import React, { useEffect, useMemo, useState } from "react";
import { FiSave, FiPrinter, FiTrash2, FiSearch, FiSquare, FiCheck, FiCheckSquare, FiMenu } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { salaryGenerate, salaryView } from "./salarySlice";
import InputElement from "../../../utils/fields/InputElement";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import Table from "../../../utils/others/Table";
import MonthDropdown from "../../../utils/components/MonthDropdown";
import { toast } from "react-toastify";
import { fetchEmployeeSettings } from "../employee/employeeSlice";
import ConfirmModal from "../../../utils/components/ConfirmModalProps";
import MultiSelectDropdown from "../../../utils/utils-functions/MultiSelectDropdown";
import httpService from "../../../services/httpService";
import {
  API_ATTENDANCE_ENTRY_REPORT_URL,
  API_ATTENDANCE_LEAVE_APPLICATION_LIST_URL,
  API_ATTENDANCE_MONTHLY_SUMMARY_URL,
} from "../../../services/apiRoutes";
import { Button } from '../../../../pages/UiElements/CustomButtons';

/* ================= TYPES ================= */
interface SalaryRow {
  id: number;
  serial_no: number;
  name: string;
  designation_name: string;
  employment_type?: string;

  basic_salary: number;
  monthly_basic_salary: number;
  others_allowance: number;
  monthly_others_allowance: number;

  // ✅ API ডাটায় আসল টাকাটা এখানে আছে (string/number হতে পারে)
  loan_balance: number;

  // optional: API তে আছে কিন্তু আপাতত ব্যবহার করছি না
  loan_deduction: number;

  net_deduction: number;
  attendance_deduction_amount: number;
  attendance_absent_days: number;
  attendance_unpaid_leave_days: number;
  attendance_half_days: number;
  attendance_late_count: number;
  attendance_late_deduction_days: number;
  attendance_early_out_count: number;
  attendance_early_out_deduction_days: number;
  ot_rate: number;
  overtime_minutes: number;
  overtime_amount: number;
  month_days: number;
  working_days: number;
}

type AttendanceSalarySummary = {
  working_days: number;
  attendance_deduction_amount: number;
  attendance_absent_days: number;
  attendance_unpaid_leave_days: number;
  attendance_half_days: number;
  attendance_late_count: number;
  attendance_late_deduction_days: number;
  attendance_early_out_count: number;
  attendance_early_out_deduction_days: number;
  ot_rate: number;
  overtime_minutes: number;
  overtime_amount: number;
};

const salarySheetTypeOptions = [
  { id: "monthly", name: "Monthly Salary" },
  { id: "overtime", name: "Overtime Salary" },
];

