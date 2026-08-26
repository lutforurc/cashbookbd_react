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
import { money, useDebounced } from '../setupHelpers';
// The string form. formatDate returns JSX, which is right inside markup but
// wrong anywhere a string is wanted -- and every use here is inside a cell that
// also holds other text.
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';
import { clearReports, collectionRead, registerRead } from './reportSlice';
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

const TAB = 'rounded-t border-b-2 px-4 py-2 text-sm font-medium transition';

/** One figure with its name under it — the row of counts at the top. */
const Count = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
  <div className="rounded border border-stroke px-3 py-2 text-center dark:border-strokedark">
    <div className={`text-lg font-semibold ${tone ?? 'text-black dark:text-white'}`}>{value}</div>
    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
  </div>
);

const HotelReports = () => {
  const dispatch = useDispatch<any>();

  const register = useSelector((state: any) => state.hotelReport.register);
  const collection = useSelector((state: any) => state.hotelReport.collection);
  const loading = useSelector((state: any) => state.hotelReport.loading);
  const branchDdl = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings?.data);

  const [tab, setTab] = useState<'register' | 'collection'>('register');
  const [branchId, setBranchId] = useState<string>('');

  const [date, setDate] = useState(today());
  const [mode, setMode] = useState('in_house');
  const [search, setSearch] = useState('');

  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [method, setMethod] = useState('');

  const term = useDebounced(search, 400);

  const printRef = useRef<HTMLDivElement>(null);
  const printRegister = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Guest Register ${date}`,
  });

  useEffect(() => {
    dispatch(getDdlProtectedBranch());

    return () => {
      dispatch(clearReports());
    };
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

  const counts = register?.counts;
  const totals = collection?.totals;

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
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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

        {tab === 'register' ? (
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
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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

      {loading && !register && !collection ? <Loader /> : null}

      {tab === 'register' ? (
        <>
          {counts ? (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:max-w-md">
              <Count label="In the building" value={counts.in_house} />
              <Count label="Arriving" value={counts.arrivals} />
              <Count label="Leaving" value={counts.departures} />
            </div>
          ) : null}

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">
              {/* ⚠️ The distinction the whole report turns on, said where
                  somebody reads the report rather than only in the code. */}
              Who actually <strong>slept here</strong> on this night — read from the nights the
              booking holds, so a guest who left early is not on the nights after they went.
            </p>

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
