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
import { formatDate } from '../../../utils/utils-functions/formatDate';
import { FiFilter } from 'react-icons/fi';

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
  const labourItems = useSelector((state) => state.labourLedger.labourItems);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled =
    String(settings?.data?.branch?.use_filter_parameter ?? '') === '1';

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [ledgerId, setLedgerAccount] = useState<number | null>(null);
  const [labourId, setLabourId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedLabourOption, setSelectedLabourOption] = useState<any>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(getLabourItems());
    setBranchId(user.user.branch_id);
  }, []);

  useEffect(() => {
    setTableData(ledgerData?.labourExpenses?.data?.data || []);
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
      const parsedStartDate = new Date(Number(year), Number(month) - 1, Number('01'));
      const parsedEndDate = new Date(Number(year), Number(month) - 1, Number(day));

      setStartDate(parsedStartDate);
      setEndDate(parsedEndDate);
      setBranchId(user.user.branch_id);
    }
  }, [branchDdlData?.protectedData]);

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

    setFilterOpen(false);
  };

  const handleResetFields = () => {
    setFilterOpen(false);
  };

  const selectedLedgerOptionHandler = (option: any) => {
    setLedgerAccount(option.value);
  };

  const selectedLabourOptionHandler = (option: any) => {
    setLabourId(option.value);
    setSelectedLabourOption(option);
  };

  return (
    <div className="">
      <HelmetTitle title={'Labour Ledger'} />
      <div className="py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'min-w-[320px] flex-1'}>
            {useFilterMenuEnabled && (
              <button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded border text-sm transition ${
                  filterOpen
                    ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                    : 'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700'
                }`}
                title="Open filters"
                aria-label="Open filters"
              >
                <FiFilter size={16} />
              </button>
            )}

            {(useFilterMenuEnabled ? filterOpen : true) && (
              <div
                className={
                  useFilterMenuEnabled
                    ? 'absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,340px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800'
                    : 'w-full'
                }
              >
                <div
                  className={
                    useFilterMenuEnabled
                      ? 'space-y-3'
                      : 'grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(200px,1.1fr)_minmax(220px,1.3fr)_minmax(220px,1.3fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto]'
                  }
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Select Branch
                    </label>
                    {branchDdlData.isLoading === true ? <Loader /> : ''}
                    <BranchDropdown
                      onChange={handleBranchChange}
                      value={branchId == null ? '' : String(branchId)}
                      className="w-full font-medium text-sm p-2"
                      branchDdl={dropdownData}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Select Account
                    </label>
                    <DdlMultiline
                      onSelect={selectedLedgerOptionHandler}
                      className="w-full font-medium text-sm h-10"
                      acType={''}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Select Labour
                    </label>
                    <LabourDropdown
                      value={selectedLabourOption}
                      onSelect={selectedLabourOptionHandler}
                      className="w-full font-medium text-sm h-10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Start Date
                    </label>
                    <InputDatePicker
                      setCurrentDate={handleStartDate}
                      className="font-medium text-sm w-full h-10"
                      selectedDate={startDate}
                      setSelectedDate={setStartDate}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      End Date
                    </label>
                    <InputDatePicker
                      setCurrentDate={handleEndDate}
                      className="w-full font-medium text-sm h-10"
                      selectedDate={endDate}
                      setSelectedDate={setEndDate}
                    />
                  </div>

                  <div
                    className={`flex gap-2 pt-1 ${
                      useFilterMenuEnabled
                        ? 'justify-end'
                        : 'justify-start self-end'
                    } ${useFilterMenuEnabled ? '' : 'md:col-span-2 xl:col-span-1'}`}
                  >
                    <ButtonLoading
                      onClick={handleActionButtonClick}
                      buttonLoading={buttonLoading}
                      label="Apply"
                      className="h-10 px-6"
                    />
                    <ButtonLoading
                      onClick={handleResetFields}
                      buttonLoading={false}
                      label="Reset"
                      className="h-10 px-4"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            className={`${
              useFilterMenuEnabled
                ? 'hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300'
                : 'hidden'
            }`}
          >
            Use the filter
          </div>

          <div className="ml-auto flex items-end gap-2">
            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="Run"
              className="h-10 px-6"
            />
          </div>
        </div>
      </div>

      <div className="overflow-y-auto">
        {ledgerData.isLoading && <Loader />}
        {Object.keys(tableData).length > 0 ? (
          Object.entries(tableData).map(([branchName, groupData]) => {
            const branchTotal = Object.values(groupData)
              .flat()
              .reduce((sum, item: Entry) => sum + (item.total || 0), 0);

            return (
              <div key={branchName}>
                <h2 className="ml-2 mt-6 text-lg font-bold text-indigo-600 dark:text-indigo-400">
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
                      <h3 className="mb-2 text-md font-semibold text-gray-700 dark:text-gray-300">
                        {groupName}
                      </h3>
                      <div className="overflow-x-auto rounded-md border border-gray-200 shadow-sm dark:border-gray-700">
                        <div className="min-w-[640px]">
                          <div className="flex bg-gray-100 text-xs font-semibold uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-300 sm:text-sm">
                            <div className="w-1/6 px-3 py-3 text-center">SL</div>
                            <div className="w-1/6 px-3 py-3">VR No</div>
                            <div className="w-1/6 px-3 py-3">Date</div>
                            <div className="w-1/6 px-3 py-3">Description</div>
                            <div className="w-1/6 px-3 py-3 text-right">Qty</div>
                            <div className="w-1/6 px-3 py-3 text-right">Rate</div>
                            <div className="w-1/6 px-3 py-3 text-right">Total</div>
                          </div>

                          <div className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                            {entries.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex flex-wrap text-sm text-gray-700 transition-colors hover:bg-indigo-50 dark:text-gray-300 dark:hover:bg-gray-700 sm:flex-nowrap"
                              >
                                <div className="flex w-full items-center justify-center whitespace-nowrap px-3 py-2 sm:w-1/6">
                                  {idx + 1}
                                </div>
                                <div className="flex w-full items-center whitespace-nowrap px-3 py-2 sm:w-1/6">
                                  {item.vr_no}
                                </div>
                                <div className="flex w-full items-center whitespace-nowrap px-3 py-2 sm:w-1/6">
                                  {formatDate(item.vr_date)}
                                </div>
                                <div className="flex w-full flex-col whitespace-nowrap px-3 py-2 sm:w-1/6">
                                  <span className="block text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {item.coa4_name}
                                  </span>
                                  <span className="break-words whitespace-normal text-xs text-gray-500 dark:text-gray-400">
                                    {item.note}
                                  </span>
                                </div>
                                <div className="flex w-full items-center justify-end whitespace-nowrap px-3 py-2 sm:w-1/6">
                                  {thousandSeparator(item.qty, 2)}
                                </div>
                                <div className="flex w-full items-center justify-end whitespace-nowrap px-3 py-2 sm:w-1/6">
                                  {thousandSeparator(item.rate, 2)}
                                </div>
                                <div className="flex w-full items-center justify-end whitespace-nowrap px-3 py-2 sm:w-1/6">
                                  {thousandSeparator(item.total, 0)}
                                </div>
                              </div>
                            ))}

                            <div className="flex border-t border-gray-200 bg-gray-50 text-sm font-semibold dark:border-gray-700 dark:bg-gray-900">
                              <div className="w-4/5 px-3 py-2 text-right">Total:</div>
                              <div className="w-1/5 px-3 py-2 text-right">
                                {thousandSeparator(groupTotal, 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="ml-2 mt-2 flex rounded-md border-t border-indigo-300 bg-indigo-100 text-sm font-bold dark:border-gray-700 dark:bg-gray-900">
                  <div className="w-4/5 px-3 py-2 text-right text-indigo-700 dark:text-indigo-400">
                    Grand Total for {branchName}:
                  </div>
                  <div className="w-1/5 px-3 py-2 text-right text-indigo-700 dark:text-indigo-400">
                    {thousandSeparator(Number(branchTotal), 0)}
                  </div>
                </div>
              </div>
            );
          })
        ) : !ledgerData.isLoading ? (
          <div className="mt-4 overflow-x-auto rounded-md border border-gray-200 shadow-sm dark:border-gray-700">
            <div className="min-w-[640px] bg-white dark:bg-gray-800">
              <div className="flex h-20 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
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
