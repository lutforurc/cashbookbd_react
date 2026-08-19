import React, { useEffect, useMemo, useState } from 'react';
import { FiRefreshCcw, FiSearch } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';

import Loader from '../../../../common/Loader';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import EmployeeDropdownSearch from '../../../utils/utils-functions/EmployeeDropdownSearch';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { chartDate } from '../../../utils/utils-functions/formatDate';
import { fetchAttendanceAuditHistory } from './attendanceSlice';
import { Button } from '../../../../pages/UiElements/CustomButtons';

const today = new Date().toISOString().slice(0, 10);
const commandButtonClass = 'min-w-25 rounded-none bg-slate-700 px-5 text-sm font-medium text-white hover:bg-slate-600 focus:bg-slate-600';

const actionOptions = [
  { id: '', name: 'All Actions' },
  { id: 'submitted', name: 'Submitted' },
  { id: 'corrected', name: 'Corrected' },
  { id: 'approved', name: 'Approved' },
  { id: 'rejected', name: 'Rejected' },
  { id: 'cancelled', name: 'Cleared/Cancelled' },
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

const normalizeLabel = (value?: string) =>
  String(value || '-')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const actionBadgeClass = (action?: string) => {
  const map: Record<string, string> = {
    submitted: 'bg-primary/10 text-primary',
    corrected: 'bg-warning/10 text-warning',
    approved: 'bg-success/10 text-success',
    rejected: 'bg-danger/10 text-danger',
    cancelled: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  };

  return map[String(action || '')] || 'bg-bodydark2/10 text-bodydark2';
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const AttendanceAuditHistory = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const auditHistory = attendance.auditHistory || {};
  const rows = Array.isArray(auditHistory?.data) ? auditHistory.data : [];
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const [employeeOption, setEmployeeOption] = useState<any>(null);
  const [filters, setFilters] = useState<any>({
    date_from: today,
    date_to: today,
    branch_id: userBranchId,
    employee_id: '',
    action: '',
    search: '',
    per_page: 100,
  });

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  const loadHistory = (currentFilters = filters) => {
    dispatch(fetchAttendanceAuditHistory(currentFilters));
  };

  useEffect(() => {
    const nextFilters = {
      ...filters,
      branch_id: filters.branch_id || userBranchId,
    };

    setFilters((prev: any) => ({
      ...prev,
      branch_id: prev.branch_id || userBranchId,
    }));
    loadHistory(nextFilters);
  }, [dispatch, userBranchId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev: any) => ({ ...prev, [name]: value }));
  };

  const summary = useMemo(() => {
    const counts = rows.reduce((acc: Record<string, number>, row: any) => {
      const action = String(row.action || 'unknown');
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {});

    return [
      { label: 'Total', value: auditHistory?.total || rows.length },
      { label: 'Approved', value: counts.approved || 0 },
      { label: 'Rejected', value: counts.rejected || 0 },
      { label: 'Cleared', value: counts.cancelled || 0 },
    ];
  }, [auditHistory?.total, rows]);

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (_row: any, index: number) => index + 1,
    },
    { key: 'attendance_entry_id', header: 'Entry ID', render: (row: any) => row.attendance_entry_id || '-' },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${actionBadgeClass(row.action)}`}>
          {normalizeLabel(row.action === 'cancelled' ? 'cleared' : row.action)}
        </span>
      ),
    },
    {
      key: 'employee_name',
      header: 'Employee',
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">{row.employee_name || '-'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.employee_serial || ''}</div>
        </div>
      ),
    },
    { key: 'branch_name', header: 'Branch/Project', render: (row: any) => row.branch_name || '-' },
    { key: 'attendance_date', header: 'Attendance Date', render: (row: any) => (row.attendance_date ? chartDate(row.attendance_date) : '-') },
    { key: 'attendance_status', header: 'Status', render: (row: any) => normalizeLabel(row.attendance_status || row.approval_status) },
    { key: 'action_by_name', header: 'Action By', render: (row: any) => row.action_by_name || row.action_by || '-' },
    { key: 'action_at', header: 'Action Time', render: (row: any) => formatDateTime(row.action_at) },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (row: any) => <span className="whitespace-normal wrap-break-word">{row.remarks || '-'}</span>,
    },
  ];

  return (
    <div>
      <HelmetTitle title="Attendance Audit History" />
      {attendance.loading && <Loader />}

      <div className="mb-3 border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-boxdark">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-6">
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
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch/Project</label>
            <BranchDropdown
 name="branch_id"
 defaultValue={userBranchId}
 branchDdl={[{ id: '', name: 'All Branches' }, ...branches]}
 value={filters.branch_id?.toString() ?? ''}
 onChange={handleChange}
 className="w-full font-medium text-sm p-2"
            />
          </div>
          <DropdownCommon id="action" name="action" label="Action" value={filters.action} data={actionOptions} onChange={handleChange} className="font-medium" />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Employee</label>
            <EmployeeDropdownSearch
              name="employee_id"
              value={employeeOption}
              placeholder="Search employee"
              searchParams={{ branch_id: filters.branch_id || undefined }}
              onSelect={(option: any) => {
                setEmployeeOption(option);
                setFilters((prev: any) => ({ ...prev, employee_id: option?.value || '' }));
              }}
              className=""
            />
          </div>
          <InputElement
 id="search"
 name="search"
 label="Search"
 value={filters.search}
 onChange={handleChange}
 placeholder="Entry, employee, remarks"
 className=""
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => loadHistory()} className={`inline-flex items-center justify-center ${commandButtonClass}`}>
            <FiRefreshCcw className="mr-2" />
            Load
          </Button>
          <Button
            type="button"
            onClick={() => {
              setEmployeeOption(null);
              const resetFilters = {
                date_from: today,
                date_to: today,
                branch_id: userBranchId,
                employee_id: '',
                action: '',
                search: '',
                per_page: 100,
              };
              setFilters(resetFilters);
              loadHistory(resetFilters);
            }}
            className="inline-flex items-center justify-center rounded-none bg-slate-500 px-5 text-sm font-medium text-white hover:bg-slate-600"
          >
            <FiSearch className="mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-boxdark">
            <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{item.label}</div>
            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-[rgb(var(--c-text))]">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="border border-slate-200 bg-white dark:border-slate-700 dark:bg-boxdark">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">Audit History</h3>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {auditHistory?.total || rows.length} records
          </span>
        </div>
        <Table columns={columns} data={rows} perPage={20} noDataMessage="No attendance audit history found" />
      </div>
    </div>
  );
};

export default AttendanceAuditHistory;
