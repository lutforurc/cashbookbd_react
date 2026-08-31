import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiClipboard, FiLogOut, FiPlus, FiPrinter, FiTrash2 } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';

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
import { API_ASSET_DISPOSAL_URL, API_ASSET_REGISTER_URL } from '../../services/apiRoutes';
import { money } from '../hotel/setupHelpers';

import AssetCarePanel from './AssetCarePanel';
import AssetRegisterForm from './AssetRegisterForm';
import AssetLabelsPrint from './AssetLabelsPrint';

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
 * the opening entries. The two boxes record it and post NOTHING; posting again
 * would double both sides of the balance sheet. The form says so, because a box
 * that quietly does nothing is one somebody will fill in twice.
 *
 * The boxes themselves are in AssetRegisterForm — this reads the register,
 * saves a row, removes one and sells one, and holds the draft while it is being
 * typed. The same split already made with AssetCarePanel.
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

const today = () => asText(new Date());

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

/** A saved asset as a draft. One place, so opening an edit cannot drift. */
const draftOf = (one: any, locked: boolean) => ({
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
  locked,
});

const AssetRegisterTab = ({ branchId }: { branchId?: number | null }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  /**
   * ⚠️ SEEDED FROM THE ADDRESS, because that is where a scanned sticker lands.
   * The QR on a label holds a link to this screen with ?q=<code>, so somebody
   * standing in front of the thing with a phone arrives at its row rather than
   * at four hundred rows and a search box. Read once, into ordinary state:
   * whatever is typed afterwards is the person's, not the link's.
   */
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  /**
   * The open disposal panel, and what the entry would be.
   *
   * ⚠️ The plan is fetched from the server rather than worked out here. Selling
   * an asset writes off a cost that has stood in the balance sheet for years,
   * and the legs a person agrees to have to be the legs that get posted.
   */
  const [leaving, setLeaving] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

  /** The years charged against one asset, opened from its row. */
  const [history, setHistory] = useState<any>(null);

  /**
   * Who is holding one asset, whether it was there, and what it has cost to
   * keep -- opened from its row, and touching no ledger.
   */
  const [caring, setCaring] = useState<any>(null);

  /**
   * ⚠️ LABELS ARE PRINTED FOR WHAT IS ON THE SCREEN, not for the whole
   * register. Somebody labelling a store filters to that store's category or
   * searches for it, and prints the page in front of them -- printing four
   * hundred stickers to put up twelve is how the first attempt goes wrong.
   */
  const labelsRef = useRef<HTMLDivElement>(null);

  const printLabels = useReactToPrint({ contentRef: labelsRef, documentTitle: 'Asset labels' });

  /**
   * ⚠️ THE FORM IS A PAGE OF ITS OWN, and the address says which.
   * `?form=new` is a new asset, `?form=12` is that one being edited, and
   * nothing at all is the list. The two are never on screen together: a form
   * and the rows it is about, stacked, is a screen where somebody edits one
   * asset while looking at another.
   *
   * In the address for the reason AssetSetup already puts its tab there — a
   * reload comes back to the same place, the browser's Back button means what
   * it looks like it means, and a link can be sent to somebody.
   */
  const asked = params.get('form');

  const openForm = (id?: any) => {
    const at = new URLSearchParams(params);
    at.set('form', id ? String(id) : 'new');
    // Pushed, so Back from the form returns to the list.
    setParams(at);
  };

  const closeForm = () => {
    const at = new URLSearchParams(params);
    at.delete('form');
    // Replaced, so pressing Back after closing does not reopen the form.
    setParams(at, { replace: true });
  };

  /**
   * The draft follows the address.
   *
   * ⚠️ SEEDED FROM THE LISTED ROW WHERE THERE IS ONE, because `locked` is
   * only on the list: it is `charged_here > 0`, worked out by the index query.
   * Where the row is not on this page — a link opened cold, or a filter that
   * excludes it — the asset is fetched and `locked` derived from the same sum
   * over its own depreciation rows, which is the identical rule rather than a
   * second one.
   *
   * It must not throw away what somebody is typing when the rows reload, hence
   * the guards on the draft already open.
   */
  useEffect(() => {
    if (!asked) {
      setForm(null);
      return;
    }

    if (asked === 'new') {
      setForm((current: any) => (current && !current.id ? current : blank()));
      return;
    }

    if (form && String(form.id) === asked) return;

    const listed = rows.find((row: any) => String(row.id) === asked);

    if (listed) {
      setForm(draftOf(listed, Number(listed.charged_here) > 0));
      return;
    }

    let alive = true;

    httpService
      .get(`${API_ASSET_REGISTER_URL}/edit/${asked}`)
      .then((res) => {
        if (!alive) return;

        const payload = res?.data?.data?.data ?? res?.data?.data ?? {};
        const asset = payload.asset;

        if (!asset) return;

        const charged = (payload.depreciations ?? []).reduce(
          (sum: number, one: any) => sum + Number(one?.amount ?? 0),
          0,
        );

        setForm(draftOf(asset, charged > 0));
      })
      .catch(() => {
        // Left null, and the page below says the asset could not be found
        // rather than opening a blank form that would save as a new one.
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked, rows]);

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
      // Back to the list, which is also what clears the draft — the effect
      // above follows the address rather than the other way round.
      closeForm();
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

  /**
   * Open the disposal panel, and ask the server what the entry would be.
   *
   * ⚠️ Asked BEFORE anything is typed, and asked again whenever the date or the
   * money changes: the depreciation owed up to the day it goes is part of the
   * entry, and it moves with the date.
   */
  const askDisposal = async (row: any, over: any = {}) => {
    const asked = { disposed_on: today(), proceeds: '', till_coa4_id: '', status: 'disposed', note: '', ...over };

    setLeaving({ ...row, ...asked });

    try {
      const res = await httpService.get(`${API_ASSET_DISPOSAL_URL}/plan/${row.id}`, {
        params: {
          disposed_on: asked.disposed_on,
          proceeds: asked.proceeds === '' ? 0 : asked.proceeds,
          till_coa4_id: asked.till_coa4_id || undefined,
        },
      });

      setPlan(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not work the disposal out');
      setLeaving(null);
    }
  };

  const dispose = async () => {
    if (!leaving?.disposed_on) {
      toast.error('Which day did it go?');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_ASSET_DISPOSAL_URL}/store/${leaving.id}`, {
        disposed_on: leaving.disposed_on,
        proceeds: leaving.proceeds === '' ? 0 : leaving.proceeds,
        till_coa4_id: leaving.till_coa4_id || null,
        status: leaving.status,
        note: leaving.note || null,
      });

      // Held longer than a toast usually is: it says whether the sale made a
      // gain or a loss, which is the thing somebody wants to write down.
      toast.success(res?.data?.message || 'Done', { autoClose: 8000 });
      setLeaving(null);
      setPlan(null);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not dispose of it');
    } finally {
      setSaving(false);
    }
  };

  /** Every year charged against one asset, as it was charged. */
  const openHistory = async (row: any) => {
    try {
      const res = await httpService.get(`${API_ASSET_REGISTER_URL}/edit/${row.id}`);
      const data = res?.data?.data?.data ?? res?.data?.data ?? {};

      setHistory({ asset: row, rows: data.depreciations ?? [], wdv: data.written_down_value });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read its depreciation');
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
              // ⚠️ The years are one click away rather than a screen away: the
              // question "why is it worth that" is asked of this cell, so the
              // answer opens from it.
              <button
                type="button"
                onClick={() => openHistory(row)}
                className="text-xs text-gray-500 underline dark:text-gray-400"
                title="Every year charged against this asset, as it was charged"
              >
                {brought ? `${money(brought)} brought forward` : ''}
                {brought && here ? ' · ' : ''}
                {here ? `${money(here)} over ${row.years_charged} year(s)` : ''}
              </button>
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
      headerClass: 'w-32 text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-2">
          <ActionButtons
            row={row}
            showEdit
            handleEdit={(one: any) => openForm(one.id)}
          />

          {/* ⚠️ Only while it is still in use. An asset that has already
              gone cannot go twice, and the row says which it is. */}
          {row.status === 'in_use' ? (
            <button
              type="button"
              onClick={() => askDisposal(row)}
              aria-label="Sell or write off"
              title="Sell it, or write it off"
              className="btn btn-sm btn-outline flex h-5 w-5 cursor-pointer items-center justify-center"
            >
              <FiLogOut className="text-lg text-amber-600" />
            </button>
          ) : null}

          {/* Who has it, whether it was there, what it has cost to keep.
              Shown for a disposed asset too: the questions asked after
              something has gone are exactly the ones this answers. */}
          <button
            type="button"
            onClick={() => setCaring(row)}
            aria-label="Custody, counts and upkeep"
            title="Who has it, whether it was there, what it has cost to keep"
            className="btn btn-sm btn-outline flex h-5 w-5 cursor-pointer items-center justify-center"
          >
            <FiClipboard className="text-lg text-primary dark:text-secondary" />
          </button>

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

  /*
   * THE FORM PAGE. One thing on it, and a way back.
   *
   * ⚠️ An id that answers to nothing reaches here as a mislaid link — an
   * asset somebody has since removed, or a number typed by hand. It is said
   * plainly rather than opening a blank form, which would look like a new
   * asset and save as one.
   */
  if (asked) {
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-black dark:text-white">
            {asked === 'new' ? 'New asset' : `Editing ${form?.name || 'an asset'}`}
          </h3>
          <ButtonLoading
            onClick={closeForm}
            label="Back to the list"
            icon={<FiArrowLeft size={16} />}
          />
        </div>

        {form ? (
          <AssetRegisterForm
            form={form}
            onChange={setForm}
            onSave={save}
            saving={saving}
            categoryOptions={categoryOptions}
          />
        ) : (
          <p className="rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
            That asset could not be found — it may have been removed. Go back and pick one.
          </p>
        )}
      </div>
    );
  }

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
          onClick={() => openForm()}
          label="Add an asset"
          icon={<FiPlus size={16} />}
        />

        {/* Stickers for the rows listed above -- filter first, then print. */}
        {rows.length ? (
          <ButtonLoading
            onClick={printLabels}
            label="Print labels"
            icon={<FiPrinter size={16} />}
          />
        ) : null}
      </div>

      {/* ⚠️ SHOWN LEG BY LEG BEFORE IT IS DONE. Selling an asset writes off a
          cost that has stood in the balance sheet for years, charges the
          depreciation owed up to the day it went, and puts whatever is left
          through the profit and loss. None of that is something to discover
          afterwards. */}
      {leaving ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-sm font-medium text-black dark:text-white">
              {leaving.status === 'written_off' ? 'Write off' : 'Sell'} — {leaving.name}{' '}
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                {leaving.code}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLeaving(null);
                setPlan(null);
              }}
              className="text-xs text-gray-500 underline dark:text-gray-400"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <DropdownCommon
              id="disposal_status"
              name="status"
              label="What happened"
              data={[
                { id: 'disposed', name: 'Sold' },
                { id: 'written_off', name: 'Written off / scrapped' },
              ]}
              value={leaving.status}
              onChange={(e: any) => askDisposal(leaving, { ...leaving, status: e.target.value })}
            />

            <div>
              <InputDatePicker
                id="disposal_on"
                name="disposed_on"
                label="On"
                selectedDate={asDate(leaving.disposed_on)}
                setSelectedDate={(date: Date | null) =>
                  askDisposal(leaving, { ...leaving, disposed_on: asText(date) })
                }
                setCurrentDate={() => undefined}
                className="w-full"
              />
              <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
                Depreciation is charged to this day.
              </p>
            </div>

            <InputElement
              id="disposal_proceeds"
              name="proceeds"
              label="Money received"
              type="number"
              min={0}
              value={String(leaving.proceeds ?? '')}
              onChange={(e: any) => setLeaving({ ...leaving, proceeds: e.target.value })}
              onBlur={() => askDisposal(leaving, leaving)}
              disabled={leaving.status === 'written_off'}
              description={
                leaving.status === 'written_off'
                  ? 'A write-off fetches nothing.'
                  : 'Leave empty if nothing was received.'
              }
            />

            <DropdownCommon
              id="disposal_till"
              name="till_coa4_id"
              label="Into which account"
              data={[
                { id: '', name: 'Not chosen' },
                ...(plan?.tills ?? []).map((one: any) => ({
                  id: one.id,
                  name: `${one.name} (${one.group_name})`,
                })),
              ]}
              value={leaving.till_coa4_id ?? ''}
              onChange={(e: any) =>
                askDisposal(leaving, { ...leaving, till_coa4_id: e.target.value })
              }
              description="Where the money went."
            />
          </div>

          <div className="mt-2">
            <InputElement
              id="disposal_note"
              name="note"
              label="Note"
              placeholder="Sold to Karim Traders, receipt 4471"
              value={leaving.note ?? ''}
              onChange={(e: any) => setLeaving({ ...leaving, note: e.target.value })}
            />
          </div>

          {plan ? (
            <div className="mt-3 rounded border border-stroke p-3 text-sm dark:border-strokedark">
              <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  Cost <strong className="text-black dark:text-white">{money(plan.cost)}</strong>
                </span>
                <span>
                  Depreciation so far{' '}
                  <strong className="text-black dark:text-white">{money(plan.accumulated)}</strong>
                </span>
                {Number(plan.catch_up?.amount) ? (
                  <span className="text-primary dark:text-secondary">
                    plus {plan.catch_up.days} day(s) to the day it went{' '}
                    <strong>{money(plan.catch_up.amount)}</strong>
                  </span>
                ) : null}
                <span>
                  Worth on the day{' '}
                  <strong className="text-black dark:text-white">
                    {money(plan.written_down_value)}
                  </strong>
                </span>
              </div>

              {/* The entry itself. Somebody signing this off reads legs, not a
                  summary — so the legs are what is shown. */}
              {(plan.legs ?? []).map((leg: any, index: number) => (
                <div
                  key={`${leg.coa4_id}-${index}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 text-xs last:border-0 dark:border-strokedark"
                >
                  <span className="text-gray-600 dark:text-gray-300">
                    {leg.head ?? leg.coa4_id}{' '}
                    <span className="text-gray-400">{leg.note ? `· ${leg.note}` : ''}</span>
                  </span>
                  <span className="font-medium text-black dark:text-white">
                    {Number(leg.debit) ? `Dr ${money(leg.debit)}` : `Cr ${money(leg.credit)}`}
                  </span>
                </div>
              ))}

              <div className="mt-2 text-sm font-semibold">
                {Number(plan.gain) ? (
                  <span className="text-success dark:text-emerald-400">
                    Gain {money(plan.gain)}
                  </span>
                ) : Number(plan.loss) ? (
                  <span className="text-danger dark:text-red-400">Loss {money(plan.loss)}</span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">No gain or loss</span>
                )}
              </div>

              {plan.ready_to_dispose === false ? (
                <p className="mt-2 rounded border border-amber-400 bg-amber-50 p-2 text-xs leading-snug text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
                  This category has no gain-or-loss head yet, so the entry cannot be written.
                  Choose it on the Categories tab.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3">
            <ButtonLoading
              onClick={dispose}
              buttonLoading={saving}
              icon={<FiLogOut className="h-5 w-5" />}
              label={leaving.status === 'written_off' ? 'Write it off' : 'Sell it'}
              variant="primary"
              disabled={plan?.ready_to_dispose === false}
            />
          </div>
        </div>
      ) : null}

      {/* Every year charged against one asset, as it was charged — opened from
          the "worth now" cell, which is where the question is asked. */}
      {history ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-sm font-medium text-black dark:text-white">
              {history.asset.name} — every year charged
            </div>
            <button
              type="button"
              onClick={() => setHistory(null)}
              className="text-xs text-gray-500 underline dark:text-gray-400"
            >
              Close
            </button>
          </div>

          {Number(history.asset.opening_accum_dep) ? (
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 text-xs dark:border-strokedark">
              <span className="text-gray-600 dark:text-gray-300">
                Brought forward from the old books
              </span>
              <span className="text-black dark:text-white">
                {money(history.asset.opening_accum_dep)}
              </span>
            </div>
          ) : null}

          {history.rows.length ? (
            history.rows.map((one: any) => (
              <div
                key={one.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 text-xs last:border-0 dark:border-strokedark"
              >
                <span className="text-gray-600 dark:text-gray-300">
                  {onTheDay(String(one.year_ending).slice(0, 10))} · {Number(one.rate)}% ·{' '}
                  {one.days} day(s) · on {money(one.opening_wdv)}
                </span>
                <span className="text-black dark:text-white">{money(one.amount)}</span>
              </div>
            ))
          ) : (
            <p className="py-1 text-xs text-gray-500 dark:text-gray-400">
              Nothing charged by this system yet.
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm font-semibold">
            <span className="text-black dark:text-white">Worth now</span>
            <span className="text-black dark:text-white">{money(history.wdv)}</span>
          </div>
        </div>
      ) : null}

      {caring ? <AssetCarePanel asset={caring} onClose={() => setCaring(null)} /> : null}

      <Table
        columns={columns}
        data={rows}
        noDataMessage="Nothing in the register yet. Add a category first, then the assets that belong to it."
      />

      <AssetLabelsPrint ref={labelsRef} rows={rows} />

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
