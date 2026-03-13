import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import Table from "../../../utils/others/Table";
import InputElement from "../../../utils/fields/InputElement";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { formatPaymentMonth } from "../../../utils/utils-functions/formatDate";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import routes from "../../../services/appRoutes";
import { salarySheetPrint, salarySheetUpdate } from "./salarySlice";

type SalaryHistory = {
  name?: string;
  designation_name?: string;
  working_days?: number | string;
};

type UpdateRow = {
  id: number;
  serial_no?: number;
  monthly_basic_salary: number;
  monthly_others_allowance: number;
  basic_salary: number;
  others_allowance: number;
  loan_deduction: number;
  net_salary?: number;
  gross_salary?: number;
  payment_amount?: number;
  history?: string | SalaryHistory;
  working_days: number;
};

const getHistory = (history?: string | SalaryHistory): SalaryHistory => {
  if (!history) return {};

  if (typeof history === "string") {
    try {
      return JSON.parse(history);
    } catch {
      return {};
    }
  }

  return history;
};

const roundUpToNearestTen = (value: number) => Math.ceil(value / 10) * 10;

const getMonthDaysFromPaymentMonth = (paymentMonth?: string) => {
  if (!paymentMonth || !/^\d{6}$/.test(paymentMonth)) return 30;

  const month = Number(paymentMonth.substring(0, 2));
  const year = Number(paymentMonth.substring(2));

  if (!month || !year) return 30;

  return new Date(year, month, 0).getDate();
};

const inferMonthlyAmount = (
  currentAmount: number,
  workingDays: number,
  selectedMonthDays: number
) => {
  if (selectedMonthDays <= 0) return currentAmount;
  if (workingDays <= 0 || workingDays >= selectedMonthDays) return currentAmount;

  return roundUpToNearestTen((currentAmount / workingDays) * selectedMonthDays);
};

