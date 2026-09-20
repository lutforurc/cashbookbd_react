import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  FaBalanceScale,
  FaBoxes,
  FaChartLine,
  FaFileInvoiceDollar,
  FaSnowflake,
  FaTruckLoading,
} from 'react-icons/fa';

import HelmetTitle from '../../utils/others/HelmetTitle';
import httpService from '../../services/httpService';
import { hasPermission } from '../../utils/permissionChecker';
import { formatDayMonthYear } from '../../utils/utils-functions/formatDate';
import { API_TRADING_DASHBOARD_URL } from '../../services/apiRoutes';
import { getDashboard, getDashboardSummary } from './dashboardSlice';
import { getMonthlyPurchaseSales } from './chartSlice';
import KpiRow, { TRADING_TILES } from './KpiRow';
import DueAgingCard from './DueAgingCard';
import BalanceSummaryCard from './BalanceSummaryCard';
import MonthlyPurchaseSalesChart from './MonthlyPurchaseSalesChart';
import DashboardCustomizeButton, {
  DashboardWidget,
  useDashboardCustomization,
} from './dashboardCustomization';
import { CARD, CARD_HEAD, Tile, count, money, share } from './dashboardKit';

/**
 * The dashboard a trader opens the morning on: goods in, goods out, and what
 * the difference was worth.
 *
 * ⚠️ IT REPLACES THE SHOP'S, it does not decorate it. Until now a branch whose
 * business type says "Trade Business" was handed the generic page — Today
 * Sales, Today Purchase, New Customers, Low Stock — which answers what happened
 * *today* and nothing about the two questions a trader actually runs the
 * business on: what is my godown worth, and did this month's selling make
 * anything. Those are the bands below.
 *
 * ⚠️ ONE PAYLOAD, TWO KINDS OF FIGURE, and the screen says which is which where
 * they are read.
 *
 *   Stock value and the two ageing columns are POSITIONS on the day being
 *   looked at. "4,20,000 of stock" is a fact about now, not about the 1st to
 *   the 19th, and ranging it would report a branch's whole godown as this
 *   month's arrivals — which is why those bands carry no date range in their
 *   own headers and say "as at" where the figure is.
 *
 *   Gross profit and the top-items table are FLOWS and honour the range in the
 *   page header.
 *
 * ⚠️ TODAY'S SALES, TODAY'S PURCHASE AND TODAY'S CASH ARE NOT COMPUTED HERE.
 * They come from getDashboardSummary(), the same call the shop dashboard makes,
 * and are drawn by the same KpiRow — so those four tiles read identically on
 * both pages and there is one rule behind them rather than two. The month-by-
 * month chart is likewise the shop's own component over the shop's own
 * endpoint. What this page adds is the four bands the shop cannot answer.
 *
 * ⚠️ THE PROFIT FIGURE HAS A KNOWN CEILING, and the foot of the page says so.
 * It is derived on the fly from the purchase layers rather than by rebuilding
 * product_opening_stock the way Product Profit/Loss does. On whole units the
 * two agree; on fractional receipts that report's row-counting approximation
 * under-collects and this page is the correct one. A dashboard that disagreed
 * with a report in silence would be worse than either.
 *
 * ⚠️ A BAND THAT CANNOT BE READ DISAPPEARS — it never shows an error. A refusal
 * (the branch does not trade, the route cache has not been cleared since the
 * endpoint was added) leaves the bands out and draws nothing red. The note at
 * the foot says which of the two it is.
 */

/*
 * ⚠️ ONE ITEM PER CARD, NOT ONE PER BAND. A band on this page is four tiles in a
 * row with a card under them, and a single switch for the lot meant turning off
 * "Not sold in 90 days" also took the godown's value off the screen.
 *
 * The band words ('stock', 'profit', 'top-profit') survive as PERMISSION scopes
 * — see PERMISSION_BY_BAND — so a card id is read by prefix: `stock-*` is the
 * godown's door. Everything else in the id is only the gate's name.
 */
