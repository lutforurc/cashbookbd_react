import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiEdit2, FiPlus, FiX } from 'react-icons/fi';

import Table from '../../utils/others/Table';
import Loader from '../../../common/Loader';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

import httpService from '../../services/httpService';
import { API_ASSET_ITEM_URL } from '../../services/apiRoutes';
import { fetchProductUnitDdl } from '../product/unit/unitSlice';

/**
 * The short list a purchase is picked from -- chairs, beds, laptops, a van.
 *
 * ⚠️ AN ITEM IS NEITHER STOCK NOR AN ASSET. Stock lives under products, with
 * quantities and FIFO layers; an asset is one physical thing and gets its own
 * register row the day it is bought. This screen maintains only what a clerk
 * searches for, and the one thing it must get right is the CATEGORY: the
 * category nominates the ledger head (`asset_coa4_id`) that a purchase line
 * debits, so an item without one cannot be bought.
 *
 * ⚠️ OR AN EXPENSE ITEM -- meat, oil, soap. It names an Expense head (Food
 * Management, Washing & Cleaning) instead of a category; buying it charges that
 * head the same day, and it is never stock and never on the register.
 *
 * ⚠️ THE LAST RATE IS A MEMORY, NOT A PRICE. It is what was paid the last time
 * this item was bought, offered as a starting figure on the purchase screen.
 * Nothing values anything from it, and leaving it at nought is honest for an
 * item nobody has bought yet.
 *
 * ⚠️ REMOVING SWITCHES THE ITEM OFF. Old register rows and purchase lines
 * already carry its name, so nothing breaks -- but a catalogue that accumulates
 * deleted rows teaches nobody anything, and a switched-off row simply stops
 * being offered.
 */

const blank = () => ({
  id: null as number | null,
  name: '',
  kind: 'asset',
  category_id: '',
  expense_coa4_id: '',
  code: '',
  unit_id: '',
  last_rate: '',
  status: '1',
});

const draftOf = (row: any) => ({
  id: row.id,
  name: row.name,
  kind: row.kind ?? 'asset',
  category_id: String(row.category_id ?? ''),
  expense_coa4_id: row.expense_coa4_id ? String(row.expense_coa4_id) : '',
  code: row.code ?? '',
  unit_id: row.unit_id ? String(row.unit_id) : '',
  last_rate: String(row.last_rate ?? ''),
  status: String(row.status ?? 1),
});

