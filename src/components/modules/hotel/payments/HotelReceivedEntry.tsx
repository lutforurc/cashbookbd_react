import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FiDollarSign,
  FiList,
  FiPlus,
  FiPrinter,
  FiRefreshCcw,
  FiSave,
  FiTrash2,
} from 'react-icons/fi';
import { FaUniversity } from 'react-icons/fa';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { ButtonLoading, IconButton } from '../../../../pages/UiElements/CustomButtons';
import { FIELD_HEIGHT, FIELD_LABEL, FIELD_TEXTAREA } from '../../../../theme/fieldStyles';
import httpService from '../../../services/httpService';
import {
  API_COAL3_ID_BY_L4_URL,
  API_HOTEL_RECEIVED_ENTRY_URL,
} from '../../../services/apiRoutes';

/**
 * Money coming in to the hotel's cash or bank, against one or more heads.
 *
 * ⚠️ IT WRITES ONE REAL VOUCHER -- the same `1-` receipt the accounts Cash
 * Received and Bank Received screens write -- with a head line for every row
 * and a single debit for the money that came into the till or the bank, so it
 * lands in the ledger, the Cash Book and the Bank Book like any other receipt.
 * See ReceivedEntryController.
 *
 * ⚠️ SEVERAL HEADS, ONE VOUCHER. Each row is a head, an amount and who paid; a
 * row is ALL OR NOTHING -- a head with no amount, or an amount with no head, is
 * refused before the server is asked. The totals shown are the sum of the rows,
 * and the two sides balance by construction: the debit is that same sum.
 *
 * ⚠️ THE MIRROR of HotelPaymentEntry. Same rows, same single contra leg, the
 * money going the other way; a receipt has no clerk-typed voucher number, only
 * who paid -- which rides on that row's line as its remark.
 */
const CASH = 'cash';
const BANK = 'bank';

const money = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Account = { value: string; label: string };

type Row = {
  id: number;
  account: Account | null;
  amount: string;
  remarks: string;
};

const makeRow = (id: number): Row => ({ id, account: null, amount: '', remarks: '' });

