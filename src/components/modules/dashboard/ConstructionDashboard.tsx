import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  dispatchRemittance,
  getDashboard,
  getDashboardSummary,
} from './dashboardSlice';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import HelmetTitle from '../../utils/others/HelmetTitle';
import TransactionChart from './TransactionChart';
import {
  FaCheckCircle,
  FaMinus,
  FaPlus,
  FaSpinner,
  FaArrowDown,
  FaArrowUp,
  FaWallet,
  FaRegClock,
  FaRegCalendarAlt,
  FaExclamationTriangle,
  FaRedoAlt,
  FaInbox,
} from 'react-icons/fa';
import { toast } from 'react-toastify';

import {
  getBranchChart,
  getHeadOfficeReceivedChart,
} from './chartSlice';
import HeadOfficePaymentChart from './HeadOfficePaymentChart';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { formatDate } from '../../utils/utils-functions/formatDate';
import { FaRightToBracket } from 'react-icons/fa6';
import CompareSingleItem from './CompareSingleItem';
import KpiRow, { CONSTRUCTION_TILES } from './KpiRow';
import Sparkline from './Sparkline';
import DashboardCustomizeButton, {
  DashboardWidget,
  useDashboardCustomization,
} from './dashboardCustomization';
import { Button } from '../../../pages/UiElements/CustomButtons';

const CONSTRUCTION_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'kpi-row', title: 'Today at a Glance' },
  { id: 'summary', title: 'Balance Summary' },
  { id: 'top-purchase', title: 'Top Purchase' },
  { id: 'receive-details', title: 'Receive Details' },
  { id: 'charts', title: 'Charts' },
];

const DASHBOARD_COLUMNS =
  'grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))]';

/**
 * The same track as DASHBOARD_COLUMNS but auto-fill rather than auto-fit.
 *
 * The band carries fewer tiles than the grid below carries cards, and auto-fit
 * collapses the tracks it has nothing to put in — two tiles would then stretch
 * across the whole width and tower over the cards underneath. auto-fill keeps
 * the empty tracks, so a tile stays the width of a card and the spare space
 * falls off the right-hand end.
 */
const KPI_COLUMNS =
  'grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))]';

