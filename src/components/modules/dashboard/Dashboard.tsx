import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getDashboard } from './dashboardSlice';
import { FiHome, FiSave } from 'react-icons/fi';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import HelmetTitle from '../../utils/others/HelmetTitle';
import TransactionChart from './TransactionChart';
import { FaCheckCircle } from 'react-icons/fa';

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

  useEffect(() => {
    dispatch(getDashboard());
    // dispatch(getBranchChart());
    dispatch(getHeadOfficeReceivedChart());
    dispatch(getDdlProtectedBranch());
  }, []);

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

  console.log(
    'Dashboard Data',
    dashboard?.data?.receiveDetails?.receivedDetails,
  );

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
    const params = {
      mtm_id: item.mtm_id,
      branch_id: item.branch_id,
      remarks: item.remarks,
      amount: item.debit,
    };

    console.log('Check Circle Clicked', params);
  };

  console.log('Current Branch', dashboard?.data?.branch?.id);

  return (
    <>
      <HelmetTitle title="Dashboard" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:text-xs xl:grid-cols-4 gap-10 flex-wrap">
        {dashboard.isLoading == false ? (
          <>
            <div className="relative flex flex-col bg-white shadow-sm border border-slate-200 overflow-hidden text-black dark:bg-gray-700 dark:text-white  rounded-lg">
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
        <div className="grid grid-cols-2 mt-6">
          <div className="bg-white shadow-sm border border-slate-200 overflow-hidden text-black dark:bg-gray-700 dark:text-white rounded-lg">
            <div className="mx-3 mb-0 border-b border-slate-200 pt-3 pb-2 px-1">
              <span className="text-sm font-bold">
                {dashboard?.data &&
                  !dashboard.isLoading &&
                  dashboard?.data?.transactionText}
              </span>
            </div>

            {!dashboard.isLoading && dashboard?.data?.receiveDetails?.receivedDetails && dashboard?.data?.receiveDetails?.receivedDetails[dashboard?.data?.branch?.id]?.map((item: any, index: number) => (
                <div className="p-2 flex items-center" key={index}>
                  <div className="text-xs ml-6 w-6">{++index}</div>
                  <div className="text-xs w-24">
                    <p>{item.vr_date}</p>
                  </div>
                  <div className="text-sm font-medium flex-1">{item.vr_no}</div>
                  <div className="text-xs w-20 text-right">
                    {thousandSeparator(item.debit, 0)}
                  </div>
                  <div className="text-xs w-20 mr-4 text-right">
                    {item.remittance == '0' ? (
                      <span className="text-xs w-20 mr-4 text-right">
                        <FaRightToBracket
                          onClick={() => handleCheckCircleClick(item)}
                          className="inline-block cursor-pointer text-red-500 text-sm"
                        />
                      </span>
                    ) : (
                      <span className="text-xs w-20 mr-4 text-right">
                        <FaCheckCircle
                          onClick={() => handleCheckCircleClick(item)}
                          className="inline-block cursor-pointer text-green-500 text-sm"
                        />
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        'No Remittance Found'
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
