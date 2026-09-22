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
import {
  DashboardRangeBar,
  rangeCaption,
  useAutoRefresh,
  useCashBookRange,
  useDashboardRange,
  useViewBranch,
} from './dashboardRange';
import RangeCashCard from './RangeCashCard';
import { DASHBOARD_FADE, DASHBOARD_GRID } from './dashboardKit';

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

/*
 * ⚠️ ONE ITEM PER CARD, NOT ONE PER BAND. The five tiles across the top are one
 * row and the four under them another, and a single switch for a whole row meant
 * turning off "Not ready" also took who is in the building off the screen.
 *
 * A band that is a single card already is one — 'nights', 'room-types' and the
 * rest keep their band name as their id, so only the two tile rows change.
 */
const HOTEL_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'tonight-inhouse', title: 'In the Building' },
  { id: 'tonight-arrivals', title: 'Arriving' },
  { id: 'tonight-departures', title: 'Leaving' },
  { id: 'tonight-free', title: 'Free Tonight' },
  { id: 'tonight-notready', title: 'Not Ready' },
  { id: 'performance-occupancy', title: 'Occupancy' },
  { id: 'performance-adr', title: 'ADR' },
  { id: 'performance-revpar', title: 'RevPAR' },
  { id: 'performance-revenue', title: 'Room Revenue' },
  { id: 'nights', title: 'Night by Night' },
  { id: 'room-types', title: 'By Room Type' },
  { id: 'takings', title: 'Money Taken This Month' },
  { id: 'balance', title: 'Cash Book' },
  { id: 'balance-range', title: 'Cash Book (Range)' },
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
  hint,
}: {
  label: string;
  value: string;
  working?: string;
  icon?: JSX.Element;
  tone?: string;
  lead?: boolean;
  /**
   * What the label is short for, on hover.
   *
   * ⚠️ ADR and RevPAR are initials, and the tile has no room to spell
   * them out -- but somebody seeing them for the first time cannot guess
   * either, and the line underneath says how the figure was worked out rather
   * than what it is called.
   */
  hint?: string;
}) => (
  <div
    className={`flex flex-col justify-between px-4 py-3 shadow-sm ring-1 transition hover:shadow-md ${
      lead
        ? 'bg-primary/5 ring-primary/40 dark:bg-secondary/10 dark:ring-secondary/40'
        : 'bg-white ring-slate-200 dark:bg-gray-800 dark:ring-gray-700'
    }`}
  >
    <div
      className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400"
      title={hint}
    >
      {icon}
      <span
        className={`truncate ${hint ? 'cursor-help decoration-dotted underline-offset-2 hover:underline' : ''}`}
      >
        {label}
      </span>
    </div>
    <div
      className={`mt-1 text-2xl font-bold ${tone ?? 'text-slate-700 dark:text-slate-100'}`}
    >
      {value}
    </div>
    {/* ⚠️ The working is on the tile deliberately. These figures are quoted at
        meetings by people who did not run the report, and "11% — 30 of 264
        room-nights" can be argued with where a bare 11% can only be believed. */}
    {working ? (
      <div
        className="mt-0.5 truncate text-[11px] text-slate-400"
        title={working}
      >
        {working}
      </div>
    ) : null}
  </div>
);

