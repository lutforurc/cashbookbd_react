import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';

import ActionButtons from '../../utils/fields/ActionButton';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import SearchInput from '../../utils/fields/SearchInput';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import Table from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_ASSET_REGISTER_URL } from '../../services/apiRoutes';
import { money } from '../hotel/setupHelpers';

/**
 * The register: every asset the company owns, one row each.
 *
 * ⚠️ ONE ROW IS ONE THING, and there is no quantity box. Four identical chairs
 * bought on one invoice are four rows, because they are moved, sold and written
 * off one at a time — a quantity would have to be split the first time one of
 * them broke, and the ledger unpicked with it.
 *
 * ⚠️ WHAT IT IS WORTH IS NOT TYPED, IT IS WORKED OUT. Cost is a fact and each
 * year's charge is a row; the written-down value is the subtraction. A figure
 * somebody typed would be a third number that can disagree with the two it came
 * from, and those two are the ones with an audit trail.
 *
 * ⚠️ AN OLD ASSET BRINGS ITS DEPRECIATION AS A MEMORY. Something carried over
 * from the old books is already in the ledger — its cost in the asset head, its
 * accumulated depreciation in the depreciation head, put there by whoever wrote
 * the opening entries. The two boxes below record it and post NOTHING; posting
 * again would double both sides of the balance sheet. The form says so, because
 * a box that quietly does nothing is one somebody will fill in twice.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): a purchase is a calendar date, and going
  // through UTC moves it a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const onTheDay = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '—';
};

const STATUS_OPTIONS = [
  { id: '', name: 'All' },
  { id: 'in_use', name: 'In use' },
  { id: 'disposed', name: 'Disposed' },
  { id: 'written_off', name: 'Written off' },
];

const STATUS_NAMES: Record<string, string> = {
  in_use: 'In use',
  disposed: 'Disposed',
  written_off: 'Written off',
};

const blank = () => ({
  category_id: '',
  code: '',
  name: '',
  description: '',
  serial_no: '',
  location: '',
  purchase_date: asText(new Date()),
  cost: '',
  opening_accum_dep: '',
  opening_as_on: '',
  notes: '',
});

const AssetRegisterTab = ({ branchId }: { branchId?: number | null }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_ASSET_REGISTER_URL, {
        params: {
          page,
          per_page: 15,
          q: search || undefined,
          category_id: categoryFilter || undefined,
          status: statusFilter || undefined,
          branch_id: branchId || undefined,
        },
      });

      const data = res?.data?.data?.data ?? res?.data?.data ?? {};

      setRows(data.rows?.data ?? []);
      setTotalPages(data.rows?.last_page ?? 1);
      setCategories(data.categories ?? []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the register');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryOptions = useMemo(
    () => [
      { id: '', name: 'Every category' },
      ...categories.map((one: any) => ({ id: one.id, name: `${one.name} — ${Number(one.rate)}%` })),
    ],
    [categories],
  );

  const save = async () => {
    if (!form?.code?.trim() || !form?.name?.trim()) {
      toast.error('An asset needs a code and a name.');
      return;
    }

    if (!form?.category_id) {
      toast.error('Which category is it? The rate comes from there.');
      return;
    }

    if (form?.cost === '' || form?.cost === null) {
      toast.error('What did it cost?');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_ASSET_REGISTER_URL}/store`, {
        id: form.id ?? null,
        branch_id: branchId || null,
        category_id: form.category_id,
        code: form.code,
        name: form.name,
        description: form.description || null,
        serial_no: form.serial_no || null,
        location: form.location || null,
        purchase_date: form.purchase_date,
        cost: form.cost,
        opening_accum_dep: form.opening_accum_dep === '' ? 0 : form.opening_accum_dep,
        opening_as_on: form.opening_as_on || null,
        notes: form.notes || null,
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

  const remove = async (row: any) => {
    setSaving(true);

    try {
      const res = await httpService.post(`${API_ASSET_REGISTER_URL}/delete/${row.id}`, {});
      toast.success(res?.data?.message || 'Removed');
      load();
    } catch (error: any) {
      // Usually the refusal: a year has been charged, so the asset is disposed
      // of rather than deleted. The server's sentence says exactly that.
      toast.error(error?.response?.data?.message || 'Could not remove it');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Asset',
      render: (row: any) => (
        <div>
          <div className="text-black dark:text-white">{row.name}</div>
          <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
            {row.code}
            {row.serial_no ? ` · ${row.serial_no}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'category_name',
      header: 'Category',
      render: (row: any) => (
        <div>
          <div className="text-black dark:text-white">{row.category_name}</div>
          {row.location ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">{row.location}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'purchase_date',
      header: 'Bought',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => onTheDay(row.purchase_date),
    },
    {
      key: 'cost',
      header: 'Cost',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => money(row.cost),
    },
    {
      key: 'written_down_value',
      header: 'Worth now',
      headerClass: 'text-right',
      cellClass: 'text-right',
      /**
       * ⚠️ Cost less every year charged — the subtraction, never a stored
       * figure. The two lines under it say where it came from, because "worth
       * now" is the number somebody queries and "you typed it" is not an answer.
       */
      render: (row: any) => {
        const brought = Number(row.opening_accum_dep) || 0;
        const here = Number(row.charged_here) || 0;

        return (
          <div>
            <div className="font-medium text-black dark:text-white">
              {money(row.written_down_value)}
            </div>
            {brought || here ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {brought ? `${money(brought)} brought forward` : ''}
                {brought && here ? ' · ' : ''}
                {here ? `${money(here)} charged here` : ''}
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">nothing charged yet</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {STATUS_NAMES[row.status] ?? row.status}
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
            handleEdit={(one: any) =>
              setForm({
                id: one.id,
                category_id: one.category_id,
                code: one.code,
                name: one.name,
                description: one.description ?? '',
                serial_no: one.serial_no ?? '',
                location: one.location ?? '',
                purchase_date: String(one.purchase_date ?? '').slice(0, 10),
                cost: one.cost,
                opening_accum_dep: one.opening_accum_dep,
                opening_as_on: String(one.opening_as_on ?? '').slice(0, 10),
                notes: one.notes ?? '',
                // What the server will refuse to move, said before the refusal.
                locked: Number(one.charged_here) > 0,
              })
            }
          />

          {!Number(row.charged_here) ? (
            <button
              type="button"
              onClick={() => remove(row)}
              aria-label="Remove this asset"
              title="Remove — nothing has been charged against it yet"
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
      <div className="mb-2 flex flex-wrap items-end gap-2">
        <SearchInput
          id="asset_search"
          label="Search"
          search={search}
          setSearchValue={(value: string) => {
            setSearch(value);
            setPage(1);
          }}
          className="w-56"
        />
        <div className="w-52">
          <DropdownCommon
            id="asset_category_filter"
            name="asset_category_filter"
            label="Category"
            data={categoryOptions}
            value={categoryFilter}
            onChange={(e: any) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-40">
          <DropdownCommon
            id="asset_status_filter"
            name="asset_status_filter"
            label="Status"
            data={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e: any) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <ButtonLoading
          onClick={() => setForm(form ? null : blank())}
          label={form ? 'Close' : 'Add an asset'}
          icon={form ? <FiX size={16} /> : <FiPlus size={16} />}
        />
      </div>

      {form ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputElement
              id="asset_code"
              name="code"
              label="Code"
              placeholder="VEH-001"
              value={form.code}
              onChange={(e: any) => setForm({ ...form, code: e.target.value })}
              description="What goes on the sticker."
            />
            <div className="md:col-span-2">
              <InputElement
                id="asset_name"
                name="name"
                label="Asset"
                placeholder="Toyota Hiace, Dhaka Metro Ga 11-2233"
                value={form.name}
                onChange={(e: any) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <DropdownCommon
              id="asset_category"
              name="category_id"
              label="Category"
              data={[{ id: '', name: 'Choose one' }, ...categoryOptions.slice(1)]}
              value={form.category_id}
              onChange={(e: any) => setForm({ ...form, category_id: e.target.value })}
              description="The rate comes from here."
            />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputDatePicker
              id="asset_purchase_date"
              name="purchase_date"
              label="Bought on"
              selectedDate={asDate(form.purchase_date)}
              setSelectedDate={(date: Date | null) =>
                setForm({ ...form, purchase_date: asText(date) })
              }
              setCurrentDate={() => undefined}
              className="w-full"
            />
            <InputElement
              id="asset_cost"
              name="cost"
              label="Cost"
              type="number"
              min={0}
              value={String(form.cost ?? '')}
              onChange={(e: any) => setForm({ ...form, cost: e.target.value })}
              disabled={form.locked}
              description={
                form.locked
                  ? 'Frozen — a year has been charged against it.'
                  : 'What it cost. This never changes afterwards.'
              }
            />
            <InputElement
              id="asset_serial"
              name="serial_no"
              label="Serial no"
              value={form.serial_no ?? ''}
              onChange={(e: any) => setForm({ ...form, serial_no: e.target.value })}
            />
            <InputElement
              id="asset_location"
              name="location"
              label="Where it is"
              placeholder="Head office, second floor"
              value={form.location ?? ''}
              onChange={(e: any) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          {/* ⚠️ THE HALF THAT POSTS NOTHING, and it says so. An asset carried
              over from the old books is already in the ledger; these two boxes
              are what this system has to be told so that its own arithmetic
              starts in the right place. */}
          <div className="mt-3 rounded border border-stroke p-3 dark:border-strokedark">
            <div className="mb-2 text-sm font-medium text-black dark:text-white">
              Brought forward from the old books
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <InputElement
                id="asset_opening_dep"
                name="opening_accum_dep"
                label="Depreciation so far"
                type="number"
                min={0}
                value={String(form.opening_accum_dep ?? '')}
                onChange={(e: any) => setForm({ ...form, opening_accum_dep: e.target.value })}
                disabled={form.locked}
                description="What has already been charged against it."
              />
              <div>
                <InputDatePicker
                  id="asset_opening_as_on"
                  name="opening_as_on"
                  label="As on"
                  selectedDate={asDate(form.opening_as_on)}
                  setSelectedDate={(date: Date | null) =>
                    setForm({ ...form, opening_as_on: asText(date) })
                  }
                  setCurrentDate={() => undefined}
                  className="w-full"
                />
                <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
                  The day that figure was true.
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">
                  Leave both empty for something bought new. For an asset carried over, enter what
                  it <strong>originally cost</strong> above and what has been charged against it
                  here — not what it is worth now.
                  <br />
                  <strong>Nothing is posted from this box.</strong> Those figures are already in
                  the ledger from the old books&rsquo; opening entries; posting them again would
                  double both the asset and the depreciation.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <InputElement
              id="asset_notes"
              name="notes"
              label="Note"
              placeholder="Optional"
              value={form.notes ?? ''}
              onChange={(e: any) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

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
        noDataMessage="Nothing in the register yet. Add a category first, then the assets that belong to it."
      />

      {totalPages > 1 ? (
        <div className="mt-3">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            handlePageChange={(next: number) => setPage(next)}
          />
        </div>
      ) : null}
    </div>
  );
};

export default AssetRegisterTab;
