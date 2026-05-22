import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiRefreshCcw } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';

import Loader from '../../../../common/Loader';
import { PrintButton } from '../../../../pages/UiElements/CustomButtons';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchAttendanceReport, fetchLeaveApplications } from './attendanceSlice';

const commandButtonClass = 'h-10 min-w-25 rounded-none bg-slate-700 px-5 text-sm font-medium text-white hover:bg-slate-600 focus:bg-slate-600';

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

const statusCode = (status?: string, approvalStatus?: string) => {
  if (approvalStatus === 'rejected' || status === 'rejected') return '✕';

  switch (status) {
    case 'present':
    case 'late':
    case 'early_out':
      return '✓';
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

const statusTotalValue = (code?: string) => {
  if (code === '✓' || code === '○' || code === 'L') return 1;
  if (code === '½') return 0.5;
  return 0;
};

const formatTotal = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

const statusClassName = (code?: string) => {
  switch (code) {
    case '✓':
      return 'status-cell status-present';
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
  const printRef = useRef<HTMLDivElement>(null);
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const rows = Array.isArray(attendance.report?.rows) ? attendance.report.rows : [];
  const leaveApplications = Array.isArray(attendance.leaveApplications) ? attendance.leaveApplications : [];

  const now = new Date();
  const [filters, setFilters] = useState({
    branch_id: '',
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

  const selectedBranch = branches.find((branch: any) => String(branch.id) === String(filters.branch_id));
  const projectName = selectedBranch?.name || 'All Projects';

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
        });
      }

      const attendanceDate = String(row.attendance_date || '').slice(0, 10);
      employeeMap.get(employeeId).dates[attendanceDate] = statusCode(row.status, row.approval_status);
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
  };

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    loadReport();
  }, [dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Monthly Attendance ${monthNames[monthIndex]} ${year}`,
    removeAfterPrint: true,
  });

  return (
    <div>
      <HelmetTitle title="Monthly Attendance Report" />
      {attendance.loading && <Loader />}

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-5">
        <div>
          <label className="text-black dark:text-white">Project</label>
          <BranchDropdown
            name="branch_id"
            branchDdl={[{ id: '', name: 'All Projects' }, ...branches]}
            value={filters.branch_id}
            onChange={handleChange}
            className="h-9 w-full font-medium text-sm p-1.5"
          />
        </div>
        <DropdownCommon id="month" name="month" label="Month" value={filters.month} data={monthOptions} onChange={handleChange} className="h-9" />
        <DropdownCommon id="year" name="year" label="Year" value={filters.year} data={yearOptions} onChange={handleChange} className="h-9" />
        <div className="flex items-end">
          <button type="button" onClick={() => loadReport()} className={`inline-flex items-center justify-center ${commandButtonClass}`}>
            <FiRefreshCcw className="mr-2" />
            Load
          </button>
        </div>
        <div className="flex items-end">
          <PrintButton label="Print A4" onClick={handlePrint} className="h-10 rounded-none" disabled={attendance.loading} />
        </div>
      </div>

      <div ref={printRef} className="attendance-monthly-print overflow-x-auto bg-white dark:bg-boxdark">
        <PrintStyles />
        <style>
          {`
            .attendance-monthly-print .matrix-header-cell {
              background: #e8eef6;
              color: #0f172a;
            }

            .attendance-monthly-print .status-cell {
              font-weight: 700;
            }

            .attendance-monthly-print .status-present {
              background: #e9f8ee;
              color: #137333;
            }

            .attendance-monthly-print .status-absent {
              background: #ffe8e8;
              color: #b91c1c;
              box-shadow: inset 0 0 0 1px #ef4444;
            }

            .attendance-monthly-print .status-holiday {
              background: #eef4ff;
              color: #1d4ed8;
            }

            .attendance-monthly-print .status-leave {
              background: #fff6db;
              color: #92400e;
            }

            .attendance-monthly-print .status-half-day {
              background: #f3e8ff;
              color: #6b21a8;
            }

            .attendance-monthly-print .total-cell {
              background: #f8fafc;
              color: #0f172a;
            }

            .attendance-monthly-print tfoot td {
              background: #eef2f7;
              color: #0f172a;
            }

            .attendance-monthly-print .legend-chip {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              margin-right: 10px;
              margin-bottom: 4px;
              color: #334155;
            }

            .attendance-monthly-print .legend-mark {
              display: inline-flex;
              min-width: 18px;
              height: 18px;
              align-items: center;
              justify-content: center;
              border: 1px solid #cbd5e1;
              font-size: 11px;
              font-weight: 700;
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
        <div className="attendance-print-pad hidden">
          <PadPrinting />
        </div>
        <div className="report-heading mb-1 flex w-full items-center justify-center gap-3 text-center text-sm text-slate-950 dark:text-white">
          <div>Attendance for the Month of <span>{monthNames[monthIndex]} {year}</span></div>
        </div>
        <table className="min-w-full border-collapse border border-slate-900 text-xs text-slate-950 dark:border-slate-500 dark:text-white">
          <thead>
            <tr>
              <th className="serial-cell matrix-header-cell w-10 border border-slate-900 px-1 py-1 text-center font-semibold dark:border-slate-500">Sl. No.</th>
              <th className="name-cell matrix-header-cell min-w-45 border border-slate-900 px-1 py-1 text-left font-semibold dark:border-slate-500">Name</th>
              {days.map((day) => (
                <th key={day} className="day-cell matrix-header-cell w-6 border border-slate-900 px-1 py-1 text-center font-semibold dark:border-slate-500">
                  {day}
                </th>
              ))}
              <th className="total-cell matrix-header-cell w-8 border border-slate-900 px-1 py-1 text-center font-semibold dark:border-slate-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {reportRows.map((employee, index) => {
              const employeeTotal = days.reduce((total, day) => {
                const dateKey = toDateString(year, monthIndex, day);
                return total + statusTotalValue(employee.dates[dateKey]);
              }, 0);

              return (
                <tr key={employee.employee_id || employee.employee_name}>
                  <td className="serial-cell border border-slate-900 px-1 py-1 text-center dark:border-slate-500">{index + 1}</td>
                  <td className="name-cell border border-slate-900 px-1 py-1 text-left dark:border-slate-500">{employee.employee_name || '-'}</td>
                  {days.map((day) => {
                    const dateKey = toDateString(year, monthIndex, day);
                    const code = employee.dates[dateKey] || '';
                    return (
                      <td key={dateKey} className={`day-cell border border-slate-900 px-1 py-1 text-center dark:border-slate-500 ${statusClassName(code)}`}>
                        {code}
                      </td>
                    );
                  })}
                  <td className="total-cell border border-slate-900 px-1 py-1 text-center font-semibold dark:border-slate-500">{formatTotal(employeeTotal)}</td>
                </tr>
              );
            })}
            {reportRows.length === 0 && (
              <tr>
                <td colSpan={daysInMonth + 3} className="border border-slate-900 px-2 py-4 text-center dark:border-slate-500">
                  No attendance data found
                </td>
              </tr>
            )}
          </tbody>
          {reportRows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2} className="border border-slate-900 px-1 py-1 text-center font-semibold dark:border-slate-500">Total</td>
                {dayTotals.map((dayTotal, index) => (
                  <td key={`day-total-${index}`} className="day-cell border border-slate-900 px-1 py-1 text-center font-semibold dark:border-slate-500">
                    {formatTotal(dayTotal)}
                  </td>
                ))}
                <td className="total-cell border border-slate-900 px-1 py-1 text-center font-semibold dark:border-slate-500">{formatTotal(grandTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        <div className="print-legend mt-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="legend-chip"><span className="legend-mark status-present">✓</span> Present</span>
          <span className="legend-chip"><span className="legend-mark status-holiday">○</span> Holiday</span>
          <span className="legend-chip"><span className="legend-mark status-absent">✕</span> Absent</span>
          <span className="legend-chip"><span className="legend-mark status-leave">L</span> Leave</span>
          <span className="legend-chip"><span className="legend-mark status-half-day">½</span> Half Day</span>
          <span className="legend-chip"><span className="legend-mark total-cell">T</span> Present days</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceMonthlyMatrixReport;
