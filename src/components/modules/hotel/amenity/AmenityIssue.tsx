import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCcw, FiX } from 'react-icons/fi';
import dayjs from 'dayjs';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import Pagination from '../../../utils/utils-functions/Pagination';
import ActionButtons from '../../../utils/fields/ActionButton';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import InputDatePicker from '../../../utils/fields/DatePicker';
import SearchInput from '../../../utils/fields/SearchInput';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

import httpService from '../../../services/httpService';
import { API_HOTEL_ITEM_STOCK_URL } from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';

/**
 * The hotel's store of expense items -- what went out, and what is left.
 *
 *   Entries        issues (to a building, perhaps an event), openings, counts
 *   Stock Balance  opening, bought, adjusted, issued, closing -- per item, with
 *                  each item's own ledger a click away
 *
 * ⚠️ THE ITEMS ARE ASSETS → ITEMS OF KIND EXPENSE (meat, soap, shampoo), bought
 * on the Accounts Transaction screen. They were charged to their expense head
 * the day they were bought; everything here is QUANTITY, and the value column is
 * information -- closing quantity at the average price paid -- never a Balance
 * Sheet figure.
 *
 * ⚠️ THE OLD AMENITY ISSUES (material issues of shop products) ARE NOT LISTED.
 * They stay where they were, as history, on the Material Issue screens.
 */

const KIND_LABEL: Record<string, string> = {
  issue: 'Issue',
  opening: 'Opening',
  adjust: 'Count adjustment',
};

const KIND_CLASS: Record<string, string> = {
  issue: 'bg-sky-100 text-sky-900 dark:bg-sky-500/25 dark:text-sky-50',
  opening: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-50',
  adjust: 'bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-50',
};

const asDate = (value: string) => (value ? dayjs(value).toDate() : null);
const asText = (date: Date | null) => (date ? dayjs(date).format('YYYY-MM-DD') : '');
const qty = (value: any) => Number(Number(value ?? 0).toFixed(3));
const showDate = (value: any) => (value ? dayjs(value).format('DD/MM/YYYY') : '');