const AssetItemsTab = () => {
  const dispatch = useDispatch<any>();
  // The same unit list a product is measured in -- a chair measured in "pcs"
  // and a pencil measured in "pcs" should be the same row, not two words.
  const unitDdl = useSelector((state: any) => state.productUnit?.unitDdl) || [];

  const unitOptions = useMemo(
    () => [
      { id: '', name: 'Select a unit' },
      ...(Array.isArray(unitDdl)
        ? unitDdl.map((u: any) => ({ id: u.id ?? u.value, name: u.name ?? u.label }))
        : []),
    ],
    [unitDdl],
  );

  const [rows, setRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [expenseHeads, setExpenseHeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ReturnType<typeof blank> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_ASSET_ITEM_URL);
      const data = res?.data?.data?.data ?? res?.data?.data ?? {};

      setRows(data.rows ?? []);
      setCategories(data.categories ?? []);
      setExpenseHeads(data.expense_heads ?? []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    dispatch(fetchProductUnitDdl(''));
  }, [dispatch]);

  const save = async () => {
    if (!form?.name?.trim()) {
      toast.error('What is the item called?');
      return;
    }

    const isExpense = form.kind === 'expense';

    if (!isExpense && !form?.category_id) {
      toast.error('Choose the category — it decides where the cost lands.');
      return;
    }

    if (isExpense && !form?.expense_coa4_id) {
      toast.error('Choose the expense head — it is where the cost lands.');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_ASSET_ITEM_URL}/store`, {
        id: form.id ?? null,
        name: form.name,
        kind: form.kind,
        category_id: isExpense ? null : Number(form.category_id),
        expense_coa4_id: isExpense ? Number(form.expense_coa4_id) : null,
        code: form.code || null,
        unit_id: form.unit_id ? Number(form.unit_id) : null,
        last_rate: form.last_rate === '' ? 0 : Number(form.last_rate),
        status: Number(form.status),
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

  const switchOff = async (row: any) => {
    setSaving(true);

    try {
      const res = await httpService.post(`${API_ASSET_ITEM_URL}/delete/${row.id}`, {});
      toast.success(res?.data?.message || 'Switched off');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not switch it off');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Item',
      render: (row: any) => (
        <div>
          <div className="text-black dark:text-white">{row.name}</div>
          {row.code ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">{row.code}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'category_name',
      header: 'Category',
      // ⚠️ The head is not decoration: it is the account a purchase of this
      // item will debit, and seeing it here is how a mis-filed category gets
      // noticed before the voucher is written.
      render: (row: any) => (
        <div>
          <div className="text-black dark:text-white">
            {row.kind === 'expense' ? 'Expense' : (row.category_name ?? '—')}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.head_name ?? 'no head nominated'}
          </div>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (row: any) => row.unit || '—',
    },
    {
      key: 'last_rate',
      header: 'Last Rate',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) =>
        Number(row.last_rate) > 0 ? thousandSeparator(Number(row.last_rate)) : '—',
    },
    {
      key: 'status',
      header: 'Status',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) =>
        Number(row.status) === 1 ? (
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">In use</span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">Switched off</span>
        ),
    },
    {
      key: 'actions',
      header: 'Action',
      headerClass: 'w-28 text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Edit item"
            title="Change this item"
            onClick={() => setForm(draftOf(row))}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <FiEdit2 size={15} />
          </button>

          {Number(row.status) === 1 ? (
            <button
              type="button"
              aria-label="Switch this item off"
              title="Switch off — it stops being offered, nothing is deleted"
              onClick={() => switchOff(row)}
              className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              <FiX size={16} />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  if (loading && !rows.length) return <Loader />;

  return (
    <div>
      {form ? (
        <div className="mb-3 rounded border border-stroke p-3 dark:border-strokedark">
          <h3 className="mb-2 text-base font-semibold text-black dark:text-white">
            {form.id ? `Editing ${form.name || 'an item'}` : 'New item'}
          </h3>

          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <InputElement
                id="itemName"
                name="itemName"
                label="Item Name *"
                placeholder="Office chair, executive"
                value={form.name}
                onChange={(e: any) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <DropdownCommon
                id="itemKind"
                name="itemKind"
                label="Kind *"
                data={[
                  { id: 'asset', name: 'Asset' },
                  { id: 'expense', name: 'Expense' },
                ]}
                value={form.kind}
                onChange={(e: any) => setForm({ ...form, kind: e.target.value })}
                description=""
              />
            </div>

            <div className="md:col-span-3">
              {form.kind === 'expense' ? (
                <DropdownCommon
                  id="itemExpenseHead"
                  name="itemExpenseHead"
                  label="Expense Head *"
                  data={[
                    { id: '', name: 'Select an expense head' },
                    ...expenseHeads.map((one: any) => ({ id: one.id, name: one.name })),
                  ]}
                  value={form.expense_coa4_id}
                  onChange={(e: any) => setForm({ ...form, expense_coa4_id: e.target.value })}
                  description=""
                />
              ) : (
                <DropdownCommon
                  id="itemCategory"
                  name="itemCategory"
                  label="Category *"
                  data={[
                    { id: '', name: 'Select a category' },
                    ...categories.map((one: any) => ({ id: one.id, name: one.name })),
                  ]}
                  value={form.category_id}
                  onChange={(e: any) => setForm({ ...form, category_id: e.target.value })}
                  description=""
                />
              )}
            </div>

            <div className="md:col-span-2">
              <InputElement
                id="itemCode"
                name="itemCode"
                label="Code"
                placeholder="CHR-01"
                value={form.code}
                onChange={(e: any) => setForm({ ...form, code: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <DropdownCommon
                id="itemUnit"
                name="itemUnit"
                label="Unit"
                data={unitOptions}
                value={form.unit_id}
                onChange={(e: any) => setForm({ ...form, unit_id: e.target.value })}
                description=""
              />
            </div>

            <div className="md:col-span-2">
              <InputElement
                id="itemLastRate"
                name="itemLastRate"
                type="number"
                min={0}
                label="Last Rate (Tk.)"
                placeholder="0.00"
                value={form.last_rate}
                onChange={(e: any) => setForm({ ...form, last_rate: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="w-40">
              <DropdownCommon
                id="itemStatus"
                name="itemStatus"
                label="Status"
                data={[
                  { id: '1', name: 'In use' },
                  { id: '0', name: 'Switched off' },
                ]}
                value={form.status}
                onChange={(e: any) => setForm({ ...form, status: e.target.value })}
              />
            </div>

            <ButtonLoading
              onClick={save}
              buttonLoading={saving}
              label={form.id ? 'Save item' : 'Add item'}
              icon={<FiPlus size={16} />}
            />
            <ButtonLoading
              onClick={() => setForm(null)}
              label="Cancel"
              variant="ghost"
              className="border border-stroke px-3 dark:border-strokedark"
              icon={<FiX size={16} />}
            />
          </div>
        </div>
      ) : (
        <div className="mb-2">
          <ButtonLoading
            onClick={() => setForm(blank())}
            label="Add an item"
            icon={<FiPlus size={16} />}
          />
        </div>
      )}

      <Table
        columns={columns}
        data={rows}
        noDataMessage="No items yet. Add one under a category — that category is what decides where its cost lands."
      />
    </div>
  );
};

export default AssetItemsTab;
