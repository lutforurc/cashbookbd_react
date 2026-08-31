import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  FaBed,
  FaBroom,
  FaDoorOpen,
  FaRegCalendarAlt,
  FaRegClock,
  FaSignOutAlt,
  FaWallet,
} from 'react-icons/fa';

import HelmetTitle from '../../utils/others/HelmetTitle';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import httpService from '../../services/httpService';
import routes from '../../services/appRoutes';
import {
  API_HOTEL_COLLECTION_URL,
  API_HOTEL_HOUSEKEEPING_URL,
  API_HOTEL_PERFORMANCE_URL,
  API_HOTEL_REGISTER_URL,
} from '../../services/apiRoutes';
import { getDashboard } from './dashboardSlice';
import DashboardCustomizeButton, {
  DashboardWidget,
  useDashboardCustomization,
} from './dashboardCustomization';

/**
 * The dashboard a hotel opens the morning on.
 *
 * ⚠️ IT REPLACES THE SHOP'S, it does not decorate it. The generic dashboard
 * answers what sold, what was bought, how many new customers and what the stock
 * is short of — on a motel every one of those reads nought forever, and four
 * empty tiles at the top of the page teach a person that the page is not worth
 * looking at. What a property actually asks in the morning is: who is in the
 * building, who is arriving, what can I still sell tonight, which rooms are not
 * ready, and what has the month been worth.
 *
 * ⚠️ EVERY FIGURE IS THE REPORT'S OWN. Nothing here counts a night, sums a rent
 * or divides an average — it reads `reports/performance`, `reports/register`,
 * `reports/collection` and `housekeeping`, which are the same answers those
 * screens show. Two occupancy numbers in one product that disagree by a
 * rounding rule is the failure this module has guarded against everywhere else
 * (§31 vs §38), and a dashboard is precisely where somebody would notice.
 *
 * ⚠️ A BAND THAT CANNOT BE READ DISAPPEARS — it never shows an error. The three
 * hotel permissions are separate and are granted to nobody when they are
 * created, so a clerk with the desk's permission and not the owner's must see
 * the bands they are allowed and nothing where the others would be. A red box
 * on the front page for a permission nobody knew existed is worse than a
 * missing tile.
 *
 * ⚠️ TONIGHT IS THE CALENDAR DATE, never the branch's transaction date. The
 * books may be closed to July while a guest sleeps here in August, and the
 * guest is still in the building.
 */

const HOTEL_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'tonight', title: 'The Property Tonight' },
  { id: 'performance', title: 'Occupancy, ADR and RevPAR' },
  { id: 'nights', title: 'Night by Night' },
  { id: 'room-types', title: 'By Room Type' },
  { id: 'takings', title: 'Money Taken This Month' },
  { id: 'balance', title: 'Cash Book' },
];

