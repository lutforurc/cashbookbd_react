import React, { useEffect, useState } from 'react';
import { FiCheck, FiEdit2, FiRefreshCcw, FiSave, FiUsers, FiX } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import EmployeeDropdownSearch from '../../../utils/utils-functions/EmployeeDropdownSearch';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import {
  approveAttendanceEntry,
  bulkSaveAttendanceEntries,
  fetchAttendanceEntries,
  fetchAttendanceShifts,
  saveAttendanceEntry,
} from './attendanceSlice';

const today = new Date().toISOString().slice(0, 10);

const commandButtonClass = 'h-10 min-w-25 rounded-none bg-slate-700 px-5 text-sm font-medium text-white hover:bg-slate-600 focus:bg-slate-600';
const iconButtonClass = 'inline-flex h-8 w-8 items-center justify-center rounded-none bg-slate-700 text-white hover:bg-slate-600';

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

const initialForm = {
  id: '',
  employee_id: '',
  employee_name: '',
  branch_id: '',
  shift_id: '',
  attendance_date: today,
  in_time: '',
  out_time: '',
  status: 'present',
  remarks: '',
};

const timeOnly = (value: any) => (value ? String(value).slice(11, 16) : '');

const AttendanceEntries = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const shifts = Array.isArray(attendance.shifts) ? attendance.shifts : [];
  const entries = Array.isArray(attendance.entries) ? attendance.entries : [];

  const [form, setForm] = useState<any>(initialForm);
  const [filters, setFilters] = useState<any>({ date_from: today, date_to: today, branch_id: '' });
  const [buttonLoading, setButtonLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchAttendanceShifts());
    dispatch(fetchAttendanceEntries(filters));
  }, [dispatch]);

  const handleChange = (setter: any) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setter((prev: any) => ({ ...prev, [name]: value }));
  };

  const normalizePayload = (data: any) =>
    Object.fromEntries(
      Object.entries(data)
        .filter(([key]) => key !== 'employee_name')
        .map(([key, value]) => [key, value === '' ? null : value]),
    );

  const loadEntries = (params = filters) => {
    dispatch(fetchAttendanceEntries(params));
  };

  const reset = () => setForm(initialForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id) {
      toast.error('Single entry করতে employee select করুন; সব employee হলে Bulk Entry ব্যবহার করুন');
      return;
    }
    setButtonLoading(true);
    try {
      const response = await dispatch(saveAttendanceEntry(normalizePayload(form))).unwrap();
      toast.success(response?.message || 'Attendance saved successfully');
      reset();
      loadEntries();
    } catch (error: any) {
      toast.error(error || 'Failed to save attendance');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!form.attendance_date) {
      toast.error('Please select attendance date');
      return;
    }

    setBulkLoading(true);
    try {
      const response = await dispatch(bulkSaveAttendanceEntries(normalizePayload({
        branch_id: form.branch_id,
        shift_id: form.shift_id,
        attendance_date: form.attendance_date,
        in_time: form.in_time,
        out_time: form.out_time,
        status: form.status,
        remarks: form.remarks,
      }))).unwrap();
      const result = response?.data?.data || response?.data || {};
      toast.success(response?.message || `Bulk attendance saved. Created: ${result.created || 0}, Skipped: ${result.skipped || 0}`);
      setFilters((prev: any) => ({
        ...prev,
        branch_id: form.branch_id || prev.branch_id,
        date_from: form.attendance_date,
        date_to: form.attendance_date,
      }));
      loadEntries({
        ...filters,
        branch_id: form.branch_id || filters.branch_id,
        date_from: form.attendance_date,
        date_to: form.attendance_date,
      });
    } catch (error: any) {
      toast.error(error || 'Bulk attendance failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleApproval = async (row: any, approval_status: 'approved' | 'rejected') => {
    try {
      const response = await dispatch(
        approveAttendanceEntry({
          id: row.id,
          approval_status,
          remarks: approval_status === 'approved' ? 'Approved from attendance list' : 'Rejected from attendance list',
        }),
      ).unwrap();
      toast.success(response?.message || 'Approval updated');
      loadEntries();
    } catch (error: any) {
      toast.error(error || 'Approval failed');
    }
  };

  const columns = [
    { key: 'attendance_date', header: 'Date' },
    { key: 'employee_name', header: 'Employee' },
    { key: 'shift_name', header: 'Shift', render: (row: any) => row.shift_name || '-' },
    { key: 'in_time', header: 'In', render: (row: any) => timeOnly(row.in_time) || '-' },
    { key: 'out_time', header: 'Out', render: (row: any) => timeOnly(row.out_time) || '-' },
    { key: 'status', header: 'Status' },
    { key: 'approval_status', header: 'Approval' },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Edit"
            onClick={() =>
              setForm({
                ...initialForm,
                ...row,
                employee_name: row.employee_name,
                in_time: timeOnly(row.in_time),
                out_time: timeOnly(row.out_time),
              })
            }
            className={iconButtonClass}
          >
            <FiEdit2 />
          </button>
          {row.approval_status !== 'approved' && (
            <button type="button" title="Approve" onClick={() => handleApproval(row, 'approved')} className={iconButtonClass}>
              <FiCheck />
            </button>
          )}
          {row.approval_status !== 'rejected' && (
            <button type="button" title="Reject" onClick={() => handleApproval(row, 'rejected')} className={iconButtonClass}>
              <FiX />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Manual Attendance" />
      {attendance.loading && <Loader />}

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <div>
            <label className="text-black dark:text-white">Employee</label>
            <EmployeeDropdownSearch
              id="employee_id"
              name="employee_id"
              placeholder="Search Employee"
              value={form.employee_id ? { value: form.employee_id, label: form.employee_name || `Employee #${form.employee_id}` } : null}
              onSelect={(option: any) =>
                setForm((prev: any) => ({
                  ...prev,
                  employee_id: option?.value || '',
                  employee_name: option?.label || '',
                }))
              }
            />
          </div>
          <div>
            <label className="text-black dark:text-white">Branch</label>
            <BranchDropdown
              name="branch_id"
              branchDdl={[{ id: '', name: 'Select Branch' }, ...branches]}
              value={form.branch_id?.toString() ?? ''}
              onChange={handleChange(setForm)}
              className="h-9 w-full font-medium text-sm p-1.5"
            />
          </div>
          <DropdownCommon id="shift_id" name="shift_id" label="Shift" value={form.shift_id?.toString()} data={[{ id: '', name: 'Select Shift' }, ...shifts]} onChange={handleChange(setForm)} className="h-9" />
          <InputDatePicker
            id="attendance_date"
            name="attendance_date"
            label="Date"
            selectedDate={dateFromString(form.attendance_date)}
            setSelectedDate={(date) => setForm((prev: any) => ({ ...prev, attendance_date: dateToString(date) }))}
            setCurrentDate={(date) => setForm((prev: any) => ({ ...prev, attendance_date: dateToString(date) }))}
            className="h-9 w-full"
          />
          <InputElement name="in_time" label="In Time" type="time" value={form.in_time || ''} onChange={handleChange(setForm)} />
          <InputElement name="out_time" label="Out Time" type="time" value={form.out_time || ''} onChange={handleChange(setForm)} />
          <DropdownCommon id="status" name="status" label="Status" value={form.status} data={statusOptions} onChange={handleChange(setForm)} className="h-9" />
          <InputElement name="remarks" label="Remarks" value={form.remarks || ''} onChange={handleChange(setForm)} />
        </div>
        <div className="mt-3 flex gap-2">
          <ButtonLoading type="submit" buttonLoading={buttonLoading} label={form.id ? 'Update Single' : 'Save Single'} className={commandButtonClass} icon={<FiSave className="mr-2" />} />
          <ButtonLoading
            type="button"
            onClick={handleBulkSubmit}
            buttonLoading={bulkLoading}
            label="Bulk Entry"
            className={commandButtonClass}
            icon={<FiUsers className="mr-2" />}
          />
          <button type="button" onClick={reset} className={`inline-flex items-center justify-center ${commandButtonClass}`}>
            <FiRefreshCcw className="mr-2" />
            Reset
          </button>
        </div>
      </form>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-5">
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
        <div className="flex items-end">
          <button type="button" onClick={() => loadEntries()} className={commandButtonClass}>
            Load
          </button>
        </div>
      </div>

      <Table columns={columns} data={entries} />
    </div>
  );
};

export default AttendanceEntries;
