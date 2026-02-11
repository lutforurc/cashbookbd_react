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
import InputElement from '../../../utils/fields/InputElement';   
import EmployeeDropdownSearch from '../../../utils/utils-functions/EmployeeDropdownSearch'; 
import { employeeLoanLedger } from './employeeLoanSlice'; 
import LoanLedgerPrint from './LoanLedgerPrint';

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
    console.log('====================================');
    console.log("employeeLoan", employeeLoan);
    console.log('====================================');
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
      headerClass: 'items-center ',
      cellClass: 'items-center ',
      render: (row: any) => (
        <div className="">{row.sl ? row.sl : ''}</div>
      ),
    }, 
    {
      key: 'remarks',
      header: 'Remarks', 
      headerClass: 'items-center ',
      cellClass: 'items-center ',
      render: (row: any) => (
        <div className="">{row.remarks ? row.remarks : ''}</div>
      ),
    }, 
    {
      key: 'received_amt',
      header: 'Received', 
      headerClass: 'items-center ',
      cellClass: 'items-center ',
      render: (row: any) => (
        <div className="">{row.received_amt ? row.received_amt : ''}</div>
      ),
    }, 
    {
      key: 'payment_amt',
      header: 'Payment', 
      headerClass: 'items-center ',
      cellClass: 'items-center ',
      render: (row: any) => (
        <div className="">{row.payment_amt ? row.payment_amt : ''}</div>
      ),
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
    content: () => {
      if (!printRef.current) {
        return null;
      }
      return printRef.current;
    },
    documentTitle: 'Due Report',
    removeAfterPrint: true,
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
      <HelmetTitle title={'Ledger'} />
      <div className="mb-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-5 md:gap-x-4">
          <div className="">
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

          <div className="mt-0 mb-2">
            <label className="text-black dark:text-white">Select Employee</label>
            <EmployeeDropdownSearch
              id="account"
              name="account"
              placeholder="Select Employee"
              onSelect={transactionAccountHandler} 
              onKeyDown={(e: any) => {
                if (e.key === 'Enter') document.getElementById('remarks')?.focus();
              }}
            />
          </div> 

          <div className="w-full">
            <label htmlFor="">Start Date</label>
            <InputDatePicker
              setCurrentDate={handleStartDate}
              className="font-medium text-sm w-full h-9"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
            />
          </div>

          <div>
            <label htmlFor="">End Date</label>
            <InputDatePicker
              setCurrentDate={handleEndDate}
              className="w-full font-medium text-sm h-9"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>

          <div className="mt-2 md:mt-0 flex">
            <div className="mr-2">
              <InputElement
                id="perPage"
                name="perPage"
                label="Rows"
                value={perPage.toString()}
                onChange={handlePerPageChange}
                type='text'
                className="font-medium text-sm h-9 w-12"
              />
            </div>
            <div className="mr-2">
              <InputElement
                id="fontSize"
                name="fontSize"
                label="Font"
                value={fontSize.toString()}
                onChange={handleFontSizeChange}
                type='text'
                className="font-medium text-sm h-9 w-12"
              />
            </div>
            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="Run"
              className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] h-9"
            />
            <PrintButton
              onClick={handlePrint}
              label=""
              className="ml-2 mt-6  pt-[0.45rem] pb-[0.45rem] h-9"
            />
          </div>
        </div>
      </div>
      <div className="overflow-y-auto">
        {ledgerData.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} />{' '}

        <div className="hidden">
          <LoanLedgerPrint
            ref={printRef}
            rows={tableData || []}
            startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : undefined}
            endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
            title="Employee Salary and Loan Ledger"
            coal4={coal4.coal4ById || undefined}
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
            showBranchName={branchId === null}
            employeeData={employeeData || undefined}  
          />
        </div>
      </div>
    </div>
  );
};

export default LoanLedger;