const asText = (date: Date) => {
  // Local parts, never toISOString(): a night is a calendar date at the desk,
  // and going through UTC moves it a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const money = (value: number | null | undefined) =>
  Number(value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const dayLabel = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : String(parsed.getDate());
};

const CARD =
  'flex flex-col overflow-hidden bg-white text-[rgb(var(--c-text))] shadow-sm ring-1 ring-slate-200 transition hover:shadow-md dark:bg-gray-800 dark:text-[rgb(var(--c-text))] dark:ring-gray-700';

const CARD_HEAD =
  'flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3 text-sm font-bold tracking-wide text-slate-700 dark:text-slate-100';

/** One tile: the figure, and underneath it the sum that produced it. */
const Tile = ({
  label,
  value,
  working,
  icon,
  tone,
  lead,
}: {
  label: string;
  value: string;
  working?: string;
  icon?: JSX.Element;
  tone?: string;
  lead?: boolean;
}) => (
  <div
    className={`flex flex-col justify-between px-4 py-3 shadow-sm ring-1 transition hover:shadow-md ${
      lead
        ? 'bg-primary/5 ring-primary/40 dark:bg-secondary/10 dark:ring-secondary/40'
        : 'bg-white ring-slate-200 dark:bg-gray-800 dark:ring-gray-700'
    }`}
  >
    <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <div className={`mt-1 text-2xl font-bold ${tone ?? 'text-slate-700 dark:text-slate-100'}`}>
      {value}
    </div>
    {/* ⚠️ The working is on the tile deliberately. These figures are quoted at
        meetings by people who did not run the report, and "11% — 30 of 264
        room-nights" can be argued with where a bare 11% can only be believed. */}
    {working ? (
      <div className="mt-0.5 truncate text-[11px] text-slate-400" title={working}>
        {working}
      </div>
    ) : null}
  </div>
);

const HotelDashboard = () => {
  const dispatch = useDispatch<any>();

  const currentBranch = useSelector((state: any) => state.branchList?.currentBranch);
  const settings = useSelector((state: any) => state.settings);
  const dashboard = useSelector((state: any) => state.dashboard);
  const me = useSelector((state: any) => state.auth?.me);

  const branchId = currentBranch?.id;

  const [run, setRun] = useState<any>(null);
  const [counts, setCounts] = useState<any>(null);
  const [rooms, setRooms] = useState<any>(null);
  const [takings, setTakings] = useState<any>(null);

  const {
    density,
    orderedWidgets,
    isWidgetVisible,
    toggleWidget,
    moveWidget,
    setDensity,
    reset,
  } = useDashboardCustomization(
    `cashbook-hotel-dashboard:${me?.id || 'user'}:${branchId || 'branch'}`,
    HOTEL_DASHBOARD_WIDGETS,
    {
      dashboardKey: 'hotel',
      branchId,
      enabled: Boolean(me?.id && branchId),
    },
  );

  const isCompact = density === 'compact';
  const gap = isCompact ? 'gap-3' : 'gap-4';
  const rowClass = isCompact ? 'px-4 py-2' : 'px-4 py-2.5';

  useEffect(() => {
    dispatch(getDashboard());
  }, [dispatch]);

  useEffect(() => {
    if (!branchId) return;

    let alive = true;

    const now = new Date();
    const today = asText(now);
    const monthStart = asText(new Date(now.getFullYear(), now.getMonth(), 1));

    /*
     * Four reads, three permissions, and each lands on its own. Settled one at
     * a time rather than through Promise.all: a clerk who may see the register
     * and not the takings must get the register, and one rejection in an
     * all-or-nothing wait would have blanked the page for them.
     *
     * ⚠️ counts_only on the register. Its rows carry guests' names and NATIONAL
     * IDs — it is the paper a police officer asks for — and nothing here
     * displays one. Fetching the list to render "2 in the building" would put
     * it in the browser of everybody who opens a dashboard.
     */
    const settle = (promise: Promise<any>, apply: (payload: any) => void) =>
      promise
        .then((response) => {
          if (alive) apply(response?.data?.data?.data ?? null);
        })
        .catch(() => {
          // Silence is the behaviour, not a swallowed bug — see the header.
        });

    settle(
      httpService.get(API_HOTEL_PERFORMANCE_URL, {
        params: { from: monthStart, to: today, branch_id: branchId },
      }),
      setRun,
    );

    settle(
      httpService.get(API_HOTEL_REGISTER_URL, {
        params: { date: today, branch_id: branchId, counts_only: 1 },
      }),
      (payload) => setCounts(payload?.counts ?? null),
    );

    settle(
      httpService.get(API_HOTEL_HOUSEKEEPING_URL, { params: { branch_id: branchId } }),
      (payload) => setRooms(payload?.counts ?? null),
    );

    settle(
      httpService.get(API_HOTEL_COLLECTION_URL, {
        params: { from: monthStart, to: today, branch_id: branchId },
      }),
      (payload) => setTakings(payload?.totals ? { ...payload.totals, unposted: payload.unposted } : null),
    );

    return () => {
      alive = false;
    };
  }, [branchId]);

  const totals = run?.totals;

  // The last night of the range IS tonight, because the range ends today. One
  // read answers both questions rather than two that could drift apart.
  const tonight = useMemo(
    () => (Array.isArray(run?.daily) && run.daily.length ? run.daily[run.daily.length - 1] : null),
    [run],
  );

  // The strip only reads as a shape if every bar is measured against the same
  // ceiling, and that ceiling is the property — not the fullest night in it.
  const nights = useMemo(() => (Array.isArray(run?.daily) ? run.daily : []), [run]);

  const notReady = rooms ? Number(rooms.dirty ?? 0) + Number(rooms.cleaning ?? 0) : null;

  return (
    <div>
      <HelmetTitle title="Dashboard" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-700 dark:text-slate-100">
            {currentBranch?.name || 'The property'}
          </h1>
          <p className="text-xs text-slate-400">
            {run?.from && run?.to
              ? `This month so far · ${run.from} to ${run.to}`
              : 'Reading the property…'}
          </p>
        </div>
        <DashboardCustomizeButton
          density={density}
          widgets={orderedWidgets}
          isWidgetVisible={isWidgetVisible}
          onToggleWidget={toggleWidget}
          onMoveWidget={moveWidget}
          onDensityChange={setDensity}
          onReset={reset}
        />
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Tonight. The desk's band, and it comes first because at nine in
          the morning nobody is asking about the month. */}
      {isWidgetVisible('tonight') && (counts || tonight || rooms) ? (
        <div className={`mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 ${gap}`}>
          <Tile
            label="In the building"
            value={String(counts?.in_house ?? 0)}
            working="guests sleeping here tonight"
            icon={<FaBed className="text-[11px] text-indigo-500" />}
            tone="text-indigo-600 dark:text-indigo-300"
          />
          <Tile
            label="Arriving"
            value={String(counts?.arrivals ?? 0)}
            working="expected at the desk today"
            icon={<FaDoorOpen className="text-[11px] text-emerald-500" />}
            tone="text-emerald-600 dark:text-emerald-400"
          />
          <Tile
            label="Leaving"
            value={String(counts?.departures ?? 0)}
            working="rooms to turn round today"
            icon={<FaSignOutAlt className="text-[11px] text-rose-500" />}
            tone="text-rose-600 dark:text-rose-400"
          />
          {/* ⚠️ Free is rooms LESS sold LESS held. A room on hold is neither
              sold nor free, and offering it is how the desk promises a bed
              somebody is already waiting on. */}
          <Tile
            label="Free tonight"
            value={String(tonight?.free ?? 0)}
            working={
              tonight
                ? `${tonight.sold} let${tonight.held ? `, ${tonight.held} on hold` : ''} of ${
                    run?.rooms ?? 0
                  }`
                : undefined
            }
          />
          <Tile
            label="Not ready"
            value={notReady === null ? '—' : String(notReady)}
            working={
              rooms
                ? `${rooms.dirty ?? 0} dirty, ${rooms.cleaning ?? 0} being done${
                    rooms.out_of_order ? `, ${rooms.out_of_order} out of order` : ''
                  }`
                : 'housekeeping not visible to you'
            }
            icon={<FaBroom className="text-[11px] text-amber-500" />}
            tone={notReady ? 'text-amber-600 dark:text-amber-400' : undefined}
          />
        </div>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* The month. The owner's band. */}
      {isWidgetVisible('performance') && totals ? (
        <div className={`mb-4 grid grid-cols-2 lg:grid-cols-4 ${gap}`}>
          <Tile
            label="Occupancy"
            value={`${totals.occupancy}%`}
            working={`${totals.room_nights_sold} of ${totals.room_nights_available} room-nights`}
          />
          <Tile label="ADR" value={money(totals.adr)} working="per room-night SOLD" />
          {/* ⚠️ The lead figure. Occupancy can be bought with discounts and ADR
              can be had by selling three rooms at a high rate; RevPAR is the
              only one of the three that both of those show up in. */}
          <Tile
            label="RevPAR"
            value={money(totals.revpar)}
            working="per room the property HAS"
            lead
            tone="text-primary dark:text-secondary"
          />
          <Tile
            label="Room revenue"
            value={money(totals.revenue)}
            working={`${run?.rooms ?? 0} rooms over ${run?.days ?? 0} nights`}
          />
        </div>
      ) : null}

      <div className={`grid grid-cols-1 items-stretch ${gap} lg:grid-cols-2`}>
        {/* ---------------------------------------------------------- */}
        {isWidgetVisible('nights') && nights.length ? (
          <div className={CARD}>
            <div className={CARD_HEAD}>
              <span>Night by night</span>
              <Link
                to={routes.hotel_reports}
                className="text-xs font-normal text-primary hover:underline dark:text-secondary"
              >
                Full report →
              </Link>
            </div>

            <div className="flex-1 overflow-x-auto px-4 py-4">
              {/* ⚠️ Every night in the range, empty ones included. A strip drawn
                  only from the nights that sold something closes the gaps, and
                  the gaps are the entire question. */}
              <div className="flex h-32 items-end gap-1">
                {nights.map((night: any) => (
                  <div
                    key={night.date}
                    className="group flex min-w-[0.5rem] flex-1 flex-col items-center justify-end gap-1"
                    title={`${night.date} — ${night.sold} of ${run?.rooms ?? 0} rooms, ${
                      night.occupancy
                    }%`}
                  >
                    <div className="flex h-24 w-full items-end">
                      <div
                        className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary dark:bg-secondary/70 dark:group-hover:bg-secondary"
                        style={{ height: `${Math.max(2, Math.min(100, night.occupancy))}%` }}
                      />
                    </div>
                    <span className="text-[9px] tabular-nums text-slate-400">
                      {dayLabel(night.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:bg-gray-700/50">
              Occupancy each night, against the {run?.rooms ?? 0} rooms this property has today.
            </div>
          </div>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {isWidgetVisible('room-types') && run?.by_room_type?.length ? (
          <div className={CARD}>
            <div className={CARD_HEAD}>
              <span>By room type</span>
            </div>

            <div className="flex-1 divide-y divide-slate-100 dark:divide-gray-700">
              {run.by_room_type.map((type: any) => (
                <div key={type.name} className={`flex items-center gap-3 ${rowClass}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">
                      {type.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {type.rooms} rooms · {type.sold} of {type.room_nights_available} sold
                    </p>
                  </div>
                  <div className="w-24 shrink-0">
                    <div className="h-1.5 overflow-hidden rounded bg-slate-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded bg-primary dark:bg-secondary"
                        style={{ width: `${Math.min(100, Math.max(0, type.occupancy))}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-[11px] tabular-nums text-slate-400">
                      {type.occupancy}%
                    </p>
                  </div>
                  <div className="w-20 shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-100">
                      {type.sold ? money(type.adr) : '—'}
                    </p>
                    <p className="text-[11px] text-slate-400">ADR</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:bg-gray-700/50">
              A floor at 40% beside one at 95% is a pricing question the single ADR hides.
            </div>
          </div>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {isWidgetVisible('takings') && takings ? (
          <div className={CARD}>
            <div className={CARD_HEAD}>
              <span>Money taken this month</span>
              <FaWallet className="shrink-0 text-indigo-500" />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-gray-700">
              <div className={`flex items-center justify-between ${rowClass}`}>
                <span className="text-xs text-slate-400">Received</span>
                <span className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {money(takings.received)}
                </span>
              </div>
              <div className={`flex items-center justify-between ${rowClass}`}>
                <span className="text-xs text-slate-400">Given back</span>
                <span className="text-base font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {money(takings.refunded)}
                </span>
              </div>
              {/* ⚠️ Netted. A refund is stored positive — the direction lives in
                  the purpose — so this is the server's signed total, never the
                  column added up. */}
              <div className={`flex items-center justify-between ${rowClass}`}>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                  In hand
                </span>
                <span className="text-lg font-bold tabular-nums text-primary dark:text-secondary">
                  {money(takings.net)}
                </span>
              </div>
            </div>

            {takings.by_method?.length ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 text-[11px] text-slate-500 dark:text-slate-300">
                {takings.by_method.map((item: any) => (
                  <span key={item.name}>
                    {item.name}: <strong>{money(item.amount)}</strong>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-auto">
              {takings.unposted ? (
                <p className="bg-amber-50 px-4 py-2 text-[11px] text-amber-900 dark:bg-amber-500/15 dark:text-amber-50">
                  <strong>{takings.unposted}</strong>{' '}
                  {takings.unposted === 1 ? 'receipt is' : 'receipts are'} not in the ledger.
                </p>
              ) : (
                <p className="bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:bg-gray-700/50">
                  {takings.count} receipts, every one of them posted.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* The cash book, kept. A hotel is still a business with a drawer,
            and this is the one card from the generic dashboard that answers
            a question a motel actually asks. */}
        {isWidgetVisible('balance') && !dashboard?.isLoading && dashboard?.data ? (
          <div className={CARD}>
            <div className={CARD_HEAD}>
              <span className="truncate">{dashboard?.data?.branch?.name}</span>
              <FaWallet className="shrink-0 text-indigo-500" />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-gray-700">
              <div className={`flex items-center gap-3 ${rowClass}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-slate-300">
                  <FaRegCalendarAlt className="text-sm" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Trx Date
                  </p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-100">
                    {settings?.data?.trx_dt}
                  </p>
                </div>
              </div>

              <div className={`flex items-center justify-between ${rowClass}`}>
                <span className="text-xs text-slate-400">Today received</span>
                <span className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {thousandSeparator(dashboard?.data?.todayReceived?.debit || 0)}
                </span>
              </div>

              <div className={`flex items-center justify-between ${rowClass}`}>
                <span className="text-xs text-slate-400">Today payment</span>
                <span className="text-base font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {thousandSeparator(dashboard?.data?.todayReceived?.credit || 0)}
                </span>
              </div>

              <div className={`flex items-center justify-between ${rowClass}`}>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                  Balance
                </span>
                <span className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-300">
                  {thousandSeparator(
                    (Number(dashboard?.data?.totalTransaction?.debit) || 0) -
                      (Number(dashboard?.data?.totalTransaction?.credit) || 0),
                  )}
                </span>
              </div>
            </div>

            <div className="mt-auto flex items-center gap-1.5 bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:bg-gray-700/50">
              <FaRegClock className="text-[11px]" />
              <span>Last updated: {dashboard?.data?.last_update}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* ⚠️ The caveat every occupancy report in the world has and most of them
          hide, said where it is read rather than only in the code. */}
      {run ? (
        <p className="mt-4 text-[11px] leading-snug text-slate-400">
          Rooms only — halls and community centres are let by the sitting, not the night. Confirmed,
          checked-in and checked-out stays count; holds do not. Rent is the full tariff, so a
          discount lowers the takings and never the ADR. Measured against the {run.rooms} rooms this
          property has <strong>today</strong> — a floor opened last week makes earlier months read
          low.
        </p>
      ) : null}
    </div>
  );
};

export default HotelDashboard;