const SalarySheetUpdate = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const location = useLocation();
  const salary = useSelector((state: any) => state.salary);

  const sourceRow = location.state?.row;
  const [rows, setRows] = useState<UpdateRow[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [selectedMonthDays, setSelectedMonthDays] = useState<number>(30);

  useEffect(() => {
    if (!sourceRow) {
      toast.info("No salary sheet selected");
      navigate(routes.hrms_salary_sheet_list);
      return;
    }

    void dispatch(salarySheetPrint(sourceRow)).unwrap();
  }, [dispatch, navigate, sourceRow]);

  useEffect(() => {
    setSelectedMonthDays(getMonthDaysFromPaymentMonth(sourceRow?.payment_month));
  }, [sourceRow?.payment_month]);

  useEffect(() => {
    const data = salary?.salarySheet?.data;
    if (!Array.isArray(data)) return;

    const mapped: UpdateRow[] = data.map((row: any, index: number) => {
      const history = getHistory(row.history);
      const workingDays = Number(history.working_days ?? row.working_days ?? 0) || 0;
      const basicSalary = Number(row.basic_salary) || 0;
      const othersAllowance = Number(row.others_allowance) || 0;

      return {
        id: Number(row.id),
        serial_no: Number(row.serial_no ?? index + 1),
        monthly_basic_salary: inferMonthlyAmount(basicSalary, workingDays, selectedMonthDays),
        monthly_others_allowance: inferMonthlyAmount(othersAllowance, workingDays, selectedMonthDays),
        basic_salary: basicSalary,
        others_allowance: othersAllowance,
        loan_deduction: Number(row.loan_deduction) || 0,
        payment_amount: Number(row.payment_amount) || 0,
        gross_salary: Number(row.gross_salary) || 0,
        net_salary: Number(row.net_salary) || 0,
        history: row.history,
        working_days: workingDays,
      };
    });

    setRows(mapped);
  }, [salary?.salarySheet, selectedMonthDays]);

  const handleInputChange = (id: number, field: keyof UpdateRow, value: string) => {
    const numericValue = Number(value) || 0;

    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: numericValue,
            }
          : row
      )
    );
  };

  const proratedAmount = (amount: number, days: number) => {
    const monthDays = selectedMonthDays > 0 ? selectedMonthDays : 30;
    if (days <= 0 || monthDays <= 0) return 0;
    return roundUpToNearestTen((amount / monthDays) * days);
  };

  const proratedBasicSalary = (row: UpdateRow) =>
    proratedAmount(Number(row.monthly_basic_salary || 0), Number(row.working_days || 0));

  const proratedOtherAllowance = (row: UpdateRow) =>
    proratedAmount(Number(row.monthly_others_allowance || 0), Number(row.working_days || 0));

  const calculateGross = (row: UpdateRow) =>
    proratedBasicSalary(row) + proratedOtherAllowance(row);

  const calculateNet = (row: UpdateRow) =>
    calculateGross(row) - Number(row.loan_deduction || 0);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.basic += proratedBasicSalary(row);
        acc.allowance += proratedOtherAllowance(row);
        acc.gross += calculateGross(row);
        acc.loan += Number(row.loan_deduction || 0);
        acc.net += calculateNet(row);
        return acc;
      },
      { basic: 0, allowance: 0, gross: 0, loan: 0, net: 0 }
    );
  }, [rows, selectedMonthDays]);

  const handleUpdate = async () => {
    if (!sourceRow) return;

    setSaveLoading(true);

    try {
      const payload = {
        row: sourceRow,
        employees: rows.map((row) => ({
          id: row.id,
          working_days: Number(row.working_days || 0),
          basic_salary: proratedBasicSalary(row),
          others_allowance: proratedOtherAllowance(row),
          loan_deduction: Number(row.loan_deduction || 0),
        })),
      };

      const response = await dispatch(salarySheetUpdate(payload)).unwrap();
      toast.success(response?.message || "Salary sheet updated successfully");
      navigate(routes.hrms_salary_sheet_list);
    } catch (error: any) {
      toast.error(typeof error === "string" ? error : error?.message || "Salary update failed");
    } finally {
      setSaveLoading(false);
    }
  };

  const columns = [
    {
      key: "serial_no",
      header: "Sl",
      headerClass: "text-center",
      cellClass: "text-center",
    },
    {
      key: "employee",
      header: "Employee",
      render: (row: UpdateRow) => {
        const history = getHistory(row.history);
        return (
          <>
            <div className="font-semibold">{history.name || "-"}</div>
            <div className="text-xs text-slate-500">{history.designation_name || "-"}</div>
          </>
        );
      },
    },
    {
      key: "working_days",
      header: "Days",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: UpdateRow) => (
        <InputElement
          id={`working_days_${row.id}`}
          name={`working_days_${row.id}`}
          value={row.working_days}
          onChange={(e) => {
            const digitsOnly = e.target.value.replace(/\D/g, "");
            const inputDays = digitsOnly === "" ? 0 : Number(digitsOnly);
            const safeDays = Math.max(
              0,
              Math.min(selectedMonthDays, Number.isFinite(inputDays) ? inputDays : 0)
            );
            handleInputChange(row.id, "working_days", String(safeDays));
          }}
          type="text"
          inputMode="numeric"
          className="w-20 text-right"
        />
      ),
    },
    {
      key: "basic_salary",
      header: "Salary",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: UpdateRow) => (
        <InputElement
          id={`basic_salary_${row.id}`}
          name={`basic_salary_${row.id}`}
          value={proratedBasicSalary(row)}
          onChange={() => undefined}
          type="number"
          className="w-28 text-right"
          disabled={true}
        />
      ),
    },
    {
      key: "others_allowance",
      header: "Allowance",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: UpdateRow) => (
        <InputElement
          id={`others_allowance_${row.id}`}
          name={`others_allowance_${row.id}`}
          value={proratedOtherAllowance(row)}
          onChange={() => undefined}
          type="number"
          className="w-28 text-right"
          disabled={true}
        />
      ),
    },
    {
      key: "gross_salary",
      header: "Gross",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: UpdateRow) => thousandSeparator(calculateGross(row), 0),
    },
    {
      key: "loan_deduction",
      header: "Loan",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: UpdateRow) => (
        <InputElement
          id={`loan_deduction_${row.id}`}
          name={`loan_deduction_${row.id}`}
          value={row.loan_deduction}
          onChange={(e) => handleInputChange(row.id, "loan_deduction", e.target.value)}
          type="number"
          className="w-28 text-right"
        />
      ),
    },
    {
      key: "net_salary",
      header: "Net Salary",
      headerClass: "text-right",
      cellClass: "text-right font-semibold",
      render: (row: UpdateRow) => thousandSeparator(calculateNet(row), 0),
    },
    {
      key: "payment_amount",
      header: "Paid",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: UpdateRow) => thousandSeparator(Number(row.payment_amount || 0), 0),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Salary Sheet Update" />

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Salary Sheet Update
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {sourceRow?.payment_month ? formatPaymentMonth(sourceRow.payment_month) : ""}
          </p>
        </div>

        <div className="flex gap-2">
          <ButtonLoading
            onClick={() => navigate(routes.hrms_salary_sheet_list)}
            label="Back"
            className="whitespace-nowrap bg-slate-500 hover:bg-slate-600"
          />
          <ButtonLoading
            onClick={handleUpdate}
            buttonLoading={saveLoading}
            disabled={saveLoading || rows.length === 0}
            label="Update Salary"
            className="whitespace-nowrap bg-blue-600 hover:bg-blue-700"
          />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-5">
        <div className="rounded-lg border bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs text-slate-500">Basic</div>
          <div className="font-semibold">{thousandSeparator(totals.basic, 0)}</div>
        </div>
        <div className="rounded-lg border bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs text-slate-500">Allowance</div>
          <div className="font-semibold">{thousandSeparator(totals.allowance, 0)}</div>
        </div>
        <div className="rounded-lg border bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs text-slate-500">Gross</div>
          <div className="font-semibold">{thousandSeparator(totals.gross, 0)}</div>
        </div>
        <div className="rounded-lg border bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs text-slate-500">Loan</div>
          <div className="font-semibold">{thousandSeparator(totals.loan, 0)}</div>
        </div>
        <div className="rounded-lg border bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs text-slate-500">Net</div>
          <div className="font-semibold">{thousandSeparator(totals.net, 0)}</div>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {salary.loading ? <Loader /> : null}
        <Table columns={columns} data={rows} className="" />
      </div>
    </div>
  );
};

export default SalarySheetUpdate;
