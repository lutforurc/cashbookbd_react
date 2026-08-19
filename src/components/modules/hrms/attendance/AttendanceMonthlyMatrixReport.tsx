import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiCalendar, FiCheck, FiCheckSquare, FiClock, FiGrid, FiSun, FiX } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';

import Loader from '../../../../common/Loader';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import routes from '../../../services/appRoutes';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table, { Column, TableFooterCell } from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchAttendanceReport, fetchLeaveApplications, fetchMonthlyAttendanceSummary } from './attendanceSlice';
import AttendanceMonthlyMatrixPrint from './AttendanceMonthlyMatrixPrint';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pad = (value: number) => String(value).padStart(2, '0');
const toDateString = (year: number, monthIndex: number, day: number) => `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
const parseLocalDate = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const parseTimeMinutes = (value?: string | null) => {
  if (!value) return null;
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const statusCode = (status?: string, approvalStatus?: string) => {
  if (approvalStatus === 'rejected' || status === 'rejected') return 'âœ•';

  switch (status) {
    case 'present':
    case 'early_out':
      return 'âœ“';
    case 'late':
      return '!';
    case 'absent':
      return 'âœ•';
    case 'leave':
      return 'L';
    case 'holiday':
      return 'H';
    case 'weekly_holiday':
      return 'W';
    case 'half_day':
      return 'Â½';
    case 'pending':
      return 'âœ“';
    default:
      return '';
  }
};

const attendanceStatusCode = (row: any) => {
  if (row?.approval_status === 'rejected' || row?.status === 'rejected') {
    return statusCode(row?.status, row?.approval_status);
  }

  const inMinutes = parseTimeMinutes(row?.in_time);
  const shiftStartMinutes = parseTimeMinutes(row?.shift_start_time || row?.start_time);
  const graceMinutes = Number(row?.grace_minutes || 0);
  const isLate = row?.status === 'late' || (
    row?.status === 'present'
    && inMinutes !== null
    && shiftStartMinutes !== null
    && inMinutes > shiftStartMinutes + graceMinutes
  );

  if (isLate) return '!';
  return statusCode(row?.status, row?.approval_status);
};

/**
 * What a cell adds to the day and month totals.
 *
 * A holiday counts nothing. It used to count one, but only ever appeared when
 * somebody had recorded attendance on a holiday, which nobody does -- so in
 * practice holidays were never in these totals. Now that every holiday in the
 * month is marked, counting them would move a number the reader has been
 * reading for months. The totals stay what they have always been: days worked
 * and days on leave.
 */
const statusTotalValue = (code?: string) => {
  if (code === 'âœ“' || code === '!' || code === 'L') return 1;
  if (code === 'Â½') return 0.5;
  return 0;
};

const formatTotal = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
/**
 * A dash where there is nothing.
 *
 * Most of this table is zeros -- nobody late, nobody absent, no deduction --
 * and a wall of them buries the two or three figures that actually say
 * something. A dash reads as "nothing here" and lets the eye find what does.
 */
const summaryNumber = (value: any) => {
  const numericValue = Number(value || 0);

  if (!numericValue) {
    return '-';
  }

  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1);
};

const statusClassName = (code?: string) => {
  switch (code) {
    case 'âœ“':
      return 'status-cell status-present';
    case '!':
      return 'status-cell status-late';
    case 'âœ•':
      return 'status-cell status-absent';
    case 'W':
      return 'status-cell status-weekly';
    case 'H':
    case 'â—‹':
      return 'status-cell status-holiday';
    case 'L':
      return 'status-cell status-leave';
    case 'Â½':
      return 'status-cell status-half-day';
    default:
      return 'status-cell status-empty';
  }
};

/**
 * The branch a day was marked at, when that is not the branch reading the
 * sheet â€” otherwise nothing. Staff lent to another site keep drawing their pay
 * here, so their days there belong on this sheet; naming the site is what
 * stops the reader taking them for days worked at home.
 */
const elsewhereBranchName = (entry?: any): string => {
  if (!entry?.is_other_branch) return '';
  return entry.attendance_branch_name || entry.branch_name || 'another branch';
};

const statusGlyph = (code?: string): React.ReactNode => {
  switch (code) {
    case 'âœ“':
      return <FiCheck className="h-3.5 w-3.5" strokeWidth={3} />;
    case 'âœ•':
      return <FiX className="h-3.5 w-3.5" strokeWidth={3} />;
    case '!':
      return <FiClock className="h-3.5 w-3.5" strokeWidth={2.5} />;
    case 'â—‹':
      return <FiSun className="h-3.5 w-3.5" strokeWidth={2.5} />;
    default:
      return code || null;
  }
};

const cellTintClass = (code?: string) => {
  switch (code) {
    case 'âœ“':
      return 'cell-tint cell-tint-present';
    case '!':
      return 'cell-tint cell-tint-late';
    case 'âœ•':
      return 'cell-tint cell-tint-absent';
    case 'W':
      return 'cell-tint cell-tint-weekly';
    case 'H':
    case 'â—‹':
      return 'cell-tint cell-tint-holiday';
    case 'L':
      return 'cell-tint cell-tint-leave';
    case 'Â½':
      return 'cell-tint cell-tint-half';
    default:
      return '';
  }
};

const AttendanceMonthlyMatrixReport = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const rows = Array.isArray(attendance.report?.rows) ? attendance.report.rows : [];
  const summaryRows = Array.isArray(attendance.monthlySummary?.rows) ? attendance.monthlySummary.rows : [];

  // The payable days the server worked out, keyed by employee, so the Total
  // column can report it rather than guess at it from the cells.
  const payableDaysByEmployee = useMemo(() => {
    const map: Record<string, number> = {};

    summaryRows.forEach((row: any) => {
      if (row?.employee_id !== undefined && row?.employee_id !== null) {
        map[String(row.employee_id)] = Number(row.payable_days || 0);
      }
    });

    return map;
  }, [summaryRows]);
  const summaryTotals = attendance.monthlySummary?.totals || {};
  const leaveApplications = Array.isArray(attendance.leaveApplications) ? attendance.leaveApplications : [];

  // Which days of the month are holidays. Nobody records attendance on one, so
  // without this the cell is blank and reads as a day somebody forgot.
  const holidayDates = attendance.report?.holidays?.dates || {};
  const weeklyHolidayWeekdays = useMemo(
    () => (Array.isArray(attendance.report?.holidays?.weekly_days)
      ? attendance.report.holidays.weekly_days.map(Number)
      : []),
    [attendance.report?.holidays?.weekly_days],
  );
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const now = new Date();
  const [filters, setFilters] = useState({
    branch_id: userBranchId,
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  });
  const [activeTab, setActiveTab] = useState<'summary' | 'matrix'>('summary');

  const monthIndex = Math.max(0, Number(filters.month || 1) - 1);
  const year = Number(filters.year || now.getFullYear());
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  const monthOptions = monthNames.map((name, index) => ({ id: String(index + 1), name }));
  const yearOptions = Array.from({ length: 5 }, (_, index) => {
    const optionYear = now.getFullYear() - index;
    return { id: String(optionYear), name: String(optionYear) };
  });

  const reportRows = useMemo(() => {
    const employeeMap = new Map<string, any>();
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex, daysInMonth);

    rows.forEach((row: any) => {
      const employeeId = String(row.employee_id || row.employee_serial || row.employee_name || '');
      if (!employeeId) return;

      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, {
          employee_id: row.employee_id,
          employee_serial: row.employee_serial,
          employee_name: row.employee_name,
          dates: {},
          dateRows: {},
          holidayNames: {},
        });
      }

      const attendanceDate = String(row.attendance_date || '').slice(0, 10);
      employeeMap.get(employeeId).dates[attendanceDate] = attendanceStatusCode(row);
      employeeMap.get(employeeId).dateRows[attendanceDate] = row;
    });

    leaveApplications.forEach((leave: any) => {
      if (leave.approval_status !== 'approved') return;

      const employeeId = String(leave.employee_id || leave.employee_serial || leave.employee_name || '');
      if (!employeeId) return;

      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, {
          employee_id: leave.employee_id,
          employee_serial: leave.employee_serial,
          employee_name: leave.employee_name,
          dates: {},
          dateRows: {},
          holidayNames: {},
        });
      }

      const fromDate = parseLocalDate(leave.from_date);
      const toDate = parseLocalDate(leave.to_date);
      if (!fromDate || !toDate) return;

      const current = new Date(Math.max(fromDate.getTime(), monthStart.getTime()));
      const last = new Date(Math.min(toDate.getTime(), monthEnd.getTime()));

      while (current <= last) {
        employeeMap.get(employeeId).dates[toDateString(current.getFullYear(), current.getMonth(), current.getDate())] = 'L';
        current.setDate(current.getDate() + 1);
      }
    });

    // Holidays last, and only where nothing else was recorded. A day somebody
    // actually worked, or took leave on, keeps what it was; the rest of the
    // holiday is marked rather than left looking like a day nobody entered.
    employeeMap.forEach((employee) => {
      for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = toDateString(year, monthIndex, day);

        if (employee.dates[dateKey]) continue;

        if (holidayDates[dateKey]) {
          employee.dates[dateKey] = 'H';
          employee.holidayNames[dateKey] = holidayDates[dateKey];
        } else if (weeklyHolidayWeekdays.includes(new Date(year, monthIndex, day).getDay())) {
          employee.dates[dateKey] = 'W';
          employee.holidayNames[dateKey] = 'Weekly holiday';
        }
      }
    });

    return Array.from(employeeMap.values()).sort((a, b) => {
      const serialA = Number(a.employee_serial);
      const serialB = Number(b.employee_serial);
      if (!Number.isNaN(serialA) && !Number.isNaN(serialB)) return serialA - serialB;
      return String(a.employee_name || '').localeCompare(String(b.employee_name || ''));
    });
  }, [daysInMonth, holidayDates, leaveApplications, monthIndex, rows, weeklyHolidayWeekdays, year]);

  const dayTotals = useMemo(
    () =>
      days.map((day) => {
        const dateKey = toDateString(year, monthIndex, day);
        return reportRows.reduce((total, employee) => total + statusTotalValue(employee.dates[dateKey]), 0);
      }),
    [days, monthIndex, reportRows, year],
  );

  // The corner figure has to be the sum of the column above it, so it comes
  // from the same server numbers the Total column shows rather than from the
  // per-day counts, which are a different question: how many people worked
  // that day.
  const grandTotal = useMemo(
    () => reportRows.reduce((total, employee) => {
      const payable = payableDaysByEmployee[String(employee.employee_id)];

      if (payable !== undefined) {
        return total + Number(payable);
      }

      return total + days.reduce((sum, day) => (
        sum + statusTotalValue(employee.dates[toDateString(year, monthIndex, day)])
      ), 0);
    }, 0),
    [days, monthIndex, payableDaysByEmployee, reportRows, year],
  );

  const summaryColumns: Column[] = useMemo(() => [
    { key: 'sl', header: 'Sl.', headerClass: 'w-12 text-center', cellClass: 'w-12 text-center', render: (_row, index) => index + 1 },
    { key: 'employee_name', header: 'Employee', headerClass: 'w-56', cellClass: 'w-56', render: (row) => row.employee_name || '-' },
    { key: 'present_days', header: 'Present', headerClass: 'w-24 text-center', cellClass: 'w-24 text-center', render: (row) => summaryNumber(row.present_days) },
    { key: 'paid_leave_days', header: 'Paid Leave', headerClass: 'w-24 text-center', cellClass: 'w-24 text-center', render: (row) => summaryNumber(row.paid_leave_days) },
    { key: 'unpaid_leave_days', header: 'Unpaid Leave', headerClass: 'w-24 text-center', cellClass: 'w-24 text-center', render: (row) => summaryNumber(row.unpaid_leave_days) },
    { key: 'absent_days', header: 'Absent', headerClass: 'w-24 text-center', cellClass: 'w-24 text-center', render: (row) => summaryNumber(row.absent_days) },
    { key: 'late_count', header: 'Late', headerClass: 'w-20 text-center', cellClass: 'w-20 text-center', render: (row) => summaryNumber(row.late_count) },
    { key: 'early_out_count', header: 'Early Out', headerClass: 'w-24 text-center', cellClass: 'w-24 text-center', render: (row) => summaryNumber(row.early_out_count) },
    { key: 'half_days', header: 'Half Day', headerClass: 'w-24 text-center', cellClass: 'w-24 text-center', render: (row) => summaryNumber(row.half_days) },
    { key: 'payable_days', header: 'Payable', headerClass: 'w-24 text-center', cellClass: 'w-24 text-center font-semibold', render: (row) => summaryNumber(row.payable_days) },
    // Red is for a deduction that exists. Painting the dash red too would make
    // a column of nothing look like a column of trouble.
    {
      key: 'deduction_days',
      header: 'Deduction',
      headerClass: 'w-24 text-center',
      cellClass: 'w-24 text-center',
      render: (row) => (
        <span
          className={
            Number(row.deduction_days || 0)
              ? 'font-bold text-red-700 dark:text-red-400'
              : ''
          }
        >
          {summaryNumber(row.deduction_days)}
        </span>
      ),
    },
  ], []);

  const summaryFooterRows: TableFooterCell[][] = useMemo(() => (
    summaryRows.length > 0
      ? [[
        { label: 'Total', colSpan: 2, className: 'text-center' },
        { label: summaryNumber(summaryTotals.present_days), className: 'text-center' },
        { label: summaryNumber(summaryTotals.paid_leave_days), className: 'text-center' },
        { label: summaryNumber(summaryTotals.unpaid_leave_days), className: 'text-center' },
        { label: summaryNumber(summaryTotals.absent_days), className: 'text-center' },
        { label: summaryNumber(summaryTotals.late_count), className: 'text-center' },
        { label: summaryNumber(summaryTotals.early_out_count), className: 'text-center' },
        { label: summaryNumber(summaryTotals.half_days), className: 'text-center' },
        { label: summaryNumber(summaryTotals.payable_days), className: 'text-center' },
        {
          label: summaryNumber(summaryTotals.deduction_days),
          className: `text-center${Number(summaryTotals.deduction_days || 0) ? ' font-bold text-red-700 dark:text-red-400' : ''}`,
        },
      ]]
      : []
  ), [summaryRows.length, summaryTotals]);

  const matrixColumns: Column[] = useMemo(() => [
    { key: 'sl', header: 'Sl. No.', headerClass: 'serial-cell w-16 text-center', cellClass: 'serial-cell w-16 text-center', render: (_row, index) => index + 1 },
    { key: 'employee_name', header: 'Name', headerClass: 'name-cell w-64 text-left', cellClass: 'name-cell w-64 text-left', render: (employee) => employee.employee_name || '-' },
    ...days.map((day) => ({
      key: `day_${day}`,
      header: day,
      headerClass: 'day-cell w-8 text-center',
      cellClass: 'day-cell w-8 px-0! py-0! text-center',
      render: (employee: any) => {
        const dateKey = toDateString(year, monthIndex, day);
        const code = employee.dates[dateKey] || '';
        const entry = employee.dateRows?.[dateKey];
        const isEditable = !!entry && entry.approval_status !== 'approved';
        // Marked at another site. The day counts here all the same â€” this
        // branch pays for it â€” so it is flagged rather than hidden.
        const elsewhere = elsewhereBranchName(entry);

        // A holiday nobody worked has no attendance behind it, so there is
        // nothing to open -- the mark is there to be read, not clicked.
        const isMarkedHoliday = !entry && (code === 'W' || code === 'H');
        const holidayName = employee.holidayNames?.[dateKey];

        return (
          <button
            type="button"
            title={
              isMarkedHoliday
                ? holidayName || 'Holiday'
                : elsewhere
                ? `Attendance given at ${elsewhere}`
                : entry?.approval_status === 'approved'
                ? 'Approved attendance cannot be changed'
                : code
                ? 'Click to update manual attendance'
                : ''
            }
            onClick={() => openManualAttendance(employee, dateKey, code)}
            disabled={!code || isMarkedHoliday}
            className={`group flex min-h-9 w-full items-center justify-center px-1 py-1 text-center ${code ? cellTintClass(code) : ''} ${isEditable ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-125' : 'cursor-default'}`}
          >
            {code ? (
              <span
                className={`attendance-mark ${statusClassName(code)}${elsewhere ? ' mark-other-branch' : ''}`}
              >
                {statusGlyph(code)}
              </span>
            ) : null}
          </button>
        );
      },
    })),
    {
      key: 'total',
      header: 'Total',
      headerClass: 'w-16 text-center',
      cellClass: 'w-16 text-center font-semibold text-slate-800 dark:text-slate-100',
      // The server's own figure, not a sum of what happens to be on screen.
      // It is the same number the salary sheet pays on: days worked, days on
      // paid leave, and the holidays inside the part of the month that has
      // been entered -- so a Friday already passed counts, one still to come
      // does not, and a Friday somebody was absent either side of does not
      // either. Adding the cells up here could never have known any of that.
      render: (employee) => {
        const payable = payableDaysByEmployee[String(employee.employee_id)];

        if (payable !== undefined) {
          return formatTotal(Number(payable));
        }

        // Nobody the summary knows about -- an inactive employee, say. Fall
        // back to counting the cells rather than showing nothing.
        return formatTotal(days.reduce((total, day) => {
          const dateKey = toDateString(year, monthIndex, day);
          return total + statusTotalValue(employee.dates[dateKey]);
        }, 0));
      },
    },
  ], [days, monthIndex, payableDaysByEmployee, year]);

  const matrixFooterRows: TableFooterCell[][] = useMemo(() => (
    reportRows.length > 0
      ? [[
        { label: 'Total', colSpan: 2, className: 'text-center font-semibold' },
        ...dayTotals.map((dayTotal) => ({ label: formatTotal(dayTotal), className: 'day-cell text-center font-semibold' })),
        { label: formatTotal(grandTotal), className: 'text-center font-semibold' },
      ]]
      : []
  ), [dayTotals, grandTotal, reportRows.length]);

  const loadReport = (currentFilters = filters) => {
    const currentMonthIndex = Math.max(0, Number(currentFilters.month || 1) - 1);
    const currentYear = Number(currentFilters.year || now.getFullYear());
    const lastDay = new Date(currentYear, currentMonthIndex + 1, 0).getDate();

    const params = {
      branch_id: currentFilters.branch_id,
      date_from: toDateString(currentYear, currentMonthIndex, 1),
      date_to: toDateString(currentYear, currentMonthIndex, lastDay),
    };

    dispatch(fetchAttendanceReport({
      ...params,
      approval_status: '',
      status: '',
      per_page: 100,
    }));
    dispatch(fetchLeaveApplications(params));
    dispatch(fetchMonthlyAttendanceSummary({
      branch_id: currentFilters.branch_id,
      month: currentFilters.month,
      year: currentFilters.year,
    }));
  };

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    const nextFilters = {
      branch_id: userBranchId,
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
    };

    setFilters((prev) => ({
      ...prev,
      branch_id: prev.branch_id || userBranchId,
    }));
    loadReport(nextFilters);
  }, [dispatch, userBranchId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Monthly Attendance ${monthNames[monthIndex]} ${year}`,
  });

  const openManualAttendance = (employee: any, dateKey: string, code: string) => {
    if (!code) return;

    const entry = employee?.dateRows?.[dateKey];
    if (!entry) {
      toast.info('Manual attendance entry not found for this cell');
      return;
    }

    if (entry.approval_status === 'approved') {
      toast.error('Approved attendance cannot be changed');
      return;
    }

    navigate(routes.hrms_attendance_entries, {
      state: {
        manualAttendanceEdit: {
          ...entry,
          employee_id: entry.employee_id || employee.employee_id,
          employee_name: entry.employee_name || employee.employee_name,
          attendance_date: dateKey,
        },
      },
    });
  };

  return (
    <div>
      <HelmetTitle title="Monthly Attendance Report" />
      {attendance.loading && <Loader />}

      <div className="mb-3 border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-boxdark">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
          <BranchDropdown
            name="branch_id"
            defaultValue={userBranchId}
            branchDdl={branches}
            value={filters.branch_id?.toString() ?? ''}
            onChange={handleChange}
            className="h-10 min-w-60 font-medium text-sm p-2"
          />
        </div>
        <div className="min-w-60">
          <DropdownCommon id="month" name="month" label="Month" value={filters.month} data={monthOptions} onChange={handleChange} className="h-10 font-medium" />
        </div>
        <div className="min-w-60">
          <DropdownCommon id="year" name="year" label="Year" value={filters.year} data={yearOptions} onChange={handleChange} className="h-10 font-medium" />
        </div>
        <div className="ml-auto flex items-end gap-2 max-md:ml-0">
          <ButtonLoading
            onClick={() => loadReport()}
            buttonLoading={attendance.loading}
            label="Load"
            icon={<FiCheckSquare />}
            className="h-10 px-6"
          />
          <PrintButton label="Print A4" onClick={handlePrint} className="h-10 px-6" disabled={attendance.loading} />
        </div>
      </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === 'summary'
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100 dark:bg-slate-700 dark:text-blue-300 dark:ring-slate-600'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FiGrid className="h-4 w-4" />
            Monthly Attendance Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === 'matrix'
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100 dark:bg-slate-700 dark:text-blue-300 dark:ring-slate-600'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FiCalendar className="h-4 w-4" />
            Attendance for the Month of {monthNames[monthIndex]} {year}
          </button>
        </div>
      </div>

      <div className={`mb-3 border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-boxdark ${activeTab === 'summary' ? '' : 'hidden'}`}>
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          Monthly Attendance Summary
        </div>
        <Table
          columns={summaryColumns}
          data={summaryRows}
          noDataMessage="No summary data found"
          footerRows={summaryFooterRows}
          getRowKey={(row: any) => row.employee_id || row.employee_name}
          className="shadow-none"
          tableClassName="text-xs"
        />
      </div>

      <div className={`attendance-monthly-screen border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-boxdark ${activeTab === 'matrix' ? '' : 'hidden'}`}>
        <style>
          {`
            .attendance-monthly-screen .status-cell {
              font-weight: 700;
            }

            .attendance-monthly-screen .attendance-mark {
              display: inline-flex;
              min-width: 24px;
              height: 24px;
              align-items: center;
              justify-content: center;
              border-radius: 9999px;
              color: rgb(var(--c-white));
              font-size: 13px;
              font-weight: 800;
              line-height: 1;
              box-shadow: 0 1px 3px rgba(15, 23, 42, 0.3);
              transition: transform 0.12s ease;
            }

            .attendance-monthly-screen .group:hover .attendance-mark {
              transform: scale(1.12);
            }

            .attendance-monthly-screen .status-present { background: rgb(var(--c-green-600)); color: rgb(var(--c-white)); }
            /* Pink, not amber: amber and the yellow below are the same colour at
               the size these marks are drawn, so a late day and a leave day were
               telling the reader apart by their glyph alone. Pink is the one
               hue this legend has not already spent -- green, red, grey, violet
               and yellow are all taken, and sky is the other-branch ring. */
            .attendance-monthly-screen .status-late { background: rgb(var(--c-pink-600)); color: rgb(var(--c-white)); }
            .attendance-monthly-screen .status-absent { background: rgb(var(--c-red-600)); color: rgb(var(--c-white)); }
            /* A weekly day off is routine, so it reads as quiet grey; a
               calendar holiday is an event, so it gets a colour of its own.
               Neither may borrow green, red or amber -- those already mean
               worked, absent and on leave. */
            .attendance-monthly-screen .status-weekly { background: rgb(var(--c-body)); color: rgb(var(--c-white)); }
            .attendance-monthly-screen .status-holiday { background: rgb(var(--c-violet-600)); color: rgb(var(--c-white)); }
            .attendance-monthly-screen .status-leave { background: rgb(var(--c-yellow-600)); color: rgb(var(--c-white)); }
            .attendance-monthly-screen .status-half-day { background: rgb(var(--c-violet-600)); color: rgb(var(--c-white)); }

            /* Marked at another branch. The status colour still says what the
               day was; the ring says where it was given. */
            .attendance-monthly-screen .mark-other-branch {
              box-shadow: 0 0 0 2px rgb(var(--c-white)), 0 0 0 4px rgb(var(--c-sky-500));
            }

            .dark .attendance-monthly-screen .mark-other-branch {
              box-shadow: 0 0 0 2px rgb(var(--c-slate-800)), 0 0 0 4px rgb(var(--c-sky-400));
            }

            .dark .attendance-monthly-screen .status-present { background: rgb(var(--c-green-500)); }
            .dark .attendance-monthly-screen .status-late { background: rgb(var(--c-pink-500)); }
            .dark .attendance-monthly-screen .status-absent { background: rgb(var(--c-red-500)); }
            .dark .attendance-monthly-screen .status-weekly { background: rgb(var(--c-slate-400)); color: rgb(var(--c-slate-900)); }
            .dark .attendance-monthly-screen .status-holiday { background: rgb(var(--c-violet-400)); color: rgb(var(--c-indigo-950)); }
            .dark .attendance-monthly-screen .status-leave { background: rgb(var(--c-yellow-500)); }
            .dark .attendance-monthly-screen .status-half-day { background: rgb(var(--c-violet-500)); }

            .attendance-monthly-screen .cell-tint {
              transition: filter 0.12s ease;
            }
            .attendance-monthly-screen .cell-tint-present { background: rgb(var(--c-green-100)); }
            .attendance-monthly-screen .cell-tint-late { background: rgb(var(--c-pink-100)); }
            .attendance-monthly-screen .cell-tint-absent { background: rgb(var(--c-red-100)); }
            .attendance-monthly-screen .cell-tint-weekly { background: rgb(var(--c-whiten)); }
            .attendance-monthly-screen .cell-tint-holiday { background: rgb(var(--c-violet-100)); }
            .attendance-monthly-screen .cell-tint-leave { background: rgb(var(--c-yellow-100)); }
            .attendance-monthly-screen .cell-tint-half { background: rgb(var(--c-purple-100)); }

            .dark .attendance-monthly-screen .cell-tint-present { background: rgba(34, 197, 94, 0.20); }
            .dark .attendance-monthly-screen .cell-tint-late { background: rgba(236, 72, 153, 0.20); }
            .dark .attendance-monthly-screen .cell-tint-absent { background: rgba(239, 68, 68, 0.22); }
            .dark .attendance-monthly-screen .cell-tint-weekly { background: rgba(148, 163, 184, 0.16); }
            .dark .attendance-monthly-screen .cell-tint-holiday { background: rgba(167, 139, 250, 0.20); }
            .dark .attendance-monthly-screen .cell-tint-leave { background: rgba(234, 179, 8, 0.20); }
            .dark .attendance-monthly-screen .cell-tint-half { background: rgba(139, 92, 246, 0.22); }

            .attendance-monthly-screen .legend-chip {
              display: inline-flex;
              align-items: center;
              gap: 5px;
              margin-right: 14px;
              margin-bottom: 4px;
            }

            .attendance-monthly-screen .legend-mark {
              display: inline-flex;
              min-width: 20px;
              height: 20px;
              align-items: center;
              justify-content: center;
              border-radius: 9999px;
              color: rgb(var(--c-white));
              font-size: 11px;
              font-weight: 800;
            }

            .attendance-monthly-screen .legend-total {
              background: rgb(var(--c-body));
              color: rgb(var(--c-white));
            }

            .dark .attendance-monthly-screen .legend-total {
              background: rgb(var(--c-slate-400));
              color: rgb(var(--c-slate-900));
            }

            @media print {
              @page {
                size: A4 landscape;
                margin: 8mm;
              }

              html,
              body {
                background: rgb(var(--c-white)) !important;
              }

              .attendance-monthly-print {
                width: 100% !important;
                overflow: visible !important;
                color: rgb(var(--c-black-2)) !important;
                background: rgb(var(--c-white)) !important;
                font-family: Arial, Helvetica, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              .attendance-monthly-print .attendance-print-pad {
                display: block !important;
              }

              .attendance-monthly-print table {
                width: 100% !important;
                min-width: 0 !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
                font-size: 8px !important;
                line-height: 1.15 !important;
                color: rgb(var(--c-black-2)) !important;
              }

              .attendance-monthly-print th,
              .attendance-monthly-print td {
                border: 1px solid rgb(var(--c-black-2)) !important;
                padding: 2px 1px !important;
                overflow: hidden !important;
              }

              .attendance-monthly-print .matrix-header-cell {
                background: rgb(var(--c-gray-200)) !important;
                color: rgb(var(--c-black-2)) !important;
              }

              .attendance-monthly-print .serial-cell {
                width: 34px !important;
              }

              .attendance-monthly-print .name-cell {
                width: 128px !important;
                white-space: nowrap !important;
                text-overflow: ellipsis !important;
              }

              .attendance-monthly-print .day-cell {
                width: 18px !important;
                text-align: center !important;
              }

              .attendance-monthly-print .total-cell {
                width: 28px !important;
                text-align: center !important;
                font-weight: 700 !important;
                background: rgb(var(--c-gray-100)) !important;
                color: rgb(var(--c-black-2)) !important;
              }

              .attendance-monthly-print .status-present {
                background: #eaf7ea !important;
                color: rgb(var(--c-black-2)) !important;
              }

              /* On paper the two were worse than on screen: #fff0bf against the
                 leave chip's #fff1c7 is a difference of six in one channel. */
              .attendance-monthly-print .status-late {
                background: #fbd5e6 !important;
                color: rgb(var(--c-black-2)) !important;
                box-shadow: inset 0 0 0 1px rgb(var(--c-black-2)) !important;
              }

              .attendance-monthly-print .status-absent {
                background: #ffdede !important;
                color: rgb(var(--c-black-2)) !important;
                box-shadow: inset 0 0 0 1px rgb(var(--c-black-2)) !important;
              }

              .attendance-monthly-print .status-holiday {
                background: #e8eef8 !important;
                color: rgb(var(--c-black-2)) !important;
              }

              .attendance-monthly-print .status-leave {
                background: #fff1c7 !important;
                color: rgb(var(--c-black-2)) !important;
              }

              .attendance-monthly-print .status-half-day {
                background: #eee3f8 !important;
                color: rgb(var(--c-black-2)) !important;
              }

              .attendance-monthly-print .report-heading {
                display: flex !important;
                justify-content: center !important;
                gap: 12px !important;
                margin-bottom: 3px !important;
                font-size: 10px !important;
                font-weight: 400 !important;
                text-align: center !important;
                color: rgb(var(--c-black-2)) !important;
              }

              .attendance-monthly-print .print-legend {
                margin-top: 4px !important;
                font-size: 8px !important;
                color: rgb(var(--c-black-2)) !important;
              }

              .attendance-monthly-print .legend-mark {
                height: 14px !important;
                min-width: 14px !important;
                font-size: 8px !important;
              }
            }
          `}
        </style>
        <div className="report-heading flex w-full items-center justify-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          <div>Attendance for the Month of <span>{monthNames[monthIndex]} {year}</span></div>
        </div>
        <Table
          columns={matrixColumns}
          data={reportRows}
          noDataMessage="No attendance data found"
          footerRows={matrixFooterRows}
          getRowKey={(row: any) => row.employee_id || row.employee_name}
          className="shadow-none"
          tableClassName="text-sm"
        />

        <div className="print-legend flex flex-wrap items-center border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
          <span className="legend-chip"><span className="legend-mark status-present">{statusGlyph('âœ“')}</span> Present</span>
          <span className="legend-chip"><span className="legend-mark status-late">{statusGlyph('!')}</span> Late</span>
          <span className="legend-chip"><span className="legend-mark status-weekly">W</span> Weekly holiday</span>
          <span className="legend-chip"><span className="legend-mark status-holiday">H</span> Holiday</span>
          <span className="legend-chip"><span className="legend-mark status-absent">{statusGlyph('âœ•')}</span> Absent</span>
          <span className="legend-chip"><span className="legend-mark status-leave">L</span> Leave</span>
          <span className="legend-chip"><span className="legend-mark status-half-day">Â½</span> Half Day</span>
          <span className="legend-chip"><span className="legend-mark legend-total">T</span> Present days</span>
          <span className="legend-chip">
            <span className="legend-mark status-present mark-other-branch">{statusGlyph('âœ“')}</span>
            Another branch â€” hover to see which
          </span>
        </div>
      </div>

      <div className="fixed left-[-10000px] top-0">
        <AttendanceMonthlyMatrixPrint
          ref={printRef}
          monthName={monthNames[monthIndex]}
          year={year}
          monthIndex={monthIndex}
          days={days}
          daysInMonth={daysInMonth}
          reportRows={reportRows}
          dayTotals={dayTotals}
          grandTotal={grandTotal}
        />
      </div>
    </div>
  );
};

export default AttendanceMonthlyMatrixReport;
