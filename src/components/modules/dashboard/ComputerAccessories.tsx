import React, { useEffect } from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { useDispatch, useSelector } from 'react-redux';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getDashboard, getDashboardSummary } from './dashboardSlice';
import KpiRow, { KpiHeading, DEFAULT_TILES } from './KpiRow';
import DueAgingCard from './DueAgingCard';
import LowStockCard from './LowStockCard';
import StockValueCard from './StockValueCard';
import InstallmentDueCard from './InstallmentDueCard';
import BalanceSummaryCard from './BalanceSummaryCard';
import MonthlyPurchaseSalesChart from './MonthlyPurchaseSalesChart';
import DailyPurchaseChart from './DailyPurchaseChart';
import DailySalesChart from './DailySalesChart';
import { getMonthlyPurchaseSales } from './chartSlice';
import DashboardCustomizeButton, {
  DashboardWidget,
  useDashboardCustomization,
} from './dashboardCustomization';

/*
 * ⚠️ ONE ITEM PER TILE, NOT ONE PER ROW. The four KPI tiles sit in one band, and
 * a single switch for the lot meant turning off "New Customers" also took
 * Today's Sales off the screen. Each tile in the band is its own switch now, so
 * the ids below are `kpi-<key>` against the specs KpiRow exports as
 * DEFAULT_TILES.
 */
const NORMAL_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'kpi-sales', title: 'Today Sales' },
  { id: 'kpi-purchase', title: 'Today Purchase' },
  { id: 'kpi-newCustomers', title: 'New Customers' },
  { id: 'kpi-vouchers', title: 'Today Vouchers' },
  { id: 'summary', title: 'Balance Summary' },
  { id: 'due-aging', title: 'Receivable Ageing' },
  { id: 'payable-aging', title: 'Payable Ageing' },
  { id: 'low-stock', title: 'Low Stock' },
  { id: 'stock-value', title: 'Stock on Hand' },
  { id: 'installments', title: 'Installments Due' },
  { id: 'top-sales', title: 'Top Sales Products' },
  { id: 'top-purchase', title: 'Top Purchase Products' },
  { id: 'daily-sales', title: 'Daily Sales Chart' },
  { id: 'daily-purchase', title: 'Daily Purchase Chart' },
  { id: 'monthly-purchase-sales', title: 'Monthly Purchase Sales Chart' },
];