const TRADING_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'kpi-sales', title: 'Today Sales' },
  { id: 'kpi-purchase', title: 'Today Purchase' },
  { id: 'kpi-received', title: 'Today Received' },
  { id: 'kpi-payment', title: 'Today Payment' },
  { id: 'stock-value', title: 'Stock Value' },
  { id: 'stock-qty', title: 'Quantity on Hand' },
  { id: 'stock-lines', title: 'Lines in Stock' },
  { id: 'stock-dead', title: 'Not Sold Lately' },
  { id: 'money-asleep', title: 'Money Asleep' },
  { id: 'profit-sales', title: 'Sales' },
  { id: 'profit-cogs', title: 'Cost of Goods' },
  { id: 'profit-variance', title: 'Purchase Variance' },
  { id: 'profit-gross', title: 'Gross Profit' },
  { id: 'profit-margin', title: 'Margin' },
  { id: 'dues-balance', title: 'Cash Book' },
  { id: 'dues-receivable', title: 'Receivable Ageing' },
  { id: 'dues-payable', title: 'Payable Ageing' },
  { id: 'dues-net', title: 'Net Position' },
  { id: 'top-profit', title: 'What Made the Money' },
  { id: 'monthly-purchase-sales', title: 'Monthly Purchase Sales Chart' },
];