const ConstructionDashboard = () => {
  const dashboard = useSelector((state) => state.dashboard);
  const dispatch = useDispatch();
  const settings = useSelector((s: any) => s.settings);
  const me = useSelector((s: any) => s.auth?.me);
  const currentBranch = useSelector((s: any) => s.branchList.currentBranch);
  const protectedBranches = useSelector(
    (s: any) => s.branchDdl?.protectedData?.data || [],
  );
  const summary = useSelector((s: any) => s.dashboard?.summary);
  const summaryData = summary?.data;
  const [displayMonth, setDisplayMonth] = useState<number | ''>('');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [loadingItems, setLoadingItems] = useState<{ [key: string]: boolean }>(
    {},
  ); // Track loading state per item
  const [successItems, setSuccessItems] = useState<{ [key: string]: boolean }>(
    {},
  ); // Track success state per item
  const [totalDebit, setTotalDebit] = useState(0); // State to store the total sum of debits
  const [expandedBranchKey, setExpandedBranchKey] = useState<string | null>(null);

  useEffect(() => {
    dispatch(getDashboard());
    // dispatch(getBranchChart());
    dispatch(getHeadOfficeReceivedChart());
    dispatch(getDdlProtectedBranch());
    dispatch(getDashboardSummary());
  }, []);

  const groupedReceiveDetails = useMemo(() => {
    return dashboard?.data?.receiveDetails?.receivedDetails || {};
  }, [dashboard?.data?.receiveDetails?.receivedDetails]);

  const isHeadOfficeBranch = currentBranch?.branch_types_id == 1;
  const hasReceiveDetails = Object.values(groupedReceiveDetails).some(
    (items): items is any[] => Array.isArray(items) && items.length > 0,
  );
  const {
    density,
    orderedWidgets,
    isWidgetVisible,
    toggleWidget,
    moveWidget,
    setDensity,
    reset,
  } = useDashboardCustomization(
    `cashbook-construction-dashboard:${me?.id || 'user'}:${currentBranch?.id || 'branch'}`,
    CONSTRUCTION_DASHBOARD_WIDGETS,
    {
      dashboardKey: 'construction',
      branchId: currentBranch?.id,
      enabled: Boolean(me?.id && currentBranch?.id),
    },
  );
  const isCompact = density === 'compact';
  const orderMap = useMemo(
    () => new Map(orderedWidgets.map((widget, index) => [widget.id, index])),
    [orderedWidgets],
  );
  const widgetOrder = (id: string) => orderMap.get(id) ?? 0;
  const dashboardGapClass = isCompact ? 'gap-4' : 'gap-6';
  const summaryRowClass = isCompact ? 'px-4 py-2' : 'px-4 py-2.5';
  const listRowClass = isCompact ? 'px-4 py-2.5' : 'px-4 py-3';
  const receiveDetailsRowClass = isCompact ? 'px-4 py-0.5' : 'px-4 py-1';
  const dashboardCardHeightClass = isCompact ? 'h-83' : 'h-87';
  const getReceiveDetailStatusKey = (item: any) =>
    String(item?.mtm_id ?? item?.vr_no ?? item?.id ?? '');

  const isRemittanceProcessed = (item: any) => {
    const rawStatus =
      item?.remittance ??
      item?.is_remittance ??
      item?.meta ??
      item?.status ??
      item?.is_received;

    if (typeof rawStatus === 'boolean') return rawStatus;
    if (typeof rawStatus === 'number') return rawStatus === 1;

    if (typeof rawStatus === 'string') {
      const normalized = rawStatus.trim().toLowerCase();

      if (!normalized || normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'null') {
        return false;
      }

      if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
        return true;
      }
    }

    return false;
  };

  const branchNameMap = useMemo(() => {
    const branchMap: Record<string, string> = {};

    if (Array.isArray(protectedBranches)) {
      protectedBranches.forEach((branch: any) => {
        if (branch?.id != null) {
          branchMap[String(branch.id)] =
            branch.name || branch.branch_name || branch.label || '';
        }
      });
    }

    if (dashboard?.data?.branch?.id != null && dashboard?.data?.branch?.name) {
      branchMap[String(dashboard.data.branch.id)] = dashboard.data.branch.name;
    }

    return branchMap;
  }, [protectedBranches, dashboard?.data?.branch]);

  useEffect(() => {
    const entries = Object.entries(groupedReceiveDetails).filter(
      ([, items]) => Array.isArray(items) && items.length > 0,
    );

    if (!entries.length) {
      setExpandedBranchKey(null);
      setTotalDebit(0);
      return;
    }

    setExpandedBranchKey((prev) => {
      if (!isHeadOfficeBranch) {
        return entries[0]?.[0] || null;
      }

      return prev && entries.some(([branchKey]) => branchKey === prev)
        ? prev
        : null;
    });

    const total = entries.reduce((sum, [, items]) => {
      const branchItems = Array.isArray(items) ? items : [];
      return (
        sum +
        branchItems.reduce(
          (branchSum: number, item: any) => branchSum + Number(item.debit || 0),
          0,
        )
      );
    }, 0);

    setTotalDebit(total);
  }, [groupedReceiveDetails, isHeadOfficeBranch]);

  useEffect(() => {
    const handleStorageChange = (event: any) => {
      // Check if the 'settings_updated' key was updated
      if (event.key === 'settings_updated') {
        //dispatch(getSettings()); // Fetch updated settings in the current tab
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dispatch]);

  const handleDisplayMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayMonth(Number(e.target.value));
  };
  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const handleChart = () => {
    let params: any = {
      month: displayMonth,
      branch: branchId,
    };

    dispatch(getBranchChart(params));
    // dispatch(getHeadOfficePaymentChart(params));
    // dispatch(getHeadOfficeReceivedChart(params));
  };

  const handleCheckCircleClick = (item: any) => {
    const itemKey = getReceiveDetailStatusKey(item);
    setLoadingItems((prev) => ({ ...prev, [itemKey]: true }));

    const params = {
      mtm_id: item.mtm_id,
      branch_id: item.branch_id,
      remarks: item.remarks,
      amount: item.debit,
    };

    dispatch(
      dispatchRemittance(params, function (message, success) {
        if (success) {
          toast.success(message);
          setSuccessItems((prev) => ({ ...prev, [itemKey]: true }));
        } else {
          toast.error(message);
        }
        setLoadingItems((prev) => ({ ...prev, [itemKey]: false }));
      }),
    );
  };

  const toggleBranchDetails = (branchKey: string) => {
    if (!isHeadOfficeBranch) return;

    setExpandedBranchKey((prev) => (prev === branchKey ? null : branchKey));
  };



 
  return (
    <>
      <HelmetTitle title="Construction Dashboard" />
      <div className="mt-6">
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
      {/* Above the grid rather than as one of its cards: it is a summary band,
          and a widget order saved before it existed would otherwise sink it to
          the bottom of the page for existing users. */}
      {isWidgetVisible('kpi-row') ? (
        <div className="mt-4">
          <KpiRow
            kpis={summaryData?.kpis}
            isLoading={summary?.isLoading}
            trxDate={summaryData?.trxDate}
            gapClass={dashboardGapClass}
            tiles={CONSTRUCTION_TILES}
            columnsClass={KPI_COLUMNS}
          />
        </div>
      ) : null}

      <div
        aria-busy={dashboard.isLoading}
        className={`mt-4 ${DASHBOARD_COLUMNS} items-start ${dashboardGapClass}`}
      >
        {dashboard.isLoading == false ? (
          <>
            {dashboard.errors ? (
              <div
                className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-lg border border-rose-200 bg-white px-6 py-12 text-center shadow-sm dark:border-rose-900/60 dark:bg-gray-800"
                role="alert"
              >
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-500 dark:bg-rose-900/30 dark:text-rose-400">
                  <FaExclamationTriangle />
                </span>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Unable to load dashboard data
                </h2>
                <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  {typeof dashboard.errors === 'string'
                    ? dashboard.errors
                    : 'Please try again.'}
                </p>
                <Button
                  className="mt-5 inline-flex items-center gap-2 rounded-md bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  onClick={() => dispatch(getDashboard())}
                  type="button"
                >
                  <FaRedoAlt className="text-xs" />
                  Try again
                </Button>
              </div>
            ) : null}

            {/* Branch summary card */}
            {!dashboard.errors && isWidgetVisible('summary') ? (
            <div
              className={`group relative flex min-w-0 flex-col overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300 dark:bg-gray-800 dark:ring-gray-700 ${dashboardCardHeightClass}`}
              style={{ order: widgetOrder('summary') }}
            >
              <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] bg-white px-4 py-3 dark:bg-gray-800">
                <span className="truncate text-sm font-bold tracking-wide text-slate-700 dark:text-slate-100">
                  {dashboard?.data &&
                    !dashboard.isLoading &&
                    dashboard?.data?.branch?.name}
                </span>
                <FaWallet className="shrink-0 text-indigo-500" />
              </div>

              <div className="divide-y divide-slate-100 dark:divide-gray-700">
                <div className={`flex items-center gap-3 ${summaryRowClass}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-slate-300">
                    <FaRegCalendarAlt className="text-sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Trx Date
                    </p>
                    <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-100">
                      {settings?.data?.trx_dt}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-3 ${summaryRowClass}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <FaArrowDown className="text-sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Today Received
                    </p>
                    <p className="truncate text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {dashboard?.data?.todayReceived?.debit > 0
                        ? thousandSeparator(dashboard?.data?.todayReceived?.debit)
                        : 0}
                    </p>
                  </div>
                  {/* h-12 rather than the h-16 the trading card uses: this card
                      is pinned to a fixed height, and three taller rows would
                      push its footer past the bottom edge. */}
                  <Sparkline
                    values={summaryData?.kpis?.received?.spark ?? []}
                    stroke="#10b981"
                    className="h-12 min-w-0 flex-1"
                    ariaLabel="Received over the last 14 days"
                  />
                </div>

                <div className={`flex items-center gap-3 ${summaryRowClass}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                    <FaArrowUp className="text-sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Today Payment
                    </p>
                    <p className="truncate text-base font-bold text-rose-600 dark:text-rose-400">
                      {dashboard?.data?.todayReceived?.credit > 0
                        ? thousandSeparator(dashboard?.data?.todayReceived?.credit)
                        : 0}
                    </p>
                  </div>
                  <Sparkline
                    values={summaryData?.kpis?.payment?.spark ?? []}
                    stroke="#f43f5e"
                    className="h-12 min-w-0 flex-1"
                    ariaLabel="Payment over the last 14 days"
                  />
                </div>

                <div className={`flex items-center gap-3 ${summaryRowClass}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <FaWallet className="text-sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Balance
                    </p>
                    <p className="truncate text-base font-bold text-indigo-600 dark:text-indigo-300">
                      {dashboard?.data &&
                        !dashboard.isLoading &&
                        thousandSeparator(
                          (Number(dashboard?.data?.totalTransaction?.debit) ||
                            0) -
                          (Number(dashboard?.data?.totalTransaction?.credit) ||
                            0))}
                    </p>
                  </div>
                  <Sparkline
                    values={summaryData?.kpis?.balance?.spark ?? []}
                    stroke="#6366f1"
                    className="h-12 min-w-0 flex-1"
                    ariaLabel="Balance over the last 14 days"
                  />
                </div>
              </div>

              <div className="mt-auto flex items-center gap-1.5 bg-slate-50 px-4 py-2 text-xs text-slate-400 dark:bg-gray-700/50 dark:text-slate-400">
                <FaRegClock className="text-[11px]" />
                <span className="min-w-0 truncate">
                  Last updated: {dashboard?.data?.last_update}
                </span>
              </div>
            </div>
            ) : null}

            {!dashboard.errors && isWidgetVisible('top-purchase') && dashboard?.data?.topProductsPurchase?.length > 0 && (
              <div
                className="relative flex min-w-0 flex-col overflow-hidden border border-[rgb(var(--c-border))] bg-white shadow-sm dark:bg-[rgb(var(--c-gray-800))]"
                style={{ order: widgetOrder('top-purchase') }}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3.5">
                  <span className="truncate text-base font-bold tracking-wide text-slate-700 dark:text-slate-100">
                    Top Purchase
                  </span>
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                    {settings?.data?.branch?.dashboard_top_sales_days == 1 ? 'Today' : `Last ${settings?.data?.branch?.dashboard_top_sales_days || 7} Days`}
                  </span>
                </div>
                {/* Body */}
                <div className="hover-scrollbar max-h-72 overflow-y-auto">
                  <ul className="divide-y divide-slate-200 dark:divide-slate-600/80">
                    {dashboard?.data?.topProductsPurchase.map(
                      (item: any, index: number) => {
                        const nameLength = item.name?.length || 0;
                        const fontClass =
                          nameLength <= 10
                            ? 'text-[13px]'
                            : nameLength <= 20
                              ? 'text-[12px]'
                              : 'text-[11px]';
                        return (
                          <li
                            key={item.product_id}
                            className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 ${listRowClass} transition hover:bg-slate-50 dark:hover:bg-slate-700/45`}
                          >
                            <span className="text-sm font-medium tabular-nums text-sky-500/70 dark:text-sky-300/60">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span
                              className={`min-w-0 flex-1 truncate font-bold text-slate-700 dark:text-slate-100 ${fontClass}`}
                            >
                              {item.name}
                            </span>
                            <span
                              className={`shrink-0 text-right font-bold tabular-nums text-yellow-500 dark:text-yellow-300 ${fontClass}`}
                            >
                              {thousandSeparator(Number(item.qty))}
                            </span>
                          </li>
                        );
                      },
                    )}
                  </ul>
                </div>
              </div>
            )}

            {!dashboard.errors && hasReceiveDetails && isWidgetVisible('receive-details') ? (
          <div
            className={`grid min-w-0 grid-cols-1 ${dashboardCardHeightClass}`}
            style={{ order: widgetOrder('receive-details') }}
          >
            <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700">
              <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] bg-white px-4 py-3 dark:bg-gray-800">
                <span className="min-w-0 flex-1 truncate pr-2 text-sm font-bold tracking-wide text-slate-700 dark:text-slate-100">
                  {!dashboard.isLoading && dashboard?.data?.transactionText}
                </span>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-sky-100 px-3 py-0.5 text-sm font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  {totalDebit ? `Tk. ${thousandSeparator(totalDebit)}` : '-'}
                </span>
              </div>
              <div className="hover-scrollbar min-h-0 flex-1 overflow-y-auto">
                {Object.entries(groupedReceiveDetails).map(([branchKey, items]) => {
                  if (!Array.isArray(items) || items.length === 0) {
                    return null;
                  }

                  const branchTotal = items.reduce(
                    (sum: number, item: any) => sum + Number(item.debit || 0),
                    0,
                  );
                  const isExpanded =
                    isHeadOfficeBranch ? expandedBranchKey === branchKey : true;
                  const branchName =
                    branchNameMap[branchKey] ||
                    `Branch ${branchKey}`;

                  return (
                    <div
                      className="border-b border-[rgb(var(--c-border))] last:border-b-0"
                      key={branchKey}
                    >
                      <Button
                        type="button"
                        onClick={() => toggleBranchDetails(branchKey)}
                        className={`w-full bg-slate-50 px-4 py-2.5 text-left transition hover:bg-slate-100 dark:bg-gray-700/40 dark:hover:bg-gray-700 ${
                          isHeadOfficeBranch ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs min-[462px]:text-sm">
                          <span className="min-w-0 flex-1 truncate font-semibold text-slate-700 dark:text-slate-100">
                            {branchName}
                          </span>
                          <span className="font-bold text-slate-800 whitespace-nowrap dark:text-[rgb(var(--c-text))]">
                            {thousandSeparator(branchTotal)}
                          </span>
                          <span className="w-5 text-right text-sky-600">
                            {isHeadOfficeBranch ? (
                              isExpanded ? (
                                <FaMinus className="inline-block text-xs" />
                              ) : (
                                <FaPlus className="inline-block text-xs" />
                              )
                            ) : null}
                          </span>
                        </div>
                      </Button>

                      {isExpanded && (
                        <div>
                          {items.map((item: any, index: number) => {
                            const itemKey = getReceiveDetailStatusKey(item);
                            const isProcessed =
                              isRemittanceProcessed(item) || successItems[itemKey];
                            const isLoading = Boolean(loadingItems[itemKey]);

                            return (
                              <div
                                className={`flex items-center gap-3 border-t border-[rgb(var(--c-border))] transition hover:bg-sky-50/50 dark:hover:bg-gray-700/40 ${receiveDetailsRowClass}`}
                                key={`${branchKey}-${itemKey}-${index}`}
                              >
                                <div className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-300">
                                  {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-bold leading-tight text-slate-700 min-[462px]:text-sm dark:text-slate-100">
                                    {item.vr_no}
                                  </p>
                                  <p className="truncate whitespace-nowrap text-[11px] leading-tight text-slate-400 dark:text-slate-400">
                                    {formatDate(item.vr_date)}
                                  </p>
                                </div>
                                <div className="shrink-0 whitespace-nowrap text-right text-xs font-bold text-slate-800 min-[462px]:text-sm dark:text-[rgb(var(--c-text))]">
                                  {thousandSeparator(item.debit)}
                                </div>
                                <div className="w-7 shrink-0 text-right text-sm">
                                  {!isProcessed ? (
                                    isHeadOfficeBranch ? (
                                      <FaRightToBracket className="inline-block text-sm text-red-500" />
                                    ) : (
                                      <div
                                        onClick={() =>
                                          !isLoading &&
                                          handleCheckCircleClick(item)
                                        }
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-50 transition hover:bg-red-100 cursor-pointer dark:bg-red-900/30"
                                      >
                                        {isLoading ? (
                                          <FaSpinner className="animate-spin text-sm text-red-500" />
                                        ) : successItems[itemKey] ? (
                                          <FaCheckCircle className="inline-block text-sm text-green-500" />
                                        ) : (
                                          <FaRightToBracket className="text-sm text-red-500" />
                                        )}
                                      </div>
                                    )
                                  ) : (
                                    <FaCheckCircle className="inline-block text-sm text-green-500" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
            ) : null}

            {!dashboard.errors && !hasReceiveDetails && isWidgetVisible('receive-details') ? (
              <div
                className={`flex min-w-0 flex-col overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700 ${dashboardCardHeightClass}`}
                style={{ order: widgetOrder('receive-details') }}
              >
                <div className="border-b border-[rgb(var(--c-border))] px-4 py-3 text-sm font-bold tracking-wide text-slate-700 dark:text-slate-100">
                  Received Details
                </div>
                <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-slate-400">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl dark:bg-gray-700 dark:text-slate-400">
                    <FaInbox />
                  </span>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    No received details found
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    New transactions will appear here.
                  </p>
                </div>
              </div>
            ) : null}

            {!dashboard.errors && isWidgetVisible('charts') ? (
        <div className="col-span-full min-w-0" style={{ order: widgetOrder('charts') }}>
          <div className=""></div>
          <div className="border-slate-200 pb-3 text-white pt-2">
            {currentBranch.branch_types_id == 1 ? (
              <div className="grid grid-cols-1">
                <div>
                  <HeadOfficePaymentChart />
                </div>
                <div>{/* <HeadOfficeReceivedChart /> */}</div>
              </div>
            ) : (
              <>
                <TransactionChart />
                <CompareSingleItem />
              </>
            )}
          </div>
        </div>
            ) : null}
          </>
        ) : (
          <div
            aria-label="Dashboard loading"
            className="contents"
            role="status"
          >
            {[0, 1, 2].map((cardIndex) => (
              <div
                className="min-w-0 animate-pulse overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700"
                key={cardIndex}
              >
                <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3.5">
                  <div className="h-4 w-32 rounded bg-slate-200 dark:bg-gray-700" />
                  <div className="h-7 w-20 rounded-full bg-slate-100 dark:bg-gray-700" />
                </div>

                <div className="divide-y divide-slate-100 dark:divide-gray-700">
                  {[0, 1, 2, 3].map((rowIndex) => (
                    <div
                      className={`flex items-center gap-3 ${summaryRowClass}`}
                      key={rowIndex}
                    >
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-100 dark:bg-gray-700" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div
                          className={`h-2.5 rounded bg-slate-200 dark:bg-gray-700 ${
                            rowIndex % 2 === 0 ? 'w-24' : 'w-20'
                          }`}
                        />
                        <div
                          className={`h-4 rounded bg-slate-200 dark:bg-gray-700 ${
                            rowIndex % 2 === 0 ? 'w-32' : 'w-28'
                          }`}
                        />
                      </div>
                      {cardIndex > 0 ? (
                        <div className="h-4 w-16 rounded bg-slate-200 dark:bg-gray-700" />
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 dark:bg-gray-700/50">
                  <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-gray-600" />
                  <div className="h-2.5 w-28 rounded bg-slate-200 dark:bg-gray-600" />
                </div>
              </div>
            ))}
            <span className="sr-only">Dashboard data is loading...</span>
          </div>
        )}
      </div>
    </>
  );
};

export default ConstructionDashboard;
