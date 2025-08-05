import { useEffect, useState } from 'react';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import dayjs from 'dayjs';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { getLabourItems, getLabourLedger } from './labourLedgerSlice';
import LabourDropdown from '../../../utils/utils-functions/LabourDropdown';
import formatDate from '../../../utils/utils-functions/formatDate';
import { FiRotateCcw, FiSave } from 'react-icons/fi';

const LabourLedger = (user: any) => {
  type Entry = {
    vr_no: string;
    vr_date: string;
    coa4_name: string;
    note: string;
    qty: number;
    rate: number;
    total: number;
  };
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const ledgerData = useSelector((state) => state.labourLedger);
  const labourItems = useSelector((state) => state.labourLedger.labourItems); // Adjust this path as needed

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);

  const [branchId, setBranchId] = useState<number | null>(null);
  const [ledgerId, setLedgerAccount] = useState<number | null>(null);
  const [labourId, setLabourId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedLabourOption, setSelectedLabourOption] = useState<any>(null); // ✅ New state for selected Labour

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(getLabourItems());
    setBranchId(user.user.branch_id);
  }, []);

  useEffect(() => {
    //  if (!ledgerData.isLoading && Array.isArray(ledgerData?.data)) {
    setTableData(ledgerData?.labourExpenses?.data?.data || []);
    // }
    console.log('tableData', tableData);
  }, [ledgerData]);

  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      const originalData = branchDdlData?.protectedData?.data || [];

      const finalData =
        originalData.length > 1
          ? [{ id: '', name: 'Select All' }, ...originalData]
          : originalData;
      setDropdownData(finalData);
      const [day, month, year] =
        branchDdlData?.protectedData?.transactionDate.split('/');
      const startDate = new Date(Number(year), Number(month) - 1, Number('01'));
      const endDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(startDate);
      setEndDate(endDate);
      setBranchId(user.user.branch_id);
    }
  }, [branchDdlData?.protectedData]);

  // ✅ Auto select first labour option from labourItems
  useEffect(() => {
    if (labourItems && labourItems.length > 0) {
      const first = labourItems[0];
      const option = { value: first.id, label: first.name };
      setSelectedLabourOption(option);
      setLabourId(option.value);
    }
  }, [labourItems]);

  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const handleStartDate = (e: any) => {
    setStartDate(e);
  };

  const handleEndDate = (e: any) => {
    setEndDate(e);
  };

  const handleActionButtonClick = () => {
    const startD = startDate ? dayjs(startDate).format('YYYY-MM-DD') : '';
    const endD = endDate ? dayjs(endDate).format('YYYY-MM-DD') : '';

    dispatch(
      getLabourLedger({
        branchId,
        ledgerId,
        labourId,
        startDate: startD,
        endDate: endD,
      }),
    );
  };

  const handleResetFields = () => {
    setLedgerAccount(null);
    setLabourId(null);
    setStartDate(null);
    setEndDate(null);
    setSelectedLabourOption(null); // Reset selected labour option
  };

  const selectedLedgerOptionHandler = (option: any) => {
    setLedgerAccount(option.value);
  };

  const selectedLabourOptionHandler = (option: any) => {
    setLabourId(option.value);
    setSelectedLabourOption(option); // ✅ store entire selected object
  };

  return (
    <div className="">
      <HelmetTitle title={'Labour Ledger'} />
      <div className="mb-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-6 md:gap-x-4">
          <div className="">
            <div>
              <label htmlFor="">Select Branch</label>
            </div>
            <div>
              {branchDdlData.isLoading === true ? <Loader /> : ''}
              <BranchDropdown
                onChange={handleBranchChange}
                className="w-full font-medium text-sm p-2"
                branchDdl={dropdownData}
              />
            </div>
          </div>

          <div className="">
            <label htmlFor="">Select Account</label>
            <DdlMultiline
              onSelect={selectedLedgerOptionHandler}
              className="w-full font-medium text-sm"
              acType={''}
            />
          </div>

          <div className="">
            <label htmlFor="">Select Labour</label>
            <LabourDropdown
              value={selectedLabourOption} // ✅ pass selected option
              onSelect={selectedLabourOptionHandler}
            />
          </div>

          <div className="w-full">
            <label htmlFor="">Start Date</label>
            <InputDatePicker
              setCurrentDate={handleStartDate}
              className="font-medium text-sm w-full p-2"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
            />
          </div>

          <div>
            <label htmlFor="">End Date</label>
            <InputDatePicker
              setCurrentDate={handleEndDate}
              className="w-full font-medium text-sm p-2"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>
          <div className="mt-2 md:mt-6 flex flex-wrap w-full">
            <button
              onClick={handleResetFields}
              className="w-1/6 flex justify-center h-9 items-center pt-1 pb-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              <FiRotateCcw className="text-white w-6 h-6 ml-2 mr-2" />
            </button>
            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="Run"
              className="w-5/6 pt-1 pb-1 px-4 h-9"
            />
          </div>
        </div>
      </div>
      <div className="overflow-y-auto">
        {ledgerData.isLoading && <Loader />}
        {Object.keys(tableData).length > 0 ? (
          Object.entries(tableData).map(([branchName, groupData]) => {
            // ✅ Branch Grand Total Calculation
            const branchTotal = Object.values(groupData)
              .flat()
              .reduce((sum, item: Entry) => sum + (item.total || 0), 0);

            return (
              <div key={branchName}>
                <h2 className="text-lg font-bold mt-6 text-indigo-600 dark:text-indigo-400 ml-2">
                  {branchName}
                </h2>

                {Object.entries(groupData).map(([groupName, rawEntries]) => {
                  const entries = rawEntries as Entry[];
                  const groupTotal = entries.reduce(
                    (sum, item) => sum + (item.total || 0),
                    0,
                  );

                  return (
                    <div key={groupName} className="ml-2 mt-4">
                      <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        {groupName}
                      </h3>
                      {/* Responsive Table Wrapper */}
                      <div className="overflow-x-auto rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="min-w-[640px]">
                          {/* Header */}
                          <div className="flex bg-gray-100 dark:bg-gray-700 text-xs sm:text-sm uppercase text-gray-600 dark:text-gray-300 font-semibold">
                            <div className="px-3 py-3 w-1/6 text-center">VR No</div>
                            <div className="px-3 py-3 w-1/6">VR No</div>
                            <div className="px-3 py-3 w-1/6">Date</div>
                            <div className="px-3 py-3 w-1/6">Description</div>
                            <div className="px-3 py-3 w-1/6 text-right">
                              Qty
                            </div>
                            <div className="px-3 py-3 w-1/6 text-right">
                              Rate
                            </div>
                            <div className="px-3 py-3 w-1/6 text-right">
                              Total
                            </div>
                          </div>
                          {/* Body */}
                          <div className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {entries.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex flex-wrap sm:flex-nowrap hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
                              >
                                <div className="px-3 py-2 w-full sm:w-1/6 whitespace-nowrap flex items-center justify-center">
                                  {idx + 1}
                                </div>
                                <div className="px-3 py-2 w-full sm:w-1/6 whitespace-nowrap flex items-center">
                                  {item.vr_no}
                                </div>
                                <div className="px-3 py-2 w-full sm:w-1/6 whitespace-nowrap flex items-center">
                                  {formatDate(item.vr_date)}
                                </div>
                                <div className="px-3 py-2 w-full sm:w-1/6 whitespace-nowrap flex flex-col">
                                  <span className="text-gray-500 dark:text-gray-400 text-xs block font-bold">
                                    {item.coa4_name}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-normal break-words">
                                    {item.note}
                                  </span>
                                </div>
                                <div className="px-3 py-2 w-full sm:w-1/6 whitespace-nowrap flex items-center justify-end">
                                  {thousandSeparator(item.qty, 2)}
                                </div>
                                <div className="px-3 py-2 w-full sm:w-1/6 whitespace-nowrap flex items-center justify-end">
                                  {thousandSeparator(item.rate, 2)}
                                </div>
                                <div className="px-3 py-2 w-full sm:w-1/6 whitespace-nowrap flex items-center justify-end">
                                  {thousandSeparator(item.total, 0)}
                                </div>
                              </div>
                            ))}

                            {/* Group Total Row */}
                            <div className="flex bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 font-semibold text-sm">
                              <div className="px-3 py-2 w-4/5 text-right">
                                Total:
                              </div>
                              <div className="px-3 py-2 w-1/5 text-right">
                                {thousandSeparator(groupTotal, 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* ✅ Branch Grand Total */}
                <div className="ml-2 flex bg-indigo-100 dark:bg-gray-900 border-t border-indigo-300 dark:border-gray-700 font-bold text-sm mt-2 rounded-md">
                  <div className="px-3 py-2 w-4/5 text-right text-indigo-700 dark:text-indigo-400">
                    Grand Total for {branchName}:
                  </div>
                  <div className="px-3 py-2 w-1/5 text-right text-indigo-700 dark:text-indigo-400">
                    {thousandSeparator(Number(branchTotal), 0)}
                  </div>
                </div>
              </div>
            );
          })
        ) : !ledgerData.isLoading ? (
          <div className="overflow-x-auto rounded-md shadow-sm border border-gray-200 dark:border-gray-700 mt-4 ">
            <div className="min-w-[640px] bg-white dark:bg-gray-800">
              <div className="flex justify-center items-center h-20 text-sm text-gray-500 dark:text-gray-400">
                No data found
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LabourLedger;
