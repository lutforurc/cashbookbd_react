import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import { FiPrinter } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import InputDatePicker from '../../../utils/fields/DatePicker';
import SearchInput from '../../../utils/fields/SearchInput';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';

import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { userCurrentBranch } from '../../branch/branchSlice';
import { money, useDebounced } from '../setupHelpers';
// The string form. formatDate returns JSX, which is right inside markup but
// wrong anywhere a string is wanted -- and every use here is inside a cell that
// also holds other text.
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';
import { clearReports, collectionRead, performanceRead, registerRead } from './reportSlice';
import RegisterPrint from './RegisterPrint';

/**
 * Reading the property back -- who was here, and what came in.
 *
 * Two reports on one screen, because they are asked in the same breath at the
 * same moment of the morning and two screens would be two places to pick a
 * branch and a date.
 *
 * ⚠️ THE REGISTER SAYS WHO SLEPT HERE, NOT WHO BOOKED TO, and that is the whole
 * point of it. Check-out DELETES the nights a guest did not sleep, so a stay
 * booked to the 18th and left on the 16th holds no night on the 17th. The
 * server reads the nights; nothing on this screen re-derives it from the
 * booking's dates, and nothing should.
 *
 * It is also the paper a police officer may ask for, which is why it prints and
 * why the printed copy carries the NIDs.
 *
 * ⚠️ THE COLLECTION REPORT IS NETTED. A refund is stored positive -- the
 * direction lives in the purpose -- so the server signs every row once and
 * every total here reads that sign rather than the amount. A screen that added
 * the amounts up would tell somebody the drawer holds more than it does.
 *
 * ⚠️ PERFORMANCE IS NOT THE CALENDAR'S THREE FIGURES, and the difference is
 * stated on the tab rather than left to be discovered. The calendar answers the
 * DESK -- per bed, with holds counted as occupied, because a held bed cannot be
 * sold to anybody else tonight. This answers the OWNER -- per room, which is
 * what ADR means everywhere in the trade, and holds excluded, because a
 * telephone call that expires overnight is not a month's takings. Two screens
 * saying "Occupancy" and meaning different things is the one thing that would
 * make both useless, so both say which they are.
 *
 * ⚠️ AND THE TAB ONLY EXISTS ON A PROPERTY THAT LETS ROOMS. Occupancy of a
 * construction firm is not a small number, it is not a question -- and every
 * figure would read nought, which is indistinguishable from a bad month.
 */

const MODES = [
  { id: 'in_house', name: 'In the building' },
  { id: 'arrivals', name: 'Arriving' },
  { id: 'departures', name: 'Leaving' },
];

const METHODS = [
  { id: '', name: 'Every method' },
  { id: 'cash', name: 'Cash' },
  { id: 'bank', name: 'Bank' },
  { id: 'card', name: 'Card' },
  { id: 'mobile', name: 'Mobile' },
  { id: 'adjustment', name: 'Adjustment' },
];

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): a night is a calendar date at the desk,
  // and going through UTC moves it a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const today = () => asText(new Date());

/** The first of this month — where a performance question starts by default. */
const monthStart = () => {
  const now = new Date();
  return asText(new Date(now.getFullYear(), now.getMonth(), 1));
};

const TAB = 'rounded-t border-b-2 px-4 py-2 text-sm font-medium transition';

/** One figure with its name under it — the row of counts at the top. */
const Count = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
  <div className="rounded border border-stroke px-3 py-2 text-center dark:border-strokedark">
    <div className={`text-lg font-semibold ${tone ?? 'text-black dark:text-white'}`}>{value}</div>
    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
  </div>
);

/**
 * A headline figure, with the division that produced it written underneath.
 *
 * ⚠️ The sum is on the tile deliberately. These three are quoted at meetings by
 * people who did not run the report, and "62.5% — 30 of 48 room-nights" can be
 * argued with, where a bare 62.5% can only be believed or disbelieved.
 */