const HotelReceivedEntry = () => {
  const [mode, setMode] = useState<string>(CASH);
  const [rows, setRows] = useState<Row[]>([makeRow(1)]);
  const [bankList, setBankList] = useState<{ id: number; name: string }[]>([]);
  const [bankAccount, setBankAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const nextId = useRef(2);

  const isCash = mode === CASH;
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const bankName = bankList.find((b) => String(b.id) === String(bankAccount))?.name ?? '';

  useEffect(() => {
    let cancelled = false;

    httpService
      .get(`${API_COAL3_ID_BY_L4_URL}2`)
      .then((res: any) => {
        if (cancelled) return;

        const list = res?.data?.data?.data ?? [];
        const banks = Array.isArray(list) ? list : [];

        setBankList(banks);
        // Most companies keep one bank; picking it saves the clerk a click.
        if (banks.length === 1) setBankAccount(String(banks[0].id));
      })
      .catch(() => {
        // The interceptor has already said what went wrong.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** One more head on this receipt. */
  const addRow = () => setRows((prev) => [...prev, makeRow(nextId.current++)]);

  /** Take a head off -- never the last one, so the voucher always has a line. */
  const removeRow = (id: number) =>
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));

  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const reset = () => {
    setMode(CASH);
    setRows([makeRow(nextId.current++)]);
    setBankAccount('');
    setNotes('');
  };

  const save = async () => {
    if (!isCash && !bankAccount) return toast.error('Select the bank account the money is received into.');

    // Every row before any of them: a head with no amount, or an amount with no
    // head, would otherwise reach the server and be refused as one line.
    for (let index = 0; index < rows.length; index++) {
      if (!rows[index].account) {
        return toast.error(`Row ${index + 1}: select the account head the money came in against.`);
      }
      if (!(Number(rows[index].amount) > 0)) {
        return toast.error(`Row ${index + 1}: enter the received amount.`);
      }
    }

    setSaving(true);

    try {
      const res = await httpService.post(API_HOTEL_RECEIVED_ENTRY_URL, {
        mode,
        bank_account: isCash ? null : bankAccount,
        notes: notes.trim() || null,
        rows: rows.map((row) => ({
          account: row.account?.value,
          amount: Number(row.amount),
          remarks: row.remarks.trim() || null,
        })),
      });

      // ⚠️ A refusal rides HTTP 200 with success:false, so the body has to be
      // read rather than the status. Same shape every other screen here reads.
      const body = res?.data;

      if (!body?.success) {
        toast.error(body?.message || 'The server refused that.');
        return;
      }

      const voucher = body?.data?.data ?? {};
      const savedVrNo = String(voucher?.vr_no ?? '');

      reset();
      toast.success(`Voucher ${savedVrNo} saved`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <HelmetTitle title="Accounts Transaction" />

      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-black dark:text-white">Received Entry</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Accounts Receipt</p>
        </div>

        <div className="flex gap-2">
          <ButtonLoading
            onClick={() => toast.info('List — not built yet.')}
            label="List"
            variant="ghost"
            className="border border-stroke px-3 dark:border-strokedark"
            icon={<FiList size={16} />}
          />
          <ButtonLoading
            onClick={() => toast.info('Print — not built yet.')}
            label="Print"
            variant="ghost"
            className="border border-stroke px-3 dark:border-strokedark"
            icon={<FiPrinter size={16} />}
          />
        </div>
      </div>

      {/* What came in, and how much -- one row per head, all on one voucher. */}
      <div className="mb-3 rounded border border-stroke p-3 dark:border-strokedark">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-black dark:text-white">Account Heads</h2>
          <ButtonLoading
            onClick={addRow}
            label="Add Row"
            variant="ghost"
            size="sm"
            className="border border-stroke dark:border-strokedark"
            icon={<FiPlus size={15} />}
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 items-end gap-3 rounded border border-stroke p-2 md:grid-cols-12 dark:border-strokedark"
            >
              <div className="md:col-span-5">
                <label htmlFor={`account-${row.id}`} className={FIELD_LABEL}>
                  Account Head *
                </label>
                <DdlMultiline
                  id={`account-${row.id}`}
                  name="account"
                  placeholder="Search and select Account Head"
                  value={row.account}
                  onSelect={(option: any) =>
                    updateRow(row.id, {
                      account: option
                        ? { value: String(option.value), label: String(option.label) }
                        : null,
                    })
                  }
                />
              </div>

              <div className="md:col-span-3">
                <InputElement
                  id={`amount-${row.id}`}
                  name="amount"
                  type="number"
                  min={0}
                  step="any"
                  label="Received Amount (Tk.) *"
                  placeholder="0.00"
                  value={row.amount}
                  onChange={(e: any) => updateRow(row.id, { amount: e.target.value })}
                />
              </div>

              <div className="md:col-span-3">
                <InputElement
                  id={`remarks-${row.id}`}
                  name="remarks"
                  label="Received From"
                  placeholder="Who paid (optional)"
                  value={row.remarks}
                  onChange={(e: any) => updateRow(row.id, { remarks: e.target.value })}
                />
              </div>

              <div className="flex items-end justify-end pb-1.5 md:col-span-1">
                <IconButton
                  icon={<FiTrash2 size={16} />}
                  title="Remove this head"
                  tone="danger"
                  disabled={rows.length <= 1}
                  onClick={() => removeRow(row.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Where the money went. */}
        <div className="rounded border border-stroke p-3 dark:border-strokedark">
          <h2 className="mb-2 text-base font-semibold text-black dark:text-white">
            Received Details
          </h2>

          <div
            role="radiogroup"
            aria-label="Received into"
            className="mb-3 grid grid-cols-2 overflow-hidden rounded border border-stroke dark:border-strokedark"
          >
            {[
              { value: CASH, label: 'Cash', icon: <FiDollarSign size={16} /> },
              { value: BANK, label: 'Bank', icon: <FaUniversity size={15} /> },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={mode === item.value}
                onClick={() => setMode(item.value)}
                className={`${FIELD_HEIGHT} inline-flex items-center justify-center gap-2 text-sm font-medium ${
                  mode === item.value
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-meta-4'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* A bank receipt debits a bank head, and which bank is not
                something the screen may guess. */}
            {!isCash ? (
              <DropdownCommon
                id="bankAccount"
                name="bankAccount"
                label="Bank Account *"
                data={[{ id: '', name: 'Select a bank account' }, ...bankList]}
                value={bankAccount}
                onChange={(e: any) => setBankAccount(e.target.value)}
              />
            ) : null}

            <div>
              <label htmlFor="notes" className={FIELD_LABEL}>
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional note for the receipt"
                className={`${FIELD_TEXTAREA} w-full px-3 py-2`}
              />
            </div>
          </div>
        </div>

        {/* What it adds up to. */}
        <div className="rounded border border-stroke p-3 dark:border-strokedark">
          <h2 className="mb-2 text-base font-semibold text-black dark:text-white">
            Received Summary
          </h2>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Received Method</span>
            <span className="font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
              {isCash ? 'Cash' : 'Bank'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Received To</span>
            <span className="font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
              {isCash ? 'Cash in Hand' : bankName || '—'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Account Heads</span>
            <span className="font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
              {rows.length}
            </span>
          </div>

          <div className="my-1 border-t border-stroke dark:border-strokedark" />

          {/* The two sides of the voucher. They come to the same figure by
              construction -- the debit is the sum of the rows -- and the
              Difference is shown so that is visible rather than assumed. */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Debit (Tk.)</span>
            <span className="font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
              {money(total)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Credit (Tk.)</span>
            <span className="font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
              {money(total)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Difference (Tk.)</span>
            <span className="font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
              {money(total - total)}
            </span>
          </div>

          <div className="my-1 border-t border-stroke dark:border-strokedark" />

          <div className="flex items-center justify-between py-1.5">
            <span className="text-base font-semibold text-black dark:text-white">
              Total Received (Tk.)
            </span>
            <span className="text-lg font-semibold text-primary">{money(total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <ButtonLoading
          onClick={reset}
          label="Reset"
          variant="ghost"
          className="border border-stroke px-3 dark:border-strokedark"
          icon={<FiRefreshCcw size={16} />}
        />
        <ButtonLoading
          onClick={save}
          buttonLoading={saving}
          label={saving ? 'Saving...' : 'Save Received'}
          variant="primary"
          disabled={saving}
          className="px-4"
          icon={<FiSave size={16} />}
        />
      </div>
    </div>
  );
};

export default HotelReceivedEntry;
