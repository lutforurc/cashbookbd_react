import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiCheck, FiDownload, FiEdit2, FiRefreshCcw, FiSearch, FiTrash2, FiUpload } from 'react-icons/fi';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { Input, Textarea } from '../../utils/fields/FormControls';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import httpService from '../../services/httpService';
import {
  API_CUSTOMER_OPENING_IMPORT_CHECK_URL,
  API_CUSTOMER_OPENING_IMPORT_ROW_URL,
} from '../../services/apiRoutes';
import { isBranchSettingOn } from '../../utils/userFeatureSettings';
import { FIELD_TEXTAREA, FIELD_TRANSPARENT, fieldClass } from '../../../theme/fieldStyles';

/**
 * Customer opening balances from an Excel sheet.
 *
 * The same two-step shape as the product opening import next door: Check asks
 * the server what every row comes to -- a customer the books already have, a
 * new one to be made, or a refusal -- and Ok saves the rows one call at a time,
 * so a long sheet never meets the request time limit and a refused row stays on
 * screen, red, to be fixed and sent again.
 *
 * The server does the matching and the saving (PartyController::
 * resolvePartyOpeningImportRow): each opening goes through the same service the
 * customer list and Add Customer call, so it raises the same journal voucher
 * and can be corrected or deleted from the list afterwards.
 */

/** The sheet's headings, in the owner's order. sl_no is the owner's own count and is not saved. */
const SHEET_HEADINGS = [
  'sl_no',
  'name',
  'type',
  'mobile',
  'customer_number',
  'address',
  'opening',
];

type Field = 'name' | 'type' | 'mobile' | 'customer_number' | 'address' | 'opening';

const FIELDS: { key: Field; header: string; className: string; numeric?: boolean }[] = [
  { key: 'name', header: 'Name', className: 'min-w-56' },
  { key: 'type', header: 'Type', className: 'min-w-28' },
  { key: 'mobile', header: 'Mobile', className: 'min-w-28' },
  { key: 'customer_number', header: 'Customer No.', className: 'min-w-28' },
  { key: 'address', header: 'Address', className: 'min-w-56' },
  { key: 'opening', header: 'Opening', className: 'min-w-24 text-right', numeric: true },
];

/**
 * Every heading a sheet may carry for a column, compared with case, spaces,
 * underscores and full stops taken out -- so "customer_number", "Customer No."
 * and "CUSTOMER NO" are one heading.
 */
const HEADING_ALIASES: Record<Field, string[]> = {
  name: ['name', 'customername', 'partyname', 'customer', 'party'],
  type: ['type', 'partytype', 'customertype'],
  mobile: ['mobile', 'phone', 'contactnumber', 'contactno', 'cell'],
  customer_number: ['customernumber', 'customerno', 'idfrcode', 'code', 'accountcode', 'ledgercode'],
  address: ['address', 'manualaddress', 'location'],
  opening: ['opening', 'openingbalance', 'balance', 'due', 'previousdue'],
};

const headingKey = (value: any) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

type SheetRow = Record<Field, string>;

interface CheckResult {
  status: 'new' | 'existing' | 'error';
  errors: string[];
  notes: string[];
  creates: string[];
  party_name: string | null;
}

interface GridRow {
  id: number;
  data: SheetRow;
  /** What Check said. Cleared by any edit to the row. */
  check?: CheckResult;
  saved?: boolean;
  voucherNo?: string | null;
  saveError?: string;
}

/**
 * The rows of a workbook's first sheet, matched to the columns by their
 * headings rather than their places. null when the first row is not a
 * heading row at all.
 */
