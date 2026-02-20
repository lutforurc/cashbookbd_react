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
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import Loader from "../../../../common/Loader";
import Table from "../../../utils/others/Table";
import YearDropdown from "../../../utils/components/YearDropdown";
import { formatPaymentMonth } from "../../../utils/utils-functions/formatDate";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import SalarySheetPrint from "./SalarySheetPrint";
import { salarySheetPrint } from "./salarySlice";
import { FiFileText } from "react-icons/fi";
import ConfirmModal from "../../../utils/components/ConfirmModalProps";

const SalarySheet = ({ user }: any) => {
  const employees = useSelector((state: any) => state.employees);
  const salary = useSelector((state: any) => state.salary);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);

  const dispatch: any = useDispatch();
  const navigate = useNavigate();

  const [perPage, setPerPage] = useState<number>(10);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any[]>([]);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<string | number>(user?.branch_id ?? "");
  const [fontSize, setFontSize] = useState<number>(12);
  const [yearId, setYearId] = useState<string>("");
  const [shouldPrint, setShouldPrint] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // ✅ Confirm Modal state
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMeta(salary?.salarySheet?.meta || []);
    setTableData(salary?.salarySheet?.data);
  }, [salary]);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user?.branch_id);
  }, []);

  useEffect(() => {
    if (yearId === "") return;
    dispatch(fetchSalarySheet({ branch_id: branchId, year_id: yearId })).unwrap();
  }, [branchId]);

  useEffect(() => {
    if (branchDdlData?.protectedData?.data) {
      const baseData = branchDdlData.protectedData.data;

      if (settings?.data?.branch?.branch_types_id === 1) {
        setDropdownData([{ id: "", name: "All Projects" }, ...baseData]);
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

  useEffect(() => {
    if (shouldPrint && printRef.current && tableData?.length > 0) {
      handlePrintAction();
      setShouldPrint(false);
    }
  }, [shouldPrint, tableData]);

  const branchColumn = {
    key: "branch_name",
    header: "Branch Name",
    render: (row: any) => row.main_trx?.branch?.name ?? "",
  };

  // ✅ Modal open on click
  const openRestoreConfirm = (row: any) => {
    if (!yearId) {
      toast.info("Please select year");
      return;
    }
    setSelectedRow(row);
    setShowRestoreConfirm(true);
  };

  // ✅ Confirm -> Salary Payment Full
  const handleRestoreConfirmed = async () => {
    if (!selectedRow) return;
    setLoading(true);

    try {
      await dispatch(employeeSalaryPaymentFull({ data: selectedRow })).unwrap();
      toast.success("Payment completed successfully");

      await dispatch(fetchSalarySheet({ branch_id: branchId, year_id: yearId })).unwrap();
    } catch (err: any) {
      toast.error(err?.message || "Payment failed");
      console.error(err);
    } finally {
      setLoading(false);
      setShowRestoreConfirm(false);
      setSelectedRow(null);
    }
  };

  const columns = [
    {
      key: "serial_no",
      header: "Sl. No.",
      headerClass: "text-center",
      cellClass: "text-center",
    },
    ...(!branchId ? [branchColumn] : []),
    {
      key: "payment_month",
      header: "Payment Month",
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
      key: "total_employee",
      header: "Employees",
      headerClass: "text-right",
      cellClass: "text-right",
    },
    {
      key: "gross_salary",
      header: "Gross Salary",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => thousandSeparator(row.gross_salary, 0),
    },
    {
      key: "net_salary",
      header: "Net Salary",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => thousandSeparator(row.net_salary, 0),
    },
    {
      key: "total_deduction",
      header: "Loan Ded.",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => thousandSeparator(row.total_deduction, 0),
    },
    {
      key: "payment_amount",
      header: "Payment Amount",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => thousandSeparator(row.payment_amount, 0),
    },
    {
      key: "due",
      header: "Due",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) =>
        thousandSeparator(Number(row.net_salary) - Number(row.payment_amount), 0),
    },
    {
      key: "action",
      header: "Action",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => {
        const dueAmount = Number(row.net_salary || 0) - Number(row.payment_amount || 0);

        return (
          <>
            {dueAmount === 0 ? (
              <span className="text-green-600">Paid</span>
            ) : (
              <button
                onClick={() => openRestoreConfirm(row)} // ✅ confirm modal open
                className="text-blue-600 hover:underline"
              >
                <FiFileText size={18} title="Make payment?" />
              </button>
            )}
          </>
        );
      },
    },
  ];

  // (Optional) keeping your old function – not used now (we call payment inside handleRestoreConfirmed)
  const salaryPaymentDetails = async (row: any) => {
    try {
      await dispatch(employeeSalaryPaymentFull({ data: row })).unwrap();
      dispatch(fetchSalarySheet({ branch_id: branchId, year_id: yearId })).unwrap();
    } catch (error) {
      console.error(error);
    }
  };

  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPerPage(!isNaN(value) ? value : 10);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFontSize(!isNaN(value) ? value : 10);
  };

  const handlePrintAction = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Salary Sheet Print",
    removeAfterPrint: true,
  });

  const handlePrint = async (row: any) => {
    try {
      await dispatch(salarySheetPrint(row)).unwrap();
      setShouldPrint(true);
    } catch (error: any) {
      console.error("Print error:", error);
      toast.error(typeof error === "string" ? error : error?.message || "Salary generation failed");
    }
  };

  const handleOnYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYearId(e.target.value.toString());
  };

  const getSelectedDue = () => {
    const net = Number(selectedRow?.net_salary || 0);
    const paid = Number(selectedRow?.payment_amount || 0);
    return net - paid;
  };

  return (
    <div>
      <HelmetTitle title={"Salary Sheet"} />

      <div className="flex overflow-x-auto justify-between mb-1">
        <div className="flex">
          <div className="mr-2">
            <div className="w-full">
              <BranchDropdown
                defaultValue={branchId?.toString()}
                onChange={(e: any) => {
                  const value = e.target.value;
                  setBranchId(value === "" ? "" : Number(value));
                }}
                className="w-60 font-medium text-sm p-2 mr-2 "
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
            <ButtonLoading
              onClick={handleSearchButton}
              buttonLoading={buttonLoading}
              label="Search"
              className="whitespace-nowrap"
            />
          </div>
        </div>

        <div className="flex">
          <div className="mr-2">
            <InputElement
              id="perPage"
              name="perPage"
              value={perPage.toString()}
              onChange={handlePerPageChange}
              type="text"
              className="font-medium text-sm h-9 w-12"
            />
          </div>
          <div className="mr-2">
            <InputElement
              id="fontSize"
              name="fontSize"
              value={fontSize.toString()}
              onChange={handleFontSizeChange}
              type="text"
              className="font-medium text-sm h-9 w-12"
            />
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {employees.loading === true ? <Loader /> : ""}

        <Table columns={columns} data={employees?.salary || []} className="" />

        {/* === Hidden Print Component === */}
        <div className="hidden">
          <SalarySheetPrint
            ref={printRef}
            rows={tableData}
            meta={meta}
            rowsPerPage={perPage}
            fontSize={fontSize}
            branchName={dropdownData?.find((b: any) => b.id == branchId)?.name}
            vr_no={salary?.salarySheet?.vr_no}
            vr_date={salary?.salarySheet?.vr_date}
          />
        </div>

        {/* ✅ Confirm Modal */}
        <ConfirmModal
          show={showRestoreConfirm}
          title="Confirm Payment"
          message={
            <>
              Proceed with salary payment for this month?
              <span className="block font-bold mt-1">
                {formatPaymentMonth(selectedRow?.payment_month)}
              </span>
              <span className="block mt-1">
                Payment: <b>{thousandSeparator(getSelectedDue(), 0)}</b>
              </span>
            </>
          }
          loading={loading}
          onCancel={() => {
            setShowRestoreConfirm(false);
            setSelectedRow(null);
          }}
          onConfirm={handleRestoreConfirmed}
          className="bg-green-600 hover:bg-green-700"
        />
      </div>
    </div>
  );
};

export default SalarySheet;