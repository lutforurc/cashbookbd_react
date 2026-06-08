import React, { useEffect, useState } from 'react';
import { FiCheck, FiRefreshCcw, FiSave, FiX } from 'react-icons/fi';
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
  approveLeaveApplication,
  fetchLeaveApplications,
  fetchLeaveTypes,
  saveLeaveApplication,
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

const initialForm = {
  employee_id: '',
  employee_name: '',
  branch_id: '',
  leave_type_id: '',
  from_date: today,
  to_date: today,
  reason: '',
};

const LeaveApplications = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const leaveTypes = Array.isArray(attendance.leaveTypes) ? attendance.leaveTypes : [];
  const leaveApplications = Array.isArray(attendance.leaveApplications) ? attendance.leaveApplications : [];
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const [form, setForm] = useState<any>({ ...initialForm, branch_id: userBranchId });
  const [filters, setFilters] = useState<any>({ date_from: today, date_to: today, branch_id: userBranchId });
  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchLeaveTypes());
    dispatch(fetchLeaveApplications({ date_from: today, date_to: today, branch_id: userBranchId }));
  }, [dispatch, userBranchId]);

  const handleChange = (setter: any) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setter((prev: any) => ({ ...prev, [name]: value }));
  };

  const payload = (data: any) =>
    Object.fromEntries(
      Object.entries(data)
        .filter(([key]) => key !== 'employee_name')
        .map(([key, value]) => [key, value === '' ? null : value]),
    );

  const loadApplications = (params = filters) => {
    dispatch(fetchLeaveApplications(params));
  };

  const reset = () => setForm({ ...initialForm, branch_id: userBranchId });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.leave_type_id) {
      toast.error('Please select employee and leave type');
      return;
    }
    if (form.from_date && form.to_date && form.from_date > form.to_date) {
      toast.error('To date must be after from date');
      return;
    }
    setButtonLoading(true);
    try {
      const response = await dispatch(saveLeaveApplication(payload(form))).unwrap();
      toast.success(response?.message || 'Leave application saved successfully');
      reset();
      loadApplications();
    } catch (error: any) {
      toast.error(error || 'Failed to save leave application');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleApproval = async (row: any, approval_status: 'approved' | 'rejected') => {
    try {
      const response = await dispatch(
        approveLeaveApplication({
          id: row.id,
          approval_status,
          remarks: approval_status === 'approved' ? 'Approved from leave list' : 'Rejected from leave list',
        }),
      ).unwrap();
      toast.success(response?.message || 'Leave approval updated');
      loadApplications();
    } catch (error: any) {
      toast.error(error || 'Approval failed');
    }
  };

  const columns = [
    { key: 'from_date', header: 'From' },
    { key: 'to_date', header: 'To' },
    { key: 'employee_name', header: 'Employee' },
    { key: 'leave_type_name', header: 'Leave Type' },
    { key: 'requested_days', header: 'Days' },
    { key: 'approved_paid_days', header: 'Paid' },
    { key: 'approved_unpaid_days', header: 'Unpaid' },
    { key: 'approval_status', header: 'Approval' },
    { key: 'reason', header: 'Reason' },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <div className="flex items-center gap-2">
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
      <HelmetTitle title="Leave Applications" />
      {attendance.loading && <Loader />}

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <div>
            <label className="text-black dark:text-white">Employee</label>
            <EmployeeDropdownSearch
              id="leave_employee_id"
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
          <DropdownCommon id="leave_type_id" name="leave_type_id" label="Leave Type" value={form.leave_type_id?.toString()} data={[{ id: '', name: 'Select Leave Type' }, ...leaveTypes]} onChange={handleChange(setForm)} className="h-9" />
          <InputDatePicker
            id="from_date"
            name="from_date"
            label="From Date"
            selectedDate={dateFromString(form.from_date)}
            setSelectedDate={(date) => setForm((prev: any) => ({ ...prev, from_date: dateToString(date) }))}
            setCurrentDate={(date) => setForm((prev: any) => ({ ...prev, from_date: dateToString(date) }))}
            className="h-9 w-full"
          />
          <InputDatePicker
            id="to_date"
            name="to_date"
            label="To Date"
            selectedDate={dateFromString(form.to_date)}
            setSelectedDate={(date) => setForm((prev: any) => ({ ...prev, to_date: dateToString(date) }))}
            setCurrentDate={(date) => setForm((prev: any) => ({ ...prev, to_date: dateToString(date) }))}
            className="h-9 w-full"
          />
          <InputElement name="reason" label="Reason" value={form.reason || ''} onChange={handleChange(setForm)} />
        </div>
        <div className="mt-3 flex gap-2">
          <ButtonLoading type="submit" buttonLoading={buttonLoading} label="Apply" className={commandButtonClass} icon={<FiSave className="mr-2" />} />
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
          <button type="button" onClick={() => loadApplications()} className={commandButtonClass}>
            Load
          </button>
        </div>
      </div>

      <Table columns={columns} data={leaveApplications} />
    </div>
  );
};

export default LeaveApplications;