const rowsFromWorkbook = (workbook: XLSX.WorkBook): SheetRow[] | null => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const table = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
  const lines = table.filter((line) => line.some((cell) => String(cell ?? '').trim() !== ''));

  if (lines.length === 0) return [];

  const headings = lines[0].map(headingKey);
  const columnOf = (field: Field) =>
    headings.findIndex((heading) => HEADING_ALIASES[field].includes(heading));

  // A name is what a customer is: without that column there is nothing to
  // match a row by and nothing to create one from.
  if (columnOf('name') < 0) return null;

  return lines
    .slice(1)
    .map((line) =>
      FIELDS.reduce((row, { key }) => {
        const column = columnOf(key);
        row[key] = column < 0 ? '' : String(line[column] ?? '').trim();
        return row;
      }, {} as SheetRow),
    )
    .filter((row) => Object.values(row).some((value) => value !== ''));
};

const toNumber = (value: string) => Number(String(value ?? '').replace(/,/g, '')) || 0;

const CustomerOpeningImport = () => {
  const settings = useSelector((state: any) => state.settings);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  // Set by any edit after a Check. Ok waits for a fresh one: an edit to one row
  // can change another's verdict (two rows that shared a name no longer do).
  const [stale, setStale] = useState(false);

  // The same branch switch the customer list and Add Customer read before they
  // offer an opening; the server refuses without it too.
  const openingOn = isBranchSettingOn(settings, 'is_opening');

  const loadRows = (parsed: SheetRow[] | null) => {
    if (parsed === null) {
      toast.error(`The first row must be the heading row: ${SHEET_HEADINGS.join(', ')}`);
      return;
    }
    if (parsed.length === 0) {
      toast.info('The sheet has no rows.');
      return;
    }

    setRows(parsed.map((data, index) => ({ id: Date.now() + index, data })));
    setStale(false);
    setShowPaste(false);
    setPasteText('');
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      loadRows(rowsFromWorkbook(XLSX.read(await file.arrayBuffer(), { type: 'array' })));
    } catch {
      toast.error('This file could not be read.');
    }
  };

  // raw keeps pasted text as text, so a customer number like 00123 keeps its noughts.
  const handlePaste = () => {
    if (!pasteText.trim()) {
      toast.info('Paste the rows from Excel first, heading row included.');
      return;
    }
    loadRows(rowsFromWorkbook(XLSX.read(pasteText, { type: 'string', raw: true })));
  };

  const downloadFormat = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      SHEET_HEADINGS,
      // One row the owner can read over before typing their own: the first
      // three columns are what a customer is matched by, the last is the figure.
      ['1', 'Rahim Traders', 'Customer', '01711223344', 'C-001', 'Mirpur, Dhaka', '15000'],
    ]);
    worksheet['!cols'] = [8, 32, 22, 18, 18, 32, 14].map((wch) => ({ wch }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customer Opening');
    XLSX.writeFile(workbook, 'customer-opening-import-format.xlsx');
  };

  const editCell = (id: number, key: Field, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, data: { ...row.data, [key]: value }, check: undefined, saveError: undefined }
          : row,
      ),
    );
    setStale(true);
  };

  const removeRow = (id: number) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
    setStale(true);
  };

  const runCheck = async () => {
    if (!rows.some((row) => !row.saved)) return;

    setChecking(true);

    try {
      // Every row goes, saved ones too, so a row number in a message is the
      // number in the grid's # column and a name already saved above counts
      // as a repeat.
      const res = await httpService.post(API_CUSTOMER_OPENING_IMPORT_CHECK_URL, {
        rows: rows.map((row) => row.data),
      });
      const body = res?.data;

      if (!body?.success) {
        toast.error(body?.message || 'The sheet could not be checked.');
        return;
      }

      const results: CheckResult[] = body?.data?.data ?? [];
      setRows((prev) =>
        prev.map((row, index) =>
          row.saved ? row : { ...row, check: results[index], saveError: undefined },
        ),
      );
      setStale(false);

      const bad = results.filter((result, index) => !rows[index]?.saved && result?.status === 'error').length;
      if (bad) {
        toast.warn(`${bad} row(s) need fixing before Ok.`);
      } else {
        toast.success('Every row is ready. Press Ok to save.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'The sheet could not be checked.');
    } finally {
      setChecking(false);
    }
  };

  const runSave = async () => {
    const queue = rows.filter((row) => !row.saved);
    let failed = 0;

    setSaving({ done: 0, total: queue.length });

    for (const [index, row] of queue.entries()) {
      let outcome: Partial<GridRow>;

      try {
        const res = await httpService.post(API_CUSTOMER_OPENING_IMPORT_ROW_URL, {
          row: row.data,
        });
        const body = res?.data;

        outcome = body?.success
          ? { saved: true, voucherNo: body?.data?.data?.opening_vr_no ?? null, saveError: undefined }
          : { saveError: body?.message || 'This row could not be saved.' };
      } catch (error: any) {
        outcome = { saveError: error?.response?.data?.message || 'This row could not be saved.' };
      }

      if (outcome.saveError) failed += 1;
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...outcome } : item)));
      setSaving({ done: index + 1, total: queue.length });
    }

    setSaving(null);

    if (failed) {
      toast.error(`${failed} row(s) were not saved. Fix them and press Ok again.`);
    } else {
      toast.success(`${queue.length} customer(s) saved.`);
    }
  };

  const pending = rows.filter((row) => !row.saved);
  const canCheck = openingOn && pending.length > 0 && !checking && !saving;
  const canSave = canCheck && !stale && pending.every((row) => row.check && row.check.status !== 'error');

  const count = (status: CheckResult['status']) =>
    pending.filter((row) => row.check?.status === status).length;
  const openingValue = rows.reduce((sum, row) => sum + toNumber(row.data.opening), 0);

  const statusCell = (row: GridRow) => {
    if (row.saved) {
      return (
        <span className="text-green-600">
          Saved{row.voucherNo ? ` · ${row.voucherNo}` : ''}
        </span>
      );
    }
    if (row.saveError) {
      return <span className="text-red-500">{row.saveError}</span>;
    }
    if (!row.check) {
      return <span className="text-gray-500">{stale ? 'Changed — press Check' : 'Not checked'}</span>;
    }
    if (row.check.status === 'error') {
      return <span className="text-red-500">{row.check.errors.join(' ')}</span>;
    }

    return (
      <div>
        <span className={row.check.status === 'new' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600'}>
          {row.check.status === 'new'
            ? 'New customer'
            : `Existing: ${row.check.party_name ?? ''} — its opening changes`}
        </span>
        {row.check.creates.length > 0 && (
          <div className="text-xs text-gray-600 dark:text-gray-300">
            Will create — {row.check.creates.join(', ')}
          </div>
        )}
        {row.check.notes.map((note) => (
          <div key={note} className="text-xs text-amber-600">
            {note}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <HelmetTitle title="Customer Opening Import" />

      {!openingOn && (
        <div className="mb-3 rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-transparent dark:text-amber-300">
          Opening balances are switched off for this branch. Turn them on in the branch settings to import.
        </div>
      )}

      <div className="rounded-sm p-4 shadow-default">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-300">
            A row is matched by its customer number, else by its mobile, else by its exact name. A
            name the books do not have is made into a customer — type, mobile and address are used
            for that. Only the opening is written on a customer that already exists. A positive
            opening is what the customer owes; enter a minus when the books owe them.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLoading
              onClick={downloadFormat}
              buttonLoading={false}
              label="Download Format"
              className="px-4 py-2"
              icon={<FiDownload />}
            />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-primary px-3 py-2 text-sm font-medium text-white">
              <FiUpload />
              Upload
              <Input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </label>
            <ButtonLoading
              onClick={() => setShowPaste((open) => !open)}
              buttonLoading={false}
              label={showPaste ? 'Hide Paste Box' : 'Paste Rows'}
              className="px-4 py-2"
              icon={<FiEdit2 />}
            />
          </div>
        </div>

        {showPaste && (
          <div className="mb-3">
            <Textarea
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              placeholder={`Paste from Excel, heading row included:\n${SHEET_HEADINGS.join('\t')}`}
              className={`${FIELD_TEXTAREA} h-40 w-full p-3 text-sm`}
            />
            <div className="mt-2 flex justify-end">
              <ButtonLoading
                onClick={handlePaste}
                buttonLoading={false}
                label="Load Rows"
                className="px-4 py-2"
                icon={<FiCheck />}
              />
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm dark:text-[rgb(var(--c-text))]">
            <span>Rows: {rows.length}</span>
            <span>Saved: {rows.length - pending.length}</span>
            <span className="text-blue-600 dark:text-blue-400">New: {count('new')}</span>
            <span className="text-green-600">Existing: {count('existing')}</span>
            <span className="text-red-500">To fix: {count('error')}</span>
            <span>Opening total: {thousandSeparator(openingValue) || '0'}</span>
          </div>
        )}

        <div className="overflow-x-auto rounded border border-[rgb(var(--c-border))]">
          <table className="w-full min-w-300 text-left text-sm">
            <thead className="bg-[rgb(var(--c-table-head))] text-xs uppercase text-gray-700 dark:text-gray-200">
              <tr>
                <th className="px-2 py-2 text-center">#</th>
                {FIELDS.map((field) => (
                  <th key={field.key} className={`px-2 py-2 ${field.numeric ? 'text-right' : ''}`}>
                    {field.header}
                  </th>
                ))}
                <th className="min-w-64 px-2 py-2">Status</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke dark:divide-strokedark">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={FIELDS.length + 3} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                    Upload the Excel sheet or paste its rows. Headings: {SHEET_HEADINGS.join(', ')}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`align-top dark:text-[rgb(var(--c-text))] ${
                      row.saved ? 'bg-green-50 dark:bg-green-900/10' : ''
                    }`}
                  >
                    <td className="px-2 py-1 text-center">{index + 1}</td>
                    {FIELDS.map((field) => (
                      <td key={field.key} className="px-1 py-1">
                        <Input
                          value={row.data[field.key]}
                          // Held while Check runs too: its answers come back by
                          // position, and a row removed meanwhile would shift them.
                          disabled={row.saved || !!saving || checking}
                          inputMode={field.numeric ? 'decimal' : undefined}
                          onChange={(event) => editCell(row.id, field.key, event.target.value)}
                          className={fieldClass('sm', `w-full ${field.className} ${FIELD_TRANSPARENT}`)}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1 text-sm">{statusCell(row)}</td>
                    <td className="px-1 py-1 text-center">
                      {!row.saved && (
                        <Button
                          type="button"
                          title="Remove this row"
                          disabled={!!saving || checking}
                          onClick={() => removeRow(row.id)}
                          className="text-red-500"
                        >
                          <FiTrash2 />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          {saving && (
            <span className="mr-auto text-sm dark:text-[rgb(var(--c-text))]">
              Saving {saving.done} / {saving.total}...
            </span>
          )}
          <ButtonLoading
            onClick={() => {
              setRows([]);
              setStale(false);
            }}
            buttonLoading={false}
            disabled={!!saving || rows.length === 0}
            label="Clear"
            className="px-4 py-2"
            icon={<FiRefreshCcw />}
          />
          <ButtonLoading
            onClick={runCheck}
            buttonLoading={checking}
            disabled={!canCheck}
            label={checking ? 'Checking...' : 'Check'}
            className="px-4 py-2"
            icon={<FiSearch />}
          />
          <ButtonLoading
            onClick={runSave}
            buttonLoading={!!saving}
            disabled={!canSave}
            label={saving ? 'Saving...' : 'Ok'}
            className="px-6 py-2"
            icon={<FiCheck />}
          />
        </div>
      </div>
    </>
  );
};

export default CustomerOpeningImport;
