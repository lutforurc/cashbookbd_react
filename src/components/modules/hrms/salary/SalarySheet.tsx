import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
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
import OvertimeSalarySheetPrint from "./OvertimeSalarySheetPrint";
import SalaryPaymentSelectionModal from "./SalaryPaymentSelectionModal";
import { salarySheetPrint } from "./salarySlice";
import routes from "../../../services/appRoutes";
import { FiSearch } from "react-icons/fi";
import * as XLSX from "xlsx";

const getSalaryHistory = (history?: string | Record<string, any>) => {
  if (!history) return {};
  if (typeof history !== "string") return history;

  try {
    return JSON.parse(history);
  } catch {
    return {};
  }
};

const getSalarySheetType = (rows: any[]) =>
  rows.some((row) => {
    const history = getSalaryHistory(row.history);
    return row.salary_sheet_type === "overtime"
      || row.note === "salary_sheet_type:overtime"
      || history.salary_sheet_type === "overtime";
  }) ? "overtime" : "monthly";

const formatOtHours = (minutes: number | string) => (Number(minutes || 0) / 60).toFixed(2);

const SalarySheet = ({ user }: any) => {
  const employees = useSelector((state: any) => state.employees);
  const salary = useSelector((state: any) => state.salary);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);

  const dispatch: any = useDispatch();
  const location = useLocation();
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
  const printSalarySheetType = getSalarySheetType(Array.isArray(tableData) ? tableData : []);
  // The branch this sheet is for. A head-office user can pull any branch, so the
  // printed page must be headed with this one rather than the user's own branch.
  const selectedBranch = dropdownData?.find((b: any) => b.id == branchId);

  const printRef = useRef<HTMLDivElement>(null);

  // ✅ Confirm Modal state
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSheetRow, setSelectedSheetRow] = useState<any>(null);
  const restoredYearId = location.state?.yearId ? String(location.state.yearId) : "";

  useEffect(() => {
    setMeta(salary?.salarySheet?.meta || []);
    setTableData(salary?.salarySheet?.data);
  }, [salary]);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user?.branch_id);
  }, []);

  useEffect(() => {
    if (restoredYearId) {
      setYearId(restoredYearId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, navigate, restoredYearId]);

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

  const openPaymentModal = async (row: any) => {
    if (!yearId) {
      toast.info("Please select year");
      return;
    }

    try {
      await dispatch(salarySheetPrint(row)).unwrap();
      setSelectedSheetRow(row);
      setShowPaymentModal(true);
    } catch (error: any) {
      console.error("Salary details load error:", error);
      toast.error(typeof error === "string" ? error : error?.message || "Salary details load failed");
    }
  };

  const handleActionChange = async (row: any, action: string) => {
    if (action === "payment") {
      await openPaymentModal(row);
      return;
    }

    if (action === "excel") {
      await handleExcelExport(row);
      return;
    }

    if (action === "update") {
      navigate(routes.hrms_salary_sheet_update, {
        state: {
          row,
          yearId,
        },
      });
    }
  };

  const handleExcelExport = async (row: any) => {
    try {
      const response = await dispatch(salarySheetPrint(row)).unwrap();
      const rows = Array.isArray(response?.data) ? response.data : [];

      if (rows.length === 0) {
        toast.info("No salary data found for export");
        return;
      }

      const exportRows = rows.map((item: any, index: number) => {
        const history = getSalaryHistory(item.history);
        const attendanceDeduction = Number(item.attendance_deduction_amount || 0);
        const isOvertimeSheet = getSalarySheetType(rows) === "overtime";

        const baseRow = {
          SL: item.serial_no || index + 1,
          Employee: history.name || item.employee_name || item.name || "",
          Designation: history.designation_name || item.designation_name || "",
          "Month Days": item.month_days || history.month_days || "",
          "Working Days": item.working_days || history.working_days || "",
          "Monthly Basic": history.monthly_basic_salary || item.monthly_basic_salary || "",
          Salary: Number(item.basic_salary || 0),
        };

        return {
          ...baseRow,
          ...(isOvertimeSheet
            ? {
                "OT Hr.": formatOtHours(item.overtime_minutes || history.overtime_minutes || 0),
                "OT Rate": Number(item.ot_rate || history.ot_rate || 0),
                "OT Amount": Number(item.overtime_amount || history.overtime_amount || 0),
              }
            : {
                Mobile: Number(item.others_allowance || 0),
              }),
          Total: Number(item.gross_salary || 0),
          Loan: Number(item.loan_deduction || 0),
          "Att. Ded": attendanceDeduction,
          "Absent Days": Number(item.attendance_absent_days || 0),
          "Unpaid Leave": Number(item.attendance_unpaid_leave_days || 0),
          "Half Days": Number(item.attendance_half_days || 0),
          "Late Count": Number(item.attendance_late_count || 0),
          "Late Ded. Days": Number(item.attendance_late_deduction_days || 0),
          "Early Out Count": Number(item.attendance_early_out_count || 0),
          "Early Out Ded. Days": Number(item.attendance_early_out_deduction_days || 0),
          "Net Salary": Number(item.net_salary || 0),
          Payment: Number(item.payment_amount || 0),
          Due: Number(item.net_salary || 0) - Number(item.payment_amount || 0),
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, getSalarySheetType(rows) === "overtime" ? "Daily Basis Salary" : "Salary Sheet");
      XLSX.writeFile(workbook, `salary-sheet-${row.payment_month || "export"}.xlsx`);
    } catch (error: any) {
      console.error("Excel export error:", error);
      toast.error(typeof error === "string" ? error : error?.message || "Salary sheet export failed");
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
          className="cursor-pointer font-semibold text-blue-600 hover:underline dark:text-blue-400"
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
      cellClass: "text-right font-medium text-slate-700 dark:text-slate-200",
      render: (row: any) => thousandSeparator(row.gross_salary),
    },
    {
      key: "net_salary",
      header: "Net Salary",
      headerClass: "text-right",
      cellClass: "text-right font-semibold text-slate-900 dark:text-white",
      render: (row: any) => thousandSeparator(row.net_salary),
    },
    {
      key: "total_deduction",
      header: "Loan Ded.",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => {
        const value = Number(row.total_deduction || 0);
        return value > 0 ? (
          <span className="font-medium text-rose-600 dark:text-rose-400">{thousandSeparator(value)}</span>
        ) : (
          <span className="text-slate-400 dark:text-slate-600">-</span>
        );
      },
    },
    {
      key: "payment_amount",
      header: "Payment Amount",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => {
        const value = Number(row.payment_amount || 0);
        return value > 0 ? (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{thousandSeparator(value)}</span>
        ) : (
          <span className="text-slate-400 dark:text-slate-600">-</span>
        );
      },
    },
    {
      key: "due",
      header: "Due",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => {
        const due = Number(row.net_salary || 0) - Number(row.payment_amount || 0);
        return due > 0 ? (
          <span className="font-semibold text-rose-600 dark:text-rose-400">{thousandSeparator(due)}</span>
        ) : (
          <span className="text-slate-400 dark:text-slate-600">-</span>
        );
      },
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
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Paid</span>
            ) : (
              <select
                defaultValue=""
                onChange={(e) => {
                  const value = e.target.value;
                  e.target.value = "";
                  void handleActionChange(row, value);
                }}
                className="min-w-28 border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Select</option>
                <option value="update">Update</option>
                <option value="excel">Excel</option>
                <option value="payment">Payment</option>
              </select>
            )}
          </>
        );
      },
    },
  ];

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

  const handleOnYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYearId(e.target.value.toString());
  };

  const handlePrint = async (row: any) => {
    try {
      await dispatch(salarySheetPrint(row)).unwrap();
      setShouldPrint(true);
    } catch (error: any) {
      console.error("Print error:", error);
      toast.error(typeof error === "string" ? error : error?.message || "Salary generation failed");
    }
  };

  const handleSelectedSalaryPayment = async (paymentRows: Array<{ id: number; pay_amount: number }>) => {
    if (!selectedSheetRow) return;

    if (paymentRows.length === 0) {
      toast.info("Please select at least one employee");
      return;
    }

    setLoading(true);

    try {
      const response = await dispatch(
        employeeSalaryPaymentFull({
          data: {
            ...selectedSheetRow,
            salary_payment_ids: paymentRows.map((item) => item.id),
            payment_rows: paymentRows,
          },
        })
      ).unwrap();

      toast.success(response?.message || "Salary payment completed successfully");
      await dispatch(fetchSalarySheet({ branch_id: branchId, year_id: yearId })).unwrap();
      await dispatch(salarySheetPrint(selectedSheetRow)).unwrap();
    } catch (error: any) {
      toast.error(error?.message || "Salary payment failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <HelmetTitle title={"Salary Sheet"} />

      <div className="flex overflow-x-auto justify-between mb-2">
        <div className="flex">
          <div className="mr-2">
            <div className="w-full">
              <BranchDropdown
                defaultValue={branchId?.toString()}
                onChange={(e: any) => {
                  const value = e.target.value;
                  setBranchId(value === "" ? "" : Number(value));
                }}
                className="min-w-60 font-medium text-sm p-2 mr-2 "
                branchDdl={dropdownData}
              />
            </div>
          </div>

          <div className="mr-2">
            <YearDropdown
              id="year_id"
              name="year_id"
              value={yearId}
              className="h-[2.3rem] bg-transparent min-w-35"
              onChange={handleOnYearChange}
            />
          </div>

          <div className="flex">
            <ButtonLoading
              onClick={handleSearchButton}
              buttonLoading={buttonLoading}
              label="Search"
              icon={<FiSearch size={15} />}
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
          {printSalarySheetType === "overtime" ? (
            <OvertimeSalarySheetPrint
              ref={printRef}
              rows={tableData}
              meta={meta}
              rowsPerPage={perPage}
              fontSize={fontSize}
              branchName={selectedBranch?.name}
              printBranch={selectedBranch}
              vr_no={salary?.salarySheet?.vr_no}
              vr_date={salary?.salarySheet?.vr_date}
            />
          ) : (
            <SalarySheetPrint
              ref={printRef}
              rows={tableData}
              meta={meta}
              rowsPerPage={perPage}
              fontSize={fontSize}
              branchName={selectedBranch?.name}
              printBranch={selectedBranch}
              vr_no={salary?.salarySheet?.vr_no}
              vr_date={salary?.salarySheet?.vr_date}
            />
          )}
        </div>

        <SalaryPaymentSelectionModal
          open={showPaymentModal}
          loading={loading}
          rows={tableData}
          paymentMonth={selectedSheetRow?.payment_month}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedSheetRow(null);
          }}
          onPrint={() => setShouldPrint(true)}
          onSubmit={handleSelectedSalaryPayment}
        />
      </div>
    </div>
  );
};

export default SalarySheet;
