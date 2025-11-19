import React, {useEffect} from 'react'
import HelmetTitle from '../../utils/others/HelmetTitle'
import { useDispatch, useSelector } from 'react-redux';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getDashboard } from './dashboardSlice';
import MonthlyPurchaseSalesChart from './MonthlyPurchaseSalesChart';
import DailyPurchaseSalesChart from './DailyPurchaseChart';
import DailyPurchaseChart from './DailyPurchaseChart';
import DailySalesChart from './DailySalesChart';

const ComputerAccessories = () => {
    const dashboard = useSelector((state) => state.dashboard);
    const settings = useSelector((s: any) => s.settings);
    const dispatch = useDispatch();

      useEffect(() => {
        dispatch(getDashboard());
      }, []);
  return (
    <div>
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
       <div className='mt-5'>
       <DailySalesChart />
       <DailyPurchaseChart />
        <MonthlyPurchaseSalesChart />
        </div>
    </div>
  )
}

export default ComputerAccessories
