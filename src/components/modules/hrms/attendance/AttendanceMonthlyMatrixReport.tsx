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
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchAttendanceReport, fetchLeaveApplications } from './attendanceSlice';
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
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Project</label>
          <BranchDropdown
            name="branch_id"
            branchDdl={[{ id: '', name: 'All Projects' }, ...branches]}
            value={filters.branch_id}
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

      <div className="attendance-monthly-print rounded-sm bg-white shadow-sm dark:bg-boxdark">
        <style>
          {`
            .attendance-monthly-print .matrix-header-cell {
              background: #d1d5db;
              color: #1f2937;
            }

            .attendance-monthly-print .status-cell {
              font-weight: 700;
            }

            .attendance-monthly-print .status-present {
              background: #eefbf3;
              color: #137333;
            }

            .attendance-monthly-print .status-late {
              background: #fff7df;
              color: #b45309;
            }

            .attendance-monthly-print .status-absent {
              background: #fff0f0;
              color: #b91c1c;
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
              background: #f8fafc;
              color: #1f2937;
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
        <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-left text-sm text-gray-700 dark:text-gray-300">
          <thead>
            <tr className="text-xs uppercase">
              <th className="serial-cell matrix-header-cell w-16 px-3 py-3 text-center font-semibold">Sl. No.</th>
              <th className="name-cell matrix-header-cell w-64 px-3 py-3 text-left font-semibold">Name</th>
              {days.map((day) => (
                <th key={day} className="day-cell matrix-header-cell w-8 px-2 py-3 text-center font-semibold">
                  {day}
                </th>
              ))}
              <th className="total-cell matrix-header-cell w-16 px-3 py-3 text-center font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {reportRows.map((employee, index) => {
              const employeeTotal = days.reduce((total, day) => {
                const dateKey = toDateString(year, monthIndex, day);
                return total + statusTotalValue(employee.dates[dateKey]);
              }, 0);

              return (
                <tr key={employee.employee_id || employee.employee_name} className="transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700">
                  <td className="serial-cell px-3 py-2 text-center">{index + 1}</td>
                  <td className="name-cell truncate px-3 py-2 text-left">{employee.employee_name || '-'}</td>
                  {days.map((day) => {
                    const dateKey = toDateString(year, monthIndex, day);
                    const code = employee.dates[dateKey] || '';
                    const entry = employee.dateRows?.[dateKey];
                    const isEditable = !!entry && entry.approval_status !== 'approved';
                    return (
                      <td
                        key={dateKey}
                        title={entry?.approval_status === 'approved' ? 'Approved attendance cannot be changed' : code ? 'Click to update manual attendance' : ''}
                        onClick={() => openManualAttendance(employee, dateKey, code)}
                        className={`day-cell px-2 py-2 text-center ${statusClassName(code)} ${isEditable ? 'cursor-pointer hover:ring-1 hover:ring-slate-500' : ''}`}
                      >
                        {code}
                      </td>
                    );
                  })}
                  <td className="total-cell px-3 py-2 text-center font-semibold">{formatTotal(employeeTotal)}</td>
                </tr>
              );
            })}
            {reportRows.length === 0 && (
              <tr>
                <td colSpan={daysInMonth + 3} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                  No attendance data found
                </td>
              </tr>
            )}
          </tbody>
          {reportRows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2} className="px-3 py-3 text-center font-semibold">Total</td>
                {dayTotals.map((dayTotal, index) => (
                  <td key={`day-total-${index}`} className="day-cell px-2 py-3 text-center font-semibold">
                    {formatTotal(dayTotal)}
                  </td>
                ))}
                <td className="total-cell px-3 py-3 text-center font-semibold">{formatTotal(grandTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>

        <div className="print-legend border-t border-gray-200 px-3 py-2 text-xs text-slate-600 dark:border-gray-700 dark:text-slate-300">
          <span className="legend-chip"><span className="legend-mark status-present">✓</span> Present</span>
          <span className="legend-chip"><span className="legend-mark status-late">!</span> Late</span>
          <span className="legend-chip"><span className="legend-mark status-holiday">○</span> Holiday</span>
          <span className="legend-chip"><span className="legend-mark status-absent">✕</span> Absent</span>
          <span className="legend-chip"><span className="legend-mark status-leave">L</span> Leave</span>
          <span className="legend-chip"><span className="legend-mark status-half-day">½</span> Half Day</span>
          <span className="legend-chip"><span className="legend-mark total-cell">T</span> Present days</span>
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
