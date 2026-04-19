import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dispatchRemittance, getDashboard } from './dashboardSlice';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import HelmetTitle from '../../utils/others/HelmetTitle';
import TransactionChart from './TransactionChart';
import { FaCheckCircle, FaMinus, FaPlus, FaSpinner } from 'react-icons/fa';
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

const ConstructionDashboard = () => {
  const dashboard = useSelector((state) => state.dashboard);
  const dispatch = useDispatch();
  const settings = useSelector((s: any) => s.settings);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:text-xs xl:grid-cols-4 gap-10 flex-wrap">
        {dashboard.isLoading == false ? (
          <>
            <div className="relative flex flex-col bg-white shadow-sm border border-slate-200 overflow-hidden text-black dark:bg-gray-700 dark:text-white">
              <div className="mx-3 mb-0 border-b border-slate-200 pt-3 pb-2 px-1">
                <span className="text-sm font-bold">
                  {dashboard?.data &&
                    !dashboard.isLoading &&
                    dashboard?.data?.branch?.name}
                </span>
              </div>
              <div className="p-4">
                <div className="mb-2 text-sm ">
                  Trx Date:{' '}
                  <span className="italic font-bold">
                    {' '}
                    {settings?.data?.trx_dt}
                  </span>
                </div>
                <div className="mb-2 text-sm ">
                  Today Received:{' '}
                  <span className="italic font-bold">
                    {' '}
                    {dashboard?.data?.todayReceived?.debit > 0
                      ? thousandSeparator(
                        dashboard?.data?.todayReceived?.debit,
                        0,
                      )
                      : 0}
                  </span>
                </div>
                <div className="mb-2 text-sm ">
                  Today Payment:{' '}
                  <span className="italic font-bold">
                    {' '}
                    {dashboard?.data?.todayReceived?.credit > 0
                      ? thousandSeparator(
                        dashboard?.data?.todayReceived?.credit,
                        0,
                      )
                      : 0}
                  </span>
                </div>
                <div className="mb-2 text-sm ">
                  Balance:{' '}
                  <span className="italic font-bold">
                    {' '}
                    {dashboard?.data &&
                      !dashboard.isLoading &&
                      thousandSeparator(
                        (Number(dashboard?.data?.totalTransaction?.debit) ||
                          0) -
                        (Number(dashboard?.data?.totalTransaction?.credit) ||
                          0),
                        0,
                      )}
                  </span>
                </div>
              </div>
              <div className="mx-3 border-t border-slate-200 pb-3 pt-2 px-1">
                <span className="text-sm font-medium">
                  Last updated: {dashboard?.data?.last_update}
                </span>
              </div>
            </div>

            {dashboard?.data?.topProductsPurchase?.length > 0 && (
              <div className="relative flex flex-col bg-white shadow-sm border border-slate-200 overflow-hidden text-black dark:bg-gray-700 dark:text-white">
                {/* Header */}
                <div className="mx-3 mb-0 border-b border-slate-200 pt-3 pb-2 px-1">
                  <span className="text-sm font-bold">
                    Top Purchase (Last 7 Days)
                  </span>
                </div>
                {/* Body */}
                <div className={`p-4 max-h-72 overflow-y-auto`}>
                  {dashboard?.data?.topProductsPurchase?.length > 0 ? (
                    <ul className="space-y-2">
                      {dashboard?.data?.topProductsPurchase.map(
                        (item, index) => {
                          const nameLength = item.name?.length || 0;
                          const fontClass =
                            nameLength <= 10
                              ? 'text-[13px]'
                              : nameLength <= 20
                                ? 'text-[12px]'
                                : 'text-[10px]';
                          return (
                            <li
                              key={item.product_id}
                              className="flex items-center justify-between border-b border-slate-200 dark:border-gray-600 rounded transition"
                            >
                              <div className="flex-1">
                                <span
                                  className={`font-medium truncate block ${fontClass}`}
                                >
                                  {index + 1}. {item.name}
                                </span>
                              </div>
                              <div className="ml-2">
                                <span className={`font-bold ${fontClass}`}>
                                  {thousandSeparator((Number(item.qty)), 0)}
                                </span>
                              </div>
                            </li>
                          );
                        },
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm italic text-gray-500 dark:text-gray-300">
                      No sales found
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          ''
        )}
      </div>

      {!dashboard.isLoading && hasReceiveDetails ? (
        <>
          <div className="grid grid-cols-1 mt-6">
            <div className="w-full xl:w-[500px] bg-white shadow-sm border border-slate-200 overflow-hidden text-black dark:bg-gray-700 dark:text-white">
              <div className="mx-3 mb-0 border-b border-slate-200 pt-3 pb-2 px-1 flex justify-between">
                <span className="text-sm font-bold">
                  {!dashboard.isLoading && dashboard?.data?.transactionText}
                </span>
                <span>
                  {totalDebit ? `Tk. ${thousandSeparator(totalDebit, 0)}` : '-'}
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
                      className="border-b border-slate-200 last:border-b-0 dark:border-gray-600"
                      key={branchKey}
                    >
                      <button
                        type="button"
                        onClick={() => toggleBranchDetails(branchKey)}
                        className={`w-full px-3 py-2 text-left ${
                          isHeadOfficeBranch ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs min-[462px]:text-sm">
                          <span className="font-semibold flex-1">{branchName}</span>
                          <span className="font-semibold whitespace-nowrap">
                            <span className="mr-2"></span>
                            <span>{thousandSeparator(branchTotal, 0)}</span>
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
                        <div className="pb-1">
                          {items.map((item: any, index: number) => {
                            const itemKey = getReceiveDetailStatusKey(item);
                            const isProcessed =
                              isRemittanceProcessed(item) || successItems[itemKey];
                            const isLoading = Boolean(loadingItems[itemKey]);

                            return (
                              <div
                                className="px-3 py-2 flex items-center border-t border-slate-100 dark:border-gray-600"
                                key={`${branchKey}-${itemKey}-${index}`}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="text-xs min-[462px]:text-sm text-center w-6 shrink-0">
                                    {index + 1}
                                  </div>
                                  <div className="text-xs min-[462px]:text-sm flex-[1.35] min-w-0 font-medium truncate">
                                    {item.vr_no}
                                  </div>
                                  <div className="text-xs min-[462px]:text-sm flex-1 min-w-0 font-medium">
                                    {formatDate(item.vr_date)}
                                  </div>
                                </div>
                                <div className="text-xs min-[462px]:text-sm w-26 min-[462px]:w-32 text-right shrink-0">
                                  {thousandSeparator(item.debit, 0)}
                                </div>
                                <div className="text-xs min-[462px]:text-sm w-8 min-[462px]:w-10 ml-3 mr-2 text-right">
                                  {!isProcessed ? (
                                    isHeadOfficeBranch ? (
                                      <FaRightToBracket className="text-red-500 text-sm inline-block" />
                                    ) : (
                                      <div
                                        onClick={() =>
                                          !isLoading &&
                                          handleCheckCircleClick(item)
                                        }
                                        className="inline-block cursor-pointer"
                                      >
                                        {isLoading ? (
                                          <FaSpinner className="text-red-500 text-sm animate-spin" />
                                        ) : successItems[itemKey] ? (
                                          <FaCheckCircle className="inline-block text-green-500 text-sm" />
                                        ) : (
                                          <FaRightToBracket className="text-red-500 text-sm" />
                                        )}
                                      </div>
                                    )
                                  ) : (
                                    <FaCheckCircle className="inline-block text-green-500 text-sm" />
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
        </>
      ) : (
        ''
      )}


      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-2"></div>
      {!dashboard.isLoading == true ? (
        <div className="mt-10">
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
      ) : (
        ''
      )}
    </>
  );
};

export default ConstructionDashboard;
