import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dispatchRemittance, getDashboard } from './dashboardSlice';
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
  FaShoppingCart,
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
import DashboardCustomizeButton, {
  DashboardWidget,
  useDashboardCustomization,
} from './dashboardCustomization';

const CONSTRUCTION_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'summary', title: 'Balance Summary' },
  { id: 'top-purchase', title: 'Top Purchase' },
  { id: 'receive-details', title: 'Receive Details' },
  { id: 'charts', title: 'Charts' },
];

const ConstructionDashboard = () => {
  const dashboard = useSelector((state) => state.dashboard);
  const dispatch = useDispatch();
  const settings = useSelector((s: any) => s.settings);
  const me = useSelector((s: any) => s.auth?.me);
  const currentBranch = useSelector((s: any) => s.branchList.currentBranch);
  const protectedBranches = useSelector(
    (s: any) => s.branchDdl?.protectedData?.data || [],
  );
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
      <div className={`mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${dashboardGapClass}`}>
        {dashboard.isLoading == false ? (
          <>
            {/* Branch summary card */}
            {isWidgetVisible('summary') ? (
            <div
              className="group relative flex flex-col bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden transition hover:shadow-md hover:ring-slate-300 dark:bg-gray-800 dark:ring-gray-700"
              style={{ order: widgetOrder('summary') }}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
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
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-100">
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
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {dashboard?.data?.todayReceived?.debit > 0
                        ? thousandSeparator(dashboard?.data?.todayReceived?.debit)
                        : 0}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-3 ${summaryRowClass}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                    <FaArrowUp className="text-sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Today Payment
                    </p>
                    <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                      {dashboard?.data?.todayReceived?.credit > 0
                        ? thousandSeparator(dashboard?.data?.todayReceived?.credit)
                        : 0}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-3 ${summaryRowClass}`}>
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
                <span>Last updated: {dashboard?.data?.last_update}</span>
              </div>
            </div>
            ) : null}

            {isWidgetVisible('top-purchase') && dashboard?.data?.topProductsPurchase?.length > 0 && (
              <div
                className="relative flex flex-col overflow-hidden border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-[#1f2937]"
                style={{ order: widgetOrder('top-purchase') }}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-slate-600">
                  <span className="truncate text-base font-bold tracking-wide text-slate-700 dark:text-slate-100">
                    Top Purchase
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                    {settings?.data?.branch?.dashboard_top_sales_days == 1 ? 'Today' : `Last ${settings?.data?.branch?.dashboard_top_sales_days || 7} Days`}
                  </span>
                </div>
                {/* Body */}
                <div className="hover-scrollbar max-h-72 overflow-y-auto">
                  {dashboard?.data?.topProductsPurchase?.length > 0 ? (
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
                  ) : (
                    <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-400">
                      <FaShoppingCart className="text-2xl" />
                      <p className="text-sm italic">No purchase found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasReceiveDetails && isWidgetVisible('receive-details') ? (
          <div
            className="grid grid-cols-1"
            style={{ order: widgetOrder('receive-details') }}
          >
            <div className="w-full bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden dark:bg-gray-800 dark:ring-gray-700">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <span className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-100">
                  {!dashboard.isLoading && dashboard?.data?.transactionText}
                </span>
                <span className="rounded-full bg-sky-100 px-3 py-0.5 text-sm font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  {totalDebit ? `Tk. ${thousandSeparator(totalDebit)}` : '-'}
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto">
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
                      className="border-b border-slate-100 last:border-b-0 dark:border-gray-700"
                      key={branchKey}
                    >
                      <button
                        type="button"
                        onClick={() => toggleBranchDetails(branchKey)}
                        className={`w-full bg-slate-50 px-4 py-2.5 text-left transition hover:bg-slate-100 dark:bg-gray-700/40 dark:hover:bg-gray-700 ${
                          isHeadOfficeBranch ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs min-[462px]:text-sm">
                          <span className="flex-1 font-semibold text-slate-700 dark:text-slate-100">
                            {branchName}
                          </span>
                          <span className="font-bold text-slate-800 whitespace-nowrap dark:text-white">
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
                      </button>

                      {isExpanded && (
                        <div>
                          {items.map((item: any, index: number) => {
                            const itemKey = getReceiveDetailStatusKey(item);
                            const isProcessed =
                              isRemittanceProcessed(item) || successItems[itemKey];
                            const isLoading = Boolean(loadingItems[itemKey]);

                            return (
                              <div
                                className="flex items-center border-t border-slate-100 px-4 py-2 transition hover:bg-sky-50/50 dark:border-gray-700 dark:hover:bg-gray-700/40"
                                key={`${branchKey}-${itemKey}-${index}`}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500 dark:bg-gray-700 dark:text-slate-300">
                                    {index + 1}
                                  </div>
                                  <div className="min-w-0 flex-[1.35] truncate text-xs font-semibold text-slate-700 min-[462px]:text-sm dark:text-slate-100">
                                    {item.vr_no}
                                  </div>
                                  <div className="min-w-0 flex-1 text-xs text-slate-500 min-[462px]:text-sm dark:text-slate-400">
                                    {formatDate(item.vr_date)}
                                  </div>
                                </div>
                                <div className="w-26 shrink-0 text-right text-xs font-bold text-slate-800 min-[462px]:w-32 min-[462px]:text-sm dark:text-white">
                                  {thousandSeparator(item.debit)}
                                </div>
                                <div className="ml-3 mr-2 w-8 text-right text-sm min-[462px]:w-10">
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

            {isWidgetVisible('charts') ? (
        <div className="col-span-full" style={{ order: widgetOrder('charts') }}>
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
          ''
        )}
      </div>
    </>
  );
};

export default ConstructionDashboard;
