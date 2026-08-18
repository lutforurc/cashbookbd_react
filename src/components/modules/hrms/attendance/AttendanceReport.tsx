import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiRefreshCcw } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';

import Loader from '../../../../common/Loader';
import { PrintButton } from '../../../../pages/UiElements/CustomButtons';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import InputDatePicker from '../../../utils/fields/DatePicker';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchEmployees } from '../employee/employeeSlice';
import { fetchAttendanceReport, fetchLeaveApplications } from './attendanceSlice';
import { chartDate } from '../../../utils/utils-functions/formatDate';
import OvertimeReportMatrix from './OvertimeReportMatrix';
import OvertimeReportPrint from './OvertimeReportPrint';

const today = new Date().toISOString().slice(0, 10);
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

const dateFromString = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const dateToString = (date: Date | null) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const statusOptions = [
  { id: '', name: 'All Status' },
  { id: 'present', name: 'Present' },
  { id: 'absent', name: 'Absent' },
  { id: 'half_day', name: 'Half Day' },
  { id: 'leave', name: 'Leave' },
  { id: 'holiday', name: 'Holiday' },
  { id: 'weekly_holiday', name: 'Weekly Holiday' },
  { id: 'late', name: 'Late' },
  { id: 'early_out', name: 'Early Out' },
  { id: 'pending', name: 'Pending' },
];

const approvalOptions = [
  { id: '', name: 'All Approval' },
  { id: 'pending', name: 'Pending' },
  { id: 'approved', name: 'Approved' },
  { id: 'rejected', name: 'Rejected' },
];

const timeOnly = (value: any) => (value ? String(value).slice(11, 16) : '-');
const normalizeStatus = (value?: string) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || '-';
const safeRows = (value: any) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  if (Array.isArray(value?.data?.data?.data)) return value.data.data.data;
  return [];
};

