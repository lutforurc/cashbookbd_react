import React, { useEffect, useState } from 'react';
import { FiRefreshCcw } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';

import Loader from '../../../../common/Loader';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import InputDatePicker from '../../../utils/fields/DatePicker';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchAttendanceReport } from './attendanceSlice';

const today = new Date().toISOString().slice(0, 10);
const commandButtonClass = 'h-10 min-w-25 rounded-none bg-slate-700 px-5 text-sm font-medium text-white hover:bg-slate-600 focus:bg-slate-600';

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

const AttendanceReport = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const report = attendance.report || {};
  const summary = report.summary || {};
  const rows = Array.isArray(report.rows) ? report.rows : [];

  const [filters, setFilters] = useState<any>({
    date_from: today,
    date_to: today,
    branch_id: '',
    status: '',
    approval_status: '',
  });

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchAttendanceReport(filters));
  }, [dispatch]);

  const handleChange = (setter: any) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setter((prev: any) => ({ ...prev, [name]: value }));
  };

  const loadReport = () => {
    dispatch(fetchAttendanceReport(filters));
  };

  const cards = [
    { label: 'Active Employee', value: summary.active_employees || 0 },
    { label: 'Attendance Entry', value: summary.total_entries || 0 },
    { label: 'Missing', value: summary.missing_employees || 0 },
    { label: 'Present', value: summary.present || 0 },
    { label: 'Absent', value: summary.absent || 0 },
    { label: 'Half Day', value: summary.half_day || 0 },
    { label: 'Leave', value: summary.leave || 0 },
    { label: 'Late', value: summary.late || 0 },
    { label: 'Pending Approval', value: summary.pending_approval || 0 },
    { label: 'Approved', value: summary.approved || 0 },
    { label: 'Rejected', value: summary.rejected || 0 },
  ];

  const columns = [
    { key: 'attendance_date', header: 'Date' },
    { key: 'employee_serial', header: 'ID' },
    { key: 'employee_name', header: 'Employee' },
    { key: 'branch_name', header: 'Branch', render: (row: any) => row.branch_name || '-' },
    { key: 'shift_name', header: 'Shift', render: (row: any) => row.shift_name || '-' },
    { key: 'in_time', header: 'In', render: (row: any) => timeOnly(row.in_time) },
    { key: 'out_time', header: 'Out', render: (row: any) => timeOnly(row.out_time) },
    { key: 'work_minutes', header: 'Minutes' },
    { key: 'status', header: 'Status' },
    { key: 'approval_status', header: 'Approval' },
  ];

  return (
    <div>
      <HelmetTitle title="Attendance Report" />
      {attendance.loading && <Loader />}

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-6">
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
            branchDdl={[{ id: '', name: 'All Branches' }, ...branches]}
            value={filters.branch_id?.toString() ?? ''}
            onChange={handleChange(setFilters)}
            className="h-9 w-full font-medium text-sm p-1.5"
          />
        </div>
        <DropdownCommon id="status" name="status" label="Status" value={filters.status} data={statusOptions} onChange={handleChange(setFilters)} className="h-9" />
        <DropdownCommon id="approval_status" name="approval_status" label="Approval" value={filters.approval_status} data={approvalOptions} onChange={handleChange(setFilters)} className="h-9" />
        <div className="flex items-end">
          <button type="button" onClick={loadReport} className={`inline-flex items-center justify-center ${commandButtonClass}`}>
            <FiRefreshCcw className="mr-2" />
            Load
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-boxdark">
            <div className="text-xs text-slate-500 dark:text-slate-300">{card.label}</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <Table columns={columns} data={rows} />
    </div>
  );
};

export default AttendanceReport;
