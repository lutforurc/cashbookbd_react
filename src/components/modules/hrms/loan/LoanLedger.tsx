import React, { useEffect, useRef, useState } from 'react';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';   
import { useReactToPrint } from 'react-to-print';
import EmployeeDropdownSearch from '../../../utils/utils-functions/EmployeeDropdownSearch'; 
import { employeeLoanLedger } from './employeeLoanSlice'; 
import LoanLedgerPrint from './LoanLedgerPrint';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { FiSearch } from 'react-icons/fi';
import ImagePopup from '../../../utils/others/ImagePopup';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';

const LoanLedger = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const ledgerData = useSelector((state) => state.ledger);
  const coal4 = useSelector((state) => state.coal4);
  const settings = useSelector((state: any) => state.settings); 
  const employeeLoan = useSelector((state: any) => state.employeeLoan); 
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]); // Initialize as an empty array
  const [employeeData, setEmployeeData] = useState<any[]>([]); // Initialize as an empty array
  const [branchId, setBranchId] = useState<number | null>(null);
  const [ledgerId, setLedgerAccount] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [branchPad, setBranchPad] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);
  const voucherRegistryRef = useRef<any>(null); 

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user.user.branch_id);
    setBranchPad(user?.user?.branch_id.toString().padStart(4, '0'));
  }, []);



  useEffect(() => {
    if (employeeLoan.ledgerData) {
      const tableRows = employeeLoan?.ledgerData?.data;
      const employeeRows = employeeLoan?.ledgerData?.employeeData;
      setTableData(tableRows);
      setEmployeeData(employeeRows);
    } else {
      setTableData([]); // Clear table data if loading or no data
      setEmployeeData([]); // Clear employee data if loading or no data
    } 
  }, [employeeLoan]);



  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setBranchId(val === '' ? null : Number(val));
  };

  const handleStartDate = (e: any) => {
    setStartDate(e);
  };

  const handleEndDate = (e: any) => {
    setEndDate(e);
  };

  const handleActionButtonClick = () => {
    const startD = dayjs(startDate).format('YYYY-MM-DD'); // Adjust format as needed
    const endD = dayjs(endDate).format('YYYY-MM-DD'); // Adjust format as needed
    if (!ledgerId) {
      toast.info('Please select ledger account.');
      return;
    }
    dispatch(
      employeeLoanLedger({ branchId, ledgerId, startDate: startD, endDate: endD }),
    );
    // dispatch(getCoal4ById(Number(ledgerId)));

  };


  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData?.protectedData?.data);
      const [day, month, year] =
        branchDdlData?.protectedData?.transactionDate.split('/');
      const startDate = new Date(Number(year), Number(month) - 1, Number('01'));
      const endDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(startDate);
      setEndDate(endDate);

      setBranchId(user.user.branch_id);
    }
  }, [branchDdlData?.protectedData]);

  const columns = [
    {
      key: 'sl',
      header: 'Sl. No', 
      headerClass: 'text-center ',
      cellClass: 'text-center ',
      render: (row: any) => (
        <div className="">{row.sl ? row.sl : ''}</div>
      ),
    }, 
    {
      key: 'vr_no',
      header: 'VR No & Date',  
      render: (row: any) => (
        <div className=""> 
          <div>{row.vr_no ? row.vr_no : ''}</div>
          <div>{row.vr_date ? dayjs(row.vr_date).format('DD/MM/YYYY') : ''}</div> 
        </div>
      ),
    }, 
    {
      key: 'remarks',
      header: 'Remarks',  
      render: (row: any) => (
        <div className="">
          <div className='block text-gray-900 dark:text-[rgb(var(--c-text))]'>{row.remarks ? row.remarks : ''}</div>
          <div className='block text-gray-500 dark:text-gray-500'>{row.branch_name ? ` ${row.branch_name}` : ''}</div>
          </div>
      ),
    }, 
    {
      key: 'received_amt',
      header: 'Received', 
      headerClass: 'text-right ',
      cellClass: 'text-right ',
      render: (row: any) => (
        <div className="">{row.received_amt ?  thousandSeparator( row.received_amt) : ''}</div>
      ),
    }, 
    {
      key: 'payment_amt',
      header: 'Payment', 
      headerClass: 'text-right ',
      cellClass: 'text-right ',
      render: (row: any) => (
        <div className="">{row.payment_amt ?  thousandSeparator( row.payment_amt) : ''}</div>
      ),
    }, 
    {
      key: 'voucher_image',
      header: 'Voucher',
      headerClass: 'text-center ',
      cellClass: 'text-center ',
      render: (row: any) => {
        const rowBranchPad = row.branch_pad || (row.branch_id ? row.branch_id.toString().padStart(4, '0') : '');

        return rowBranchPad && row.voucher_image ? (
          <div className="flex justify-center">
            <ImagePopup
              branchPad={rowBranchPad}
              voucher_image={row.voucher_image}
              title="Voucher Image"
            />
          </div>
        ) : (
          <span />
        );
      },
    },
  ];


  const COLOR_CLASSES = [
    'text-red-700 dark:text-red-400',
    'text-blue-700 dark:text-blue-400',
    'text-emerald-700 dark:text-emerald-400',
    'text-purple-700 dark:text-purple-400',
    'text-amber-700 dark:text-amber-400',
    'text-cyan-700 dark:text-cyan-400',
    'text-pink-700 dark:text-pink-400',
    'text-lime-700 dark:text-lime-400',
  ];

 
 

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Due Report',
  });

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

  const branchOptions = settings?.data?.branch?.branch_types_id === 1
    ? [{ id: "", name: "Select All Branch" }, ...(dropdownData ?? [])]
    : [...(dropdownData ?? [])];

  const transactionAccountHandler = (selectedOption: any) => {
    setLedgerAccount(Number(selectedOption?.value ?? '')); 
  };

  return (
    <div className="">
      <HelmetTitle title={'Loan Ledger'} />
      <div className="mb-3 border border-slate-200 bg-[rgb(var(--c-surface))] p-3 dark:border-slate-700">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <div>
              {' '}
              <label htmlFor="">Select Branch</label>
            </div>
            <div>
              {branchDdlData.isLoading == true ? <Loader /> : ''}
              <BranchDropdown
                defaultValue={user?.user?.branch_id}
                onChange={handleBranchChange}
                className="w-full font-medium text-sm p-2"
                branchDdl={branchOptions}
              />
            </div>
          </div>

          <div className="min-w-[180px] flex-1">
            <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Select Employee</label>
            <EmployeeDropdownSearch
 id="account"
 name="account"
 placeholder="Select Employee"
 onSelect={transactionAccountHandler} 
 className="w-full font-medium text-sm "
 onKeyDown={(e: any) => {
                if (e.key === 'Enter') document.getElementById('remarks')?.focus();
              }}
            />
          </div> 

          <div className="min-w-[150px] flex-1">
            <label htmlFor="">Start Date</label>
            <InputDatePicker
 setCurrentDate={handleStartDate}
 className="font-medium text-sm w-full "
 selectedDate={startDate}
 setSelectedDate={setStartDate}
            />
          </div>

          <div className="min-w-[150px] flex-1">
            <label htmlFor="">End Date</label>
            <InputDatePicker
 setCurrentDate={handleEndDate}
 className="w-full font-medium text-sm "
 selectedDate={endDate}
 setSelectedDate={setEndDate}
            />
          </div>

          <div className="flex shrink-0 items-end gap-2">
            <div>
              <PrintRowsInput
 id="perPage"
 name="perPage"
 label="Rows"
 value={perPage.toString()}
 onChange={handlePerPageChange}
 type='text'
 className="font-medium text-sm w-16"
              />
            </div>
            <div>
              <PrintFontInput
 id="fontSize"
 name="fontSize"
 label="Font"
 value={fontSize.toString()}
 onChange={handleFontSizeChange}
 type='text'
 className="font-medium text-sm w-16"
              />
            </div>
            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="Run"
              icon={<FiSearch size={15} />}
              className="px-4"
            />
            <PrintButton
              onClick={handlePrint}
              label=""
              className="px-3"
            />
          </div>
        </div>
      </div>
      <div className="overflow-y-auto border border-slate-200 bg-[rgb(var(--c-surface))] dark:border-slate-700">
        {ledgerData.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} />{' '}

        <div className="hidden">
          <LoanLedgerPrint
            ref={printRef}
            rows={tableData || []}
            startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : undefined}
            endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
            title="Loan Ledger"
            coal4={coal4.coal4ById || undefined}
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
            showBranchName={branchId === null}
            employeeData={employeeData as any || undefined}  
          />
        </div>
      </div>
    </div>
  );
};

export default LoanLedger;