const parseLocalDate = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateRange = (from?: string, to?: string) => {
  const start = parseLocalDate(from);
  const end = parseLocalDate(to);
  if (!start || !end || start > end) return [];

  const dates = [];
  const current = new Date(start);
  while (current <= end && dates.length < 62) {
    dates.push(formatLocalDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const getEmployeeId = (row: any) => String(row?.employee_id || row?.id || row?.employee_serial || row?.employee_name || row?.name || '');
const isActiveEmployee = (row: any) => {
  const status = String(row?.status ?? row?.employee_status ?? row?.status_name ?? '').toLowerCase();
  return status === '' || status === '1' || status === 'active';
};
const branchNameFromId = (branches: any[], branchId: any) => branches.find((branch) => String(branch.id) === String(branchId))?.name || '-';
const formatOtHours = (minutes: number | string) => (Number(minutes || 0) / 60).toFixed(2);

const cardTone = (label: string) => {
  const map: Record<string, { bar: string; value: string; dot: string }> = {
    'Active Employee': { bar: 'bg-indigo-500', value: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500' },
    'Attendance Entry': { bar: 'bg-sky-500', value: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
    'Absent/Missing': { bar: 'bg-rose-500', value: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
    Present: { bar: 'bg-emerald-500', value: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    'Half Day': { bar: 'bg-blue-500', value: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    Leave: { bar: 'bg-violet-500', value: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' },
    Late: { bar: 'bg-amber-500', value: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    'Late Deduction Days': { bar: 'bg-amber-500', value: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    'Early Out': { bar: 'bg-orange-500', value: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    'Early Out Deduction Days': { bar: 'bg-orange-500', value: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    'OT Hr.': { bar: 'bg-teal-500', value: 'text-teal-600 dark:text-teal-400', dot: 'bg-teal-500' },
    'OT Amount': { bar: 'bg-teal-500', value: 'text-teal-600 dark:text-teal-400', dot: 'bg-teal-500' },
    'Pending Approval': { bar: 'bg-amber-500', value: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    Approved: { bar: 'bg-emerald-500', value: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    Rejected: { bar: 'bg-rose-500', value: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  };
  return map[label] || { bar: 'bg-slate-400', value: 'text-slate-900 dark:text-white', dot: 'bg-slate-400' };
};

type AttendanceReportProps = {
  user: any;
  reportTitle?: string;
  defaultStatus?: string;
  reportType?: 'daily' | 'absent' | 'late' | 'early_out' | 'overtime';
};

const AttendanceReport = ({
  user,
  reportTitle = 'Daily Attendance Report',
  defaultStatus = '',
  reportType = 'daily',
}: AttendanceReportProps) => {
  const dispatch = useDispatch<any>();
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const employeeState = useSelector((state: any) => state.employees);
  const overtimePrintRef = useRef<HTMLDivElement>(null);
  const branches = branchDdlData?.protectedData?.data || [];
  const report = attendance.report || {};
  const rows = Array.isArray(report.rows) ? report.rows : [];
  const leaveApplications = Array.isArray(attendance.leaveApplications) ? attendance.leaveApplications : [];
  const employees = safeRows(employeeState?.employees?.data || employeeState?.employees);
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const [filters, setFilters] = useState<any>({
    date_from: today,
    date_to: today,
    branch_id: userBranchId,
    status: defaultStatus,
    approval_status: '',
  });
  const [overtimeRowsPerPage, setOvertimeRowsPerPage] = useState('12');
  const [overtimePrintFontSize, setOvertimePrintFontSize] = useState('12');

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  const fetchSupportingData = (currentFilters: any) => {
    dispatch(fetchEmployees({
      page: 1,
      per_page: 1000,
      branch_id: currentFilters.branch_id ? Number(currentFilters.branch_id) : undefined,
    }));
    dispatch(fetchLeaveApplications({
      branch_id: currentFilters.branch_id,
      date_from: currentFilters.date_from,
      date_to: currentFilters.date_to,
      approval_status: 'approved',
    }));
  };

  useEffect(() => {
    const nextFilters = {
      date_from: today,
      date_to: today,
      branch_id: userBranchId,
      status: defaultStatus,
      approval_status: '',
    };

    setFilters((prev: any) => ({
      ...prev,
      branch_id: prev.branch_id || userBranchId,
    }));
    dispatch(fetchAttendanceReport({
      ...nextFilters,
      ...(reportType === 'overtime' ? { overtime_eligible: 1, overtime_only: 1 } : {}),
    }));
    fetchSupportingData(nextFilters);
  }, [defaultStatus, dispatch, userBranchId]);

  const handleChange = (setter: any) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setter((prev: any) => ({ ...prev, [name]: value }));
  };

  const loadReport = () => {
    dispatch(fetchAttendanceReport({
      ...filters,
      ...(reportType === 'overtime' ? { overtime_eligible: 1, overtime_only: 1 } : {}),
    }));
    fetchSupportingData(filters);
  };

  const displayRows = useMemo(() => {
    const dates = dateRange(filters.date_from, filters.date_to);
    const attendanceKeySet = new Set(
      rows.map((row: any) => `${getEmployeeId(row)}-${String(row.attendance_date || '').slice(0, 10)}`),
    );

    const approvedLeaves = leaveApplications.filter((leave: any) => leave.approval_status === 'approved');
    const generatedRows = employees
      .filter(isActiveEmployee)
      .filter((employee: any) => !filters.branch_id || String(employee.branch_id) === String(filters.branch_id))
      .flatMap((employee: any) => dates.map((attendanceDate) => {
        const employeeId = getEmployeeId(employee);
        if (!employeeId || attendanceKeySet.has(`${employeeId}-${attendanceDate}`)) return null;

        const leave = approvedLeaves.find((item: any) => {
          const leaveEmployeeId = getEmployeeId(item);
          const fromDate = String(item.from_date || '').slice(0, 10);
          const toDate = String(item.to_date || '').slice(0, 10);
          return leaveEmployeeId === employeeId && fromDate <= attendanceDate && toDate >= attendanceDate;
        });

        return {
          id: `generated-${employeeId}-${attendanceDate}`,
          attendance_date: attendanceDate,
          employee_id: employee.id || employee.employee_id,
          employee_serial: employee.employee_serial || employee.serial_no || employee.id,
          employee_name: employee.employee_name || employee.name,
          branch_id: employee.branch_id,
          branch_name: employee.branch_name || branchNameFromId(branches, employee.branch_id),
          shift_name: employee.shift_name || '-',
          in_time: null,
          out_time: null,
          work_minutes: '-',
          status: leave ? 'leave' : 'absent',
          approval_status: leave ? 'approved' : '-',
          remarks: leave?.reason || '',
          generated_status: true,
        };
      }))
      .filter(Boolean);

    return [...rows, ...(reportType === 'overtime' ? [] : generatedRows)]
      .filter((row: any) => !filters.status || row.status === filters.status)
      .filter((row: any) => !filters.approval_status || row.approval_status === filters.approval_status)
      .sort((a: any, b: any) => {
        const dateCompare = String(a.attendance_date || '').localeCompare(String(b.attendance_date || ''));
        if (dateCompare !== 0) return dateCompare;
        const serialA = Number(a.employee_serial);
        const serialB = Number(b.employee_serial);
        if (!Number.isNaN(serialA) && !Number.isNaN(serialB)) return serialA - serialB;
        return String(a.employee_name || '').localeCompare(String(b.employee_name || ''));
      });
  }, [branches, employees, filters.approval_status, filters.branch_id, filters.date_from, filters.date_to, filters.status, leaveApplications, reportType, rows]);

  const summary = useMemo(() => displayRows.reduce((total: any, row: any) => {
    const status = row.status || 'unknown';
    total.total_entries += row.generated_status ? 0 : 1;
    total[status] = (total[status] || 0) + 1;
    if (row.approval_status === 'pending') total.pending_approval += 1;
    if (row.approval_status === 'approved') total.approved += 1;
    if (row.approval_status === 'rejected') total.rejected += 1;
    total.overtime_minutes += Number(row.overtime_minutes || 0);
    total.overtime_amount += Number(row.overtime_amount || 0);
    return total;
  }, {
    active_employees: employees.filter(isActiveEmployee).length || report.summary?.active_employees || 0,
    total_entries: 0,
    present: 0,
    absent: 0,
    half_day: 0,
    leave: 0,
    late: 0,
    pending_approval: 0,
    approved: 0,
    rejected: 0,
    overtime_minutes: 0,
	    overtime_amount: 0,
	  }), [displayRows, employees, report.summary?.active_employees]);

  const overtimeDates = useMemo(
    () => dateRange(filters.date_from, filters.date_to),
    [filters.date_from, filters.date_to],
  );

  const overtimeMatrixRows = useMemo(() => {
    const employeeMap = new Map<string, any>();

    displayRows.forEach((row: any) => {
      const employeeId = getEmployeeId(row);
      if (!employeeId) return;

      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, {
          employee_id: employeeId,
          employee_serial: row.employee_serial,
          employee_name: row.employee_name || row.name || '-',
          dates: {},
        });
      }

      const attendanceDate = String(row.attendance_date || '').slice(0, 10);
      if (!attendanceDate) return;

      const currentHours = Number(employeeMap.get(employeeId).dates[attendanceDate] || 0);
      employeeMap.get(employeeId).dates[attendanceDate] = currentHours + (Number(row.overtime_minutes || 0) / 60);
    });

    return Array.from(employeeMap.values()).sort((a, b) => {
      const serialA = Number(a.employee_serial);
      const serialB = Number(b.employee_serial);
      if (!Number.isNaN(serialA) && !Number.isNaN(serialB)) return serialA - serialB;
      return String(a.employee_name || '').localeCompare(String(b.employee_name || ''));
    });
  }, [displayRows]);

  const overtimeDayTotals = useMemo(
    () => overtimeDates.map((date) =>
      overtimeMatrixRows.reduce((total, employee) => total + Number(employee.dates[date] || 0), 0),
    ),
    [overtimeDates, overtimeMatrixRows],
  );

  const overtimeGrandTotal = useMemo(
    () => overtimeDayTotals.reduce((total, dayTotal) => total + dayTotal, 0),
    [overtimeDayTotals],
  );

  const overtimeMatrixTitle = useMemo(() => {
    const start = parseLocalDate(filters.date_from);
    const end = parseLocalDate(filters.date_to);
    if (!start || !end) return 'Overtime Report';

    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `Overtime for the Month of ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    }

    return `Overtime from ${filters.date_from} to ${filters.date_to}`;
  }, [filters.date_from, filters.date_to]);

  const handleOvertimePrint = useReactToPrint({
    content: () => overtimePrintRef.current,
    documentTitle: overtimeMatrixTitle,
    removeAfterPrint: true,
  });

  const cards = [
    { label: 'Active Employee', value: summary.active_employees || 0 },
    { label: 'Attendance Entry', value: summary.total_entries || 0 },
    { label: 'Absent/Missing', value: summary.absent || 0 },
    { label: 'Present', value: summary.present || 0 },
    { label: 'Half Day', value: summary.half_day || 0 },
    { label: 'Leave', value: summary.leave || 0 },
    { label: 'Late', value: summary.late || 0 },
    ...(reportType === 'late'
      ? [{ label: 'Late Deduction Days', value: Math.floor(Number(summary.late || 0) / 3) }]
      : []),
    { label: 'Early Out', value: summary.early_out || 0 },
    ...(reportType === 'early_out'
      ? [{ label: 'Early Out Deduction Days', value: Math.floor(Number(summary.early_out || 0) / 3) }]
      : []),
    ...(reportType === 'overtime'
      ? [
          { label: 'OT Hr.', value: formatOtHours(summary.overtime_minutes || 0) },
          { label: 'OT Amount', value: Number(summary.overtime_amount || 0).toLocaleString() },
        ]
      : []),
    { label: 'Pending Approval', value: summary.pending_approval || 0 },
    { label: 'Approved', value: summary.approved || 0 },
    { label: 'Rejected', value: summary.rejected || 0 },
  ];

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (_row: any, index: number) => index + 1,
    },
    { key: 'attendance_date', header: 'Date', render: (row: any) => chartDate(row.attendance_date) },
    { key: 'employee_serial', header: 'ID' },
    { key: 'employee_name', header: 'Employee' },
    { key: 'branch_name', header: 'Branch', render: (row: any) => row.branch_name || '-' },
    { key: 'shift_name', header: 'Shift', render: (row: any) => row.shift_name || '-' },
    { key: 'in_time', header: 'In', render: (row: any) => timeOnly(row.in_time) },
    { key: 'out_time', header: 'Out', render: (row: any) => timeOnly(row.out_time) },
    { key: 'work_minutes', header: 'Minutes', render: (row: any) => row.work_minutes || '-' },
    ...(reportType === 'overtime'
      ? [
          { key: 'overtime_minutes', header: 'OT Hr.', render: (row: any) => formatOtHours(row.overtime_minutes || 0) },
          { key: 'overtime_amount', header: 'OT Amount', render: (row: any) => Number(row.overtime_amount || 0).toLocaleString() },
        ]
      : []),
    { key: 'status', header: 'Status', render: (row: any) => normalizeStatus(row.status) },
    { key: 'approval_status', header: 'Approval', render: (row: any) => normalizeStatus(row.approval_status) },
  ];

  return (
    <div>
      <HelmetTitle title={reportTitle} />
      {(attendance.loading || employeeState.loading) && <Loader />}

      <div className="mb-3 border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-boxdark">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
        <InputDatePicker
          id="date_from"
          name="date_from"
          label="From"
          selectedDate={dateFromString(filters.date_from)}
          setSelectedDate={(date) => setFilters((prev: any) => ({ ...prev, date_from: dateToString(date) }))}
          setCurrentDate={(date) => setFilters((prev: any) => ({ ...prev, date_from: dateToString(date) }))}
          className="h-9 w-full"
        />
        <InputDatePicker
          id="date_to"
          name="date_to"
          label="To"
          selectedDate={dateFromString(filters.date_to)}
          setSelectedDate={(date) => setFilters((prev: any) => ({ ...prev, date_to: dateToString(date) }))}
          setCurrentDate={(date) => setFilters((prev: any) => ({ ...prev, date_to: dateToString(date) }))}
          className="h-9 w-full"
        />
        <div>
          <label className="text-black dark:text-white">Branch</label>
          <BranchDropdown
            name="branch_id"
            defaultValue={userBranchId}
            branchDdl={branches}
            value={filters.branch_id?.toString() ?? ''}
            onChange={handleChange(setFilters)}
            className="h-9 w-full font-medium text-sm p-1.5"
          />
        </div>
        <DropdownCommon id="status" name="status" label="Status" value={filters.status} data={statusOptions} onChange={handleChange(setFilters)} className="h-9" />
        <DropdownCommon id="approval_status" name="approval_status" label="Approval" value={filters.approval_status} data={approvalOptions} onChange={handleChange(setFilters)} className="h-9" />
        <div className="flex items-end gap-2">
          <button type="button" onClick={loadReport} className={`inline-flex items-center justify-center ${commandButtonClass}`}>
            <FiRefreshCcw className="mr-2" />
            Load
          </button>
        </div>
      </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-6">
        {cards.map((card) => {
          const tone = cardTone(card.label);
          return (
            <div key={card.label} className="relative overflow-hidden border border-slate-200 bg-white p-3 pl-4 dark:border-slate-700 dark:bg-boxdark">
              <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-300">
                <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                {card.label}
              </div>
              <div className={`mt-1 text-xl font-bold ${tone.value}`}>{card.value}</div>
            </div>
          );
        })}
        {reportType === 'overtime' && (
          <div className="flex items-end gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={overtimeRowsPerPage}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) setOvertimeRowsPerPage(e.target.value);
              }}
              onBlur={() => setOvertimeRowsPerPage(String(Math.max(1, Number(overtimeRowsPerPage) || 12)))}
              title="Rows per page for print"
              className="h-10 w-20 border border-stroke bg-white px-3 text-center text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
            />
            <input
              type="text"
              inputMode="numeric"
              value={overtimePrintFontSize}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) setOvertimePrintFontSize(e.target.value);
              }}
              onBlur={() => setOvertimePrintFontSize(String(Math.max(6, Number(overtimePrintFontSize) || 12)))}
              title="Font Size for print"
              className="h-10 w-20 border border-stroke bg-white px-3 text-center text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
            />
            <PrintButton
              label="Print"
              onClick={handleOvertimePrint}
              className="h-10 px-5"
              disabled={attendance.loading || employeeState.loading}
            />
          </div>
        )}
      </div>

      {reportType === 'overtime' ? (
        <>
          <OvertimeReportMatrix
            title={overtimeMatrixTitle}
            dates={overtimeDates}
            rows={overtimeMatrixRows}
            dayTotals={overtimeDayTotals}
            grandTotal={overtimeGrandTotal}
          />
          <div className="fixed left-[-10000px] top-0">
            <OvertimeReportPrint
              ref={overtimePrintRef}
              title={overtimeMatrixTitle}
              dates={overtimeDates}
              rows={overtimeMatrixRows}
              dayTotals={overtimeDayTotals}
              grandTotal={overtimeGrandTotal}
              rowsPerPage={Number(overtimeRowsPerPage) || 12}
              fontSize={Number(overtimePrintFontSize) || 12}
            />
          </div>
        </>
      ) : (
        <div className="border border-slate-200 bg-white dark:border-slate-700 dark:bg-boxdark">
          <Table columns={columns} data={displayRows} />
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;