const pad = (value: number) => String(value).padStart(2, "0");
const toDateString = (year: number, monthIndex: number, day: number) => `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
const formatOtHours = (minutes: number | string) => (Number(minutes || 0) / 60).toFixed(2);

const parseMonthId = (monthId: string) => {
  const [monthPart, yearPart] = String(monthId || "").split("-");
  const month = Number(monthPart);
  const year = Number(yearPart);

  if (!Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(year)) {
    return null;
  }

  const monthIndex = month - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return {
    monthIndex,
    year,
    daysInMonth,
    date_from: toDateString(year, monthIndex, 1),
    date_to: toDateString(year, monthIndex, daysInMonth),
  };
};

const toList = (value: any) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  return [];
};

const attendanceRowsFromResponse = (response: any) => {
  const payload = response?.data?.data?.data || response?.data?.data || response?.data || {};
  return Array.isArray(payload?.rows) ? payload.rows : [];
};

const leaveRowsFromResponse = (response: any) =>
  toList(response?.data?.data?.data ?? response?.data?.data ?? response?.data);

const monthlySummaryRowsFromResponse = (response: any) => {
  const payload = response?.data?.data?.data || response?.data?.data || response?.data || {};
  return Array.isArray(payload?.rows) ? payload.rows : [];
};

const toNumber = (value: any, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const attendancePayableValue = (status?: string, approvalStatus?: string) => {
  if (approvalStatus === "rejected" || status === "rejected" || status === "absent") return 0;
  if (status === "half_day") return 0.5;
  if (["present", "late", "early_out", "pending", "holiday", "weekly_holiday", "leave"].includes(String(status || ""))) return 1;
  return 0;
};

const parseLocalDate = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const buildAttendanceWorkingDayMap = (attendanceRows: any[], leaveRows: any[], monthInfo: NonNullable<ReturnType<typeof parseMonthId>>) => {
  const byEmployeeDate = new Map<string, Record<string, number>>();
  const monthStart = new Date(monthInfo.year, monthInfo.monthIndex, 1);
  const monthEnd = new Date(monthInfo.year, monthInfo.monthIndex, monthInfo.daysInMonth);

  const ensureEmployee = (employeeId: string) => {
    if (!byEmployeeDate.has(employeeId)) byEmployeeDate.set(employeeId, {});
    return byEmployeeDate.get(employeeId)!;
  };

  attendanceRows.forEach((row: any) => {
    const employeeId = String(row.employee_id || "");
    const attendanceDate = String(row.attendance_date || "").slice(0, 10);
    if (!employeeId || !attendanceDate) return;

    ensureEmployee(employeeId)[attendanceDate] = attendancePayableValue(row.status, row.approval_status);
  });

  leaveRows.forEach((leave: any) => {
    if (leave.approval_status !== "approved") return;

    const employeeId = String(leave.employee_id || "");
    if (!employeeId) return;

    const fromDate = parseLocalDate(leave.from_date);
    const toDate = parseLocalDate(leave.to_date);
    if (!fromDate || !toDate) return;

    const current = new Date(Math.max(fromDate.getTime(), monthStart.getTime()));
    const last = new Date(Math.min(toDate.getTime(), monthEnd.getTime()));
    const employeeDates = ensureEmployee(employeeId);
    let paidDaysLeft = Number(leave.approved_paid_days ?? leave.requested_days ?? 0) || 0;

    while (current <= last) {
      const dayKey = toDateString(current.getFullYear(), current.getMonth(), current.getDate());
      employeeDates[dayKey] = paidDaysLeft > 0 ? 1 : 0;
      paidDaysLeft = Math.max(0, paidDaysLeft - 1);
      current.setDate(current.getDate() + 1);
    }
  });

  const totals = new Map<string, number>();
  byEmployeeDate.forEach((dates, employeeId) => {
    totals.set(
      employeeId,
      Object.values(dates).reduce((total, value) => total + Number(value || 0), 0),
    );
  });

  return totals;
};

const buildAttendanceSummaryMapFromMonthlyRows = (rows: any[], monthInfo: NonNullable<ReturnType<typeof parseMonthId>>) => {
  const summaries = new Map<string, AttendanceSalarySummary>();

  rows.forEach((row: any) => {
    const employeeId = String(row.employee_id || row.id || "");
    if (!employeeId) return;

    const deductionDays = toNumber(row.deduction_days);
    const payableDays = row.payable_days !== undefined && row.payable_days !== null
      ? toNumber(row.payable_days)
      : Math.max(0, monthInfo.daysInMonth - deductionDays);

    summaries.set(employeeId, {
      working_days: Math.min(monthInfo.daysInMonth, Math.max(0, payableDays)),
      attendance_deduction_amount: toNumber(row.attendance_deduction_amount),
      attendance_absent_days: toNumber(row.absent_days),
      attendance_unpaid_leave_days: toNumber(row.unpaid_leave_days),
      attendance_half_days: toNumber(row.half_days),
      attendance_late_count: toNumber(row.late_count),
      attendance_late_deduction_days: toNumber(row.late_deduction_days),
      attendance_early_out_count: toNumber(row.early_out_count),
      attendance_early_out_deduction_days: toNumber(row.early_out_deduction_days),
      overtime_minutes: toNumber(row.overtime_minutes),
      overtime_amount: toNumber(row.overtime_amount),
    });
  });

  return summaries;
};

/**
 * A disabled field that exists only to show a figure.
 *
 * Half this sheet's columns are read-only: month days, working days and the
 * three money columns are worked out, not typed. They are drawn as disabled
 * inputs, and FIELD_BASE greys disabled text -- right for a field you cannot
 * type in yet, wrong for one that is simply a number, which left the sheet's
 * own figures the palest thing on the row and the totals beside them dark.
 * They read black on white and white on dark now, like every other number
 * here.
 */
const READONLY_FIGURE = "text-right disabled:text-black! dark:disabled:text-white!";

/**
 * A money box you can still type in.
 *
 * `type="number"` cannot show 5,000 — the browser refuses the comma — so this
 * is a text box that groups the digits while you are out of it and hands you
 * the bare number the moment you are in it. Anything that is not a figure is
 * dropped as it arrives, so a pasted "Tk 5,500" still lands as 5500.
 *
 * Zero reads as 0 rather than the dash thousandSeparator prints: a dash is
 * right for a total nobody can edit and wrong for a box waiting for a number.
 */
const AmountInput: React.FC<{
  value: number | string;
  onChange: (value: string) => void;
  className?: string;
}> = ({ value, onChange, className = "" }) => {
  const [editing, setEditing] = useState(false);

  return (
    <InputElement
      type="text"
      inputMode="numeric"
      value={editing ? String(value ?? "") : (Number(value) || 0).toLocaleString("en-IN")}
      className={className}
      onFocus={() => setEditing(true)}
      onBlur={() => setEditing(false)}
      onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ""))}
    />
  );
};

const isDailyLabour = (employmentType?: string) =>
  String(employmentType || "").toLowerCase().includes("daily");

const buildAttendanceSummaryMapFromAttendanceRows = (attendanceRows: any[], leaveRows: any[], monthInfo: NonNullable<ReturnType<typeof parseMonthId>>) => {
  const workingDays = buildAttendanceWorkingDayMap(attendanceRows, leaveRows, monthInfo);
  const summaries = new Map<string, AttendanceSalarySummary>();

  workingDays.forEach((days, employeeId) => {
    const employeeRows = attendanceRows.filter((row: any) => String(row.employee_id || "") === employeeId);
    const overtimeMinutes = employeeRows.reduce((total: number, row: any) => total + toNumber(row.overtime_minutes), 0);
    const otRate = employeeRows.reduce((rate: number, row: any) => rate || toNumber(row.ot_rate), 0);
    const overtimeAmount = employeeRows.reduce((total: number, row: any) => {
      const savedAmount = toNumber(row.overtime_amount);
      if (savedAmount > 0) return total + savedAmount;

      const minutes = toNumber(row.overtime_minutes);
      const rate = toNumber(row.ot_rate);
      return total + ((minutes / 60) * rate);
    }, 0);

    summaries.set(employeeId, {
      working_days: days,
      attendance_deduction_amount: 0,
      attendance_absent_days: 0,
      attendance_unpaid_leave_days: 0,
      attendance_half_days: 0,
      attendance_late_count: 0,
      attendance_late_deduction_days: 0,
      attendance_early_out_count: 0,
      attendance_early_out_deduction_days: 0,
      ot_rate: otRate,
      overtime_minutes: overtimeMinutes,
      overtime_amount: overtimeAmount,
    });
  });

  return summaries;
};

/* ================= COMPONENT ================= */
const SalarySheetGenerate = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const location = useLocation();

  const { loading } = useSelector((state: any) => state.salary);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const employeeSettings = useSelector((state: any) => state.employees);

  const [employees, setEmployees] = useState<SalaryRow[]>([]);
  const [branchId, setBranchId] = useState<string | number>(user?.branch_id ?? "");
  const [salarySheetType, setSalarySheetType] = useState<string>("monthly");
  const [designationLevel, setDesignationLevel] = useState<any[]>([]);
  const [monthId, setMonthId] = useState<string>("");
  const [monthText, setMonthText] = useState<string>("");
  const [selectedMonthDays, setSelectedMonthDays] = useState<number>(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  );

  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  /**
   * The row the trash button is asking about.
   *
   * The row itself, not just its id, so the dialog can name the employee after
   * the list has been filtered — and so a click on a stale row cannot take a
   * different one with it.
   */
  const [rowToRemove, setRowToRemove] = useState<SalaryRow | null>(null);
  const [designationLevels, setDesignationLevels] = useState<any[]>([]);
  const [draggingRowId, setDraggingRowId] = useState<number | null>(null);
  const roundUpToNearestTen = (value: number) => Math.ceil(value / 10) * 10;
  /** Nearest, not up: 947 becomes 950 and 944 becomes 940. */
  const roundToNearestTen = (value: number) => Math.round(value / 10) * 10;
  const updateContext = location.state as
    | {
        fromSalarySheet?: boolean;
        branchId?: string | number;
        monthId?: string;
      }
    | undefined;

  /* ================= INIT ================= */
  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchEmployeeSettings());
  }, [dispatch, user]);

  useEffect(() => {
    if (!updateContext?.fromSalarySheet) return;

    if (updateContext.branchId !== undefined) {
      setBranchId(updateContext.branchId);
    }

    if (updateContext.monthId) {
      setMonthId(updateContext.monthId);
    }
  }, [updateContext]);

  useEffect(() => {
    setDesignationLevel(
      employeeSettings?.employeeSettings?.data?.data?.designationLevels || []
    );
  }, [employeeSettings]);

  const designationLevelOptions = designationLevel.map((d: any) => ({
    value: d.id,
    label: d.name,
  }));

  const withSequence = (items: SalaryRow[]) =>
    items.map((item, index) => ({
      ...item,
      serial_no: index + 1,
    }));

  const fetchAttendanceSalarySummary = async () => {
    const monthInfo = parseMonthId(monthId);
    if (!monthInfo) return new Map<string, AttendanceSalarySummary>();

    const attendanceParams = {
      branch_id: branchId,
      date_from: monthInfo.date_from,
      date_to: monthInfo.date_to,
      approval_status: "",
      status: "",
      ...(salarySheetType === "overtime" ? { overtime_eligible: 1 } : { employment_type: "monthly" }),
      per_page: 1000,
    };

    const leaveParams = {
      branch_id: branchId,
      ...(salarySheetType === "monthly" ? { employment_type: "monthly" } : {}),
      date_from: monthInfo.date_from,
      date_to: monthInfo.date_to,
      per_page: 1000,
    };

    const monthlySummaryParams = {
      branch_id: branchId,
      ...(salarySheetType === "monthly" ? { employment_type: "monthly" } : {}),
      month: String(monthInfo.monthIndex + 1),
      year: String(monthInfo.year),
    };

    const [monthlySummaryResult, attendanceResult, leaveResult] = await Promise.allSettled([
      httpService.get(API_ATTENDANCE_MONTHLY_SUMMARY_URL, { params: monthlySummaryParams }),
      httpService.get(API_ATTENDANCE_ENTRY_REPORT_URL, { params: attendanceParams }),
      httpService.get(API_ATTENDANCE_LEAVE_APPLICATION_LIST_URL, { params: leaveParams }),
    ]);

    const monthlySummaryMap = buildAttendanceSummaryMapFromMonthlyRows(
      monthlySummaryResult.status === "fulfilled" ? monthlySummaryRowsFromResponse(monthlySummaryResult.value) : [],
      monthInfo,
    );

    if (attendanceResult.status === "rejected" || leaveResult.status === "rejected") {
      throw attendanceResult.status === "rejected" ? attendanceResult.reason : leaveResult.reason;
    }

    const attendanceRows = attendanceRowsFromResponse(attendanceResult.value);
    const leaveRows = leaveRowsFromResponse(leaveResult.value);

    if (salarySheetType === "monthly" && monthlySummaryMap.size > 0) return monthlySummaryMap;

    return buildAttendanceSummaryMapFromAttendanceRows(attendanceRows, leaveRows, monthInfo);
  };

  /* ================= FETCH DATA ================= */
  const handleSearchButton = async () => {
    if (!monthId) {
      toast.info("Please select month");
      return;
    }

    setSearched(true);
    setSearchLoading(true);
    setEmployees([]);

    try {
      const response = await dispatch(
        salaryView({
          branch_id: Number(branchId),
          level_ids: designationLevels.map((l: any) => l.value),
          month_id: monthId,
          salary_sheet_type: salarySheetType,
          ...(salarySheetType === "monthly" ? { employment_type: "monthly" } : { overtime_eligible: 1 }),
        })
      ).unwrap();

      const list = response?.data?.data ?? [];
      let attendanceSummary = new Map<string, AttendanceSalarySummary>();

      try {
        attendanceSummary = await fetchAttendanceSalarySummary();
      } catch (attendanceError: any) {
        toast.info(attendanceError?.response?.data?.message || "Attendance working day not found, month days used.");
      }

      // ✅ IMPORTANT: API shape -> SalaryRow shape
      const mapped: SalaryRow[] = list.map((emp: any) => {
        const summary = attendanceSummary.get(String(emp.id));

        return {
          id: emp.id,
          serial_no: Number(emp.serial_no ?? emp.employee_serial) || 0,
          name: emp.name,
          designation_name: emp.designation_name,
          employment_type: emp.employment_type,

          basic_salary: Number(emp.basic_salary) || 0,
          monthly_basic_salary: Number(emp.basic_salary) || 0,
          others_allowance: salarySheetType === "monthly" ? Number(emp.others_allowance) || 0 : 0,
          monthly_others_allowance: Number(emp.others_allowance) || 0,

          // ✅ loan_balance sometimes string ("3000") so force Number
          loan_balance: Number(emp.loan_balance) || 0,

          // keep it (API has it but is 0 now)
          loan_deduction: Number(emp.loan_deduction) || 0,

          net_deduction: Number(emp.others_deduction) || 0,
          attendance_deduction_amount: isDailyLabour(emp.employment_type) ? 0 : Number(summary?.attendance_deduction_amount) || 0,
          attendance_absent_days: Number(summary?.attendance_absent_days) || 0,
          attendance_unpaid_leave_days: Number(summary?.attendance_unpaid_leave_days) || 0,
          attendance_half_days: Number(summary?.attendance_half_days) || 0,
          attendance_late_count: Number(summary?.attendance_late_count) || 0,
          attendance_late_deduction_days: Number(summary?.attendance_late_deduction_days) || 0,
          attendance_early_out_count: Number(summary?.attendance_early_out_count) || 0,
          attendance_early_out_deduction_days: Number(summary?.attendance_early_out_deduction_days) || 0,
          ot_rate: salarySheetType === "overtime" ? Number(summary?.ot_rate || emp.ot_rate) || 0 : 0,
          overtime_minutes: salarySheetType === "overtime" ? Number(summary?.overtime_minutes) || 0 : 0,
          overtime_amount: salarySheetType === "overtime" ? Number(summary?.overtime_amount) || 0 : 0,
          month_days: selectedMonthDays,
          working_days: summary?.working_days ?? selectedMonthDays,
        };
      });

      const sheetRows = salarySheetType === "overtime"
        ? mapped.filter((row) => Number(row.overtime_minutes || 0) > 0 || Number(row.overtime_amount || 0) > 0)
        : mapped;

      setEmployees(withSequence(sheetRows));

      if (sheetRows.length > 0) {
        toast.success(response.message || "Salary data fetched successfully");
      } else {
        toast.info("No salary data found");
      }
    } catch (error: any) {
      toast.info(error);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!updateContext?.fromSalarySheet) return;
    if (!monthId) return;

    void handleSearchButton();
  }, [monthId]);

  /* ================= HANDLERS ================= */
  const handleInputChange = (id: number, field: keyof SalaryRow, value: string) => {
    const num = Number(value);
    setEmployees((prev) =>
      prev.map((emp) => {
        if (String(emp.id) !== String(id)) return emp;

        const nextValue = isNaN(num) ? 0 : num;
        if (field === "ot_rate") {
          return {
            ...emp,
            ot_rate: nextValue,
            overtime_amount: (Number(emp.overtime_minutes || 0) / 60) * nextValue,
          };
        }

        return { ...emp, [field]: nextValue };
      })
    );
  };

  const handleRemoveRow = () => {
    if (!rowToRemove) return;

    const removed = rowToRemove;
    setEmployees((prev) => withSequence(prev.filter((emp) => emp.id !== removed.id)));
    setRowToRemove(null);
    toast.info(`${removed.name} removed from this sheet`);
  };

  /* ================= CALCULATIONS ================= */
  const proratedAmount = (amount: number, days: number) => {
    const monthDays = selectedMonthDays > 0 ? selectedMonthDays : 30;
    if (days <= 0 || monthDays <= 0) return 0;
    if (days >= monthDays) return amount;
    return roundUpToNearestTen((amount / monthDays) * days);
  };

  const proratedBasicSalary = (emp: SalaryRow) =>
    proratedAmount(Number(emp.monthly_basic_salary) || 0, Number(emp.working_days) || 0);

  const proratedOtherAllowance = (emp: SalaryRow) =>
    proratedAmount(Number(emp.monthly_others_allowance) || 0, Number(emp.working_days) || 0);

  const includeOvertime = salarySheetType === "overtime";
  const includeMobileBill = salarySheetType === "monthly";

  /** Basic plus allowance, before overtime — what a day of pay is measured against. */
  const baseGrossSalary = (emp: SalaryRow) =>
    proratedBasicSalary(emp) + (includeMobileBill ? proratedOtherAllowance(emp) : 0);

  const totalSalary = (emp: SalaryRow) =>
    baseGrossSalary(emp) + (includeOvertime ? Number(emp.overtime_amount || 0) : 0);

  /**
   * The attendance penalty, worked out here rather than read from the API.
   *
   * The monthly-summary endpoint returns the deduction *days* but no amount —
   * it has no salary to price them against — so the column sat at zero however
   * many lates an employee collected. The amount only appeared after Generate,
   * where apiMakeSalary() prices the same days. This mirrors that formula
   * exactly — days x prorated gross / 30, to the nearest ten — so the preview
   * and the saved sheet agree, and so the figure moves when the working days
   * are edited.
   *
   * Absent and half days are deliberately not charged here: they already lower
   * the working days, which lowers the prorated basic. Charging them again
   * would deduct them twice.
   */
  const attendanceDeduction = (emp: SalaryRow) => {
    if (isDailyLabour(emp.employment_type)) return 0;

    const days = (Number(emp.attendance_late_deduction_days) || 0)
      + (Number(emp.attendance_early_out_deduction_days) || 0);

    if (days <= 0) return 0;

    const perDaySalary = Math.round((baseGrossSalary(emp) / 30) * 100) / 100;

    return roundToNearestTen(days * perDaySalary);
  };

  const netSalary = (emp: SalaryRow) => {
    const days = Number(emp.working_days) || 0;
    const monthDays = selectedMonthDays > 0 ? selectedMonthDays : 30;
    if (days <= 0 || monthDays <= 0) return 0;
    const roundedGross = totalSalary(emp);
    const loanDed = Number(emp.loan_balance) || 0;
    return Math.max(0, roundedGross - loanDed - attendanceDeduction(emp));
  };

  const grandTotals = useMemo(() => {
    return employees.reduce(
      (acc, emp) => {
        acc.basic_salary += proratedBasicSalary(emp);
        acc.others_allowance += includeMobileBill ? proratedOtherAllowance(emp) : 0;
        acc.total_salary += totalSalary(emp);
        acc.overtime_amount += includeOvertime ? Number(emp.overtime_amount) || 0 : 0;
        acc.loan_deduction += Number(emp.loan_balance) || 0; // ✅ total loan ded = sum loan_balance
        acc.attendance_deduction += attendanceDeduction(emp);
        acc.net_deduction += Number(emp.net_deduction) || 0;
        acc.net_salary += netSalary(emp);
        return acc;
      },
      {
        basic_salary: 0,
        others_allowance: 0,
        total_salary: 0,
        overtime_amount: 0,
        loan_deduction: 0,
        attendance_deduction: 0,
        net_deduction: 0,
        net_salary: 0,
      }
    );
  }, [employees, includeMobileBill, includeOvertime, selectedMonthDays]);

  /* ================= TABLE COLUMNS ================= */
  const columns = [
    {
      key: "serial_no",
      header: "Sl",
      headerClass: "text-center w-20",
      cellClass: "text-center font-semibold",
      render: (row: SalaryRow) => (
        <div className="flex items-center justify-center gap-2 w-20">
          <FiMenu className="h-4 w-4 cursor-grab text-slate-400 active:cursor-grabbing" />
          <span>{row.serial_no}</span>
        </div>
      ),
    },
    {
      key: "name",
      header: "Name of Employee",
      headerClass: "",
      render: (row: SalaryRow) => (
        <>
          <div className="font-semibold">{row.name}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {row.designation_name}
          </div>
        </>
      ),
    },
    {
      key: "month_days",
      header: "Month Days",
      headerClass: "text-right w-35",
      cellClass: "text-right",
      render: (row: SalaryRow) => (
        <InputElement
          type="text"
          value={String(Number(row.month_days) || selectedMonthDays)}
          className={`${READONLY_FIGURE} w-24 !md:w-20`}
          disabled={true}
        />
      ),
    },
    {
      key: "days",
      header: "Working Day",
      headerClass: "text-right w-35",
      cellClass: "text-right",
      render: (row: SalaryRow) => (
        <InputElement
          type="text"
          value={String(Math.max(0, Number(row.working_days) || 0))}
          className={`${READONLY_FIGURE} w-40`}
          onChange={() => undefined}
          disabled={true}
        />
      ),
    },
    {
      key: "monthly_basic_salary",
      header: "Monthly Basic",
      headerClass: "text-right w-35",
      cellClass: "text-right",
      render: (row: SalaryRow) => (
        // `text`, not `number`: a number input cannot show a grouped figure,
        // and this one is disabled anyway, so nothing is typed into it.
        <InputElement
          type="text"
          value={thousandSeparator(Number(row.monthly_basic_salary) || 0)}
          className={`${READONLY_FIGURE} w-24 !md:w-20`}
          onChange={() => undefined}
          disabled={true}
        />
      ),
    },
    {
      key: "basic_salary",
      header: "Basic",
      headerClass: "text-right w-30",
      cellClass: "text-right",
      render: (row: SalaryRow) => (
        <InputElement
          type="text"
          value={thousandSeparator(proratedBasicSalary(row))}
          className={`${READONLY_FIGURE} w-24 !md:w-20`}
          onChange={() => undefined}
          disabled={true}
        />
      ),
    },

    ...(includeMobileBill
      ? [{
          key: "others_allowance",
          header: "Mobile Bill",
          headerClass: "text-right w-30",
          cellClass: "text-right",
          render: (row: SalaryRow) => (
            <InputElement
              type="text"
              value={thousandSeparator(proratedOtherAllowance(row))}
              className={`${READONLY_FIGURE} w-24 !md:w-20`}
              onChange={() => undefined}
              disabled={true}
            />
          ),
        }]
      : []),
    ...(includeOvertime
      ? [
        {
          key: "ot_rate",
          header: "OT Rate",
          headerClass: "text-right w-28",
          cellClass: "text-right",
          render: (row: SalaryRow) => (
            <InputElement
              type="text"
              value={thousandSeparator(Number(row.ot_rate || 0))}
              className={`${READONLY_FIGURE} w-24 !md:w-20`}
              onChange={() => undefined}
              disabled={true}
            />
          ),
        },
        {
          key: "overtime_amount",
          header: "OT",
          headerClass: "text-right w-28",
          cellClass: "text-right font-semibold text-cyan-700 dark:text-cyan-300",
          render: (row: SalaryRow) => (
            <div title={`OT Hr.: ${formatOtHours(row.overtime_minutes || 0)}`}>
              <div>{thousandSeparator(Number(row.overtime_amount || 0))}</div>
              <div className="text-[11px] font-normal text-slate-400">{formatOtHours(row.overtime_minutes || 0)} hr</div>
            </div>
          ),
        }]
      : []),
    {
      key: "total",
      header: "Total",
      headerClass: "text-right w-30",
      cellClass: "text-right font-semibold text-green-700 dark:text-green-400 w-30",
      render: (row: SalaryRow) =>
        thousandSeparator(totalSalary(row)),
    },

    // ✅ Loan Ded. input এখন loan_balance edit করবে
    {
      key: "loan_balance",
      header: "Loan Ded.",
      headerClass: "text-right w-30",
      cellClass: "text-right",
      render: (row: SalaryRow) => (
        <AmountInput
          value={row.loan_balance}
          className="text-right w-30 !md:w-30 font-semibold text-red-600 dark:text-red-400"
          onChange={(value) => handleInputChange(row.id, "loan_balance", value)}
        />
      ),
    },

    {
      key: "attendance_deduction_amount",
      header: "Att. Ded",
      headerClass: "text-right w-30",
      cellClass: "text-right font-semibold text-red-700 dark:text-red-400",
      render: (row: SalaryRow) => (
        <span title={`Absent: ${row.attendance_absent_days || 0}, Unpaid: ${row.attendance_unpaid_leave_days || 0}, Half: ${row.attendance_half_days || 0}, Late: ${row.attendance_late_count || 0} (${row.attendance_late_deduction_days || 0} day), Early: ${row.attendance_early_out_count || 0} (${row.attendance_early_out_deduction_days || 0} day)`}>
          {isDailyLabour(row.employment_type) ? "-" : thousandSeparator(attendanceDeduction(row))}
        </span>
      ),
    },

    // ✅ Net Salary = Total - loan_balance - attendance deduction
    {
      key: "net_salary",
      header: "Net Salary",
      headerClass: "text-right w-30",
      cellClass: "text-right font-bold text-green-700 dark:text-green-400",
      render: (row: SalaryRow) => thousandSeparator(netSalary(row)),
    },
    {
      key: "actions",
      header: "Action",
      headerClass: "text-center max-w-10",
      cellClass: "text-center",
      render: (row: SalaryRow) => (
        <Button
          type="button"
          title={`Remove ${row.name} from this sheet`}
          onClick={() => setRowToRemove(row)}
          className="text-red-600 hover:text-red-800"
        >
          <FiTrash2 className="block w-4 h-4" />
        </Button>
      ),
    },
  ];

  /* ================= GENERATE ================= */
  const handleSalaryGenerate = async () => {
    if (!branchId || !monthId) return;

    setSaveButtonLoading(true);

    try {
      // ✅ Backend যদি loan_deduction ফিল্ড চায়,
      // তাহলে loan_balance কে loan_deduction হিসেবে পাঠিয়ে দিন (safe mapping)
      const payloadEmployees = employees.map((e) => ({
        ...e,
        serial_no: Number(e.serial_no || 0),
        sequence: Number(e.serial_no || 0),
        sort_order: Number(e.serial_no || 0),
        monthly_basic_salary: Number(e.monthly_basic_salary) || 0,
        monthly_others_allowance: Number(e.monthly_others_allowance) || 0,
        basic_salary: proratedBasicSalary(e),
        others_allowance: includeMobileBill ? proratedOtherAllowance(e) : 0,
        loan_balance: Number(e.loan_balance) || 0,

        // ✅ IMPORTANT: save loan_deduction = loan_balance
        loan_deduction: Number(e.loan_balance) || 0,

        attendance_deduction_amount: attendanceDeduction(e),
        attendance_absent_days: Number(e.attendance_absent_days) || 0,
        attendance_unpaid_leave_days: Number(e.attendance_unpaid_leave_days) || 0,
        attendance_half_days: Number(e.attendance_half_days) || 0,
        attendance_late_count: Number(e.attendance_late_count) || 0,
        attendance_late_deduction_days: Number(e.attendance_late_deduction_days) || 0,
        attendance_early_out_count: Number(e.attendance_early_out_count) || 0,
        attendance_early_out_deduction_days: Number(e.attendance_early_out_deduction_days) || 0,
        overtime_minutes: includeOvertime ? Number(e.overtime_minutes) || 0 : 0,
        ot_rate: includeOvertime ? Number(e.ot_rate) || 0 : 0,
        overtime_amount: includeOvertime ? Number(e.overtime_amount) || 0 : 0,
        net_deduction: Number(e.net_deduction) || 0,
        month_days: Number(e.month_days || selectedMonthDays) || 0,
        working_days: Number(e.working_days) || 0,
      }));

      const response = await dispatch(
        salaryGenerate({
          branch_id: Number(branchId),
          level_ids: designationLevels.map((l: any) => Number(l.value)),
          month_id: monthId,
          salary_sheet_type: salarySheetType,
          employees: payloadEmployees,
        })
      ).unwrap();

      if (response.success) {
        toast.success(response.message || "Salary generated successfully");
        setEmployees([]);
        setSearched(false);
      } else {
        toast.error(response.message || "Something went wrong");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate salary");
    } finally {
      setSaveButtonLoading(false);
      setShowConfirm(false);
    }
  };

  /* ================= BRANCH DDL ================= */
  useEffect(() => {
    if (branchDdlData?.protectedData?.data) {
      const baseData = branchDdlData.protectedData.data;

      if (settings?.data?.branch?.branch_types_id === 1) {
        setDropdownData([{ id: "", name: "All Projects" }, ...baseData]);
      } else {
        setDropdownData(baseData);
      }
    }
  }, [branchDdlData?.protectedData?.data, settings?.data?.branch?.branch_types_id]);

  const handleOnMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setMonthId(value.toString());
    setMonthText(e.target.selectedOptions[0]?.text || "");

    const [monthPart, yearPart] = String(value).split("-");
    const parsedMonth = Number(monthPart);
    const parsedYear = Number(yearPart);

    const now = new Date();
    const fallbackDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysInMonth =
      Number.isFinite(parsedMonth) &&
      parsedMonth >= 1 &&
      parsedMonth <= 12 &&
      Number.isFinite(parsedYear) &&
      parsedYear >= 1900
        ? new Date(parsedYear, parsedMonth, 0).getDate()
        : fallbackDays;

    setSelectedMonthDays(daysInMonth);
    setEmployees((prev) =>
      prev.map((emp) => ({
        ...emp,
        month_days: daysInMonth,
        working_days: daysInMonth,
      }))
    );
  };

  const moveRow = (draggedId: number, targetId: number) => {
    if (draggedId === targetId) return;

    setEmployees((prev) => {
      const fromIndex = prev.findIndex((row) => row.id === draggedId);
      const toIndex = prev.findIndex((row) => row.id === targetId);

      if (fromIndex < 0 || toIndex < 0) return prev;

      const nextRows = [...prev];
      const [movedRow] = nextRows.splice(fromIndex, 1);
      nextRows.splice(toIndex, 0, movedRow);

      return withSequence(nextRows);
    });
  };

  /* ================= UI ================= */
  return (
    <div>
      <HelmetTitle title="Salary Generate" />

      {/* ===== Top Bar ===== */}
      <div className="mb-3 border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-boxdark">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="max-w-280 flex ">
          <BranchDropdown
            defaultValue={branchId?.toString()}
            onChange={(e: any) => {
              const value = e.target.value;
              setBranchId(value === "" ? "" : Number(value));
            }}
            className="w-60 font-medium text-sm p-2 mr-2 "
            branchDdl={dropdownData}
          />

          <div className="mr-2 w-full">
            <MultiSelectDropdown
              options={designationLevelOptions}
              value={designationLevels}
              onChange={setDesignationLevels}
              className="w-60"
            />
          </div>

          <div className="mr-2">
            <DropdownCommon
              id="salary_sheet_type"
              name="salary_sheet_type"
              value={salarySheetType}
              data={salarySheetTypeOptions}
              onChange={(e) => {
                setSalarySheetType(e.target.value);
                setEmployees([]);
                setSearched(false);
              }}
              className="h-[2.3rem] min-w-40 bg-transparent"
            />
          </div>

          <div className="mr-2">
            <MonthDropdown
              id="month_id"
              name="month_id"
              value={monthId}
              className="h-[2.3rem] bg-transparent ml-2 mr-2 min-w-35"
              onChange={handleOnMonthChange}
            />
          </div>

          <ButtonLoading
            onClick={handleSearchButton}
            buttonLoading={searchLoading}
            disabled={searchLoading}
            label="Search"
            icon={<FiSearch className="mr-2" />}
            className="whitespace-nowrap p-2 ml-2 mr-2"
          />
        </div>

        <div className="flex gap-2">
          {branchId && (
            <ButtonLoading
              onClick={() => {
                if (!branchId || !monthId) {
                  toast.info(!branchId ? "Please select branch" : "Please select month");
                  return;
                }
                setShowConfirm(true);
              }}
              buttonLoading={saveButtonLoading}
              label="Salary Generate"
              className="whitespace-nowrap"
              icon={<FiCheckSquare className="mr-2" />}
            />
          )}
        </div>
      </div>
      </div>

      {loading && <Loader />}

      {/* ===== TABLE ===== */}
      <div className="border border-slate-200 bg-white dark:border-slate-700 dark:bg-boxdark">
      <Table
        columns={columns}
        data={searched ? employees : []}
        getRowKey={(row) => row.id}
        rowClassName={(row) =>
          draggingRowId === row.id ? " bg-indigo-50 opacity-70 dark:bg-slate-700" : ""
        }
        getRowProps={(row) => ({
          draggable: true,
          onDragStart: (event) => {
            setDraggingRowId(row.id);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(row.id));
          },
          onDragOver: (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          },
          onDrop: (event) => {
            event.preventDefault();
            const draggedId = Number(event.dataTransfer.getData("text/plain"));
            moveRow(draggedId, row.id);
            setDraggingRowId(null);
          },
          onDragEnd: () => setDraggingRowId(null),
        })}
      />

      {/* ===== FOOTER ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <div>
          Total Employees: <span className="font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">{employees.length}</span>
        </div>

        <div className="flex flex-wrap justify-end gap-x-6 gap-y-1">
          <div>
            Total Salary:{" "}
            <span className="font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">{thousandSeparator(grandTotals.total_salary)}</span>
          </div>
          {includeOvertime && (
            <div>
              OT:{" "}
              <span className="font-semibold text-cyan-600 dark:text-cyan-400">{thousandSeparator(grandTotals.overtime_amount)}</span>
            </div>
          )}
          <div>
            Loan Deduction:{" "}
            <span className="font-semibold text-rose-600 dark:text-rose-400">{thousandSeparator(grandTotals?.loan_deduction)}</span>
          </div>
          <div>
            Att. Deduction:{" "}
            <span className="font-semibold text-rose-600 dark:text-rose-400">{thousandSeparator(grandTotals.attendance_deduction)}</span>
          </div>
          <div className="font-bold text-emerald-600 dark:text-emerald-400">
            Net Total: {thousandSeparator(grandTotals.net_salary)}
          </div>
        </div>
      </div>
      </div>

      <ConfirmModal
        show={showConfirm}
        title="Confirm Salary Generation"
        message={
          <>
            Proceed with salary for <span className="font-bold mt-1">{monthText}</span>
          </>
        }
        loading={saveButtonLoading}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleSalaryGenerate}
        className="bg-blue-400 hover:bg-blue-500"
      />

      {/* The trash button used to drop the row on the first click, with a whole
          salary sheet's worth of edits behind it and no way back. Same dialog
          the voucher delete uses. */}
      <ConfirmModal
        show={rowToRemove !== null}
        title="Confirm Deletion"
        message={
          <>
            Are you sure you want to remove
            <span className="mt-1 block font-bold">{rowToRemove?.name} ?</span>
            <span className="mt-2 block text-sm text-[rgb(var(--c-text-muted))] dark:text-[rgb(var(--c-text-muted))]">
              This only takes the employee off this sheet. Nothing is deleted
              until the sheet is generated.
            </span>
          </>
        }
        onCancel={() => setRowToRemove(null)}
        onConfirm={handleRemoveRow}
        className="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default SalarySheetGenerate;