const HotelDashboard = () => {
  const dispatch = useDispatch<any>();

  const currentBranch = useSelector(
    (state: any) => state.branchList?.currentBranch,
  );
  const settings = useSelector((state: any) => state.settings);
  const dashboard = useSelector((state: any) => state.dashboard);
  const me = useSelector((state: any) => state.auth?.me);

  // The branch on the page: the user's own, or the one a head office picked.
  const view = useViewBranch();
  const branchId = view.viewBranchId;

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

  // The range the performance and takings are read over, and the refresh.
  // The register and the rooms are always today's, whatever the range.
  const range = useDashboardRange();
  const { tick, refresh, refreshedAt, markRefreshed } = useAutoRefresh();
  const cash = useCashBookRange(branchId, range.from, range.to, tick);

  useEffect(() => {
    dispatch(getDashboard(branchId));
  }, [dispatch, tick, branchId]);

  // A read in flight: the cards stay up and dim until the performance lands.
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!branchId) return;

    let alive = true;
    setBusy(true);

    const today = asText(new Date());
    const { from: monthStart, to: rangeEnd } = range;

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
          // But the dimming lifts: a page left at 60% would read as still loading.
          if (alive) setBusy(false);
        });

    settle(
      httpService.get(API_HOTEL_PERFORMANCE_URL, {
        params: { from: monthStart, to: rangeEnd, branch_id: branchId },
      }),
      (payload) => {
        setRun(payload);
        setBusy(false);
        markRefreshed();
      },
    );

    settle(
      httpService.get(API_HOTEL_REGISTER_URL, {
        params: { date: today, branch_id: branchId, counts_only: 1 },
      }),
      (payload) => setCounts(payload?.counts ?? null),
    );

    settle(
      httpService.get(API_HOTEL_HOUSEKEEPING_URL, {
        params: { branch_id: branchId },
      }),
      (payload) => setRooms(payload?.counts ?? null),
    );

    settle(
      httpService.get(API_HOTEL_COLLECTION_URL, {
        params: { from: monthStart, to: rangeEnd, branch_id: branchId },
      }),
      (payload) =>
        setTakings(
          payload?.totals
            ? { ...payload.totals, unposted: payload.unposted }
            : null,
        ),
    );

    return () => {
      alive = false;
    };
  }, [branchId, range.from, range.to, tick]);

  const totals = run?.totals;

  // Tonight is the range's night dated today -- there when the range ends
  // today, absent on Last month or a custom range that ends earlier, and then
  // the tonight tiles say nothing rather than call last month's last night
  // tonight. One read answers both questions rather than two that could drift.
  const tonight = useMemo(() => {
    const today = asText(new Date());
    return Array.isArray(run?.daily)
      ? run.daily.find((night: any) => String(night?.date) === today) ?? null
      : null;
  }, [run]);

  // The strip only reads as a shape if every bar is measured against the same
  // ceiling, and that ceiling is the property — not the fullest night in it.
  const nights = useMemo(
    () => (Array.isArray(run?.daily) ? run.daily : []),
    [run],
  );

  const notReady = rooms
    ? Number(rooms.dirty ?? 0) + Number(rooms.cleaning ?? 0)
    : null;

  const renderWidget = (id: string): React.ReactNode => {
    switch (id) {
      case 'tonight-inhouse':
        return (
          (counts || tonight || rooms) &&
          (isWidgetVisible('tonight-inhouse') ? (
            <Tile
              label="In the building"
              value={String(counts?.in_house ?? 0)}
              working="guests sleeping here tonight"
              icon={<FaBed className="text-[11px] text-indigo-500" />}
              tone="text-indigo-600 dark:text-indigo-300"
            />
          ) : null)
        );
      case 'tonight-arrivals':
        return (
          (counts || tonight || rooms) &&
          (isWidgetVisible('tonight-arrivals') ? (
            <Tile
              label="Arriving"
              value={String(counts?.arrivals ?? 0)}
              working="expected at the desk today"
              icon={<FaDoorOpen className="text-[11px] text-emerald-500" />}
              tone="text-emerald-600 dark:text-emerald-400"
            />
          ) : null)
        );
      case 'tonight-departures':
        return (
          (counts || tonight || rooms) &&
          (isWidgetVisible('tonight-departures') ? (
            <Tile
              label="Leaving"
              value={String(counts?.departures ?? 0)}
              working="rooms to turn round today"
              icon={<FaSignOutAlt className="text-[11px] text-rose-500" />}
              tone="text-rose-600 dark:text-rose-400"
            />
          ) : null)
        );
      case 'tonight-free':
        return (
          (counts || tonight || rooms) &&
          (isWidgetVisible('tonight-free') ? (
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
          ) : null)
        );
      case 'tonight-notready':
        return (
          (counts || tonight || rooms) &&
          (isWidgetVisible('tonight-notready') ? (
            <Tile
              label="Not ready"
              value={notReady === null ? '—' : String(notReady)}
              working={
                rooms
                  ? `${rooms.dirty ?? 0} dirty, ${rooms.cleaning ?? 0} being done${
                      rooms.out_of_order
                        ? `, ${rooms.out_of_order} out of order`
                        : ''
                    }`
                  : 'housekeeping not visible to you'
              }
              icon={<FaBroom className="text-[11px] text-amber-500" />}
              tone={notReady ? 'text-amber-600 dark:text-amber-400' : undefined}
            />
          ) : null)
        );
      case 'performance-occupancy':
        return (
          totals &&
          (isWidgetVisible('performance-occupancy') ? (
            <Tile
              label="Occupancy"
              value={`${totals.occupancy}%`}
              working={`${totals.room_nights_sold} of ${totals.room_nights_available} room-nights`}
            />
          ) : null)
        );
      case 'performance-adr':
        return (
          totals &&
          (isWidgetVisible('performance-adr') ? (
            <Tile
              label="ADR"
              hint="Average Daily Rate — room revenue divided by the room-nights actually sold"
              value={money(totals.adr)}
              working="per room-night SOLD"
            />
          ) : null)
        );
      case 'performance-revpar':
        return (
          totals &&
          (isWidgetVisible('performance-revpar') ? (
            <Tile
              label="RevPAR"
              hint="Revenue Per Available Room — room revenue divided by every room-night the property had, sold or not"
              value={money(totals.revpar)}
              working="per room the property HAS"
              lead
              tone="text-primary dark:text-secondary"
            />
          ) : null)
        );
      case 'performance-revenue':
        return (
          totals &&
          (isWidgetVisible('performance-revenue') ? (
            <Tile
              label="Room revenue"
              value={money(totals.revenue)}
              working={`${run?.rooms ?? 0} rooms over ${run?.days ?? 0} nights`}
            />
          ) : null)
        );
      case 'nights':
        return isWidgetVisible('nights') && nights.length ? (
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
                        style={{
                          height: `${Math.max(2, Math.min(100, night.occupancy))}%`,
                        }}
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
              Occupancy each night, against the {run?.rooms ?? 0} rooms this
              property has today.
            </div>
          </div>
        ) : null;
      case 'room-types':
        return isWidgetVisible('room-types') && run?.by_room_type?.length ? (
          <div className={CARD}>
            <div className={CARD_HEAD}>
              <span>By room type</span>
            </div>

            <div className="flex-1 divide-y divide-slate-100 dark:divide-gray-700">
              {run.by_room_type.map((type: any) => (
                <div
                  key={type.name}
                  className={`flex items-center gap-3 ${rowClass}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">
                      {type.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {type.rooms} rooms · {type.sold} of{' '}
                      {type.room_nights_available} sold
                    </p>
                  </div>
                  <div className="w-24 shrink-0">
                    <div className="h-1.5 overflow-hidden rounded bg-slate-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded bg-primary dark:bg-secondary"
                        style={{
                          width: `${Math.min(100, Math.max(0, type.occupancy))}%`,
                        }}
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
              A floor at 40% beside one at 95% is a pricing question the single
              ADR hides.
            </div>
          </div>
        ) : null;
      case 'takings':
        return isWidgetVisible('takings') && takings ? (
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
                  {takings.unposted === 1 ? 'receipt is' : 'receipts are'} not
                  in the ledger.
                </p>
              ) : (
                <p className="bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:bg-gray-700/50">
                  {takings.count} receipts, every one of them posted.
                </p>
              )}
            </div>
          </div>
        ) : null;
      case 'balance':
        return isWidgetVisible('balance') &&
          !dashboard?.isLoading &&
          dashboard?.data ? (
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
                  {thousandSeparator(
                    dashboard?.data?.todayReceived?.debit || 0,
                  )}
                </span>
              </div>

              <div className={`flex items-center justify-between ${rowClass}`}>
                <span className="text-xs text-slate-400">Today payment</span>
                <span className="text-base font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {thousandSeparator(
                    dashboard?.data?.todayReceived?.credit || 0,
                  )}
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
        ) : null;
      case 'balance-range':
        return isWidgetVisible('balance-range') ? (
          <RangeCashCard cash={cash} rowClass={rowClass} />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div>
      <HelmetTitle title="Dashboard" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-700 dark:text-slate-100">
            {view.viewBranchName || 'The property'}
          </h1>
          <p className="text-xs text-slate-400">
            {run?.from && run?.to
              ? rangeCaption(run.from, run.to, refreshedAt)
              : 'Reading the property…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardRangeBar range={range} view={view} onRefresh={refresh} busy={busy} />
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
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Tonight. The desk's band, and it comes first because at nine in
          the morning nobody is asking about the month. */}
      {/* As many 18rem columns as the page has room for -- see DASHBOARD_GRID.
          Every card in a row stands as tall as the tallest; the cards' own
          mb-4 is taken off. The wide cards span two columns only from xl,
          where there are surely two to span. */}
      <div className={`${DASHBOARD_GRID} ${gap} ${DASHBOARD_FADE} ${busy ? 'opacity-60' : ''}`}>
        {orderedWidgets
          .filter((widget) => isWidgetVisible(widget.id))
          .map((widget) => {
            const content = renderWidget(widget.id);
            if (!content) return null;
            return (
              <div
                key={widget.id}
                className={
                  'min-w-0 *:h-full *:mb-0 ' +
                  (['nights', 'room-types', 'takings', 'balance'].includes(widget.id)
                    ? 'xl:col-span-2'
                    : '')
                }
              >
                {content}
              </div>
            );
          })}
      </div>

      {/* ⚠️ The caveat every occupancy report in the world has and most of them
          hide, said where it is read rather than only in the code.
          ⚠️ Shown WHEN THE REPORT IS THERE, which is what `run ?` says. It was
          `!run ?`, and that reads `run.rooms` in the one case where `run` is
          null -- so it threw on the first render, before the request had even
          come back, for everybody, every time. The caveat also has nothing to
          explain when there are no figures on the page to qualify. */}
      {run ? (
        <p className="mt-4 text-[11px] leading-snug text-slate-400">
          Rooms only — halls and community centres are let by the sitting, not
          the night. Confirmed, checked-in and checked-out stays count; holds do
          not. Rent is the full tariff, so a discount lowers the takings and
          never the ADR. Measured against the {run.rooms} rooms this property
          has <strong>today</strong> — a floor opened last week makes earlier
          months read low.
        </p>
      ) : null}
    </div>
  );
};

export default HotelDashboard;
