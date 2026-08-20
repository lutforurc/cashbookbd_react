import React, { useEffect, useMemo, useState } from 'react';
import { FiRefreshCcw } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import Loader from '../../../../common/Loader';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import EmployeeDropdownSearch from '../../../utils/utils-functions/EmployeeDropdownSearch';
import InputDatePicker from '../../../utils/fields/DatePicker';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchAttendanceReport, fetchLeaveApplications } from './attendanceSlice';
import { chartDate } from '../../../utils/utils-functions/formatDate';
import { Button } from '../../../../pages/UiElements/CustomButtons';

const commandButtonClass = 'min-w-25 rounded-none bg-slate-700 px-5 text-sm font-medium text-white hover:bg-slate-600 focus:bg-slate-600';

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

const dateFromString = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
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

const today = dateToString(new Date());
const monthStart = dateToString(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

const dateRange = (from?: string, to?: string) => {
  const start = dateFromString(from);
  const end = dateFromString(to);
  if (!start || !end || start > end) return [];

  const dates = [];
  const current = new Date(start);
  while (current <= end && dates.length < 366) {
    dates.push(dateToString(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const normalizeStatus = (value?: string) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || '-';
const timeOnly = (value: any) => (value ? String(value).slice(11, 16) : '-');
const getEmployeeId = (row: any) => String(row?.employee_id || row?.id || row?.value || row?.employee_serial || '');
const branchNameFromId = (branches: any[], branchId: any) => branches.find((branch) => String(branch.id) === String(branchId))?.name || '-';

const cardTone = (label: string) => {
  const map: Record<string, { bar: string; value: string; dot: string }> = {
    'Total Days': { bar: 'bg-indigo-500', value: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500' },
    Present: { bar: 'bg-emerald-500', value: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    Absent: { bar: 'bg-rose-500', value: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
    Leave: { bar: 'bg-violet-500', value: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' },
    Late: { bar: 'bg-amber-500', value: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    'Early Out': { bar: 'bg-orange-500', value: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    'Half Day': { bar: 'bg-blue-500', value: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    Holiday: { bar: 'bg-sky-500', value: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
  };
  return map[label] || { bar: 'bg-slate-400', value: 'text-slate-900 dark:text-[rgb(var(--c-text))]', dot: 'bg-slate-400' };
};

const EmployeeAttendanceReport = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const rows = Array.isArray(attendance.report?.rows) ? attendance.report.rows : [];
  const leaveApplications = Array.isArray(attendance.leaveApplications) ? attendance.leaveApplications : [];
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const [filters, setFilters] = useState<any>({
    employee_id: '',
    employee_name: '',
    branch_id: userBranchId,
    date_from: monthStart,
    date_to: today,
    status: '',
  });

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  const handleChange = (setter: any) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setter((prev: any) => ({ ...prev, [name]: value }));
  };

  const loadReport = (currentFilters = filters) => {
    if (!currentFilters.employee_id) {
      toast.error('Please select employee');
      return;
    }

    const params = {
      employee_id: currentFilters.employee_id,
      branch_id: currentFilters.branch_id,
      date_from: currentFilters.date_from,
      date_to: currentFilters.date_to,
      status: '',
      approval_status: '',
      per_page: 366,
    };

    dispatch(fetchAttendanceReport(params));
    dispatch(fetchLeaveApplications({
      employee_id: currentFilters.employee_id,
      branch_id: currentFilters.branch_id,
      date_from: currentFilters.date_from,
      date_to: currentFilters.date_to,
      approval_status: 'approved',
    }));
  };

  const displayRows = useMemo(() => {
    const employeeId = String(filters.employee_id || '');
    if (!employeeId) return [];

    const attendanceRows = rows.filter((row: any) => String(row.employee_id || '') === employeeId);
    const attendanceMap = new Map(
      attendanceRows.map((row: any) => [String(row.attendance_date || '').slice(0, 10), row]),
    );

    const approvedLeaves = leaveApplications.filter((leave: any) => {
      const leaveEmployeeId = getEmployeeId(leave);
      return leave.approval_status === 'approved' && leaveEmployeeId === employeeId;
    });

    return dateRange(filters.date_from, filters.date_to)
      .map((attendanceDate) => {
        const entry = attendanceMap.get(attendanceDate);
        if (entry) return entry;

        const leave = approvedLeaves.find((item: any) => {
          const fromDate = String(item.from_date || '').slice(0, 10);
          const toDate = String(item.to_date || '').slice(0, 10);
          return fromDate <= attendanceDate && toDate >= attendanceDate;
        });

        return {
          id: `employee-generated-${employeeId}-${attendanceDate}`,
          attendance_date: attendanceDate,
          employee_id: employeeId,
          employee_serial: '',
          employee_name: filters.employee_name,
          branch_id: filters.branch_id,
          branch_name: branchNameFromId(branches, filters.branch_id),
          shift_name: '-',
          in_time: null,
          out_time: null,
          work_minutes: '-',
          status: leave ? 'leave' : 'absent',
          approval_status: leave ? 'approved' : '-',
          remarks: leave?.reason || '',
          generated_status: true,
        };
      })
      .filter((row: any) => !filters.status || row.status === filters.status);
  }, [branches, filters.branch_id, filters.date_from, filters.date_to, filters.employee_id, filters.employee_name, filters.status, leaveApplications, rows]);

  const summary = useMemo(() => displayRows.reduce((total: any, row: any) => {
    const status = row.status || 'unknown';
    total.days += 1;
    total[status] = (total[status] || 0) + 1;
    return total;
  }, {
    days: 0,
    present: 0,
    absent: 0,
    leave: 0,
    late: 0,
    half_day: 0,
    early_out: 0,
    holiday: 0,
    weekly_holiday: 0,
  }), [displayRows]);

  const cards = [
    { label: 'Total Days', value: summary.days || 0 },
    { label: 'Present', value: summary.present || 0 },
    { label: 'Absent', value: summary.absent || 0 },
    { label: 'Leave', value: summary.leave || 0 },
    { label: 'Late', value: summary.late || 0 },
    { label: 'Early Out', value: summary.early_out || 0 },
    { label: 'Half Day', value: summary.half_day || 0 },
    { label: 'Holiday', value: (summary.holiday || 0) + (summary.weekly_holiday || 0) },
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
    { key: 'employee_name', header: 'Employee', render: (row: any) => row.employee_name || filters.employee_name || '-' },
    { key: 'branch_name', header: 'Branch', render: (row: any) => row.branch_name || branchNameFromId(branches, row.branch_id) },
    { key: 'shift_name', header: 'Shift', render: (row: any) => row.shift_name || '-' },
    { key: 'in_time', header: 'In', render: (row: any) => timeOnly(row.in_time) },
    { key: 'out_time', header: 'Out', render: (row: any) => timeOnly(row.out_time) },
    { key: 'work_minutes', header: 'Minutes', render: (row: any) => row.work_minutes || '-' },
    { key: 'status', header: 'Status', render: (row: any) => normalizeStatus(row.status) },
    { key: 'approval_status', header: 'Approval', render: (row: any) => normalizeStatus(row.approval_status) },
    { key: 'remarks', header: 'Remarks', render: (row: any) => row.remarks || '-' },
  ];

  return (
    <div>
      <HelmetTitle title="Employee Attendance Report" />
      {attendance.loading && <Loader />}

      <div className="mb-3 border border-slate-200 bg-[rgb(var(--c-surface))] p-3 dark:border-slate-700">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Employee</label>
          <EmployeeDropdownSearch
            id="employee_attendance_employee_id"
            name="employee_id"
            placeholder="Search Employee"
            value={filters.employee_id ? { value: filters.employee_id, label: filters.employee_name || `Employee #${filters.employee_id}` } : null}
            onSelect={(option: any) =>
              setFilters((prev: any) => ({
                ...prev,
                employee_id: option?.value || '',
                employee_name: option?.label || '',
              }))
            }
          />
        </div>
        <InputDatePicker
          id="date_from"
          name="date_from"
          label="From"
          selectedDate={dateFromString(filters.date_from)}
          setSelectedDate={(date) => setFilters((prev: any) => ({ ...prev, date_from: dateToString(date) }))}
          setCurrentDate={(date) => setFilters((prev: any) => ({ ...prev, date_from: dateToString(date) }))}
          className="w-full"
        />
        <InputDatePicker
          id="date_to"
          name="date_to"
          label="To"
          selectedDate={dateFromString(filters.date_to)}
          setSelectedDate={(date) => setFilters((prev: any) => ({ ...prev, date_to: dateToString(date) }))}
          setCurrentDate={(date) => setFilters((prev: any) => ({ ...prev, date_to: dateToString(date) }))}
          className="w-full"
        />
        <div>
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Branch</label>
          <BranchDropdown
 name="branch_id"
 defaultValue={userBranchId}
 branchDdl={branches}
 value={filters.branch_id?.toString() ?? ''}
 onChange={handleChange(setFilters)}
 className="w-full font-medium text-sm p-1.5"
          />
        </div>
        <DropdownCommon id="status" name="status" label="Status" value={filters.status} data={statusOptions} onChange={handleChange(setFilters)} className="" />
        <div className="flex items-end">
          <Button type="button" onClick={() => loadReport()} className={`inline-flex items-center justify-center ${commandButtonClass}`}>
            <FiRefreshCcw className="mr-2" />
            Load
          </Button>
        </div>
      </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        {cards.map((card) => {
          const tone = cardTone(card.label);
          return (
            <div key={card.label} className="relative overflow-hidden border border-slate-200 bg-[rgb(var(--c-surface))] p-3 pl-4 dark:border-slate-700">
              <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-300">
                <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                {card.label}
              </div>
              <div className={`mt-1 text-xl font-bold ${tone.value}`}>{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className="border border-slate-200 bg-[rgb(var(--c-surface))] dark:border-slate-700">
        <Table columns={columns} data={displayRows} />
      </div>
    </div>
  );
};

export default EmployeeAttendanceReport;