const AmenityIssue = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'entries' | 'balance'>('entries');

  return (
    <div>
      <HelmetTitle title="Amenity Issue & Stock" />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 border-b border-stroke dark:border-strokedark">
          {(['entries', 'balance'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium ${
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white'
              }`}
            >
              {key === 'entries' ? 'Entries' : 'Stock Balance'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <ButtonLoading
            onClick={() => navigate(`${routes.hotel_amenity_issue_new}?kind=issue`)}
            label="Issue"
            variant="primary"
            icon={<FiPlus size={16} />}
          />
          <ButtonLoading
            onClick={() => navigate(`${routes.hotel_amenity_issue_new}?kind=opening`)}
            label="Opening"
            icon={<FiPlus size={16} />}
          />
          <ButtonLoading
            onClick={() => navigate(`${routes.hotel_amenity_issue_new}?kind=adjust`)}
            label="Count Adjustment"
            icon={<FiPlus size={16} />}
          />
        </div>
      </div>

      {tab === 'entries' ? <Entries /> : <StockBalance />}
    </div>
  );
};

/* ------------------------------------------------------------------ */

const Entries = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [kind, setKind] = useState('');
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [open, setOpen] = useState<Record<number, any[]>>({});

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(`${API_HOTEL_ITEM_STOCK_URL}/moves`, {
        params: { page, per_page: 10, kind: kind || undefined, from, to, search: search.trim() || undefined },
      });
      const paginator = res?.data?.data?.data ?? {};

      setRows(Array.isArray(paginator.data) ? paginator.data : []);
      setTotalPages(Number(paginator.last_page) || 1);
    } catch (error: any) {
      setRows([]);
      toast.error(error?.response?.data?.message || 'Could not read the entries');
    } finally {
      setLoading(false);
    }
  }, [page, kind, from, to, search]);

  useEffect(() => {
    load();
  }, [load]);

  // A filter change starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [kind, from, to, search]);

  const toggle = async (id: number) => {
    if (open[id]) {
      setOpen(({ [id]: _, ...rest }) => rest);
      return;
    }

    try {
      const res = await httpService.get(`${API_HOTEL_ITEM_STOCK_URL}/moves/${id}`);
      const move = res?.data?.data?.data ?? {};
      setOpen((prev) => ({ ...prev, [id]: move.lines ?? [] }));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the entry');
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await httpService.post(`${API_HOTEL_ITEM_STOCK_URL}/delete/${id}`, {});

      if (!res?.data?.success) {
        toast.error(res?.data?.message || 'Could not delete it');
        return;
      }

      toast.success(res.data.message || 'Deleted');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not delete it');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'move_no',
        header: 'No',
        render: (row: any) => (
          <button
            type="button"
            className="text-left text-primary hover:underline"
            title="Show the items"
            onClick={() => toggle(row.id)}
          >
            {row.move_no}
          </button>
        ),
      },
      { key: 'move_date', header: 'Date', render: (row: any) => showDate(row.move_date) },
      {
        key: 'kind',
        header: 'Type',
        render: (row: any) => (
          <span className={`rounded px-1.5 py-0.5 text-xs ${KIND_CLASS[row.kind] ?? ''}`}>
            {KIND_LABEL[row.kind] ?? row.kind}
          </span>
        ),
      },
      {
        key: 'building_name',
        header: 'Building',
        render: (row: any) => row.building_name || <span className="text-gray-400">—</span>,
      },
      {
        key: 'booking_no',
        header: 'Event',
        render: (row: any) => row.booking_no || <span className="text-gray-400">—</span>,
      },
      {
        key: 'received_by',
        header: 'Received by',
        render: (row: any) => row.received_by || <span className="text-gray-400">—</span>,
      },
      { key: 'item_count', header: 'Items', headerClass: 'text-center', cellClass: 'text-center' },
      {
        key: 'total_qty',
        header: 'Total qty',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
        render: (row: any) => qty(row.total_qty),
      },
      {
        key: 'action',
        header: 'Action',
        headerClass: 'w-20 text-center',
        cellClass: 'text-center',
        render: (row: any) => (
          <ActionButtons
            row={row}
            showDelete
            handleDelete={remove}
            showConfirmId={confirmId}
            setShowConfirmId={setConfirmId}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [confirmId, open, load],
  );

  return (
    <div>
      <div className="mb-2 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <SearchInput
            id="moveSearch"
            label="Search"
            placeholder="No, receiver or event"
            search={search}
            setSearchValue={setSearch}
            className="w-full"
          />
        </div>
        <div className="lg:col-span-3">
          <DropdownCommon
            id="moveKind"
            name="moveKind"
            label="Type"
            data={[
              { id: '', name: 'All types' },
              { id: 'issue', name: 'Issue' },
              { id: 'opening', name: 'Opening' },
              { id: 'adjust', name: 'Count adjustment' },
            ]}
            value={kind}
            onChange={(e: any) => setKind(e.target.value)}
            description=""
          />
        </div>
        <div className="lg:col-span-2">
          <InputDatePicker
            id="moveFrom"
            name="moveFrom"
            label="From"
            selectedDate={asDate(from)}
            setSelectedDate={(date: Date | null) => setFrom(asText(date))}
            setCurrentDate={(date: Date | null) => setFrom(asText(date))}
            className="w-full"
          />
        </div>
        <div className="lg:col-span-2">
          <InputDatePicker
            id="moveTo"
            name="moveTo"
            label="To"
            selectedDate={asDate(to)}
            setSelectedDate={(date: Date | null) => setTo(asText(date))}
            setCurrentDate={(date: Date | null) => setTo(asText(date))}
            className="w-full"
          />
        </div>
        <div className="lg:col-span-2">
          <ButtonLoading onClick={load} label="Refresh" icon={<FiRefreshCcw size={16} />} />
        </div>
      </div>

      <div className="relative">
        {loading ? <Loader /> : null}
        <Table
          columns={columns}
          data={rows}
          getRowKey={(row: any) => row.id}
          renderRowExpansion={(row: any) =>
            open[row.id] ? (
              <div className="bg-gray-50 px-6 py-2 text-sm dark:bg-meta-4/40">
                {open[row.id].map((line: any) => (
                  <div key={line.id} className="flex justify-between gap-4 py-0.5">
                    <span>
                      {line.item_name ?? `#${line.item_id}`}
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{line.head_name}</span>
                    </span>
                    <span className="tabular-nums">
                      {row.kind === 'adjust' ? `counted ${qty(line.counted)}, ` : ''}
                      {row.kind === 'issue' ? qty(-line.quantity) : `${line.quantity > 0 ? '+' : ''}${qty(line.quantity)}`}{' '}
                      {line.unit_name ?? ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : null
          }
          noDataMessage="Nothing in this range. Press Issue, Opening or Count Adjustment to make one."
        />
      </div>

      {totalPages > 1 ? (
        <div className="mt-2">
          <Pagination currentPage={page} totalPages={totalPages} handlePageChange={setPage} />
        </div>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ */

const StockBalance = () => {
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [headId, setHeadId] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(`${API_HOTEL_ITEM_STOCK_URL}/balance`, {
        params: { from, to, head_id: headId || undefined },
      });

      if (res?.data?.success === false) {
        toast.error(res.data.message || 'Could not read the stock');
        return;
      }

      setData(res?.data?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the stock');
    } finally {
      setLoading(false);
    }
  }, [from, to, headId]);

  useEffect(() => {
    load();
  }, [load]);

  const openLedger = async (row: any) => {
    try {
      const res = await httpService.get(`${API_HOTEL_ITEM_STOCK_URL}/ledger/${row.item_id}`, {
        params: { from, to },
      });
      setLedger(res?.data?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the ledger');
    }
  };

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = Array.isArray(data?.rows) ? data.rows : [];
    return term ? all.filter((row: any) => String(row.item_name).toLowerCase().includes(term)) : all;
  }, [data, search]);

  const number = (key: string, header: string, signed = false) => ({
    key,
    header,
    headerClass: 'text-right',
    cellClass: 'text-right tabular-nums',
    render: (row: any) => {
      const value = qty(row[key]);
      return value ? `${signed && value > 0 ? '+' : ''}${value}` : <span className="text-gray-400">0</span>;
    },
  });

  const columns = [
    {
      key: 'item_name',
      header: 'Item',
      render: (row: any) => (
        <button
          type="button"
          className="text-left text-primary hover:underline"
          title="Open this item's ledger"
          onClick={() => openLedger(row)}
        >
          {row.item_name}
          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">{row.unit_name}</span>
        </button>
      ),
    },
    { key: 'head_name', header: 'Head' },
    number('opening', 'Opening'),
    number('bought', 'Bought (+)'),
    number('adjusted', 'Opening / Count (±)', true),
    number('issued', 'Issued (−)'),
    {
      key: 'closing',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right tabular-nums font-semibold',
      render: (row: any) => (
        <span className={qty(row.closing) < 0 ? 'text-rose-600' : ''}>{qty(row.closing)}</span>
      ),
    },
    {
      key: 'value',
      header: 'Approx. value',
      headerClass: 'text-right',
      cellClass: 'text-right tabular-nums',
      render: (row: any) => (Number(row.value) ? thousandSeparator(Number(row.value)) : '—'),
    },
  ];

  return (
    <div>
      <div className="mb-2 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <SearchInput
            id="balanceSearch"
            label="Search"
            placeholder="Item name"
            search={search}
            setSearchValue={setSearch}
            className="w-full"
          />
        </div>
        <div className="lg:col-span-3">
          <DropdownCommon
            id="balanceHead"
            name="balanceHead"
            label="Head"
            data={[
              { id: '', name: 'All heads' },
              ...(Array.isArray(data?.heads) ? data.heads : []).map((h: any) => ({ id: String(h.id), name: h.name })),
            ]}
            value={headId}
            onChange={(e: any) => setHeadId(e.target.value)}
            description=""
          />
        </div>
        <div className="lg:col-span-2">
          <InputDatePicker
            id="balanceFrom"
            name="balanceFrom"
            label="From"
            selectedDate={asDate(from)}
            setSelectedDate={(date: Date | null) => setFrom(asText(date))}
            setCurrentDate={(date: Date | null) => setFrom(asText(date))}
            className="w-full"
          />
        </div>
        <div className="lg:col-span-2">
          <InputDatePicker
            id="balanceTo"
            name="balanceTo"
            label="To"
            selectedDate={asDate(to)}
            setSelectedDate={(date: Date | null) => setTo(asText(date))}
            setCurrentDate={(date: Date | null) => setTo(asText(date))}
            className="w-full"
          />
        </div>
        <div className="lg:col-span-2">
          <ButtonLoading onClick={load} buttonLoading={loading} label="Run" icon={<FiRefreshCcw size={16} />} />
        </div>
      </div>

      {data?.note ? (
        <p className="mb-2 text-xs leading-snug text-gray-500 dark:text-gray-400">{data.note}</p>
      ) : null}

      <div className="relative">
        {loading && !data ? <Loader /> : null}
        <Table
          columns={columns}
          data={rows}
          perPage={20}
          getRowKey={(row: any) => row.item_id}
          footerRows={
            rows.length
              ? [
                  [
                    { label: 'Total approximate value', colSpan: 7, className: 'text-right' },
                    { label: thousandSeparator(Number(data?.total_value ?? 0)), className: 'text-right' },
                  ],
                ]
              : undefined
          }
          noDataMessage="No expense items yet. They are set up under Fixed Assets → Items with Kind = Expense."
        />
      </div>

      {ledger ? (
        <div className="mt-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-black dark:text-white">
                {ledger.item?.name} — ledger
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {ledger.item?.head_name} · {showDate(ledger.from)} to {showDate(ledger.to)} · opening{' '}
                {qty(ledger.opening)} {ledger.item?.unit_name ?? ''}, closing {qty(ledger.closing)}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close the ledger"
              onClick={() => setLedger(null)}
              className="text-gray-500 hover:text-black dark:hover:text-white"
            >
              <FiX size={18} />
            </button>
          </div>

          <Table
            bordered
            columns={[
              { key: 'date', header: 'Date', render: (r: any) => showDate(r.date) },
              { key: 'ref', header: 'Reference' },
              {
                key: 'kind',
                header: 'Type',
                render: (r: any) => (r.kind === 'purchase' ? 'Purchase' : KIND_LABEL[r.kind] ?? r.kind),
              },
              { key: 'note', header: 'Note', render: (r: any) => r.note || '' },
              {
                key: 'in',
                header: 'In',
                headerClass: 'text-right',
                cellClass: 'text-right tabular-nums',
                render: (r: any) => (r.in ? qty(r.in) : ''),
              },
              {
                key: 'out',
                header: 'Out',
                headerClass: 'text-right',
                cellClass: 'text-right tabular-nums',
                render: (r: any) => (r.out ? qty(r.out) : ''),
              },
              {
                key: 'balance',
                header: 'Balance',
                headerClass: 'text-right',
                cellClass: 'text-right tabular-nums font-semibold',
                render: (r: any) => qty(r.balance),
              },
            ]}
            data={ledger.rows ?? []}
            noDataMessage="No movement of this item in the range."
          />
        </div>
      ) : null}
    </div>
  );
};

export default AmenityIssue;