const ComputerAccessories = () => {
  const currentBranch = useSelector((s: any) => s.branchList.currentBranch);
  const me = useSelector((s: any) => s.auth?.me);
  const { purchaseSales } = useSelector((state) => state.charts);
  const dispatch = useDispatch();
  const topProductsSales = purchaseSales?.data?.data?.topProductsSales || [];
  const topProductsPurchase = purchaseSales?.data?.data?.topProductsPurchase || [];
  const sum = (rows: any[], key: string) =>
    rows.reduce((total, item) => total + Number(item?.[key] || 0), 0);
  const topProductsSalesQty = sum(topProductsSales, 'qty');
  const topProductsSalesAmount = sum(topProductsSales, 'amount');
  const topProductsPurchaseQty = sum(topProductsPurchase, 'qty');
  const topProductsPurchaseAmount = sum(topProductsPurchase, 'amount');

  /*
   * ⚠️ THE WINDOWS COME FROM THE PAYLOAD, NOT FROM THE BRANCH SETTING.
   *
   * The badges used to be painted from `settings`, which falls back to 7 when
   * the branch has never set one — while the server falls back to 1. A branch
   * that had never opened this screen therefore read "7 Days" over a list of
   * one day's sales, and the label was wrong in the direction nobody checks.
   * The two cards also read the same setting, so the purchase list was labelled
   * with the sales window. Whatever the server actually windowed is what the
   * badge now says; a payload from an older server shows no badge rather than a
   * wrong one.
   */
  const daysLabel = (days: unknown) => {
    if (days == null || days === '') return null;
    const n = Number(days);
    if (!n) return null;
    return n === 1 ? 'Today' : `${n} Days`;
  };
  const salesDaysLabel = daysLabel(purchaseSales?.data?.data?.topProductDays);
  const purchaseDaysLabel = daysLabel(purchaseSales?.data?.data?.topPurchaseDays);

  // Index, name, quantity, money. Shared with the footer so the two totals sit
  // under the columns they add up.
  const ROW_GRID =
    'grid grid-cols-[1.75rem_minmax(0,1fr)_4.25rem_5rem] items-center gap-2';
  const {
    density,
    orderedWidgets,
    visibleWidgets,
    isWidgetVisible,
    toggleWidget,
    moveWidget,
    setDensity,
    reset,
  } = useDashboardCustomization(
    `cashbook-normal-dashboard:${me?.id || 'user'}:${currentBranch?.id || 'branch'}`,
    NORMAL_DASHBOARD_WIDGETS,
    {
      dashboardKey: 'normal',
      branchId: currentBranch?.id,
      enabled: Boolean(me?.id && currentBranch?.id),
    },
  );
  const isCompact = density === 'compact';
  const cardRowClass = isCompact ? 'px-4 py-2' : 'px-4 py-2.5';
  const listRowClass = isCompact ? 'px-4 py-2' : 'px-4 py-2.5';
  // Feeds both the KPI row and the widget grid, so the two stay aligned.
  const dashboardGapClass = isCompact ? 'gap-3' : 'gap-4';

  /** The day's tiles, minus the ones switched off. One id per tile, `kpi-<key>`. */
  const kpiTiles = DEFAULT_TILES.filter((tile) => isWidgetVisible(`kpi-${tile.key}`));

  const summary = useSelector((s: any) => s.dashboard?.summary);
  const summaryData = summary?.data;

  useEffect(() => {
    dispatch(getDashboard());
    dispatch(getMonthlyPurchaseSales());
    dispatch(getDashboardSummary());
  }, []);
 

  return (
    <div>
      <HelmetTitle title="Dashboard" />
      <div className="mb-4">
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

      {kpiTiles.length > 0 && <KpiHeading trxDate={summaryData?.trxDate} />}


      {/* items-stretch, not items-start: every card in a row ends at the same
          line. Each card is a flex column with its footer on mt-auto, so the
          extra height goes to the body and the footers stay aligned too. */}
      <div className={`grid grid-cols-1 items-stretch ${dashboardGapClass} md:grid-cols-2 md:text-xs lg:grid-cols-3 xl:grid-cols-4`}>
        {/* ⚠️ NO isLoading GATE OVER THE WHOLE GRID. It used to hold back every
            card until /dashboard/data came back, so a slow request, a failed
            one or a branch whose payload never arrived left the page blank
            under the KPI row -- including the cards fed by a completely
            different endpoint. Each card waits for its own data now. */}
        {visibleWidgets.map((widget) => {
            const tile = DEFAULT_TILES.find(tile => widget.id === `kpi-${tile.key}`);
            if (tile) return <KpiRow key={widget.id} embedded kpis={summaryData?.kpis} isLoading={summary?.isLoading} tiles={[tile]} />;
            if (widget.id === 'summary') {
              return <BalanceSummaryCard key={widget.id} rowClass={cardRowClass} />;
            }

            if (widget.id === 'due-aging') {
              return (
                <DueAgingCard
                  key={widget.id}
                  aging={summaryData?.dueAging}
                  isLoading={summary?.isLoading}
                />
              );
            }

            if (widget.id === 'payable-aging') {
              return (
                <DueAgingCard
                  key={widget.id}
                  aging={summaryData?.payableAging}
                  isLoading={summary?.isLoading}
                  title="Payable Ageing"
                  overdueLabel="to pay"
                  advanceLabel="Advance paid"
                />
              );
            }

            if (widget.id === 'low-stock') {
              return (
                <LowStockCard
                  key={widget.id}
                  lowStock={summaryData?.lowStock}
                  isLoading={summary?.isLoading}
                />
              );
            }

            if (widget.id === 'stock-value') {
              return (
                <StockValueCard
                  key={widget.id}
                  stock={summaryData?.stock}
                  isLoading={summary?.isLoading}
                />
              );
            }

            if (widget.id === 'installments') {
              return (
                <InstallmentDueCard
                  key={widget.id}
                  installments={summaryData?.installments}
                  isLoading={summary?.isLoading}
                />
              );
            }

            if (widget.id === 'top-sales') {
              return (
              <div key={widget.id} className="relative flex flex-col overflow-hidden bg-white text-[rgb(var(--c-text))] shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:text-[rgb(var(--c-text))] dark:ring-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
                  <span className="truncate text-sm font-bold">
                    Top Sales Products
                  </span>
                  {salesDaysLabel && (
                    <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                      {salesDaysLabel}
                    </span>
                  )}
                </div>
                {/* Body */}
                <div className="hover-scrollbar max-h-72 overflow-y-auto">
                  {topProductsSales?.length > 0 ? (
                    <ul className="divide-y divide-slate-100 dark:divide-gray-700">
                      {topProductsSales.map(
                        (item, index) => {
                          const nameLength = item.name?.length || 0;
                          const fontClass =
                            nameLength <= 10
                              ? 'text-[12px]'
                              : nameLength <= 15
                                ? 'text-[11px]'
                                : 'text-[10px]';
                          return (
                            <li
                              key={item.product_id}
                              className={`${ROW_GRID} ${listRowClass} transition hover:bg-slate-50 dark:hover:bg-gray-700/50`}
                            >
                              <span className="text-[11px] font-bold tabular-nums text-slate-400 dark:text-slate-300">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <span
                                className={`min-w-0 truncate font-semibold ${fontClass}`}
                                title={item.name}
                              >
                                {item.name}
                              </span>
                              <span className={`text-right font-bold tabular-nums text-sky-600 dark:text-sky-300 ${fontClass}`}>
                                {thousandSeparator(Number(item.qty))}
                              </span>
                              {/* ⚠️ THE MONEY, BECAUSE THE UNITS LIE. A shop's
                                  best-selling line by units and its best-earning
                                  line are routinely two different products -- a
                                  phone case outsells a handset every week and
                                  does not pay the rent. The list stays ordered
                                  by quantity, which is what the card is titled;
                                  this column is where the reader sees the two
                                  answers disagree. */}
                              <span className={`text-right tabular-nums text-slate-500 dark:text-slate-300 ${fontClass}`}>
                                {thousandSeparator(Math.round(Number(item.amount) || 0))}
                              </span>
                            </li>
                          );
                        },
                      )}
                    </ul>
                  ) : (
                    <p className="px-4 py-6 text-center text-xs italic text-slate-400">
                      No sales found
                    </p>
                  )}
                </div>

                {/* Total sits on the card floor, not directly under the last
                    row. The cards stretch to a common height, so a total left
                    mid-card leaves an empty stretch below it. It keeps the
                    body's columns so each total lands under its own figure. */}
                <div className={`mt-auto ${ROW_GRID} border-t border-[rgb(var(--c-border))] bg-slate-50 ${listRowClass} font-bold dark:bg-gray-700/50`}>
                  <span className="col-span-2 text-[12px]">Total</span>
                  <span className="text-right text-[12px] tabular-nums text-sky-600 dark:text-sky-300">
                    {thousandSeparator(topProductsSalesQty)}
                  </span>
                  <span className="text-right text-[12px] tabular-nums text-slate-500 dark:text-slate-300">
                    {thousandSeparator(Math.round(topProductsSalesAmount))}
                  </span>
                </div>
              </div>
              );
            }

            if (widget.id === 'top-purchase') {
              return (
              <div key={widget.id} className="relative flex flex-col overflow-hidden bg-white text-[rgb(var(--c-text))] shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:text-[rgb(var(--c-text))] dark:ring-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
                  <span className="truncate text-sm font-bold">
                    Top Purchase Products
                  </span>
                  {purchaseDaysLabel && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      {purchaseDaysLabel}
                    </span>
                  )}
                </div>
                {/* Body */}
                <div className="hover-scrollbar max-h-72 overflow-y-auto">
                  {topProductsPurchase?.length > 0 ? (
                    <ul className="divide-y divide-slate-100 dark:divide-gray-700">
                      {topProductsPurchase.map(
                        (item, index) => {
                          const nameLength = item.name?.length || 0;
                          const fontClass =
                            nameLength <= 10
                              ? 'text-[12px]'
                              : nameLength <= 15
                                ? 'text-[11px]'
                                : 'text-[10px]';
                          return (
                            <li
                              key={item.product_id}
                              className={`${ROW_GRID} ${listRowClass} transition hover:bg-slate-50 dark:hover:bg-gray-700/50`}
                            >
                              <span className="text-[11px] font-bold tabular-nums text-slate-400 dark:text-slate-300">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <span
                                className={`min-w-0 truncate font-semibold ${fontClass}`}
                                title={item.name}
                              >
                                {item.name}
                              </span>
                              <span className={`text-right font-bold tabular-nums text-amber-600 dark:text-amber-300 ${fontClass}`}>
                                {thousandSeparator(Number(item.qty))}
                              </span>
                              <span className={`text-right tabular-nums text-slate-500 dark:text-slate-300 ${fontClass}`}>
                                {thousandSeparator(Math.round(Number(item.amount) || 0))}
                              </span>
                            </li>
                          );
                        },
                      )}
                    </ul>
                  ) : (
                    <p className="px-4 py-6 text-center text-xs italic text-slate-400">
                      No purchase found
                    </p>
                  )}
                </div>

                <div className={`mt-auto ${ROW_GRID} border-t border-[rgb(var(--c-border))] bg-slate-50 ${listRowClass} font-bold dark:bg-gray-700/50`}>
                  <span className="col-span-2 text-[12px]">Total</span>
                  <span className="text-right text-[12px] tabular-nums text-amber-600 dark:text-amber-300">
                    {thousandSeparator(topProductsPurchaseQty)}
                  </span>
                  <span className="text-right text-[12px] tabular-nums text-slate-500 dark:text-slate-300">
                    {thousandSeparator(Math.round(topProductsPurchaseAmount))}
                  </span>
                </div>
              </div>
              );
            }

            if (widget.id === 'daily-sales') {
              return (
                <div className="col-span-full" key={widget.id}>
                  <DailySalesChart />
                </div>
              );
            }

            if (widget.id === 'daily-purchase') {
              return (
                <div className="col-span-full" key={widget.id}>
                  <DailyPurchaseChart />
                </div>
              );
            }

            if (widget.id === 'monthly-purchase-sales') {
              return (
                <div className="col-span-full" key={widget.id}>
                  <MonthlyPurchaseSalesChart />
                </div>
              );
            }

            return null;
          })}
      </div>
    </div>
  );
};

export default ComputerAccessories;
