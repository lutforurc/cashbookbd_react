import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiRotateCcw, FiSave, FiX } from 'react-icons/fi';

import ActionButtons from '../../utils/fields/ActionButton';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import Table from '../../utils/others/Table';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_HOTEL_CHARGE_TYPE_URL } from '../../services/apiRoutes';
import { money } from './setupHelpers';

/**
 * What can go on a bill, and which head each earns into -- §33.
 *
 * ⚠️ NOTHING ON THIS SCREEN IS REQUIRED, and it says so at the top. A property
 * that never opens it posts exactly as every install did before the table
 * existed: room rent to Room Rent Income, everything else to Hotel Other Income.
 * The seven shipped types carry no head at all -- somebody staring at a column
 * of blanks has to be told that is the working state and not an unfinished one.
 *
 * ⚠️ EDITING A SHIPPED TYPE DOES NOT CHANGE IT FOR ANYBODY ELSE. The shipped list
 * is shared by every tenant on the server; saving writes a row of THIS company's
 * own with the same code, which overrides it. Reset removes that row and puts the
 * shipped one back. The screen has to say so, or the first person to rename
 * "Laundry" will think they have broken something.
 *
 * ⚠️ THE CODE IS A KEY AND DOES NOT MOVE. It is the string written into every
 * folio line and matched against the tax-rate table, so it is shown but never
 * editable on an existing type -- a code changed underneath a folio line would
 * restate a bill somebody has already paid (§6.3).
 */

const blank = () => ({
  code: '',
  name: '',
  coa4_id: '',
  default_rate: '',
  vat_rate: '',
  sort_order: 50,
});

const ChargeTypesTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [heads, setHeads] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_HOTEL_CHARGE_TYPE_URL);
      const data = res?.data?.data?.data ?? res?.data?.data ?? {};

      setRows(data.rows ?? []);
      setHeads(data.heads ?? []);
      setNote(data.note ?? '');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the charge types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const headOptions = [
    // ⚠️ The first option is the fallback, named. A blank first line would read
    // as "not chosen yet" when it is in fact a working answer.
    { id: '', name: 'Hotel Other Income (the default)' },
    ...heads.map((head: any) => ({ id: head.id, name: `${head.name} — ${head.group_name}` })),
  ];

  const save = async () => {
    if (!form?.code?.trim() || !form?.name?.trim()) {
      toast.error('A charge type needs a code and a name.');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_HOTEL_CHARGE_TYPE_URL}/store`, {
        code: form.code,
        name: form.name,
        coa4_id: form.coa4_id || null,
        default_rate: form.default_rate === '' ? null : form.default_rate,
        vat_rate: form.vat_rate === '' ? 0 : form.vat_rate,
        sort_order: form.sort_order,
      });

      toast.success(res?.data?.message || 'Saved');
      setForm(null);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save it');
    } finally {
      setSaving(false);
    }
  };

  const reset = async (row: any) => {
    setSaving(true);

    try {
      const res = await httpService.post(`${API_HOTEL_CHARGE_TYPE_URL}/delete/${row.id}`, {});
      toast.success(res?.data?.message || 'Put back');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not put it back');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Charge',
      render: (row: any) => (
        <div>
          <div className="text-black dark:text-white">{row.name}</div>
          {/* The key, shown because it is what a folio line stores -- and
              greyed, because it is not a thing anybody edits. */}
          <div className="font-mono text-xs text-gray-500 dark:text-gray-400">{row.code}</div>
        </div>
      ),
    },
    {
      key: 'head_name',
      header: 'Earns into',
      render: (row: any) =>
        row.head_name ? (
          <span className="text-black dark:text-white">{row.head_name}</span>
        ) : (
          // ⚠️ Named, not left blank. A blank here reads as broken; what it
          // actually means is the working default.
          <span className="text-gray-500 dark:text-gray-400">Hotel Other Income</span>
        ),
    },
    {
      key: 'default_rate',
      header: 'Suggested rate',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) =>
        row.default_rate ? money(row.default_rate) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'vat_rate',
      header: 'VAT',
      headerClass: 'text-right',
      cellClass: 'text-right',
      // ⚠️ Read when the charge is billed and copied onto the line. Food is 5%
      // where a room is 15% -- which is the whole reason the rate lives per
      // type rather than once on the bill.
      render: (row: any) =>
        Number(row.vat_rate) ? (
          <span className="text-black dark:text-white">{Number(row.vat_rate)}%</span>
        ) : (
          <span
            className="text-amber-700 dark:text-amber-300"
            title="Bills with no VAT until a rate is set here."
          >
            0%
          </span>
        ),
    },
    {
      key: 'by_hand',
      header: 'On the folio',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) =>
        row.by_hand ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">offered</span>
        ) : (
          // Room rent, and only room rent. A hand-typed rent line carries no
          // room and no night, so the same night could be billed twice.
          <span
            className="text-xs text-gray-500 dark:text-gray-400"
            title="Room rent goes on through “Bill the nights”, never by hand — otherwise a night could be charged twice."
          >
            billed by the nights
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Action',
      headerClass: 'w-28 text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-2">
          <ActionButtons
            row={row}
            showEdit
            handleEdit={(r: any) =>
              setForm({
                code: r.code,
                name: r.name,
                coa4_id: r.coa4_id ?? '',
                default_rate: r.default_rate ?? '',
                vat_rate: r.vat_rate ?? '',
                sort_order: r.sort_order,
                locked: true,
              })
            }
          />

          {/* Only where this company has written a row of its own. A shipped
              type has nothing of theirs to put back.

              Not the trash icon ActionButtons offers: this deletes nothing the
              user can see, it puts the shipped type back -- which is what the
              same arrow means in the note under the table. */}
          {row.is_overridden ? (
            <button
              type="button"
              onClick={() => reset(row)}
              aria-label="Put the shipped version back"
              className="btn btn-sm btn-outline flex h-5 w-5 cursor-pointer items-center justify-center"
              title="Remove this company’s own version and go back to the one that ships"
            >
              <FiRotateCcw className="text-lg text-red-600" />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  if (loading && !rows.length) return <Loader />;

  return (
    <div>
      {note ? (
        <p className="mb-3 rounded border border-stroke p-2.5 text-xs leading-snug text-gray-600 dark:border-strokedark dark:text-gray-300">
          {note}
        </p>
      ) : null}

      <div className="mb-2">
        <ButtonLoading
          onClick={() => setForm(form ? null : blank())}
          label={form ? 'Close' : 'Add a charge type'}
          icon={form ? <FiX size={16} /> : <FiPlus size={16} />}
        />
      </div>

      {form ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputElement
              id="charge_code"
              name="code"
              label="Code"
              placeholder="spa"
              value={form.code}
              onChange={(e: any) => setForm({ ...form, code: e.target.value })}
              // ⚠️ Never editable on an existing type. It is the string every
              // folio line stores, and changing it underneath one would restate
              // a bill somebody has already paid.
              disabled={form.locked}
              description={
                form.locked
                  ? 'The code never changes — bills already name it.'
                  : 'Lower case, no spaces. It is a key, not a label.'
              }
            />
            <InputElement
              id="charge_name"
              name="name"
              label="Name"
              placeholder="Spa & Massage"
              value={form.name}
              onChange={(e: any) => setForm({ ...form, name: e.target.value })}
            />
            <div className="md:col-span-2">
              <DropdownCommon
                id="charge_coa4_id"
                name="coa4_id"
                label="Earns into"
                data={headOptions}
                value={form.coa4_id}
                onChange={(e: any) => setForm({ ...form, coa4_id: e.target.value })}
                description="Income heads only — an expense head would run the books backwards."
              />
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputElement
              id="charge_default_rate"
              name="default_rate"
              label="Suggested rate"
              type="number"
              min={0}
              value={String(form.default_rate ?? '')}
              onChange={(e: any) => setForm({ ...form, default_rate: e.target.value })}
              description="Fills the box in. Leave it empty where there is no standing price."
            />
            <InputElement
              id="charge_vat_rate"
              name="vat_rate"
              label="VAT %"
              type="number"
              min={0}
              max={100}
              placeholder="5"
              value={String(form.vat_rate ?? '')}
              onChange={(e: any) => setForm({ ...form, vat_rate: e.target.value })}
              description="5 on food where a room is 15. Copied onto the bill line when it is billed."
            />
            <InputElement
              id="charge_sort_order"
              name="sort_order"
              label="Order on the list"
              type="number"
              min={0}
              value={String(form.sort_order ?? 50)}
              onChange={(e: any) => setForm({ ...form, sort_order: e.target.value })}
            />
          </div>

          <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
            Saving one of the types that ships writes <strong>this company&rsquo;s own version</strong>{' '}
            of it — nothing changes for any other property, and Reset puts it back.
          </p>

          <div className="mt-3">
            <ButtonLoading
              onClick={save}
              buttonLoading={saving}
              icon={<FiSave className="h-5 w-5" />}
              label="Save"
              variant="primary"
            />
          </div>
        </div>
      ) : null}

      <Table
        columns={columns}
        data={rows}
        noDataMessage="No charge types. That should not happen — seven ship with the system."
      />

      <p className="mt-2 flex items-start gap-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
        <FiRotateCcw size={13} className="mt-0.5 shrink-0" />
        <span>
          A type already used on a bill keeps earning wherever it earned then — a bill is read
          back from what it stored, never recomputed. Changing a head here affects what is billed
          from now on.
        </span>
      </p>
    </div>
  );
};

export default ChargeTypesTab;
