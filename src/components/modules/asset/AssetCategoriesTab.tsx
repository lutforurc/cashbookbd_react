import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';

import ActionButtons from '../../utils/fields/ActionButton';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import Table from '../../utils/others/Table';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_ASSET_CATEGORY_URL } from '../../services/apiRoutes';

/**
 * What kinds of thing this company owns, how fast each wears out, and where its
 * money lives.
 *
 * ⚠️ THE RATE BELONGS TO THE CLASS, not to the thing. "Vehicles at 20%" is one
 * decision applied to every lorry; typed onto each lorry it would be typed
 * wrongly on one of them, and nobody would find out until the year-end schedule
 * failed to foot.
 *
 * ⚠️ THE THREE HEADS ARE NOMINATED FROM THIS COMPANY'S OWN CHART, and each list
 * is filtered to the half of the accounts it belongs in — the cost and the
 * accumulated depreciation to the balance sheet, the yearly charge to the profit
 * and loss. "Depreciation" is a word that appears in both halves, and the two
 * pointed the wrong way round would run the books backwards with nothing on
 * screen looking odd.
 *
 * ⚠️ A category with no heads is kept and edited like any other. It simply
 * cannot be depreciated — and the row says so, so that it is discovered here
 * rather than in June when the run refuses.
 */

const blank = () => ({
  name: '',
  code: '',
  rate: '',
  residual_value: 1,
  asset_coa4_id: '',
  accum_dep_coa4_id: '',
  dep_expense_coa4_id: '',
  disposal_coa4_id: '',
  notes: '',
  sort_order: 50,
});

const percent = (value: any) => `${Number(value ?? 0)}%`;

const AssetCategoriesTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [balanceSheetHeads, setBalanceSheetHeads] = useState<any[]>([]);
  const [expenseHeads, setExpenseHeads] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_ASSET_CATEGORY_URL);
      const data = res?.data?.data?.data ?? res?.data?.data ?? {};

      setRows(data.rows ?? []);
      setBalanceSheetHeads(data.balance_sheet_heads ?? []);
      setExpenseHeads(data.expense_heads ?? []);
      setNote(data.note ?? '');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const headOptions = (heads: any[]) => [
    // ⚠️ Named, not blank. "Not chosen yet" is a real state here — the category
    // can be saved without it — so the first line says which state it is.
    { id: '', name: 'Not chosen yet' },
    ...heads.map((head: any) => ({ id: head.id, name: `${head.name} — ${head.group_name}` })),
  ];

  const save = async () => {
    if (!form?.name?.trim()) {
      toast.error('The category needs a name.');
      return;
    }

    if (form?.rate === '' || form?.rate === null) {
      toast.error('Give the rate. Nought is an answer, but it has to be typed.');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_ASSET_CATEGORY_URL}/store`, {
        id: form.id ?? null,
        name: form.name,
        code: form.code || null,
        rate: form.rate,
        residual_value: form.residual_value === '' ? 1 : form.residual_value,
        asset_coa4_id: form.asset_coa4_id || null,
        accum_dep_coa4_id: form.accum_dep_coa4_id || null,
        dep_expense_coa4_id: form.dep_expense_coa4_id || null,
        disposal_coa4_id: form.disposal_coa4_id || null,
        notes: form.notes || null,
        sort_order: form.sort_order,
      });

      // Shown for longer than the usual toast: where years have already been
      // charged the server says so in a sentence, and that sentence is the
      // answer to the question somebody editing a rate is really asking.
      toast.success(res?.data?.message || 'Saved', { autoClose: 6000 });
      setForm(null);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save it');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: any) => {
    setSaving(true);

    try {
      const res = await httpService.post(`${API_ASSET_CATEGORY_URL}/delete/${row.id}`, {});
      toast.success(res?.data?.message || 'Removed');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not remove it');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Category',
      render: (row: any) => (
        <div>
          <div className="text-black dark:text-white">{row.name}</div>
          {row.notes ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">{row.notes}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-right',
      cellClass: 'text-right',
      // Reducing balance: a percentage of what the thing is still worth, said
      // beside the figure so nobody reads it as a share of the cost.
      render: (row: any) => (
        <div>
          <div className="text-black dark:text-white">{percent(row.rate)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">of what it is worth</div>
        </div>
      ),
    },
    {
      key: 'residual_value',
      header: 'Stops at',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => Number(row.residual_value ?? 0).toFixed(2),
    },
    {
      key: 'asset_head_name',
      header: 'Heads',
      render: (row: any) =>
        row.ready_to_post ? (
          <div className="text-xs leading-snug">
            <div className="text-black dark:text-white">{row.asset_head_name}</div>
            <div className="text-gray-500 dark:text-gray-400">
              less {row.accum_dep_head_name}
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              charged to {row.expense_head_name}
            </div>
            {/* ⚠️ The fourth head is only needed to SELL, so its absence is
                said quietly rather than as a fault: a category that cannot be
                disposed of is perfectly able to be depreciated, and confusing
                the two sends somebody hunting for a problem that is not there. */}
            {row.ready_to_dispose ? (
              <div className="text-gray-500 dark:text-gray-400">
                sold through {row.disposal_head_name}
              </div>
            ) : (
              <div className="text-amber-700 dark:text-amber-300">
                no gain-or-loss head — cannot be sold yet
              </div>
            )}
          </div>
        ) : (
          // ⚠️ Said here rather than left for June. A category with no heads
          // cannot be depreciated, and finding that out on the day the year is
          // being closed is finding out too late.
          <span
            className="text-xs text-amber-700 dark:text-amber-300"
            title="Depreciation cannot be run for this category until all three heads are chosen."
          >
            not set — cannot be depreciated
          </span>
        ),
    },
    {
      key: 'asset_count',
      header: 'Assets',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => row.asset_count ?? 0,
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
            handleEdit={(one: any) =>
              setForm({
                id: one.id,
                name: one.name,
                code: one.code ?? '',
                rate: one.rate,
                residual_value: one.residual_value,
                asset_coa4_id: one.asset_coa4_id ?? '',
                accum_dep_coa4_id: one.accum_dep_coa4_id ?? '',
                dep_expense_coa4_id: one.dep_expense_coa4_id ?? '',
                disposal_coa4_id: one.disposal_coa4_id ?? '',
                notes: one.notes ?? '',
                sort_order: one.sort_order,
              })
            }
          />

          {/* Only where nothing is filed under it. A category holding assets
              is switched off, not removed -- the rate its schedule was worked
              out from lives here. */}
          {!row.asset_count ? (
            <button
              type="button"
              onClick={() => remove(row)}
              aria-label="Remove this category"
              title="Remove — nothing is filed under it"
              className="btn btn-sm btn-outline flex h-5 w-5 cursor-pointer items-center justify-center"
            >
              <FiTrash2 className="text-lg text-red-600" />
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
          label={form ? 'Close' : 'Add a category'}
          icon={form ? <FiX size={16} /> : <FiPlus size={16} />}
        />
      </div>

      {form ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputElement
              id="asset_category_name"
              name="name"
              label="Category"
              placeholder="Vehicles"
              value={form.name}
              onChange={(e: any) => setForm({ ...form, name: e.target.value })}
            />
            <InputElement
              id="asset_category_code"
              name="code"
              label="Code"
              placeholder="VEH"
              value={form.code ?? ''}
              onChange={(e: any) => setForm({ ...form, code: e.target.value })}
              description="Optional. Handy on a sticker."
            />
            <InputElement
              id="asset_category_rate"
              name="rate"
              label="Rate %"
              type="number"
              min={0}
              max={100}
              placeholder="20"
              value={String(form.rate ?? '')}
              onChange={(e: any) => setForm({ ...form, rate: e.target.value })}
              description="A year, of what the asset is still worth."
            />
            <InputElement
              id="asset_category_residual"
              name="residual_value"
              label="Stops at"
              type="number"
              min={0}
              value={String(form.residual_value ?? 1)}
              onChange={(e: any) => setForm({ ...form, residual_value: e.target.value })}
              description="One taka, so the asset never vanishes off the books."
            />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
            <DropdownCommon
              id="asset_coa4_id"
              name="asset_coa4_id"
              label="Asset head"
              data={headOptions(balanceSheetHeads)}
              value={form.asset_coa4_id}
              onChange={(e: any) => setForm({ ...form, asset_coa4_id: e.target.value })}
              description="Where what it cost sits. Balance sheet."
            />
            <DropdownCommon
              id="accum_dep_coa4_id"
              name="accum_dep_coa4_id"
              label="Accumulated depreciation"
              data={headOptions(balanceSheetHeads)}
              value={form.accum_dep_coa4_id}
              onChange={(e: any) => setForm({ ...form, accum_dep_coa4_id: e.target.value })}
              description="Grows underneath the asset. Balance sheet."
            />
            <DropdownCommon
              id="dep_expense_coa4_id"
              name="dep_expense_coa4_id"
              label="Depreciation charge"
              data={headOptions(expenseHeads)}
              value={form.dep_expense_coa4_id}
              onChange={(e: any) => setForm({ ...form, dep_expense_coa4_id: e.target.value })}
              description="This year’s expense. Profit and loss."
            />
          </div>

          {/* ⚠️ THE FOURTH HEAD, AND IT ARRIVED LATE. The first three are what
              depreciation needs; this one is what SELLING needs, and a category
              can be perfectly able to depreciate and unable to dispose. Without
              it on this form there was no way to give a category its gain-or-loss
              head at all, so the disposal panel refused every sale with a
              message pointing at a box that did not exist. */}
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
            <DropdownCommon
              id="disposal_coa4_id"
              name="disposal_coa4_id"
              label="Gain or loss on sale"
              data={headOptions(expenseHeads)}
              value={form.disposal_coa4_id}
              onChange={(e: any) => setForm({ ...form, disposal_coa4_id: e.target.value })}
              description="Only needed to sell or write one off. Profit and loss."
            />
          </div>

          <div className="mt-2">
            <InputElement
              id="asset_category_notes"
              name="notes"
              label="Note"
              placeholder="Optional — where the rate came from"
              value={form.notes ?? ''}
              onChange={(e: any) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {/* ⚠️ The two things somebody typing a rate needs told, and neither is
              obvious from the form: the charge falls every year rather than
              staying flat, and a rate changed later does not reach back. */}
          <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
            Reducing balance: 20% of 100,000 is 20,000 in the first full year and 16,000 in the
            next, because the second year is charged on 80,000. Changing a rate here reaches the
            next run — every year already charged keeps the rate it was charged at.
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
        noDataMessage="No categories yet. Add one — furniture, vehicles, computers — and give it a rate."
      />
    </div>
  );
};

export default AssetCategoriesTab;
