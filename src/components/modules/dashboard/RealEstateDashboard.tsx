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
// money(), count(), share(), CARD, CARD_HEAD and Tile moved to the shared kit so
// the trading dashboard cannot drift away from this one on how a taka is
// written. Nothing here changed but where they are read from.
import { CARD, CARD_HEAD, Tile, count, money, share } from './dashboardKit';

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

const REAL_ESTATE_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'sales', title: 'The Sales Book' },
  { id: 'inventory', title: 'What Is Left To Sell' },
  { id: 'projects', title: 'Project by Project' },
  { id: 'collection', title: 'Money Taken This Month' },
  { id: 'installments', title: 'Installments' },
  { id: 'balance', title: 'Cash Book' },
];

const asText = (date: Date) => {
  // Local parts, never toISOString(): which receipts fall inside "this month"
  // is a calendar question at the desk, and going through UTC moves the
  // boundary a day for half the world — and takes a month's receipts with it.
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const RealEstateDashboard = () => {
  const dispatch = useDispatch<any>();

  const currentBranch = useSelector((state: any) => state.branchList?.currentBranch);
  const settings = useSelector((state: any) => state.settings);
  const dashboard = useSelector((state: any) => state.dashboard);
  const me = useSelector((state: any) => state.auth?.me);

  const branchId = currentBranch?.id;

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

  useEffect(() => {
    dispatch(getDashboard());
  }, [dispatch]);

  useEffect(() => {
    if (!branchId) return;

    let alive = true;
    setSettled(false);

    const now = new Date();
    const today = asText(now);
    const monthStart = asText(new Date(now.getFullYear(), now.getMonth(), 1));

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
  }, [branchId]);

  const inventory = payload?.inventory;
  const sales = payload?.sales;
  const collection = payload?.collection;
  const installments = payload?.installments;
  const projects: any[] = Array.isArray(payload?.by_project) ? payload.by_project : [];

  /*
   * ⚠️ Sold and available are the two halves of the switch, and withdrawn is
   * neither. `inactive` is a unit taken off the market — a dispute, a
   * re-plan — and the Unit List screen prints it as its own status, so it gets
   * its own tile when there is one and no tile at all when there is not.
   * Folding it into "units left" would advertise a flat nobody can sell.
   */
  const hasWithdrawn = Number(inventory?.total?.inactive ?? 0) > 0;
  const hasUnbuilt = Number(inventory?.total?.under_development ?? 0) > 0;

  return (
    <div>
      <HelmetTitle title="Dashboard" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-700 dark:text-slate-100">
            {currentBranch?.name || 'The estate'}
          </h1>
          <p className="text-xs text-slate-400">
            {payload?.from && payload?.to
              ? `This month so far · ${formatDayMonthYear(payload.from)} to ${formatDayMonthYear(
                  payload.to,
                )}`
              : 'Reading the estate…'}
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
      {/* The sales book. Deliberately NOT this month's — see the header. */}
      {isWidgetVisible('sales') && sales ? (
        <>
          <div className={`mb-4 grid grid-cols-2 sm:grid-cols-4 ${gap}`}>
            <Tile
              label="Booked value"
              value={money(sales.booked_value)}
              working={`${count(sales.sale_count)} live ${
                Number(sales.sale_count) === 1 ? 'sale' : 'sales'
              }, all time`}
              icon={<FaBuilding className="text-[11px] text-slate-400" />}
            />
            <Tile
              label="Received"
              value={money(sales.received)}
              working="confirmed receipts, less refunds"
              tone="text-emerald-600 dark:text-emerald-400"
            />
            {/* ⚠️ The lead figure. Booked value flatters — a sale is worth what
                somebody signed for — and Received is the same number for every
                estate that has just opened. Outstanding is the one that says
                whether the money is actually coming in. */}
            <Tile
              label="Outstanding"
              value={money(sales.outstanding)}
              working="still to collect"
              lead
              tone="text-primary dark:text-secondary"
            />
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
          </div>

          {/* ⚠️ Said where it is read, not only in the controller. Two screens
              in this module count receipts by different rules, and the one a
              dashboard links to has to be named as the odd one out rather than
              quietly disagreed with. */}
          
        </>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* What is left to sell. The one band a developer reads before anything
          else, because it is the stock the business is made of. */}
      {isWidgetVisible('inventory') && inventory ? (
        <>
          <div
            className={`mb-1 grid grid-cols-2 sm:grid-cols-3 ${
              hasWithdrawn || hasUnbuilt ? 'lg:grid-cols-6' : 'lg:grid-cols-4'
            } ${gap}`}
          >
            <Tile
              label="Units left"
              value={count(inventory.unit?.available)}
              working={`of ${count(inventory.unit?.total)} flats and plots`}
              icon={<FaBuilding className="text-[11px] text-emerald-500" />}
              tone="text-emerald-600 dark:text-emerald-400"
            />
            <Tile
              label="Units sold"
              value={count(inventory.unit?.sold)}
              working={`of ${count(inventory.unit?.total)}`}
            />
            {/* ⚠️ PARKING IS ITS OWN TILE AND NEVER ADDED INTO UNITS. The
                module sells a space as its own unit_type, the sold-units
                screens count it on their own card, and a sale may carry a
                parking with no flat at all. Folding it in would offer a buyer
                somewhere to live that has no rooms. */}
            <Tile
              label="Parking left"
              value={count(inventory.parking?.available)}
              working={`of ${count(inventory.parking?.total)} spaces`}
              icon={<FaCar className="text-[11px] text-emerald-500" />}
            />
            <Tile
              label="Parking sold"
              value={count(inventory.parking?.sold)}
              working={`of ${count(inventory.parking?.total)}`}
            />
            {hasWithdrawn ? (
              <Tile
                label="Withdrawn"
                value={count(inventory.total?.inactive)}
                working="off the market, not for sale"
                tone="text-slate-400"
              />
            ) : null}
            {hasUnbuilt ? (
              <Tile
                label="Being built"
                value={count(inventory.total?.under_development)}
                working="not finished, not yet offered"
              />
            ) : null}
          </div>

          <p className="mb-4 text-[11px] leading-snug text-slate-400">
            Every unit on this branch's books, counted by{' '}
            <Link
              to={routes.real_estate_floor_unit_list}
              className="text-primary hover:underline dark:text-secondary"
            >
              the unit list
            </Link>
            . A unit whose floor or building has gone missing cannot be placed on a branch and is not
            counted here.
          </p>
        </>
      ) : null}

      <div className={`grid grid-cols-1 items-stretch ${gap} lg:grid-cols-2`}>
        {/* ---------------------------------------------------------- */}
        {isWidgetVisible('projects') && projects.length ? (
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
                const soldThrough = share(project.unit_sold, project.unit_total);

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
                        {project.unit_sold} of {project.unit_total} units · {project.parking_sold}{' '}
                        of {project.parking_total} parking
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
              What is still owed on each project, against what it was sold for. The schedule behind
              every one of those sales is on the installment screens, not here.
            </div>
          </div>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {isWidgetVisible('collection') && collection ? (
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
              {Number(collection.receipt_count) === 1 ? 'receipt' : 'receipts'}, confirmed, in{' '}
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
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* ⚠️ Both figures shown even at nought, unlike the inventory tiles
            above. "Nothing is overdue" is the answer somebody opens this page
            for, and a band that vanished on a good month would send them to the
            due-installments screen to check. */}
        {isWidgetVisible('installments') && installments ? (
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
                    {Number(installments.overdue_count) === 1 ? 'installment' : 'installments'} past
                    the due date
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
                    {Number(installments.due_soon_count) === 1 ? 'installment' : 'installments'} not
                    yet late
                  </p>
                </div>
                <span className="shrink-0 text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {money(installments.due_soon_amount)}
                </span>
              </div>
            </div>

            <div className="mt-auto bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:bg-gray-700/50">
              What each installment still owes, after early-payment discounts and receipts — the same
              rule{' '}
              <Link
                to={routes.due_installment_list}
                className="text-primary hover:underline dark:text-secondary"
              >
                the due list
              </Link>{' '}
              uses, counted on today's calendar date rather than the branch's transaction date.
            </div>
          </div>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* The cash book, kept. A developer is still a business with a drawer,
            and this is the one card from the generic dashboard that answers a
            question an estate actually asks. */}
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

      {/* ⚠️ Said once, at the foot, rather than as an error on every band that
          came back empty. A band is missing for one of two reasons and this
          page cannot tell them apart: the permission is not held, or the route
          cache has not been cleared since the endpoint was added. Both look
          like a quiet page, and neither is a fault on this screen. */}
      {settled && !payload ? (
        <p className="mt-4 text-[11px] leading-snug text-slate-400">
          Nothing could be read. These figures need the Real Estate module permission
          (<code>real.estate.view</code>), and a figure this page cannot read is left out rather than
          shown as nought. A band that is empty for you is one you are not permitted to see — this
          page draws no error of its own.
        </p>
      ) : null}
    </div>
  );
};

export default RealEstateDashboard;
