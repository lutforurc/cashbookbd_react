import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiCheckSquare } from 'react-icons/fi';
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
  if (approvalStatus === 'rejected' || status === 'rejected') return '✕';

  switch (status) {
    case 'present':
    case 'early_out':
      return '✓';
    case 'late':
      return '!';
    case 'absent':
      return '✕';
    case 'leave':
      return 'L';
    case 'holiday':
    case 'weekly_holiday':
      return '○';
    case 'half_day':
      return '½';
    case 'pending':
      return '✓';
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

const statusTotalValue = (code?: string) => {
  if (code === '✓' || code === '!' || code === '○' || code === 'L') return 1;
  if (code === '½') return 0.5;
  return 0;
};

const formatTotal = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
const summaryNumber = (value: any) => {
  const numericValue = Number(value || 0);
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1);
};

const statusClassName = (code?: string) => {
  switch (code) {
    case '✓':
      return 'status-cell status-present';
    case '!':
      return 'status-cell status-late';
    case '✕':
      return 'status-cell status-absent';
    case '○':
      return 'status-cell status-holiday';
    case 'L':
      return 'status-cell status-leave';
    case '½':
      return 'status-cell status-half-day';
    default:
      return 'status-cell status-empty';
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
  const summaryTotals = attendance.monthlySummary?.totals || {};
  const leaveApplications = Array.isArray(attendance.leaveApplications) ? attendance.leaveApplications : [];
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const now = new Date();
  const [filters, setFilters] = useState({
    branch_id: userBranchId,
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  });

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

    return Array.from(employeeMap.values()).sort((a, b) => {
      const serialA = Number(a.employee_serial);
      const serialB = Number(b.employee_serial);
      if (!Number.isNaN(serialA) && !Number.isNaN(serialB)) return serialA - serialB;
      return String(a.employee_name || '').localeCompare(String(b.employee_name || ''));
    });
  }, [daysInMonth, leaveApplications, monthIndex, rows, year]);

  const dayTotals = useMemo(
    () =>
      days.map((day) => {
        const dateKey = toDateString(year, monthIndex, day);
        return reportRows.reduce((total, employee) => total + statusTotalValue(employee.dates[dateKey]), 0);
      }),
    [days, monthIndex, reportRows, year],
  );

  const grandTotal = useMemo(
    () => dayTotals.reduce((total, dayTotal) => total + dayTotal, 0),
    [dayTotals],
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
    { key: 'deduction_days', header: 'Deduction', headerClass: 'w-24 text-center', cellClass: 'w-24 text-center font-semibold text-red-700 dark:text-red-400', render: (row) => summaryNumber(row.deduction_days) },
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
        { label: summaryNumber(summaryTotals.deduction_days), className: 'text-center text-red-700 dark:text-red-400' },
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
      cellClass: 'day-cell w-8 !px-0 !py-0 text-center',
      render: (employee: any) => {
        const dateKey = toDateString(year, monthIndex, day);
        const code = employee.dates[dateKey] || '';
        const entry = employee.dateRows?.[dateKey];
        const isEditable = !!entry && entry.approval_status !== 'approved';

        return (
          <button
            type="button"
            title={entry?.approval_status === 'approved' ? 'Approved attendance cannot be changed' : code ? 'Click to update manual attendance' : ''}
            onClick={() => openManualAttendance(employee, dateKey, code)}
            disabled={!code}
            className={`block h-full min-h-9 w-full px-2 py-2 text-center ${statusClassName(code)} ${isEditable ? 'cursor-pointer hover:ring-1 hover:ring-slate-500' : 'cursor-default'}`}
          >
            {code}
          </button>
        );
      },
    })),
    {
      key: 'total',
      header: 'Total',
      headerClass: 'w-16 text-center',
      cellClass: 'w-16 text-center font-semibold text-slate-800 dark:text-slate-100',
      render: (employee) => formatTotal(days.reduce((total, day) => {
        const dateKey = toDateString(year, monthIndex, day);
        return total + statusTotalValue(employee.dates[dateKey]);
      }, 0)),
    },
  ], [days, monthIndex, year]);

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
    content: () => printRef.current,
    documentTitle: `Monthly Attendance ${monthNames[monthIndex]} ${year}`,
    removeAfterPrint: true,
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

      <div className="py-3">
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

      <div className="mb-3 rounded-sm bg-white shadow-sm dark:bg-boxdark">
        <div className="border-b border-gray-200 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-gray-700 dark:text-slate-100">
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

      <div className="attendance-monthly-screen rounded-sm bg-white shadow-sm dark:bg-boxdark">
        <style>
          {`
            .attendance-monthly-screen .status-cell {
              font-weight: 700;
            }

            .attendance-monthly-screen .status-present {
              background: #eefbf3;
              color: #137333;
            }

            .attendance-monthly-screen .status-late {
              background: #fff7df;
              color: #b45309;
            }

            .attendance-monthly-screen .status-absent {
              background: #fff0f0;
              color: #b91c1c;
            }

            .attendance-monthly-screen .status-holiday {
              background: #eef4ff;
              color: #1d4ed8;
            }

            .attendance-monthly-screen .status-leave {
              background: #fff6db;
              color: #92400e;
            }

            .attendance-monthly-screen .status-half-day {
              background: #f3e8ff;
              color: #6b21a8;
            }

            .attendance-monthly-screen .legend-chip {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              margin-right: 10px;
              margin-bottom: 4px;
              color: #334155;
            }

            .attendance-monthly-screen .legend-mark {
              display: inline-flex;
              min-width: 18px;
              height: 18px;
              align-items: center;
              justify-content: center;
              border: 1px solid #cbd5e1;
              font-size: 11px;
              font-weight: 700;
            }

            .attendance-monthly-screen .legend-total {
              background: #f8fafc;
              color: #0f172a;
            }

            @media print {
              @page {
                size: A4 landscape;
                margin: 8mm;
              }

              html,
              body {
                background: #ffffff !important;
              }

              .attendance-monthly-print {
                width: 100% !important;
                overflow: visible !important;
                color: #000000 !important;
                background: #ffffff !important;
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
                color: #000000 !important;
              }

              .attendance-monthly-print th,
              .attendance-monthly-print td {
                border: 1px solid #000000 !important;
                padding: 2px 1px !important;
                overflow: hidden !important;
              }

              .attendance-monthly-print .matrix-header-cell {
                background: #e5e7eb !important;
                color: #000000 !important;
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
                background: #eeeeee !important;
                color: #000000 !important;
              }

              .attendance-monthly-print .status-present {
                background: #eaf7ea !important;
                color: #000000 !important;
              }

              .attendance-monthly-print .status-late {
                background: #fff0bf !important;
                color: #000000 !important;
                box-shadow: inset 0 0 0 1px #000000 !important;
              }

              .attendance-monthly-print .status-absent {
                background: #ffdede !important;
                color: #000000 !important;
                box-shadow: inset 0 0 0 1px #000000 !important;
              }

              .attendance-monthly-print .status-holiday {
                background: #e8eef8 !important;
                color: #000000 !important;
              }

              .attendance-monthly-print .status-leave {
                background: #fff1c7 !important;
                color: #000000 !important;
              }

              .attendance-monthly-print .status-half-day {
                background: #eee3f8 !important;
                color: #000000 !important;
              }

              .attendance-monthly-print .report-heading {
                display: flex !important;
                justify-content: center !important;
                gap: 12px !important;
                margin-bottom: 3px !important;
                font-size: 10px !important;
                font-weight: 400 !important;
                text-align: center !important;
                color: #000000 !important;
              }

              .attendance-monthly-print .print-legend {
                margin-top: 4px !important;
                font-size: 8px !important;
                color: #000000 !important;
              }

              .attendance-monthly-print .legend-mark {
                height: 14px !important;
                min-width: 14px !important;
                font-size: 8px !important;
              }
            }
          `}
        </style>
        <div className="report-heading flex w-full items-center justify-center gap-3 border-b border-gray-200 px-3 py-2 text-center text-sm font-medium text-slate-800 dark:border-gray-700 dark:text-slate-100">
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

        <div className="print-legend border-t border-gray-200 px-3 py-2 text-xs text-slate-600 dark:border-gray-700 dark:text-slate-300">
          <span className="legend-chip"><span className="legend-mark status-present">✓</span> Present</span>
          <span className="legend-chip"><span className="legend-mark status-late">!</span> Late</span>
          <span className="legend-chip"><span className="legend-mark status-holiday">○</span> Holiday</span>
          <span className="legend-chip"><span className="legend-mark status-absent">✕</span> Absent</span>
          <span className="legend-chip"><span className="legend-mark status-leave">L</span> Leave</span>
          <span className="legend-chip"><span className="legend-mark status-half-day">½</span> Half Day</span>
          <span className="legend-chip"><span className="legend-mark legend-total">T</span> Present days</span>
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
