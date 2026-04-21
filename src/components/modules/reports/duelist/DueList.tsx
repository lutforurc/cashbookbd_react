import React, { useEffect, useRef, useState } from 'react';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import { getDueList } from './dueListSlice';
import { FiBook, FiCheckSquare, FiEdit, FiFilter, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import dayjs from 'dayjs';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import Table from '../../../utils/others/Table';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import CashBookPrint from '../cashbook/CashBookPrint';
import DueListPrint from './DueListPrint';
import InputElement from '../../../utils/fields/InputElement';
import { useReactToPrint } from 'react-to-print';
import { isUserFeatureEnabled } from '../../../utils/userFeatureSettings';


const DueList = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const branchList = useSelector((state) => state.branchList);
  const dueList = useSelector((state) => state.dueList);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null); // Define state with type
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isSelected, setIsSelected] = useState<number | string>('');
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);


    interface OptionType {
    value: string;
    label: string;
    additionalDetails: string;
  }
  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setIsSelected(user.user.branch_id);
    setBranchId(user.user.branch_id);
  }, []);

  useEffect(() => {
    setTableData(dueList?.data?.data?.data);
  }, [dueList]);


  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const handleEndDate = (e: any) => {
    setEndDate(e);
  };
  const handleActionButtonClick = (e: any) => {

    const endD = dayjs(endDate).format('YYYY-MM-DD'); // Adjust format as needed
    dispatch(getDueList({ branchId, endDate: endD }));
    setTableData(dueList?.data?.data?.data);
    setFilterOpen(false);
  };

  const handleResetFilters = () => {
    setFilterOpen(false);
  };



  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData?.protectedData?.data);
      const [day, month, year] =
        branchDdlData?.protectedData?.transactionDate.split('/');
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
      setEndDate(parsedDate);
      setBranchId(user.user.branch_id);
    } else {
    }
  }, [branchDdlData?.protectedData?.data]);

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'coa4_name',
      header: 'Customer/Supplier',
      render: (row: any) => (
        <>
          <p>{row.coa4_name}</p>
          <p className="text-sm text-gray-500">{(row.mobile?.length ?? 0) > 10 && <div className="text-xs">{row.mobile}</div>}</p>
          <p className="text-sm text-gray-500">{row.manual_address}</p>
        </>
      ),
    },
    {
      key: 'ledger_page',
      header: 'Page',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'area_id',
      header: 'Area Code',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <>
          <p>{row.area_id ? row.area_id : '-'}</p>
        </>
      )
    },
    {
      key: 'debit',
      header: 'Debit',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          <p>{row.debit > 0 ? thousandSeparator(row.debit) : '-'}</p>
        </>
      )
    },
    {
      key: 'credit',
      header: 'Credit',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          <p>{row.credit > 0 ? thousandSeparator(row.credit) : '-'}</p>
        </>
      )
    }
  ];

  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setPerPage(value);
    } else {
      setPerPage(10); // Reset if input is invalid
    }
  };
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);

    if (!isNaN(value)) {
      setFontSize(value);
    } else {
      setFontSize(10); // Reset if input is invalid
    }
  };

  const handlePrint = useReactToPrint({
    content: () => {
      if (!printRef.current) {
        // alert("Nothing to print: Ref not ready");
        return null;
      }
      return printRef.current;
    },
    documentTitle: 'Due Report',
    // onAfterPrint: () => alert('Printed successfully!'),
    removeAfterPrint: true,
  });

  return (
    <div className="">
      <HelmetTitle title={'Due List'} />
      <div className="py-3">
        {selectedOption && (
          <div className="mt-4">
            <p>Selected:</p>
            <p className="font-bold">{selectedOption.label}</p>
          </div>
        )}
        <div className={`gap-3 ${useFilterMenuEnabled ? 'flex flex-wrap items-center' : 'flex flex-col 2xl:flex-row 2xl:items-end'}`}>
          <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'w-full 2xl:min-w-[320px] 2xl:flex-1'}>
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
                    ? 'absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,320px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800'
                    : 'w-full'
                }
              >
                <div
                  className={
                    useFilterMenuEnabled
                      ? 'space-y-3'
                      : 'grid grid-cols-1 items-end gap-3 md:grid-cols-2'
                  }
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                    {branchDdlData.isLoading == true ? <Loader /> : ''}
                    <BranchDropdown
                      onChange={handleBranchChange}
                      value={branchId == null ? '' : String(branchId)}
                      className="w-full font-medium text-sm p-1.5 h-10"
                      branchDdl={dropdownData}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
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
                        : 'hidden'
                    }`}
                  >
                    <ButtonLoading
                      onClick={handleActionButtonClick}
                      buttonLoading={buttonLoading}
                      icon={<FiCheckSquare />}
                      label="Apply"
                      className="h-10 px-6"
                    />
                    <ButtonLoading
                      onClick={handleResetFilters}
                      buttonLoading={false}
                      icon={<FiRotateCcw />}
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

          <div className={`flex flex-wrap items-end gap-2 ${useFilterMenuEnabled ? 'ml-auto' : 'w-full justify-start 2xl:ml-auto 2xl:w-auto 2xl:justify-end'}`}>
            {!useFilterMenuEnabled && (
              <>
                <ButtonLoading
                  onClick={handleActionButtonClick}
                  buttonLoading={buttonLoading}
                  icon={<FiCheckSquare />}
                  label="Apply"
                  className="h-10 px-6"
                />
                <ButtonLoading
                  onClick={handleResetFilters}
                  buttonLoading={false}
                  icon={<FiRotateCcw />}
                  label="Reset"
                  className="h-10 px-4"
                />
              </>
            )}
            <InputElement
              id="perPage"
              name="perPage"
              label="Per page"
              value={perPage.toString()}
              onChange={handlePerPageChange}
              type='text'
              className="font-medium text-sm h-10 !w-20 text-center"
            />
            <InputElement
              id="fontSize"
              name="fontSize"
              label="Font Size"
              value={fontSize.toString()}
              onChange={handleFontSizeChange}
              type='text'
              className="font-medium text-sm h-10 !w-20 text-center"
            />
            <PrintButton
              onClick={handlePrint}
              label="Print"
              className="h-10 px-6"
              disabled={!Array.isArray(tableData) || tableData.length === 0}
            />
          </div>
        </div>
      </div>
      <div className='overflow-y-auto overflow-x-auto'>
        {dueList.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} /> {/* Ensure data is always an array */}

        {/* === Hidden Print Component === */}
        <div className="hidden">
          <DueListPrint
          ref={printRef}
          rows={tableData || []}
          endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
          title="Due List"
          rowsPerPage={Number(perPage)}
          fontSize={Number(fontSize)}
          />
        </div>
      </div>
    </div>
  );
};

export default DueList;
