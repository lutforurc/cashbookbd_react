import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  FaBuilding,
  FaCar,
  FaExclamationTriangle,
  FaHourglassHalf,
  FaRegCalendarAlt,
  FaRegClock,
  FaUsers,
  FaWallet,
} from 'react-icons/fa';

import HelmetTitle from '../../utils/others/HelmetTitle';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import httpService from '../../services/httpService';
import routes from '../../services/appRoutes';
import { formatDayMonthYear } from '../../utils/utils-functions/formatDate';
import { API_REAL_ESTATE_DASHBOARD_URL } from '../../services/apiRoutes';
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
// money(), count(), share(), CARD, CARD_HEAD and Tile moved to the shared kit so
// the trading dashboard cannot drift away from this one on how a taka is
// written. Nothing here changed but where they are read from.
import { CARD, CARD_HEAD, DASHBOARD_FADE, DASHBOARD_GRID, Tile, count, money, share } from './dashboardKit';

/**
 * The dashboard a developer opens the morning on: flats, plots and parking.
 *
 * ⚠️ IT REPLACES THE SHOP'S, it does not decorate it. The generic dashboard
 * answers what sold, what was bought, how many new customers arrived and what
 * the stock is short of — on a branch selling flats every one of those reads
 * nought forever, and four empty tiles at the top of the page teach a person
 * that the page is not worth looking at. What an estate actually asks is: what
 * is left to sell, what have I sold, what has come in, and who still owes me.
 *
 * ⚠️ EVERY FIGURE IS THE MODULE'S OWN, out of one call on the server. Nothing
 * here counts a unit or sums a receipt in the browser: the sold-units list is
 * paginated and the receipts list is paginated, so a browser-side total would
 * quietly be a total of the first page. And the receipt rule is copied from the
 * sold-units screen on purpose — Received here has to equal Received there to
 * the taka, because the first thing anybody does with a dashboard is check it
 * against the screen it links to.
 *
 * ⚠️ ONE BAND IS RANGED AND THE REST ARE NOT. Inventory, the sales book and the
 * installments standing are TODAY'S POSITIONS — "23 units left" is a standing,
 * not something that happened between the 1st and the 19th, and ranging it
 * would report a branch's whole estate as this month's. Only the takings band
 * honours the range, and the sales band says so in its own footer so that the
 * biggest figure on the page is not read as a month's work.
 *
 * ⚠️ A BAND THAT CANNOT BE READ DISAPPEARS — it never shows an error. The
 * permission is real.estate.view, granted per role, and a user without it gets
 * the same quiet page a stale route cache produces. A red box on the front page
 * for a permission nobody knew existed is worse than a missing tile; the note
 * at the foot of the page says which of the two it is.
 */

/*
 * ⚠️ ONE ITEM PER CARD, NOT ONE PER BAND. The sales band is four tiles in a row
 * and the inventory band is six, and a single switch for the lot meant turning
 * off "Parking sold" also took the lead Outstanding tile off the screen. The
 * four bands that are one card each keep the id they always had, so a layout
 * saved before this change still reads.
 */
const REAL_ESTATE_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'sales-booked', title: 'Booked Value' },
  { id: 'sales-received', title: 'Received' },
  { id: 'sales-outstanding', title: 'Outstanding' },
  { id: 'sales-buyers', title: 'Buyers' },
  { id: 'inventory-units-left', title: 'Units Left' },
  { id: 'inventory-units-sold', title: 'Units Sold' },
  { id: 'inventory-parking-left', title: 'Parking Left' },
  { id: 'inventory-parking-sold', title: 'Parking Sold' },
  { id: 'inventory-withdrawn', title: 'Withdrawn' },
  { id: 'inventory-being-built', title: 'Being Built' },
  { id: 'projects', title: 'Project by Project' },
  { id: 'collection', title: 'Money Taken This Month' },
  { id: 'installments', title: 'Installments' },
  { id: 'balance', title: 'Cash Book' },
  { id: 'balance-range', title: 'Cash Book (Range)' },
];


