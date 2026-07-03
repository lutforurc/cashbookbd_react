import React, { useEffect } from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { useDispatch, useSelector } from 'react-redux';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getDashboard } from './dashboardSlice';
import MonthlyPurchaseSalesChart from './MonthlyPurchaseSalesChart';
import DailyPurchaseSalesChart from './DailyPurchaseChart';
import DailyPurchaseChart from './DailyPurchaseChart';
import DailySalesChart from './DailySalesChart';
import { getMonthlyPurchaseSales } from './chartSlice';
import {
  FaArrowDown,
  FaArrowUp,
  FaRegCalendarAlt,
  FaRegClock,
  FaWallet,
} from 'react-icons/fa';
import DashboardCustomizeButton, {
  DashboardWidget,
  useDashboardCustomization,
} from './dashboardCustomization';

const NORMAL_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'summary', title: 'Balance Summary' },
  { id: 'top-sales', title: 'Top Sales Products' },
  { id: 'top-purchase', title: 'Top Purchase Products' },
  { id: 'daily-sales', title: 'Daily Sales Chart' },
  { id: 'daily-purchase', title: 'Daily Purchase Chart' },
  { id: 'monthly-purchase-sales', title: 'Monthly Purchase Sales Chart' },
];

const ComputerAccessories = () => {
  const dashboard = useSelector((state) => state.dashboard);
  const settings = useSelector((s: any) => s.settings);
  const currentBranch = useSelector((s: any) => s.branchList.currentBranch);
  const me = useSelector((s: any) => s.auth?.me);
  const { purchaseSales, loading } = useSelector((state) => state.charts);
  const dispatch = useDispatch();
  const topProductsSales = purchaseSales?.data?.data?.topProductsSales || [];
  const topProductsPurchase = purchaseSales?.data?.data?.topProductsPurchase || [];
  const topProductsSalesTotal = topProductsSales.reduce(
    (sum, item) => sum + Number(item?.qty || 0),
    0,
  );
  const topProductsPurchaseTotal = topProductsPurchase.reduce(
    (sum, item) => sum + Number(item?.qty || 0),
    0,
  );
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
  const dashboardGapClass = isCompact ? 'gap-4' : 'gap-10';

  useEffect(() => {
    dispatch(getDashboard());
    dispatch(getMonthlyPurchaseSales());
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
      <div className={`grid grid-cols-1 items-start ${dashboardGapClass} md:grid-cols-2 md:text-xs lg:grid-cols-3 xl:grid-cols-4`}>
        {dashboard.isLoading == false &&
          visibleWidgets.map((widget) => {
            if (widget.id === 'summary') {
              return (
            <div key={widget.id} className="group relative flex flex-col overflow-hidden bg-white text-black shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300 dark:bg-gray-800 dark:text-white dark:ring-gray-700">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <span className="truncate text-sm font-bold tracking-wide text-slate-700 dark:text-slate-100">
                  {dashboard?.data &&
                    !dashboard.isLoading &&
                    dashboard?.data?.branch?.name}
                </span>
                <FaWallet className="shrink-0 text-indigo-500" />
              </div>

              <div className="divide-y divide-slate-100 dark:divide-gray-700">
                <div className={`flex items-center gap-3 ${cardRowClass}`}>
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

                <div className={`flex items-center gap-3 ${cardRowClass}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <FaArrowDown className="text-sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Today Received
                    </p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {dashboard?.data?.todayReceived?.debit > 0
                        ? thousandSeparator(
                            dashboard?.data?.todayReceived?.debit)
                        : 0}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-3 ${cardRowClass}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                    <FaArrowUp className="text-sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Today Payment
                    </p>
                    <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                      {dashboard?.data?.todayReceived?.credit > 0
                        ? thousandSeparator(
                            dashboard?.data?.todayReceived?.credit)
                        : 0}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-3 ${cardRowClass}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <FaWallet className="text-sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Balance
                    </p>
                    <p className="text-base font-bold text-indigo-600 dark:text-indigo-300">
                      {dashboard?.data &&
                        !dashboard.isLoading &&
                        thousandSeparator(
                          (Number(dashboard?.data?.totalTransaction?.debit) ||
                            0) -
                            (Number(dashboard?.data?.totalTransaction?.credit) ||
                              0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-1.5 bg-slate-50 px-4 py-2 text-xs text-slate-400 dark:bg-gray-700/50 dark:text-slate-400">
                <FaRegClock className="text-[11px]" />
                <span>
                  Last updated: {dashboard?.data?.last_update}
                </span>
              </div>
            </div>
              );
            }

            if (widget.id === 'top-sales' && topProductsSales?.length > 0) {
              return (
              <div key={widget.id} className="relative flex flex-col overflow-hidden border border-slate-200 bg-white text-black shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-gray-600">
                  <span className="truncate text-sm font-bold">
                    Top Sales Products
                  </span>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                    {settings?.data?.branch?.dashboard_top_sales_days == 1 ? 'Today' : `${settings?.data?.branch?.dashboard_top_sales_days || 7} Days`}
                  </span>
                </div>
                {/* Body */}
                <div className="hover-scrollbar max-h-72 overflow-y-auto">
                  {topProductsSales?.length > 0 ? (
                    <ul className="divide-y divide-slate-200 dark:divide-gray-600">
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
                              className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 ${listRowClass} transition hover:bg-slate-50 dark:hover:bg-gray-600/45`}
                            >
                              <span className="text-[11px] font-bold tabular-nums text-slate-400 dark:text-slate-300">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <span
                                className={`min-w-0 truncate font-semibold ${fontClass}`}
                              >
                                {item.name}
                              </span>
                              <span className={`text-right font-bold tabular-nums text-sky-600 dark:text-sky-300 ${fontClass}`}>
                                {thousandSeparator(Number(item.qty))}
                              </span>
                            </li>
                          );
                        },
                      )}
                      <li className={`flex items-center justify-between bg-slate-50 ${listRowClass} font-bold dark:bg-gray-800/35`}>
                        <span className="text-[12px]">Total</span>
                        <span className="text-[12px] tabular-nums text-sky-600 dark:text-sky-300">
                          {thousandSeparator(topProductsSalesTotal)}
                        </span>
                      </li>
                    </ul>
                  ) : (
                    <p className="text-sm italic text-gray-500 dark:text-gray-300">
                      No sales found
                    </p>
                  )}
                </div>
              </div>
              );
            }

            if (widget.id === 'top-purchase' && topProductsPurchase?.length > 0) {
              return (
              <div key={widget.id} className="relative flex flex-col overflow-hidden border border-slate-200 bg-white text-black shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-gray-600">
                  <span className="truncate text-sm font-bold">
                    Top Purchase Products
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {settings?.data?.branch?.dashboard_top_sales_days == 1 ? 'Today' : `${settings?.data?.branch?.dashboard_top_sales_days || 7} Days`}
                  </span>
                </div>
                {/* Body */}
                <div className="hover-scrollbar max-h-72 overflow-y-auto">
                  {topProductsPurchase?.length > 0 ? (
                    <ul className="divide-y divide-slate-200 dark:divide-gray-600">
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
                              className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 ${listRowClass} transition hover:bg-slate-50 dark:hover:bg-gray-600/45`}
                            >
                              <span className="text-[11px] font-bold tabular-nums text-slate-400 dark:text-slate-300">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <span
                                className={`min-w-0 truncate font-semibold ${fontClass}`}
                              >
                                {item.name}
                              </span>
                              <span className={`text-right font-bold tabular-nums text-amber-600 dark:text-amber-300 ${fontClass}`}>
                                {thousandSeparator(Number(item.qty))}
                              </span>
                            </li>
                          );
                        },
                      )}
                      <li className={`flex items-center justify-between bg-slate-50 ${listRowClass} font-bold dark:bg-gray-800/35`}>
                        <span className="text-[12px]">Total</span>
                        <span className="text-[12px] tabular-nums text-amber-600 dark:text-amber-300">
                          {thousandSeparator(topProductsPurchaseTotal)}
                        </span>
                      </li>
                    </ul>
                  ) : (
                    <p className="text-sm italic text-gray-500 dark:text-gray-300">
                      No sales found
                    </p>
                  )}
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
