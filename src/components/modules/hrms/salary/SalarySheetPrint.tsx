import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { employeeSalaryPaymentFull, fetchSalarySheet } from "../employee/employeeSlice";
import { toast } from "react-toastify";
import InputElement from "../../../utils/fields/InputElement";
import { useReactToPrint } from "react-to-print";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import Loader from "../../../../common/Loader";
import Table from "../../../utils/others/Table";
import EmployeePrint from "../employee/EmployeePrint";
import YearDropdown from "../../../utils/components/YearDropdown";
import { formatPaymentMonth } from "../../../utils/utils-functions/formatDate";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";


const SalarySheetPrint = ({ user }: any) => {
  const employees = useSelector((state) => state.employees);
  const branchDdlData = useSelector((state) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();
  const [perPage, setPerPage] = useState<number>(20);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number>(12);
  const navigate = useNavigate();
  const [yearId, setYearId] = useState<string>("");



  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user?.branch_id);
  }, []);

  useEffect(() => {
    if (yearId === "") {
      return;
    }
    dispatch(fetchSalarySheet({ branch_id: branchId, year_id: yearId })).unwrap();
  }, [branchId]);



  useEffect(() => {
    if (branchDdlData?.protectedData?.data) if (branchDdlData?.protectedData?.data) {
      const baseData = branchDdlData.protectedData.data;
      if (settings?.data?.branch?.branch_types_id === 1) {
        setDropdownData([
          { id: "", name: 'All Projects' },
          ...baseData,
        ]);
      } else {
        setDropdownData(baseData);
      }
    }
  }, [branchDdlData?.protectedData?.data]);

  const handleSearchButton = (e: any) => {
    e.preventDefault();
    if (yearId === "") {
      toast.info("Please select year");
      return;
    }
    dispatch(fetchSalarySheet({ branch_id: branchId, year_id: yearId })).unwrap();
  };



  const branchColumn = {
    key: 'branch_name',
    header: 'Branch Name',
    render: (row: any) => row.main_trx?.branch?.name ?? '',
  };

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    ...(!branchId ? [branchColumn] : []),
    {
      key: 'payment_month',
      header: 'Payment Month',
      render: (row: any) => (
        <span
          className="text-blue-600 cursor-pointer"
          onClick={() => handlePrint(row)}
          title="Click to print salary sheet"
        >
          {formatPaymentMonth(row.payment_month)}
        </span>
      ),
    },

    {
      key: 'total_employee',
      header: 'Employees',
      headerClass: 'text-right',
      cellClass: 'text-right',
    },
    {
      key: 'gross_salary',
      header: 'Gross Salary',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => thousandSeparator(row.gross_salary, 0),
    },
    {
      key: 'net_salary',
      header: 'Net Salary',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => thousandSeparator(row.net_salary, 0),
    },
    {
      key: 'total_deduction',
      header: 'Loan Ded.',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => thousandSeparator(row.total_deduction, 0),
    },
    {
      key: 'payment_amount',
      header: 'Payment Amount',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => thousandSeparator(row.payment_amount, 0),
    },
    {
      key: 'due',
      header: 'Due',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => thousandSeparator(Number(row.net_salary) - Number(row.payment_amount), 0),
    },

    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        const dueAmount = Number(row.net_salary || 0) - Number(row.payment_amount || 0);
        return (
          <>
            {dueAmount === 0 ? (
              <span className="text-green-600">Paid</span>
            ) : (
              <button
                onClick={() => salaryPaymentDetails(row)}
                className="text-blue-600 hover:underline"
              >
                Details
              </button>
            )}
          </>
        );
      },
    }
  ];


  const salaryPaymentDetails = async (row: any) => {
    try {
      const response = await dispatch(
        employeeSalaryPaymentFull({ data: row }) // ✅ FIX
      ).unwrap();

      dispatch(fetchSalarySheet({ branch_id: branchId, year_id: yearId })).unwrap();
      console.log(response);
    } catch (error) {
      console.error(error);
    }
  };



  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };



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


  const handleOnYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setYearId(value.toString());
  };


  return (
    <div>
      <HelmetTitle title={'Salary Sheet'} />
      <div className="flex overflow-x-auto justify-between mb-1">
        <div className='flex'>
          <div className='mr-2'>
            <div className="w-full">
              {/* {branchDdlData.isLoading == true ? <Loader /> : ''} */}
              <BranchDropdown
                defaultValue={user?.user?.branch_id}
                onChange={handleBranchChange}
                className="w-60 font-medium text-sm p-2 "
                branchDdl={dropdownData}
              />
            </div>
          </div>

          <div className="mr-2">
            <YearDropdown
              id="year_id"
              name="year_id"
              className="h-[2.3rem] bg-transparent min-w-35"
              onChange={handleOnYearChange}
            />
          </div>
          <div className="flex">

            {/* <SearchInput
              search={search}
              setSearchValue={setSearchValue}
              className="text-nowrap"
            /> */}
            <ButtonLoading
              onClick={handleSearchButton}
              buttonLoading={buttonLoading}
              label="Search"
              className="whitespace-nowrap"
            />
          </div>
        </div>


        <div className='flex'>
          <div className="mr-2">
            <InputElement
              id="perPage"
              name="perPage"
              // label="Rows"
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
              // label="Font"
              value={fontSize.toString()}
              onChange={handleFontSizeChange}
              type='text'
              className="font-medium text-sm h-9 w-12"
            />
          </div>
          <PrintButton
            onClick={handlePrint}
            label="Print"
            className="ml-2 mr-2"
          />
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {employees.loading == true ? <Loader /> : ''}

        <Table columns={columns} data={employees?.salary || []} className="" />



        {/* === Hidden Print Component === */}
        <div className="hidden">
          <EmployeePrint
            ref={printRef}
            rows={tableData}
            rowsPerPage={perPage}
            fontSize={fontSize}
            branchName={dropdownData?.find(b => b.id == branchId)?.name}
          />
        </div>
      </div>
    </div>
  );
};

export default SalarySheetPrint;
