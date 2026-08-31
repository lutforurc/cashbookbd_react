import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiX } from 'react-icons/fi';

import ActionButtons from '../../utils/fields/ActionButton';
import Table from '../../utils/others/Table';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_ASSET_CATEGORY_URL } from '../../services/apiRoutes';
import AssetCategoryForm from './AssetCategoryForm';

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
 *
 * The boxes themselves are in AssetCategoryForm — this reads the list, saves a
 * category and removes one, and holds the draft while it is being typed. The
 * same split AssetRegisterTab already makes with AssetCarePanel.
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
        <AssetCategoryForm
          form={form}
          onChange={setForm}
          onSave={save}
          saving={saving}
          balanceSheetHeads={balanceSheetHeads}
          expenseHeads={expenseHeads}
        />
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