const RealEstateDashboard = () => {
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

  const [payload, setPayload] = useState<any>(null);
  /**
   * ⚠️ "Nothing has answered yet" and "nothing answered at all" are different
   * pages, and without this they render the same. The note at the foot of the
   * page claims a band was left out rather than shown empty, and it has no
   * business saying that while the request is still in the air.
   */
  const [settled, setSettled] = useState(false);

  const {
    density,
    orderedWidgets,
    isWidgetVisible,
    toggleWidget,
    moveWidget,
    setDensity,
    reset,
  } = useDashboardCustomization(
    `cashbook-real-estate-dashboard:${me?.id || 'user'}:${branchId || 'branch'}`,
    REAL_ESTATE_DASHBOARD_WIDGETS,
    {
      dashboardKey: 'real-estate',
      branchId,
      enabled: Boolean(me?.id && branchId),
    },
  );

  const isCompact = density === 'compact';
  const gap = isCompact ? 'gap-3' : 'gap-4';
  const rowClass = isCompact ? 'px-4 py-2' : 'px-4 py-2.5';

  // The range the period bands are read over, and the refresh.
  const range = useDashboardRange();
  const { tick, refresh, refreshedAt, markRefreshed } = useAutoRefresh();
  const cash = useCashBookRange(branchId, range.from, range.to, tick);

  useEffect(() => {
    dispatch(getDashboard(branchId));
  }, [dispatch, tick, branchId]);

  useEffect(() => {
    if (!branchId) return;

    let alive = true;
    setSettled(false);

    const { from: monthStart, to: today } = range;

    /*
     * One read, because the server is where the pieces are made to agree: the
     * sales book and the sold-units list share a payment subquery, and the
     * takings band and the sales band would drift apart if the browser summed
     * either of them itself.
     *
     * ⚠️ The empty catch is the behaviour, not a swallowed bug — see the
     * header. A refusal (no permission, wrong business type, a route cache that
     * has not been cleared) leaves every band out and draws nothing red.
     */
    httpService
      .get(API_REAL_ESTATE_DASHBOARD_URL, {
        params: { from: monthStart, to: today, branch_id: branchId },
      })
      .then((response) => {
        if (!alive) return;
        setPayload(response?.data?.data?.data ?? null);
        setSettled(true);
        markRefreshed();
      })
      .catch(() => {
        if (alive) {
          setPayload(null);
          setSettled(true);
        }
      });

    return () => {
      alive = false;
    };
  }, [branchId, range.from, range.to, tick]);

  const inventory = payload?.inventory;
  const sales = payload?.sales;
  const collection = payload?.collection;
  const installments = payload?.installments;
  const projects: any[] = Array.isArray(payload?.by_project)
    ? payload.by_project
    : [];

  /*
   * ⚠️ Sold and available are the two halves of the switch, and withdrawn is
   * neither. `inactive` is a unit taken off the market — a dispute, a
   * re-plan — and the Unit List screen prints it as its own status, so it gets
   * its own tile when there is one and no tile at all when there is not.
   * Folding it into "units left" would advertise a flat nobody can sell.
   */
  const hasWithdrawn = Number(inventory?.total?.inactive ?? 0) > 0;
  const hasUnbuilt = Number(inventory?.total?.under_development ?? 0) > 0;

  const renderWidget = (id: string): React.ReactNode => {
    switch (id) {
      case 'sales-booked':
        return (
          sales &&
          (isWidgetVisible('sales-booked') ? (
            <Tile
              label="Booked value"
              value={money(sales.booked_value)}
              working={`${count(sales.sale_count)} live ${
                Number(sales.sale_count) === 1 ? 'sale' : 'sales'
              }, all time`}
              icon={<FaBuilding className="text-[11px] text-slate-400" />}
            />
          ) : null)
        );
      case 'sales-received':
        return (
          sales &&
          (isWidgetVisible('sales-received') ? (
            <Tile
              label="Received"
              value={money(sales.received)}
              working="confirmed receipts, less refunds"
              tone="text-emerald-600 dark:text-emerald-400"
            />
          ) : null)
        );
      case 'sales-outstanding':
        return (
          sales &&
          (isWidgetVisible('sales-outstanding') ? (
            <Tile
              label="Outstanding"
              value={money(sales.outstanding)}
              working="still to collect"
              lead
              tone="text-primary dark:text-secondary"
            />
          ) : null)
        );
      case 'sales-buyers':
        return (
          sales &&
          (isWidgetVisible('sales-buyers') ? (
            <Tile
              label="Buyers"
              value={count(sales.buyer_count)}
              working={
                `${count(sales.sale_count)} sales between them` +
                (Number(sales.parking_only_sales) > 0
                  ? ` · ${count(sales.parking_only_sales)} parking only`
                  : '')
              }
              icon={<FaUsers className="text-[11px] text-indigo-500" />}
            />
          ) : null)
        );
      case 'inventory-units-left':
        return (
          inventory &&
          (isWidgetVisible('inventory-units-left') ? (
            <Tile
              label="Units left"
              value={count(inventory.unit?.available)}
              working={`of ${count(inventory.unit?.total)} flats and plots`}
              icon={<FaBuilding className="text-[11px] text-emerald-500" />}
              tone="text-emerald-600 dark:text-emerald-400"
            />
          ) : null)
        );
      case 'inventory-units-sold':
        return (
          inventory &&
          (isWidgetVisible('inventory-units-sold') ? (
            <Tile
              label="Units sold"
              value={count(inventory.unit?.sold)}
              working={`of ${count(inventory.unit?.total)}`}
            />
          ) : null)
        );
      case 'inventory-parking-left':
        return (
          inventory &&
          (isWidgetVisible('inventory-parking-left') ? (
            <Tile
              label="Parking left"
              value={count(inventory.parking?.available)}
              working={`of ${count(inventory.parking?.total)} spaces`}
              icon={<FaCar className="text-[11px] text-emerald-500" />}
            />
          ) : null)
        );
      case 'inventory-parking-sold':
        return (
          inventory &&
          (isWidgetVisible('inventory-parking-sold') ? (
            <Tile
              label="Parking sold"
              value={count(inventory.parking?.sold)}
              working={`of ${count(inventory.parking?.total)}`}
            />
          ) : null)
        );
      case 'inventory-withdrawn':
        return (
          inventory &&
          (isWidgetVisible('inventory-withdrawn') && hasWithdrawn ? (
            <Tile
              label="Withdrawn"
              value={count(inventory.total?.inactive)}
              working="off the market, not for sale"
              tone="text-slate-400"
            />
          ) : null)
        );
      case 'inventory-being-built':
        return (
          inventory &&
          (isWidgetVisible('inventory-being-built') && hasUnbuilt ? (
            <Tile
              label="Being built"
              value={count(inventory.total?.under_development)}
              working="not finished, not yet offered"
            />
          ) : null)
        );
      case 'projects':
        return isWidgetVisible('projects') && projects.length ? (
          <div className={CARD}>
            <div className={CARD_HEAD}>
              <span>Project by project</span>
              <Link
                to={routes.report_sales_summary}
                className="text-xs font-normal text-primary hover:underline dark:text-secondary"
              >
                Sales summary →
              </Link>
            </div>

            <div className="flex-1 divide-y divide-slate-100 dark:divide-gray-700">
              {projects.map((project: any) => {
                const soldThrough = share(
                  project.unit_sold,
                  project.unit_total,
                );

                return (
                  <div
                    key={project.project_id ?? project.project_name ?? 'none'}
                    className={`flex items-center gap-3 ${rowClass}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">
                        {project.project_name || 'No project'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {project.unit_sold} of {project.unit_total} units ·{' '}
                        {project.parking_sold} of {project.parking_total}{' '}
                        parking
                      </p>
                    </div>

                    {/* ⚠️ The bar measures units only. Parking has its own
                        count on the line above, and a bar that mixed the two
                        would show a project as less sold than it is. */}
                    <div className="w-20 shrink-0">
                      <div className="h-1.5 overflow-hidden rounded bg-slate-200 dark:bg-gray-700">
                        <div
                          className="h-full rounded bg-primary dark:bg-secondary"
                          style={{ width: `${soldThrough}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-right text-[11px] tabular-nums text-slate-400">
                        {soldThrough}%
                      </p>
                    </div>

                    <div className="w-24 shrink-0 text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          Number(project.outstanding) > 0
                            ? 'text-primary dark:text-secondary'
                            : 'text-slate-400'
                        }`}
                      >
                        {money(project.outstanding)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        of {money(project.booked_value)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:bg-gray-700/50">
              What is still owed on each project, against what it was sold for.
              The schedule behind every one of those sales is on the installment
              screens, not here.
            </div>
          </div>
        ) : null;
      case 'collection':
        return isWidgetVisible('collection') && collection ? (
          <div className={CARD}>
            <div className={CARD_HEAD}>
              <span>Money taken this month</span>
              <FaWallet className="shrink-0 text-indigo-500" />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-gray-700">
              <div className={`flex items-center justify-between ${rowClass}`}>
                <span className="text-xs text-slate-400">Received</span>
                <span className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {money(collection.received)}
                </span>
              </div>
              <div className={`flex items-center justify-between ${rowClass}`}>
                <span className="text-xs text-slate-400">Given back</span>
                <span className="text-base font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {money(collection.refunded)}
                </span>
              </div>
              {/* ⚠️ Netted. A refund is stored positive — the direction lives in
                  payment_type — so this is the server's signed total, never the
                  column added up. */}
              <div className={`flex items-center justify-between ${rowClass}`}>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                  In net
                </span>
                <span className="text-lg font-bold tabular-nums text-primary dark:text-secondary">
                  {money(collection.net)}
                </span>
              </div>
            </div>

            {collection.by_mode?.length ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 text-[11px] text-slate-500 dark:text-slate-300">
                {collection.by_mode.map((item: any) => (
                  <span key={item.name}>
                    {item.name}: <strong>{money(item.amount)}</strong>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-auto bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:bg-gray-700/50">
              {count(collection.receipt_count)}{' '}
              {Number(collection.receipt_count) === 1 ? 'receipt' : 'receipts'},
              confirmed, in{' '}
              {payload?.from ? formatDayMonthYear(payload.from) : '—'} to{' '}
              {payload?.to ? formatDayMonthYear(payload.to) : '—'} —{' '}
              <Link
                to={routes.unit_payment_list}
                className="text-primary hover:underline dark:text-secondary"
              >
                the receipt list
              </Link>
            </div>
          </div>
        ) : null;
      case 'installments':
        return isWidgetVisible('installments') && installments ? (
          <div className={CARD}>
            <div className={CARD_HEAD}>
              <span>Installments</span>
              <Link
                to={routes.due_installment_list}
                className="text-xs font-normal text-primary hover:underline dark:text-secondary"
              >
                Due list →
              </Link>
            </div>

            <div className="flex-1 divide-y divide-slate-100 dark:divide-gray-700">
              <div className={`flex items-center gap-3 ${rowClass}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300">
                  <FaExclamationTriangle className="text-sm" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Overdue
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {count(installments.overdue_count)}{' '}
                    {Number(installments.overdue_count) === 1
                      ? 'installment'
                      : 'installments'}{' '}
                    past the due date
                  </p>
                </div>
                <span className="shrink-0 text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {money(installments.overdue_amount)}
                </span>
              </div>

              <div className={`flex items-center gap-3 ${rowClass}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-300">
                  <FaHourglassHalf className="text-sm" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Due in {count(payload?.due_soon_days ?? 30)} days
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {count(installments.due_soon_count)}{' '}
                    {Number(installments.due_soon_count) === 1
                      ? 'installment'
                      : 'installments'}{' '}
                    not yet late
                  </p>
                </div>
                <span className="shrink-0 text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {money(installments.due_soon_amount)}
                </span>
              </div>
            </div>

            <div className="mt-auto bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:bg-gray-700/50">
              What each installment still owes, after early-payment discounts
              and receipts — the same rule{' '}
              <Link
                to={routes.due_installment_list}
                className="text-primary hover:underline dark:text-secondary"
              >
                the due list
              </Link>{' '}
              uses, counted on today's calendar date rather than the branch's
              transaction date.
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
            {payload?.branch?.name || currentBranch?.name || 'The estate'}
          </h1>
          <p className="text-xs text-slate-400">
            {payload?.from && payload?.to
              ? rangeCaption(payload.from, payload.to, refreshedAt)
              : 'Reading the estate…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardRangeBar range={range} view={view} onRefresh={refresh} busy={!settled} />
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
      {/* The sales book. Deliberately NOT this month's — see the header. */}
      {/* As many 18rem columns as the page has room for -- see DASHBOARD_GRID.
          Every card in a row stands as tall as the tallest; the cards' own
          mb-4 is taken off, since a full-height card plus a margin is taller
          than its cell. The wide cards span two columns only from xl, where
          there are surely two to span. */}
      <div className={`${DASHBOARD_GRID} ${gap} ${DASHBOARD_FADE} ${settled ? '' : 'opacity-60'}`}>
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
                  (['projects', 'collection', 'installments', 'balance'].includes(widget.id)
                    ? 'xl:col-span-2'
                    : '')
                }
              >
                {content}
              </div>
            );
          })}
      </div>

      {/* ⚠️ Said once, at the foot, rather than as an error on every band that
          came back empty. A band is missing for one of two reasons and this
          page cannot tell them apart: the permission is not held, or the route
          cache has not been cleared since the endpoint was added. Both look
          like a quiet page, and neither is a fault on this screen. */}
      {settled && !payload ? (
        <p className="mt-4 text-[11px] leading-snug text-slate-400">
          Nothing could be read. These figures need the Real Estate module
          permission (<code>real.estate.view</code>), and a figure this page
          cannot read is left out rather than shown as nought. A band that is
          empty for you is one you are not permitted to see — this page draws no
          error of its own.
        </p>
      ) : null}
    </div>
  );
};

export default RealEstateDashboard;
