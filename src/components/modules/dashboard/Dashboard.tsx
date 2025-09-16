import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dispatchRemittance, getDashboard } from './dashboardSlice';
import { FiHome, FiSave } from 'react-icons/fi';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import HelmetTitle from '../../utils/others/HelmetTitle';
import TransactionChart from './TransactionChart';
import { FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';

import {
  getBranchChart,
  getHeadOfficePaymentChart,
  getHeadOfficeReceivedChart,
} from './chartSlice';
import HeadOfficePaymentChart from './HeadOfficePaymentChart';
import HeadOfficeReceivedChart from './HeadOfficeReceivedChart';
import InputOnly from '../../utils/fields/InputOnly';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import Loader from '../../../common/Loader';
import {formatDate} from '../../utils/utils-functions/formatDate';
import { FaRightToBracket } from 'react-icons/fa6';

const Dashboard = () => {
  const dashboard = useSelector((state) => state.dashboard);
  const branchDdlData = useSelector((state) => state.branchDdl);
  const dispatch = useDispatch();
  const settings = useSelector((s: any) => s.settings);
  const currentBranch = useSelector((s: any) => s.branchList.currentBranch);
  const [displayMonth, setDisplayMonth] = useState<number | ''>('');
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loadingItems, setLoadingItems] = useState<{ [key: string]: boolean }>(
    {},
  ); // Track loading state per item
  const [successItems, setSuccessItems] = useState<{ [key: string]: boolean }>(
    {},
  ); // Track success state per item
    const [totalDebit, setTotalDebit] = useState(0); // State to store the total sum of debits


  useEffect(() => {
    dispatch(getDashboard());
    // dispatch(getBranchChart());
    dispatch(getHeadOfficeReceivedChart());
    dispatch(getDdlProtectedBranch());
  }, []);

    useEffect(() => {
    // Calculate the total sum of debits whenever the data is loaded
    if (dashboard?.data?.receiveDetails?.receivedDetails) {
      const total = dashboard?.data?.receiveDetails?.receivedDetails[
        dashboard?.data?.branch?.id
      ]?.reduce((sum: number, item: any) => sum + Number(item.debit), 0);
      setTotalDebit(total); // Set the total sum of debits
    }
  }, [dashboard?.data?.receiveDetails?.receivedDetails]);

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
    setLoadingItems((prev) => ({ ...prev, [item.vr_no]: true })); // Set loading for clicked item

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
          setSuccessItems((prev) => ({ ...prev, [item.vr_no]: true })); // Mark item as success
        } else {
          toast.error(message);
        }
        setLoadingItems((prev) => ({ ...prev, [item.vr_no]: false })); // Stop loading after API call
      }),
    );
  };

  // The handleCheckCircleClick function
  // const handleCheckCircleClick = async (item: any) => {
  //   setLoading(true);  // Start loading
  //   setIsSuccess(false);  // Reset success before API call

  //   try {
  //     // Dispatch the remittance and wait for the response
  //     const response = await dispatchRemittance(item, (message, success) => {
  //       if (success) {
  //         setIsSuccess(true);  // If successful, set success state
  //         toast.success(message);  // Show success toast
  //       } else {
  //         setIsSuccess(false);  // If failure, retain the current state
  //         toast.error(message);  // Show error toast
  //       }
  //     });

  //     // Optionally handle the response if you need to use it further
  //     if (response.success) {
  //       setIsSuccess(true);
  //     } else {
  //       setIsSuccess(false);
  //     }
  //   } catch (error) {
  //     toast.error(error.message);
  //     setIsSuccess(false);  // In case of an error, retain the current state
  //   } finally {
  //     setLoading(false);  // Stop loading after the operation finishes
  //   }
  // };

  return (
    <>
      <HelmetTitle title="Dashboard" />
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
                        dashboard?.data?.totalTransaction?.debit -
                          dashboard?.data?.totalTransaction?.credit,
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
          </>
        ) : (
          ''
        )}
      </div>
      {dashboard.isLoading == false ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 mt-6 ">
          <div className="bg-white shadow-sm border border-slate-200 overflow-hidden text-black dark:bg-gray-700 dark:text-white">
            <div className="mx-3 mb-0 border-b border-slate-200 pt-3 pb-2 px-1 flex justify-between">
              <span className="text-sm font-bold">
                {dashboard?.data &&
                  !dashboard.isLoading &&
                  dashboard?.data?.transactionText}
              </span>
              <span>
                  Tk. { thousandSeparator (totalDebit,0)}
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {' '}
              {!dashboard.isLoading &&
                dashboard?.data?.receiveDetails?.receivedDetails &&
                dashboard?.data?.receiveDetails?.receivedDetails[
                  dashboard?.data?.branch?.id
                ]?.map((item: any, index: number) => (
                  <div className="p-2 flex items-center" key={item.vr_no}>
                    <div className="text-sm ml-6 w-6">{++index}</div>
                    <div className="text-sm font-medium w-24">
                      {formatDate(item.vr_date)}
                    </div>
                    <div className="text-sm font-medium flex-1">
                      {item.vr_no}
                    </div>
                    <div className="text-sm w-20 text-right">
                      {thousandSeparator(item.debit, 0)}
                    </div>
                    <div className="text-sm w-20 mr-4 text-right">
                      {item.remittance === '0' ? (
                        <div
                          onClick={() =>
                            !loadingItems[item.vr_no] &&
                            handleCheckCircleClick(item)
                          } // Disable click when loading
                          className="inline-block cursor-pointer"
                        >
                          {loadingItems[item.vr_no] ? (
                            <FaSpinner className="text-red-500 text-sm animate-spin" />
                          ) : successItems[item.vr_no] ? (
                            <FaCheckCircle className="inline-block text-green-500 text-sm" />
                          ) : (
                            <FaRightToBracket className="text-red-500 text-sm" />
                          )}
                        </div>
                      ) : (
                        <FaCheckCircle className="inline-block text-green-500 text-sm" />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        ''
      )}

      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* <div> */}
        {/* <label> Display Month</label> */}
        {/* <InputOnly
            id="display_month"
            label="Display Month"
            name="display_month"
            value={displayMonth.toString()}
            className=""
            placeholder="Display Month"
            onChange={handleDisplayMonthChange}
          /> */}
        {/* </div> */}

        {/* <div> 
          <label> Select Branch</label>
          <BranchDropdown
            onChange={handleBranchChange}
            className="w-full font-medium text-sm p-2"
            branchDdl={[
              { id: '', name: 'All' }, // Add the "All" option
              ...(branchDdlData?.protectedData?.data || []), // Spread existing options
            ]}
          />
        </div> */}

        {/* <div className="flex items-end">
          <ButtonLoading
            label="Run"
            onClick={handleChart}
            loading={dashboard.isLoading}
            className="bg-blue-500 text-white w-20 h-9"
          />
        </div> */}
      </div>
      {!dashboard.isLoading == true ? (
        <div className="mt-10">
          {/* <div className="relative flex flex-col bg-white shadow-sm border border-slate-200 w-full text-sm overflow-hidden text-black dark:bg-gray-700 dark:text-white  rounded-lg"> */}
          <div className=""></div>
          <div className="border-slate-200 pb-3 text-white pt-2">
            {currentBranch.branch_types_id == 1 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div>
                  <HeadOfficePaymentChart />
                </div>
                <div>{/* <HeadOfficeReceivedChart /> */}</div>
              </div>
            ) : (
              <TransactionChart />
            )}
          </div>
        </div>
      ) : (
        ''
      )}
    </>
  );
};

export default Dashboard;