const asText = (date: Date) => {
  // Local parts, never toISOString(): which vouchers fall inside "this month"
  // is a calendar question at the desk, and going through UTC moves the
  // boundary a day for half the world — and takes a month's vouchers with it.
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * A quantity, not a count.
 *
 * ⚠️ NOT count(). A count is whole things — units, parties, invoices — and
 * truncating is right for all of them. A quantity is a weight as often as it is
 * a number of pieces, and this trade moves goods by the kilo: 43,294,476.00 of
 * something on this branch's own books. Rounding that to a whole number would
 * quietly report a godown that does not add up, and a trader checks it against
 * the stock report row by row.
 */
const qty = (value: number | null | undefined) => {
  const amount = Number(value ?? 0);
  return amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

/**
 * What a list of rows is worth together.
 *
 * ⚠️ The rows the server sent, not all the rows there are. The dead list is cut
 * to five, so this is the total of the five on screen and the footer beside it
 * says which five — a subtotal presented as a whole is the error the footer
 * exists to prevent.
 */
const listedValue = (rows: any[], key: string) =>
  rows.reduce((sum, row) => sum + Number(row?.[key] || 0), 0);

const TradingDashboard = () => {
  const dispatch = useDispatch<any>();

  const currentBranch = useSelector((state: any) => state.branchList?.currentBranch);
  const summary = useSelector((state: any) => state.dashboard?.summary);
  const me = useSelector((state: any) => state.auth?.me);
  const permissions = useSelector((state: any) => state.settings?.data?.permissions) ?? [];

  const summaryData = summary?.data;
  const branchId = currentBranch?.id;

  /*
   * ⚠️ THE GODOWN, THE MARGIN AND THE TOP TABLE ARE THE OWNER'S FIGURES. The
   * server already leaves `stock`, `profit` and `top` out of the payload
   * without the matching permission; this is the same door on the customize
   * list, so the widgets are not offered as switches that would toggle nothing.
   */
  const PERMISSION_BY_BAND: Record<string, string> = {
    stock: 'dashboard.stock.view',
    profit: 'dashboard.profit.view',
    'top-profit': 'dashboard.top.profit.view',
  };
  /*
   * ⚠️ BY PREFIX, because the list is cards now and the permissions are still
   * per band: `stock-dead` is the godown's door and `profit-margin` the margin's.
   * Twenty ids written against three permissions would be twenty places to
   * forget one, and a card whose permission was forgotten is offered as a switch
   * that toggles nothing.
   */
  const isPermitted = (id: string) =>
    Object.entries(PERMISSION_BY_BAND).every(
      ([band, permission]) =>
        !(id === band || id.startsWith(`${band}-`)) ||
        hasPermission(permissions, permission),
    );
  const widgets = TRADING_DASHBOARD_WIDGETS.filter((w) => isPermitted(w.id));

  const [payload, setPayload] = useState<any>(null);
  /**
   * ⚠️ "Nothing has answered yet" and "nothing answered at all" are different
   * pages, and without this they render the same. The note at the foot claims a
   * band was left out rather than shown empty, and it has no business saying
   * that while the request is still in the air.
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
    `cashbook-trading-dashboard:${me?.id || 'user'}:${branchId || 'branch'}`,
    widgets,
    {
      dashboardKey: 'trading',
      branchId,
      enabled: Boolean(me?.id && branchId),
    },
  );

  /** The day's tiles, minus the ones switched off. One id per tile, `kpi-<key>`. */
  const kpiTiles = TRADING_TILES.filter((tile) => isWidgetVisible(`kpi-${tile.key}`));

  /**
   * Whether any card in a row is still on.
   *
   * ⚠️ Asked before drawing the row, not after. A grid with nothing in it is
   * still a block with a bottom margin, so a row whose every card is switched
   * off would leave a hole in the page rather than close up.
   */
  const anyVisible = (...ids: string[]) => ids.some((id) => isWidgetVisible(id));

  const isCompact = density === 'compact';
  const gap = isCompact ? 'gap-3' : 'gap-4';
  const rowClass = isCompact ? 'px-4 py-2' : 'px-4 py-2.5';

  useEffect(() => {
    dispatch(getDashboard()); // the cash-book card's figures
    dispatch(getDashboardSummary());
    dispatch(getMonthlyPurchaseSales());
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
     * margin and the top-items table are summed over the same vouchers, and the
     * stock value and the dead list come off the same layer walk. The browser
     * sums neither.
     *
     * ⚠️ The empty catch is the behaviour, not a swallowed bug — see the header.
     */
    httpService
      .get(API_TRADING_DASHBOARD_URL, {
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

  const stock = payload?.stock;
  const profit = payload?.profit;
  const dues = payload?.dues;
  const top: any[] = Array.isArray(payload?.top) ? payload.top : [];

  const dead: any[] = Array.isArray(stock?.dead) ? stock.dead : [];
  const deadDays = Number(stock?.dead_days ?? 60);

  /** What the five listed lines made between them. */
  const topProfit = listedValue(top, 'profit');

  /*
   * A margin on no sales is not nought per cent, it is a question with no
   * answer — and the server sends null rather than 0 for exactly that reason.
   * Printing "0%" there would read as "sold at cost", which is a claim.
   */
  const margin = profit?.margin === null || profit?.margin === undefined ? '—' : `${profit.margin}%`;

  /*
   * What the purchase bills said over what the godown took in.
   *
   * ⚠️ THE BAND GROWS A TILE ONLY WHEN THERE IS SOMETHING TO SAY. Goods are
   * bought by the bill and received by the weighbridge, and on most months the
   * two agree — a permanent tile reading 0 would sit there every month to be
   * read once. When they do not agree the tile appears, and it is positive when
   * more was billed than arrived, which is the direction that costs money.
   */
  const variance = Number(profit?.variance || 0);

  return (
    <div>
      <HelmetTitle title="Dashboard" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-700 dark:text-slate-100">
            {currentBranch?.name || 'The trade'}
          </h1>
          <p className="text-xs text-slate-400">
            {payload?.from && payload?.to
              ? `This month so far · ${formatDayMonthYear(payload.from)} to ${formatDayMonthYear(
                  payload.to,
                )}`
              : 'Reading the godown…'}
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
      {/* Today. The shop's own call and the shop's own tiles, so these four
          read the same on both pages. */}
      {kpiTiles.length ? (
        <div className="mb-4">
          <KpiRow
            kpis={summaryData?.kpis}
            isLoading={summary?.isLoading}
            trxDate={summaryData?.trxDate}
            gapClass={gap}
            tiles={kpiTiles}
          />
        </div>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* The godown. A POSITION on the day, not the month — see the header. */}
      {stock ? (
        <>
          {anyVisible('stock-value', 'stock-qty', 'stock-lines', 'stock-dead') ? (
            <div className={`mb-4 grid grid-cols-2 sm:grid-cols-4 ${gap}`}>
              {/* ⚠️ The lead figure. Quantity flatters — a lakh of units of a
                  cheap line and a thousand of an expensive one are the same
                  number of items and nothing like the same money — and the count
                  of items says only how long the list is. What the godown is
                  worth is the figure that decides whether the month was real. */}
              {isWidgetVisible('stock-value') ? (
                <Tile
                  label="Stock value"
                  value={money(stock.value)}
                  working="at what it cost, as at today"
                  icon={<FaBoxes className="text-[11px] text-slate-400" />}
                  lead
                  tone="text-primary dark:text-secondary"
                  hint="Purchase cost of what is still on hand — not what it would sell for"
                />
              ) : null}
              {isWidgetVisible('stock-qty') ? (
                <Tile
                  label="Quantity on hand"
                  value={qty(stock.qty)}
                  working="across every line held"
                  icon={<FaTruckLoading className="text-[11px] text-slate-400" />}
                />
              ) : null}
              {isWidgetVisible('stock-lines') ? (
                <Tile
                  label="Lines in stock"
                  value={count(stock.items)}
                  working="products with something on the floor"
                  icon={<FaFileInvoiceDollar className="text-[11px] text-slate-400" />}
                />
              ) : null}
              {/* ⚠️ The tile a trader actually acts on. Stock that is standing
                  there, worth money, and has not sold in two months is money
                  asleep, and the figure is only useful beside the list below. */}
              {isWidgetVisible('stock-dead') ? (
                <Tile
                  label={`Not sold in ${deadDays} days`}
                  value={money(stock.dead_value)}
                  working={`${count(stock.dead_items)} ${
                    Number(stock.dead_items) === 1 ? 'line' : 'lines'
                  } sitting still`}
                  icon={<FaSnowflake className="text-[11px] text-sky-500" />}
                  tone={
                    Number(stock.dead_value) > 0 ? 'text-amber-600 dark:text-amber-400' : undefined
                  }
                />
              ) : null}
            </div>
          ) : null}

          {isWidgetVisible('money-asleep') && dead.length > 0 ? (
            <div className={`mb-4 grid grid-cols-1 ${gap} lg:grid-cols-2`}>
              <div className={CARD}>
                <div className={CARD_HEAD}>
                  <span className="truncate">Money Asleep</span>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {deadDays}+ days
                  </span>
                </div>

                <ul className="divide-y divide-slate-100 dark:divide-gray-700">
                  {dead.map((item) => (
                    <li
                      key={item.id}
                      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 ${rowClass} text-[12px] transition hover:bg-slate-50 dark:hover:bg-gray-700/50`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-700 dark:text-slate-100">
                          {item.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {qty(item.qty)} on hand · {/* ⚠️ "never" is a different
                          claim from "a long time ago", and a product nobody has
                          ever bought is the one most likely to be a buying
                          mistake — so it is said in words rather than as a
                          number of days nobody can check. */}
                          {item.idle_days === null || item.idle_days === undefined
                            ? 'never sold'
                            : `last sold ${count(item.idle_days)} days ago`}
                        </p>
                      </div>
                      <span className="text-right font-bold tabular-nums text-amber-600 dark:text-amber-400">
                        {money(item.value)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div
                  className={`mt-auto flex items-center justify-between border-t border-[rgb(var(--c-border))] bg-slate-50 ${rowClass} text-[12px] font-bold dark:bg-gray-700/50`}
                >
                  <span className="text-slate-500 dark:text-slate-300">
                    {dead.length < Number(stock.dead_items)
                      ? `Worst ${dead.length} of ${count(stock.dead_items)}`
                      : 'All of it'}
                  </span>
                  <span className="tabular-nums text-amber-600 dark:text-amber-400">
                    {money(listedValue(dead, 'value'))}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* The month's selling. A FLOW, so it honours the range above. */}
      {profit &&
      anyVisible('profit-sales', 'profit-cogs', 'profit-variance', 'profit-gross', 'profit-margin') ? (
        <div
          className={`mb-4 mt-4 grid grid-cols-2 ${
            variance !== 0 ? 'sm:grid-cols-3 lg:grid-cols-5' : 'sm:grid-cols-4'
          } ${gap}`}
        >
            {isWidgetVisible('profit-sales') ? (
              <Tile
                label="Sales"
                value={money(profit.sales)}
                working={`${count(profit.invoices)} ${
                  Number(profit.invoices) === 1 ? 'invoice' : 'invoices'
                } · ${qty(profit.sold_qty)} billed`}
                icon={<FaFileInvoiceDollar className="text-[11px] text-slate-400" />}
              />
            ) : null}
            {isWidgetVisible('profit-cogs') ? (
              <Tile
                label="Cost of goods"
                value={money(profit.cogs)}
                working="what the goods that left had cost to buy"
                icon={<FaTruckLoading className="text-[11px] text-slate-400" />}
              />
            ) : null}
            {/* ⚠️ Its own tile, and only when it is not nought. The bill is
                written for what was loaded and the godown for what was weighed,
                and the money left at the bill — so this is real cost that the
                layers above never carried. Folded silently into the cost of
                goods it would be invisible, which is how a month of quiet
                shortage stays unnoticed for a year. */}
            {isWidgetVisible('profit-variance') && variance !== 0 ? (
              <Tile
                label="Purchase variance"
                value={money(variance)}
                working={`${variance > 0 ? 'short' : 'over'} on ${money(
                  profit.purchase_billed,
                )} billed`}
                icon={<FaBalanceScale className="text-[11px] text-slate-400" />}
                tone={
                  variance > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
                hint="What this period's purchase bills put on the books, less what the godown took in. Positive means more was paid for than arrived — normal trading, in either direction, and the reason this band's gross profit matches the Profit & Loss report."
              />
            ) : null}
            {/* ⚠️ The lead figure, and the one the band exists for. Sales alone
                is quoted as success by anyone who has not seen this number, and
                a month can sell a great deal and make nothing. */}
            {isWidgetVisible('profit-gross') ? (
              <Tile
                label="Gross profit"
                value={money(profit.gross)}
                working={`sales less cost${variance !== 0 ? ', less purchase variance' : ''}`}
                lead
                tone={
                  Number(profit.gross) < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
              />
            ) : null}
            {isWidgetVisible('profit-margin') ? (
              <Tile
                label="Margin"
                value={margin}
                working="before rent, salary and every other expense"
                icon={<FaChartLine className="text-[11px] text-slate-400" />}
                hint="Gross profit as a share of sales. Rent, wages and everything else are not deducted"
              />
            ) : null}
          </div>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* The cash book beside both books at once. A trader is chased by their
          own suppliers, so the supplier column is not decoration. */}
      {dues &&
      anyVisible('dues-balance', 'dues-receivable', 'dues-payable', 'dues-net') ? (
        <>
          {anyVisible('dues-balance', 'dues-receivable', 'dues-payable') ? (
            <div className={`mb-1 grid grid-cols-1 items-stretch ${gap} md:grid-cols-3`}>
              {isWidgetVisible('dues-balance') ? <BalanceSummaryCard rowClass={rowClass} /> : null}
              {isWidgetVisible('dues-receivable') ? (
                <DueAgingCard aging={dues.receivable} />
              ) : null}
              {/* ⚠️ The words are passed, not defaulted. The same four buckets
                  mean the opposite thing on this side: money the branch owes and
                  somebody has to pay. A card headed "Receivable Ageing" over the
                  supplier book would be read as money coming in, and "1,20,000 to
                  chase" against a supplier is a wrong instruction. */}
              {isWidgetVisible('dues-payable') ? (
                <DueAgingCard
                  aging={dues.payable}
                  title="Payable Ageing"
                  overdueLabel="to pay"
                  advanceLabel="Advance paid"
                />
              ) : null}
            </div>
          ) : null}

          {/* ⚠️ One figure under the two columns, because that is the question
              the two columns ask together and neither can answer alone: a book
              of 30,00,000 coming in against 29,00,000 going out is a healthy
              trade with nothing in the bank. Advances are NOT netted off —
              those parties are not these parties, and the note says so. */}
          {isWidgetVisible('dues-net') ? (
            <div
              className={`mb-4 flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700`}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <FaBalanceScale className="text-[11px]" />
                <span title="What customers owe this branch, less what this branch owes its suppliers. Amounts paid ahead are not set against these — a party in credit is a different party, and each side's advance is shown on its own card.">
                  Net position
                </span>
              </span>
              <span
                className={`text-lg font-bold tabular-nums ${
                  Number(dues.net) < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-700 dark:text-slate-100'
                }`}
              >
                {money(dues.net)}
              </span>
            </div>
          ) : null}
        </>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* ⚠️ BY PROFIT, NOT BY QUANTITY. The shop dashboard already lists top
          products by quantity, and the fastest-moving line is routinely the
          thinnest-margined one — reading that list as "what is working" buys
          more of the thing that pays least. Each row carries its own margin so
          the two can be told apart at a glance. */}
      {isWidgetVisible('top-profit') && top.length > 0 ? (
        <div className={`mb-4 ${CARD}`}>
          <div className={CARD_HEAD}>
            <span className="truncate">What Made the Money</span>
            <span className="shrink-0 text-[11px] font-normal text-slate-400">by profit</span>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-gray-700">
            {top.map((row, index) => (
              <li
                key={row.id}
                className={`grid grid-cols-[2rem_minmax(0,1fr)_auto_auto] items-center gap-2 ${rowClass} text-[12px] transition hover:bg-slate-50 dark:hover:bg-gray-700/50`}
              >
                <span className="text-[11px] font-bold tabular-nums text-slate-400 dark:text-slate-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-700 dark:text-slate-100">
                    {row.name}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {money(row.sales)} sold · {money(row.cogs)} cost
                  </p>
                </div>
                <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-slate-400">
                  {row.margin === null || row.margin === undefined ? '—' : `${row.margin}%`}
                </span>
                <span
                  className={`w-24 shrink-0 text-right font-bold tabular-nums ${
                    Number(row.profit) < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {money(row.profit)}
                </span>
              </li>
            ))}
          </ul>

          <div
            className={`mt-auto flex items-center justify-between border-t border-[rgb(var(--c-border))] bg-slate-50 ${rowClass} text-[12px] dark:bg-gray-700/50`}
          >
            {/* ⚠️ The footer says how much of the month these rows are, because
                five rows above a big number reads as the whole of it. A line
                that lost money is worth seeing sooner than a thin profit, so
                the five are the five best — and on a month that went wrong the
                best of them can still be a loss. */}
            <span className="text-slate-500 dark:text-slate-300">
              Top {top.length}
              {/* ⚠️ A share of a NEGATIVE gross is not a share of anything —
                  percent-of-a-loss reads as a percent of a profit and would be
                  the wrong number with the right sign. Said only when there is
                  a profit for these rows to be a share of. */}
              {profit && Number(profit.gross) > 0
                ? ` · ${share(topProfit, Number(profit.gross))}% of gross profit`
                : ''}
            </span>
            <span
              className={`font-bold tabular-nums ${
                topProfit < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {money(topProfit)}
            </span>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* The shop's own chart over the shop's own endpoint, so the shape of the
          year reads the same on both pages. */}
      {isWidgetVisible('monthly-purchase-sales') ? (
        <div className="mb-4">
          <MonthlyPurchaseSalesChart />
        </div>
      ) : null}

      {/* ⚠️ Said once, at the foot, rather than as an error on every band that
          came back empty. */}
      {settled && !payload ? (
        <p className="mt-4 text-[11px] leading-snug text-slate-400">
          Nothing could be read. These figures are served only to a branch that buys goods and sells
          them on, and a route cache that has not been cleared since the endpoint was added looks
          exactly like a branch that does not trade. Nothing here is drawn as nought — a figure this
          page could not read is left out.
        </p>
      ) : null}

      {/* ⚠️ And the one disagreement worth naming where the figure is read. The
          report is one link away and will not always agree to the paisa. */}
      {profit ? (
        <p className="mt-2 text-[11px] leading-snug text-slate-400">
          Gross profit is worked out from the purchase layers at the moment the page is opened, so
          it is the same for everyone looking at this branch and it does not write anything. Product
          Profit/Loss builds its layers afresh each run and can read a little differently on a line
          received in part units — on those, this page is the closer of the two.
        </p>
      ) : null}
    </div>
  );
};

export default TradingDashboard;