const Figure = ({
  label,
  value,
  working,
  lead,
}: {
  label: string;
  value: string;
  working?: string;
  lead?: boolean;
}) => (
  <div
    className={`rounded border px-3 py-2 ${
      lead
        ? 'border-primary bg-primary/5 dark:border-secondary dark:bg-secondary/10'
        : 'border-stroke dark:border-strokedark'
    }`}
  >
    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
    <div
      className={`text-xl font-semibold ${
        lead ? 'text-primary dark:text-secondary' : 'text-black dark:text-white'
      }`}
    >
      {value}
    </div>
    {working ? (
      <div className="mt-0.5 text-[0.7rem] leading-tight text-gray-500 dark:text-gray-400">
        {working}
      </div>
    ) : null}
  </div>
);

const HotelReports = () => {
  const dispatch = useDispatch<any>();

  const register = useSelector((state: any) => state.hotelReport.register);
  const collection = useSelector((state: any) => state.hotelReport.collection);
  const performance = useSelector((state: any) => state.hotelReport.performance);
  const reportError = useSelector((state: any) => state.hotelReport.error);
  const loading = useSelector((state: any) => state.hotelReport.loading);
  const branchDdl = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings?.data);
  const currentBranch = useSelector((state: any) => state.branchList?.currentBranch);

  /**
   * ⚠️ Read off `is_lodging`, which the server works out from the business
   * type's NAME — never off `business_type_id`. The ids are auto-increment and
   * seeded per install, so "Hotel / Motel" is 10 in one tenant's database and
   * could be 9 in another's; a number written here would hide the tab from a
   * hotel somewhere. This is the same reasoning that kept the sidebar's Hotel
   * menu off a business-type check in the first place.
   */
  const isLodging = currentBranch?.is_lodging === true;

  const [tab, setTab] = useState<'register' | 'collection' | 'performance'>('register');
  const [branchId, setBranchId] = useState<string>('');

  const [date, setDate] = useState(today());
  const [mode, setMode] = useState('in_house');
  const [search, setSearch] = useState('');

  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [method, setMethod] = useState('');

  // Its own pair of dates rather than the collection tab's. That one opens on
  // today, which is the right question for a drawer and a useless one for
  // occupancy: a single night's ADR is one booking's rate.
  const [runFrom, setRunFrom] = useState(monthStart());
  const [runTo, setRunTo] = useState(today());

  const term = useDebounced(search, 400);

  const printRef = useRef<HTMLDivElement>(null);
  const printRegister = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Guest Register ${date}`,
  });

  useEffect(() => {
    dispatch(getDdlProtectedBranch());

    // The business type, for the Performance tab. Asked for only when it is
    // not already in the store — every other screen that needs it does the
    // same, and a report should not be the reason a lookup is refetched.
    if (currentBranch?.is_lodging === undefined) dispatch(userCurrentBranch());

    return () => {
      dispatch(clearReports());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (!branchId && settings?.branch?.id) setBranchId(String(settings.branch.id));
  }, [settings?.branch?.id, branchId]);

  const loadRegister = useCallback(() => {
    if (!branchId) return;
    dispatch(registerRead({ date, mode, branch_id: branchId, q: term || undefined }));
  }, [dispatch, date, mode, branchId, term]);

  const loadCollection = useCallback(() => {
    if (!branchId) return;
    dispatch(collectionRead({ from, to, branch_id: branchId, method: method || undefined }));
  }, [dispatch, from, to, branchId, method]);

  // ⚠️ Read again on every change rather than filtered on screen. The server
  // works out who was in a bed on a given night from the nights table, and no
  // filter over yesterday's answer can produce today's.
  useEffect(() => {
    if (tab === 'register') loadRegister();
  }, [tab, loadRegister]);

  useEffect(() => {
    if (tab === 'collection') loadCollection();
  }, [tab, loadCollection]);

  const loadPerformance = useCallback(() => {
    if (!branchId) return;
    dispatch(performanceRead({ from: runFrom, to: runTo, branch_id: branchId }));
  }, [dispatch, runFrom, runTo, branchId]);

  useEffect(() => {
    if (tab === 'performance') loadPerformance();
  }, [tab, loadPerformance]);

  /**
   * A tab that stops being allowed cannot stay open.
   *
   * Switching to a property that does not let rooms leaves the reader looking
   * at the last hotel's occupancy under this branch's name — which is the one
   * mistake a figure people quote must not make.
   */
  useEffect(() => {
    if (tab === 'performance' && currentBranch?.is_lodging === false) setTab('register');
  }, [tab, currentBranch?.is_lodging]);

  const registerColumns = useMemo(
    () => [
      { key: 'serial_no', header: '#', headerClass: 'w-12 text-center', cellClass: 'text-center' },
      {
        key: 'name',
        header: 'Guest',
        render: (row: any) => (
          <div>
            <div className="text-black dark:text-white">
              {row.name}
              {row.is_primary ? (
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(main)</span>
              ) : null}
            </div>
            {/* ⚠️ Said on the row, not left to be assumed. A register that
                printed the person who telephoned as the person who slept there
                would be wrong about the one fact it exists to record. */}
            {!row.named ? (
              <div className="text-xs text-amber-700 dark:text-amber-300">
                nobody named yet — this is the booker
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'room',
        header: 'Room',
        render: (row: any) => row.room || <span className="text-gray-400">—</span>,
      },
      {
        key: 'mobile',
        header: 'Mobile',
        render: (row: any) => row.mobile || <span className="text-gray-400">—</span>,
      },
      {
        key: 'national_id',
        header: 'NID',
        render: (row: any) => row.national_id || <span className="text-gray-400">—</span>,
      },
      {
        key: 'check_in_date',
        header: 'Stay',
        render: (row: any) => (
          <span className="whitespace-nowrap text-xs">
            {formatDayMonthYear(row.check_in_date)} → {formatDayMonthYear(row.check_out_date)}
          </span>
        ),
      },
      { key: 'booking_no', header: 'Booking' },
    ],
    [],
  );

  const collectionColumns = useMemo(
    () => [
      { key: 'serial_no', header: '#', headerClass: 'w-12 text-center', cellClass: 'text-center' },
      { key: 'payment_no', header: 'Receipt' },
      {
        key: 'payment_date',
        header: 'Date',
        render: (row: any) => formatDayMonthYear(row.payment_date),
      },
      {
        key: 'booking_no',
        header: 'Booking',
        render: (row: any) => (
          <div>
            <div className="text-black dark:text-white">{row.booking_no}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{row.booker_name}</div>
          </div>
        ),
      },
      { key: 'purpose', header: 'For' },
      { key: 'method', header: 'How' },
      {
        key: 'account',
        header: 'Account',
        render: (row: any) =>
          row.account || <span className="text-amber-700 dark:text-amber-300">not recorded</span>,
      },
      {
        key: 'signed',
        header: 'Amount',
        headerClass: 'text-right',
        cellClass: 'text-right font-medium',
        // The sign comes from the server, worked out once, so this screen and
        // the ledger cannot disagree about which way a refund went.
        render: (row: any) => (
          <span className={row.signed < 0 ? 'text-danger dark:text-red-400' : ''}>
            {row.signed < 0 ? '− ' : ''}
            {money(Math.abs(row.signed))}
          </span>
        ),
      },
      {
        key: 'vr_no',
        header: 'Voucher',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) =>
          row.vr_no ? (
            <span className="whitespace-nowrap font-mono text-xs">{row.vr_no}</span>
          ) : (
            <span className="whitespace-nowrap rounded border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/20 dark:text-amber-50">
              not posted
            </span>
          ),
      },
    ],
    [],
  );

  /**
   * Occupancy as a bar as well as a number.
   *
   * A column of percentages down a month is thirty numbers nobody compares.
   * The same column with a bar behind it is a shape, and the shape is the
   * question — which nights were empty.
   */
  const OccupancyCell = ({ value }: { value: number }) => (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded bg-primary dark:bg-secondary"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="w-14 text-right tabular-nums">{value.toFixed(2)}%</span>
    </div>
  );

  const dailyColumns = useMemo(
    () => [
      {
        key: 'date',
        header: 'Night',
        render: (row: any) => (
          <span className="whitespace-nowrap">{formatDayMonthYear(row.date)}</span>
        ),
      },
      {
        key: 'sold',
        header: 'Rooms sold',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
        render: (row: any) => `${row.sold} / ${row.room_nights_available}`,
      },
      {
        key: 'occupancy',
        header: 'Occupancy',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => <OccupancyCell value={Number(row.occupancy)} />,
      },
      {
        key: 'revenue',
        header: 'Room revenue',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
        render: (row: any) => money(row.revenue),
      },
      {
        key: 'adr',
        header: 'ADR',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
        // Nought rooms sold has no average rate, and printing 0.00 would put a
        // night with no guests in the same column as a night given away free.
        render: (row: any) =>
          row.sold ? money(row.adr) : <span className="text-gray-400">—</span>,
      },
      {
        key: 'revpar',
        header: 'RevPAR',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
        render: (row: any) => money(row.revpar),
      },
    ],
    [],
  );

  const roomTypeColumns = useMemo(
    () => [
      { key: 'name', header: 'Room type' },
      {
        key: 'rooms',
        header: 'Rooms',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
      },
      {
        key: 'sold',
        header: 'Room-nights sold',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
        render: (row: any) => `${row.sold} / ${row.room_nights_available}`,
      },
      {
        key: 'occupancy',
        header: 'Occupancy',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => <OccupancyCell value={Number(row.occupancy)} />,
      },
      {
        key: 'revenue',
        header: 'Room revenue',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
        render: (row: any) => money(row.revenue),
      },
      {
        key: 'adr',
        header: 'ADR',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
        render: (row: any) =>
          row.sold ? money(row.adr) : <span className="text-gray-400">—</span>,
      },
      {
        key: 'revpar',
        header: 'RevPAR',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
        render: (row: any) => money(row.revpar),
      },
    ],
    [],
  );

  const counts = register?.counts;
  const totals = collection?.totals;
  const run = performance?.totals;

  return (
    <div>
      <HelmetTitle title="Hotel Reports" />

      <div className="mb-3 flex flex-wrap gap-1 border-b border-stroke dark:border-strokedark">
        <button
          type="button"
          onClick={() => setTab('register')}
          className={`${TAB} ${
            tab === 'register'
              ? 'border-primary text-primary dark:border-secondary dark:text-secondary'
              : 'border-transparent text-gray-500 dark:text-gray-400'
          }`}
        >
          Guest register
        </button>
        <button
          type="button"
          onClick={() => setTab('collection')}
          className={`${TAB} ${
            tab === 'collection'
              ? 'border-primary text-primary dark:border-secondary dark:text-secondary'
              : 'border-transparent text-gray-500 dark:text-gray-400'
          }`}
        >
          Collection
        </button>

        {/* Only on a property that lets rooms. The server refuses the figures
            for anything else anyway — this is so nobody is invited to ask. */}
        {isLodging ? (
          <button
            type="button"
            onClick={() => setTab('performance')}
            className={`${TAB} ${
              tab === 'performance'
                ? 'border-primary text-primary dark:border-secondary dark:text-secondary'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`}
          >
            Performance
          </button>
        ) : null}
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="mt-1 mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Property
          </span>
          <BranchDropdown
            id="hotel_report_branch"
            name="branch_id"
            branchDdl={branchDdl?.protectedData?.data ?? []}
            value={branchId}
            onChange={(event: any) => setBranchId(event.target.value)}
          />
        </div>

        {tab === 'performance' ? (
          <>
            <InputDatePicker
              id="performance_from"
              name="run_from"
              label="From"
              selectedDate={runFrom ? new Date(runFrom) : null}
              setSelectedDate={(d: Date | null) => setRunFrom(asText(d))}
              setCurrentDate={(d: Date | null) => setRunFrom(asText(d))}
              className="w-full"
            />
            <InputDatePicker
              id="performance_to"
              name="run_to"
              label="To"
              selectedDate={runTo ? new Date(runTo) : null}
              setSelectedDate={(d: Date | null) => setRunTo(asText(d))}
              setCurrentDate={(d: Date | null) => setRunTo(asText(d))}
              className="w-full"
            />
          </>
        ) : tab === 'register' ? (
          <>
            <InputDatePicker
              id="register_date"
              name="date"
              label="Night of"
              selectedDate={date ? new Date(date) : null}
              setSelectedDate={(d: Date | null) => setDate(asText(d))}
              setCurrentDate={(d: Date | null) => setDate(asText(d))}
              className="w-full"
            />
            <DropdownCommon
              id="register_mode"
              name="mode"
              label="Showing"
              data={MODES}
              value={mode}
              onChange={(event: any) => setMode(event.target.value)}
            />
            <div>
              <span className="mt-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Find
              </span>
              {/* Name, mobile, NID or room — the four things somebody standing
                  at the counter is holding when they ask. */}
              <SearchInput search={search} setSearchValue={setSearch} className="w-full" />
            </div>
          </>
        ) : (
          <>
            <InputDatePicker
              id="collection_from"
              name="from"
              label="From"
              selectedDate={from ? new Date(from) : null}
              setSelectedDate={(d: Date | null) => setFrom(asText(d))}
              setCurrentDate={(d: Date | null) => setFrom(asText(d))}
              className="w-full"
            />
            <InputDatePicker
              id="collection_to"
              name="to"
              label="To"
              selectedDate={to ? new Date(to) : null}
              setSelectedDate={(d: Date | null) => setTo(asText(d))}
              setCurrentDate={(d: Date | null) => setTo(asText(d))}
              className="w-full"
            />
            <DropdownCommon
              id="collection_method"
              name="method"
              label="Method"
              data={METHODS}
              value={method}
              onChange={(event: any) => setMethod(event.target.value)}
            />
          </>
        )}
      </div>

      {loading && !register && !collection && !performance ? <Loader /> : null}

      {tab === 'performance' ? (
        <>
          {/* The server's refusal, shown rather than swallowed. It says WHY —
              usually that this property does not let rooms by the night. */}
          {!performance && reportError ? (
            <p className="rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
              {reportError}
            </p>
          ) : null}

          {run ? (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <Figure
                  label="Occupancy"
                  value={`${run.occupancy}%`}
                  working={`${run.room_nights_sold} of ${run.room_nights_available} room-nights`}
                />
                <Figure
                  label="ADR"
                  value={money(run.adr)}
                  working="per room-night SOLD"
                />
                {/* ⚠️ The lead figure, and deliberately so. Occupancy can be
                    bought with discounts and ADR can be had by selling three
                    rooms at a high rate. RevPAR is the only one of the three
                    that both of those show up in. */}
                <Figure
                  label="RevPAR"
                  value={money(run.revpar)}
                  working="per room the property HAS"
                  lead
                />
                <Figure
                  label="Room revenue"
                  value={money(run.revenue)}
                  working={`${performance.rooms} rooms over ${performance.days} nights`}
                />
              </div>

              <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-300">
                {/* The dormitory's own answer, kept small. On a property let by
                    the bed the room figure understates how full the building
                    was: one guest in a four-bed room is a full room and a
                    quarter of the beds, and both are true at once (§2.5). */}
                <span>
                  <strong className="text-black dark:text-white">Beds:</strong>{' '}
                  {run.bed_nights_sold} of {run.bed_nights_available} bed-nights ({run.bed_occupancy}
                  %)
                </span>

                {run.held_room_nights ? (
                  <span className="text-amber-700 dark:text-amber-300">
                    <strong>{run.held_room_nights} room-nights are on hold</strong> and are not in
                    any figure above — a hold is a telephone call that expires on its own.
                  </span>
                ) : null}
              </div>

              <p className="mb-4 rounded border border-stroke bg-gray-50 p-2.5 text-xs leading-snug text-gray-600 dark:border-strokedark dark:bg-meta-4/40 dark:text-gray-300">
                {/* ⚠️ Every one of these three sentences is a figure somebody
                    would otherwise argue about in a meeting, so they are said
                    on the report rather than left in the code. */}
                Rooms only — halls and community centres are let by the sitting, not the night, and
                counting them would push occupancy past 100%. Confirmed, checked-in and checked-out
                stays count; holds do not. Rent is the <strong>full tariff</strong>: a room let at
                6,000 with 600 off is a 6,000 room and a 600 discount, so a discount lowers the
                takings and never the ADR. Measured against the {performance.rooms} rooms this
                property has <strong>today</strong> — a floor opened last week makes last month read
                low.
              </p>

              <div className="mb-2 text-sm font-semibold text-black dark:text-white">
                By room type
              </div>
              <Table
                columns={roomTypeColumns}
                data={performance?.by_room_type ?? []}
                noDataMessage="No rooms set up for this property."
                className="mb-6"
              />

              <div className="mb-2 text-sm font-semibold text-black dark:text-white">
                Night by night
              </div>
              <Table
                columns={dailyColumns}
                data={performance?.daily ?? []}
                noDataMessage="No nights in that range."
              />
            </>
          ) : null}
        </>
      ) : tab === 'register' ? (
        <>
          {counts ? (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:max-w-md">
              <Count label="In the building" value={counts.in_house} />
              <Count label="Arriving" value={counts.arrivals} />
              <Count label="Leaving" value={counts.departures} />
            </div>
          ) : null}

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
     
            <ButtonLoading
              onClick={() => {
                if (!register?.rows?.length) {
                  toast.error('Nothing to print.');
                  return;
                }
                printRegister();
              }}
              label="Print"
              icon={<FiPrinter size={16} />}
              disabled={!register?.rows?.length}
            />
          </div>

          <Table
            columns={registerColumns}
            data={register?.rows ?? []}
            noDataMessage="Nobody on this list for that night."
          />

          <div className="hidden">
            <RegisterPrint
              ref={printRef}
              rows={register?.rows ?? []}
              date={register?.date ?? date}
              mode={register?.mode ?? mode}
              branch={register?.branch}
            />
          </div>
        </>
      ) : (
        <>
          {totals ? (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:max-w-2xl">
              <Count label="Receipts" value={totals.count} />
              <div className="rounded border border-stroke px-3 py-2 text-center dark:border-strokedark">
                <div className="text-lg font-semibold text-black dark:text-white">
                  {money(totals.received)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Taken</div>
              </div>
              <div className="rounded border border-stroke px-3 py-2 text-center dark:border-strokedark">
                <div className="text-lg font-semibold text-danger dark:text-red-400">
                  {money(totals.refunded)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Given back</div>
              </div>
              {/* ⚠️ The one figure that should match the drawer. */}
              <div className="rounded border border-primary px-3 py-2 text-center dark:border-secondary">
                <div className="text-lg font-semibold text-primary dark:text-secondary">
                  {money(totals.net)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">In hand</div>
              </div>
            </div>
          ) : null}

          {collection?.unposted ? (
            <p className="mb-3 rounded border border-amber-400 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
              <strong>
                {collection.unposted} {collection.unposted === 1 ? 'receipt is' : 'receipts are'} not
                in the ledger.
              </strong>{' '}
              Money written down before the vouchers were wired up keeps its blank. Everything taken
              since raises its voucher as it is saved, so this number should not grow.
            </p>
          ) : null}

          {totals?.by_method?.length ? (
            <div className="mb-3 flex flex-wrap gap-4 text-xs">
              <div>
                <div className="mb-1 font-semibold text-black dark:text-white">By method</div>
                {totals.by_method.map((item: any) => (
                  <div key={item.name} className="text-gray-600 dark:text-gray-300">
                    {item.name}: {money(item.amount)}
                  </div>
                ))}
              </div>
              <div>
                {/* For the person reconciling the cash book rather than the
                    person counting the drawer — different question, same rows. */}
                <div className="mb-1 font-semibold text-black dark:text-white">By account</div>
                {totals.by_account.map((item: any) => (
                  <div key={item.name} className="text-gray-600 dark:text-gray-300">
                    {item.name}: {money(item.amount)}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <Table
            columns={collectionColumns}
            data={collection?.rows ?? []}
            noDataMessage="No money taken in that range."
          />
        </>
      )}
    </div>
  );
};

export default HotelReports;
