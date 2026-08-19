import React, { useState } from 'react';
import { FiCalendar, FiCheck, FiClock, FiEdit2, FiRefreshCcw, FiSave, FiShield, FiUserCheck } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import Loader from '../../../../common/Loader';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import EmployeeDropdownSearch from '../../../utils/utils-functions/EmployeeDropdownSearch';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import InputTimePicker from '../../../utils/fields/InputTimePicker';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import {
  fetchAttendanceShifts,
  fetchAttendancePolicies,
  fetchShiftRosters,
  fetchHolidays,
  fetchLeaveTypes,
  fetchWeeklyHolidays,
  saveAttendancePolicy,
  saveAttendanceShift,
  saveShiftRoster,
  saveHoliday,
  saveLeaveType,
  saveWeeklyHoliday,
} from './attendanceSlice';
import { chartDate, formatDateUsdToBd } from '../../../utils/utils-functions/formatDate';

const tabs = [
  { key: 'shift', label: 'Shift', icon: FiClock },
  { key: 'policy', label: 'Policy', icon: FiShield },
  { key: 'roster', label: 'Roster', icon: FiUserCheck },
  { key: 'weekly', label: 'Weekly Holiday', icon: FiCheck },
  { key: 'holiday', label: 'Holiday', icon: FiCalendar },
  { key: 'leave', label: 'Leave Type', icon: FiCalendar },
];

const dayOptions = [
  { id: '', name: 'Select Day' },
  { id: 0, name: 'Sunday' },
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

const holidayTypes = [
  { id: 'government', name: 'Government' },
  { id: 'festival', name: 'Festival' },
  { id: 'company', name: 'Company' },
  { id: 'optional', name: 'Optional' },
  { id: 'project', name: 'Project' },
  { id: 'weekly', name: 'Weekly' },
  { id: 'other', name: 'Other' },
];

const yesNo = [
  { id: 1, name: 'Yes' },
  { id: 0, name: 'No' },
];

const employmentTypes = [
  { id: 'monthly', name: 'Monthly Employee' },
  { id: 'daily', name: 'Daily Labour' },
  { id: 'shifting', name: 'Shift Based Employee' },
];

const rosterStatuses = [
  { id: 'scheduled', name: 'Scheduled' },
  { id: 'completed', name: 'Completed' },
  { id: 'cancelled', name: 'Cancelled' },
];

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

const initialShift = {
  id: '',
  name: '',
  code: '',
  branch_id: '',
  start_time: '09:00',
  end_time: '17:00',
  grace_minutes: '15',
  half_day_minutes: '240',
  minimum_work_minutes: '240',
  early_out_minutes: '60',
  late_deduction_after_count: '3',
  early_out_deduction_after_count: '3',
  is_night_shift: '0',
  status: '1',
};

const initialWeekly = {
  id: '',
  branch_id: '',
  branch_type_id: '',
  day_of_week: '',
  is_enabled: '1',
  effective_from: '',
  effective_to: '',
  remarks: '',
};

const initialPolicy = {
  id: '',
  name: '',
  employment_type: 'monthly',
  branch_id: '',
  default_shift_id: '',
  standard_work_minutes: '480',
  minimum_work_minutes: '240',
  half_day_minutes: '240',
  grace_minutes: '15',
  early_out_minutes: '60',
  overtime_enabled: '0',
  overtime_after_minutes: '480',
  late_deduction_after_count: '3',
  early_out_deduction_after_count: '3',
  status: '1',
};

const initialRoster = {
  id: '',
  employee_id: '',
  employee_name: '',
  branch_id: '',
  shift_id: '',
  duty_date: '',
  status: 'scheduled',
  remarks: '',
};

const initialHoliday = {
  id: '',
  branch_id: '',
  branch_type_id: '',
  holiday_date: '',
  holiday_name: '',
  holiday_type: 'company',
  is_paid: '1',
  is_optional: '0',
  remarks: '',
  status: '1',
};

const initialLeaveType = {
  id: '',
  name: '',
  code: '',
  yearly_quota: '0',
  is_paid: '1',
  allow_half_day: '1',
  allow_backdated: '1',
  requires_attachment: '0',
  sort_order: '0',
  status: '1',
};

const AttendanceSetup = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);

  const [activeTab, setActiveTab] = useState('shift');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [shiftForm, setShiftForm] = useState<any>(initialShift);
  const [policyForm, setPolicyForm] = useState<any>(initialPolicy);
  const [rosterForm, setRosterForm] = useState<any>(initialRoster);
  const [weeklyForm, setWeeklyForm] = useState<any>(initialWeekly);
  const [holidayForm, setHolidayForm] = useState<any>(initialHoliday);
  const [leaveTypeForm, setLeaveTypeForm] = useState<any>(initialLeaveType);

  const branches = branchDdlData?.protectedData?.data || [];
  const branchDropdownData = [{ id: '', name: 'All Branch' }, ...branches];
  const shifts = Array.isArray(attendance.shifts) ? attendance.shifts : [];
  const policies = Array.isArray(attendance.policies) ? attendance.policies : [];
  const rosters = Array.isArray(attendance.rosters) ? attendance.rosters : [];
  const weeklyHolidays = Array.isArray(attendance.weeklyHolidays) ? attendance.weeklyHolidays : [];
  const holidays = Array.isArray(attendance.holidays) ? attendance.holidays : [];
  const leaveTypes = Array.isArray(attendance.leaveTypes) ? attendance.leaveTypes : [];

  const fetchTabData = (tabKey: string) => {
    if (tabKey === 'shift') {
      dispatch(fetchAttendanceShifts());
      return;
    }

    if (tabKey === 'weekly') {
      dispatch(fetchWeeklyHolidays(weeklyForm.branch_id ? { branch_id: weeklyForm.branch_id } : {}));
      return;
    }

    if (tabKey === 'policy') {
      dispatch(fetchAttendanceShifts());
      dispatch(fetchAttendancePolicies());
      return;
    }

    if (tabKey === 'roster') {
      dispatch(fetchAttendanceShifts());
      dispatch(fetchShiftRosters(rosterForm.duty_date ? { duty_date: rosterForm.duty_date } : {}));
      return;
    }

    if (tabKey === 'holiday') {
      dispatch(fetchHolidays(holidayForm.branch_id ? { branch_id: holidayForm.branch_id } : {}));
      return;
    }

    if (tabKey === 'leave') {
      dispatch(fetchLeaveTypes());
    }
  };

  const handleChange = (setter: any) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setter((prev: any) => ({ ...prev, [name]: value }));
  };

  const payload = (form: any) =>
    Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value === '' ? null : value]),
    );

  const refresh = () => fetchTabData(activeTab);

  const saveAndRefresh = async (action: any, data: any, reset: () => void, success: string) => {
    setButtonLoading(true);
    try {
      const response = await dispatch(action(payload(data))).unwrap();
      toast.success(response?.message || success);
      reset();
      refresh();
    } catch (error: any) {
      toast.error(error || 'Failed to save');
    } finally {
      setButtonLoading(false);
    }
  };

  const branchField = (name: string, value: any, onChange: any) => (
    <div>
      <label className="text-black dark:text-white">Branch</label>
      <BranchDropdown
        defaultValue={value?.toString()}
        onChange={(e: any) => {
          const branchValue = e.target.value;
          const nextValue = branchValue === '' ? '' : Number(branchValue);
          onChange({
            target: {
              name,
              value: nextValue,
            },
          });

          if (activeTab === 'weekly') {
            dispatch(fetchWeeklyHolidays(nextValue ? { branch_id: nextValue } : {}));
          }

          if (activeTab === 'holiday') {
            dispatch(fetchHolidays(nextValue ? { branch_id: nextValue } : {}));
          }
        }}
        className="h-9 w-full font-medium text-sm p-1.5"
        branchDdl={branchDropdownData}
      />
    </div>
  );

  const renderActions = (isEdit: boolean, reset: () => void) => (
    <div className="flex gap-2">
      <ButtonLoading
        type="submit"
        buttonLoading={buttonLoading}
        label={isEdit ? 'Update' : 'Save'}
        className={`${commandButtonClass} whitespace-nowrap`}
        icon={<FiSave className="mr-2" />}
      />
      <Button
        type="button"
        onClick={reset}
        className={`inline-flex items-center justify-center ${commandButtonClass}`}
      >
        <FiRefreshCcw className="mr-2" />
        Reset
      </Button>
    </div>
  );

  const shiftColumns = [
    { key: 'name', header: 'Shift' },
    { key: 'start_time', header: 'Start' },
    { key: 'end_time', header: 'End' },
    { key: 'grace_minutes', header: 'Grace' },
    { key: 'half_day_minutes', header: 'Half Day' },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <Button type="button" onClick={() => setShiftForm({ ...initialShift, ...row })} className={iconButtonClass}>
          <FiEdit2 />
        </Button>
      ),
    },
  ];

  const policyColumns = [
    { key: 'name', header: 'Policy' },
    { key: 'employment_type', header: 'Type', render: (row: any) => employmentTypes.find((item) => item.id === row.employment_type)?.name || row.employment_type || '-' },
    { key: 'default_shift_id', header: 'Default Shift', render: (row: any) => shifts.find((shift: any) => String(shift.id) === String(row.default_shift_id || row.shift_id))?.name || '-' },
    { key: 'standard_work_minutes', header: 'Standard Min' },
    { key: 'overtime_enabled', header: 'OT', render: (row: any) => (Number(row.overtime_enabled) ? 'Yes' : 'No') },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <Button type="button" onClick={() => setPolicyForm({ ...initialPolicy, ...row, default_shift_id: row.default_shift_id || row.shift_id || '' })} className={iconButtonClass}>
          <FiEdit2 />
        </Button>
      ),
    },
  ];

  const rosterColumns = [
    { key: 'duty_date', header: 'Duty Date', render: (row: any) => chartDate(row.duty_date) },
    { key: 'employee_name', header: 'Employee', render: (row: any) => row.employee_name || row.employee?.name || '-' },
    { key: 'branch_id', header: 'Branch', render: (row: any) => branches.find((b: any) => String(b.id) === String(row.branch_id))?.name || '-' },
    { key: 'shift_id', header: 'Shift', render: (row: any) => row.shift_name || shifts.find((shift: any) => String(shift.id) === String(row.shift_id))?.name || '-' },
    { key: 'status', header: 'Status' },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <Button
          type="button"
          onClick={() => setRosterForm({
            ...initialRoster,
            ...row,
            employee_name: row.employee_name || row.employee?.name || '',
            duty_date: String(row.duty_date || '').slice(0, 10),
          })}
          className={iconButtonClass}
        >
          <FiEdit2 />
        </Button>
      ),
    },
  ];

  const weeklyColumns = [
    { key: 'day_of_week', header: 'Day', render: (row: any) => dayOptions.find((d) => String(d.id) === String(row.day_of_week))?.name || '-' },
    { key: 'branch_id', header: 'Branch', render: (row: any) => branches.find((b: any) => String(b.id) === String(row.branch_id))?.name || 'All Branches' },
    { key: 'is_enabled', header: 'Enabled', render: (row: any) => (Number(row.is_enabled) ? 'Yes' : 'No') },
    { key: 'remarks', header: 'Remarks' },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <Button type="button" onClick={() => setWeeklyForm({ ...initialWeekly, ...row })} className={iconButtonClass}>
          <FiEdit2 />
        </Button>
      ),
    },
  ];

  const holidayColumns = [
    { key: 'holiday_date', header: 'Date', 
      render: (row: any) => {
        const date = chartDate(row.holiday_date); 
        return date;
      }
     },
    { key: 'holiday_name', header: 'Holiday' },
    { key: 'holiday_type', header: 'Type' },
    { key: 'branch_id', header: 'Branch', render: (row: any) => branches.find((b: any) => String(b.id) === String(row.branch_id))?.name || 'All Branches' },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <Button type="button" onClick={() => setHolidayForm({ ...initialHoliday, ...row })} className={iconButtonClass}>
          <FiEdit2 />
        </Button>
      ),
    },
  ];

  const leaveColumns = [
    { key: 'name', header: 'Leave Type' },
    { key: 'code', header: 'Code' },
    { key: 'yearly_quota', header: 'Quota' },
    { key: 'is_paid', header: 'Paid', render: (row: any) => (Number(row.is_paid) ? 'Yes' : 'No') },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <Button type="button" onClick={() => setLeaveTypeForm({ ...initialLeaveType, ...row })} className={iconButtonClass}>
          <FiEdit2 />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Attendance Setup" />
      {attendance.loading && <Loader />}

      <div className="flex flex-col md:flex-row md:gap-4">
        <div className="flex flex-row flex-wrap gap-1 self-start rounded border border-slate-200 bg-slate-50 p-2 shadow-sm md:w-56 md:shrink-0 md:flex-col md:flex-nowrap dark:border-slate-700 dark:bg-boxdark">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <Button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  fetchTabData(tab.key);
                }}
                className={`inline-flex h-11 items-center gap-2 rounded px-4 text-sm font-medium transition md:w-full md:justify-start ${
                  active
                    ? 'bg-blue-50 text-blue-600 dark:bg-slate-700/60 dark:text-blue-400'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-700/40 dark:hover:text-blue-400'
                }`}
              >
                <Icon className="text-base" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        <div className="flex-1 rounded border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-boxdark">

      {activeTab === 'shift' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveAndRefresh(saveAttendanceShift, shiftForm, () => setShiftForm(initialShift), 'Shift saved successfully');
          }}
        >
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputElement name="name" label="Shift Name" value={shiftForm.name} onChange={handleChange(setShiftForm)} />
            <InputElement name="code" label="Code" value={shiftForm.code} onChange={handleChange(setShiftForm)} />
            <InputTimePicker name="start_time" label="Start Time" value={shiftForm.start_time} onChange={handleChange(setShiftForm)} />
            <InputTimePicker name="end_time" label="End Time" value={shiftForm.end_time} onChange={handleChange(setShiftForm)} />
            <InputElement name="grace_minutes" label="Grace Minutes" type="number" value={shiftForm.grace_minutes} onChange={handleChange(setShiftForm)} />
            <InputElement name="half_day_minutes" label="Half Day Minutes" type="number" value={shiftForm.half_day_minutes} onChange={handleChange(setShiftForm)} />
            <InputElement name="early_out_minutes" label="Early Out Minutes" type="number" value={shiftForm.early_out_minutes} onChange={handleChange(setShiftForm)} />
            <DropdownCommon id="is_night_shift" name="is_night_shift" label="Night Shift" value={shiftForm.is_night_shift?.toString()} data={yesNo} onChange={handleChange(setShiftForm)} className="" />
          </div>
          {renderActions(Boolean(shiftForm.id), () => setShiftForm(initialShift))}
        </form>
      )}

      {activeTab === 'policy' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveAndRefresh(saveAttendancePolicy, policyForm, () => setPolicyForm(initialPolicy), 'Attendance policy saved successfully');
          }}
        >
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputElement name="name" label="Policy Name" value={policyForm.name} onChange={handleChange(setPolicyForm)} />
            <DropdownCommon id="employment_type" name="employment_type" label="Employee Type" value={policyForm.employment_type} data={employmentTypes} onChange={handleChange(setPolicyForm)} className="" />
            {branchField('branch_id', policyForm.branch_id, handleChange(setPolicyForm))}
            <DropdownCommon id="default_shift_id" name="default_shift_id" label="Default Shift" value={policyForm.default_shift_id?.toString()} data={[{ id: '', name: 'Select Shift' }, ...shifts]} onChange={handleChange(setPolicyForm)} className="" />
            <InputElement name="standard_work_minutes" label="Standard Work Minutes" type="number" value={policyForm.standard_work_minutes} onChange={handleChange(setPolicyForm)} />
            <InputElement name="minimum_work_minutes" label="Minimum Work Minutes" type="number" value={policyForm.minimum_work_minutes} onChange={handleChange(setPolicyForm)} />
            <InputElement name="half_day_minutes" label="Half Day Minutes" type="number" value={policyForm.half_day_minutes} onChange={handleChange(setPolicyForm)} />
            <InputElement name="grace_minutes" label="Grace Minutes" type="number" value={policyForm.grace_minutes} onChange={handleChange(setPolicyForm)} />
            <InputElement name="early_out_minutes" label="Early Out Minutes" type="number" value={policyForm.early_out_minutes} onChange={handleChange(setPolicyForm)} />
            <DropdownCommon id="overtime_enabled" name="overtime_enabled" label="Overtime" value={policyForm.overtime_enabled?.toString()} data={yesNo} onChange={handleChange(setPolicyForm)} className="" />
            <InputElement name="overtime_after_minutes" label="OT After Minutes" type="number" value={policyForm.overtime_after_minutes} onChange={handleChange(setPolicyForm)} />
            <InputElement name="late_deduction_after_count" label="Late Deduction Count" type="number" value={policyForm.late_deduction_after_count} onChange={handleChange(setPolicyForm)} />
            <InputElement name="early_out_deduction_after_count" label="Early Out Deduction Count" type="number" value={policyForm.early_out_deduction_after_count} onChange={handleChange(setPolicyForm)} />
            <DropdownCommon id="status" name="status" label="Status" value={policyForm.status?.toString()} data={yesNo} onChange={handleChange(setPolicyForm)} className="" />
          </div>
          {renderActions(Boolean(policyForm.id), () => setPolicyForm(initialPolicy))}
        </form>
      )}

      {activeTab === 'roster' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveAndRefresh(saveShiftRoster, rosterForm, () => setRosterForm(initialRoster), 'Shift roster saved successfully');
          }}
        >
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
            <div>
              <label className="text-black dark:text-white">Employee</label>
              <EmployeeDropdownSearch
                id="roster_employee_id"
                name="employee_id"
                placeholder="Search Employee"
                value={rosterForm.employee_id ? { value: rosterForm.employee_id, label: rosterForm.employee_name || `Employee #${rosterForm.employee_id}` } : null}
                onSelect={(option: any) =>
                  setRosterForm((prev: any) => ({
                    ...prev,
                    employee_id: option?.value || '',
                    employee_name: option?.label || '',
                  }))
                }
              />
            </div>
            {branchField('branch_id', rosterForm.branch_id, handleChange(setRosterForm))}
            <DropdownCommon id="shift_id" name="shift_id" label="Shift" value={rosterForm.shift_id?.toString()} data={[{ id: '', name: 'Select Shift' }, ...shifts]} onChange={handleChange(setRosterForm)} className="" />
            <InputDatePicker
              id="duty_date"
              name="duty_date"
              label="Duty Date"
              selectedDate={dateFromString(rosterForm.duty_date)}
              setSelectedDate={(date) => setRosterForm((prev: any) => ({ ...prev, duty_date: dateToString(date) }))}
              setCurrentDate={(date) => setRosterForm((prev: any) => ({ ...prev, duty_date: dateToString(date) }))}
              className="h-9 w-full"
            />
            <DropdownCommon id="roster_status" name="status" label="Status" value={rosterForm.status} data={rosterStatuses} onChange={handleChange(setRosterForm)} className="" />
            <InputElement name="remarks" label="Remarks" value={rosterForm.remarks || ''} onChange={handleChange(setRosterForm)} />
          </div>
          {renderActions(Boolean(rosterForm.id), () => setRosterForm(initialRoster))}
          <div className="mt-3 flex justify-end">
            <Button type="button" onClick={() => dispatch(fetchShiftRosters(rosterForm.duty_date ? { duty_date: rosterForm.duty_date } : {}))} className={commandButtonClass}>
              Load Roster
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'weekly' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveAndRefresh(saveWeeklyHoliday, weeklyForm, () => setWeeklyForm(initialWeekly), 'Weekly holiday saved successfully');
          }}
        >
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
            {branchField('branch_id', weeklyForm.branch_id, handleChange(setWeeklyForm))}
            <InputElement name="branch_type_id" label="Branch Type ID" value={weeklyForm.branch_type_id} onChange={handleChange(setWeeklyForm)} />
            <DropdownCommon id="day_of_week" name="day_of_week" label="Day" value={weeklyForm.day_of_week?.toString()} data={dayOptions} onChange={handleChange(setWeeklyForm)} className="" />
            <DropdownCommon id="is_enabled" name="is_enabled" label="Enabled" value={weeklyForm.is_enabled?.toString()} data={yesNo} onChange={handleChange(setWeeklyForm)} className="" />
            <InputDatePicker
              id="effective_from"
              name="effective_from"
              label="Effective From"
              selectedDate={dateFromString(weeklyForm.effective_from)}
              setSelectedDate={(date) => setWeeklyForm((prev: any) => ({ ...prev, effective_from: dateToString(date) }))}
              setCurrentDate={(date) => setWeeklyForm((prev: any) => ({ ...prev, effective_from: dateToString(date) }))}
              className="h-9 w-full"
            />
            <InputDatePicker
              id="effective_to"
              name="effective_to"
              label="Effective To"
              selectedDate={dateFromString(weeklyForm.effective_to)}
              setSelectedDate={(date) => setWeeklyForm((prev: any) => ({ ...prev, effective_to: dateToString(date) }))}
              setCurrentDate={(date) => setWeeklyForm((prev: any) => ({ ...prev, effective_to: dateToString(date) }))}
              className="h-9 w-full"
            />
            <InputElement name="remarks" label="Remarks" value={weeklyForm.remarks || ''} onChange={handleChange(setWeeklyForm)} />
          </div>
          {renderActions(Boolean(weeklyForm.id), () => setWeeklyForm(initialWeekly))}
        </form>
      )}

      {activeTab === 'holiday' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveAndRefresh(saveHoliday, holidayForm, () => setHolidayForm(initialHoliday), 'Holiday saved successfully');
          }}
        >
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
            {branchField('branch_id', holidayForm.branch_id, handleChange(setHolidayForm))}
            <InputElement name="branch_type_id" label="Branch Type ID" value={holidayForm.branch_type_id} onChange={handleChange(setHolidayForm)} />
            <InputDatePicker
              id="holiday_date"
              name="holiday_date"
              label="Holiday Date"
              selectedDate={dateFromString(holidayForm.holiday_date)}
              setSelectedDate={(date) => setHolidayForm((prev: any) => ({ ...prev, holiday_date: dateToString(date) }))}
              setCurrentDate={(date) => setHolidayForm((prev: any) => ({ ...prev, holiday_date: dateToString(date) }))}
              className="h-9 w-full"
            />
            <InputElement name="holiday_name" label="Holiday Name" value={holidayForm.holiday_name} onChange={handleChange(setHolidayForm)} />
            <DropdownCommon id="holiday_type" name="holiday_type" label="Holiday Type" value={holidayForm.holiday_type} data={holidayTypes} onChange={handleChange(setHolidayForm)} className="" />
            <DropdownCommon id="is_paid" name="is_paid" label="Paid" value={holidayForm.is_paid?.toString()} data={yesNo} onChange={handleChange(setHolidayForm)} className="" />
            <DropdownCommon id="is_optional" name="is_optional" label="Optional" value={holidayForm.is_optional?.toString()} data={yesNo} onChange={handleChange(setHolidayForm)} className="" />
            <InputElement name="remarks" label="Remarks" value={holidayForm.remarks || ''} onChange={handleChange(setHolidayForm)} />
          </div>
          {renderActions(Boolean(holidayForm.id), () => setHolidayForm(initialHoliday))}
        </form>
      )}

      {activeTab === 'leave' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveAndRefresh(saveLeaveType, leaveTypeForm, () => setLeaveTypeForm(initialLeaveType), 'Leave type saved successfully');
          }}
        >
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputElement name="name" label="Leave Type" value={leaveTypeForm.name} onChange={handleChange(setLeaveTypeForm)} />
            <InputElement name="code" label="Code" value={leaveTypeForm.code} onChange={handleChange(setLeaveTypeForm)} />
            <InputElement name="yearly_quota" label="Yearly Quota" type="number" value={leaveTypeForm.yearly_quota} onChange={handleChange(setLeaveTypeForm)} />
            <InputElement name="sort_order" label="Sort Order" type="number" value={leaveTypeForm.sort_order} onChange={handleChange(setLeaveTypeForm)} />
            <DropdownCommon id="is_paid" name="is_paid" label="Paid" value={leaveTypeForm.is_paid?.toString()} data={yesNo} onChange={handleChange(setLeaveTypeForm)} className="" />
            <DropdownCommon id="allow_half_day" name="allow_half_day" label="Allow Half Day" value={leaveTypeForm.allow_half_day?.toString()} data={yesNo} onChange={handleChange(setLeaveTypeForm)} className="" />
            <DropdownCommon id="allow_backdated" name="allow_backdated" label="Allow Backdated" value={leaveTypeForm.allow_backdated?.toString()} data={yesNo} onChange={handleChange(setLeaveTypeForm)} className="" />
            <DropdownCommon id="requires_attachment" name="requires_attachment" label="Attachment" value={leaveTypeForm.requires_attachment?.toString()} data={yesNo} onChange={handleChange(setLeaveTypeForm)} className="" />
          </div>
          {renderActions(Boolean(leaveTypeForm.id), () => setLeaveTypeForm(initialLeaveType))}
        </form>
      )}
        </div>
      </div>

      <div className="mt-4 border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-boxdark">
        {activeTab === 'shift' && <Table columns={shiftColumns} data={shifts} />}
        {activeTab === 'policy' && <Table columns={policyColumns} data={policies} />}
        {activeTab === 'roster' && <Table columns={rosterColumns} data={rosters} />}
        {activeTab === 'weekly' && <Table columns={weeklyColumns} data={weeklyHolidays} />}
        {activeTab === 'holiday' && <Table columns={holidayColumns} data={holidays} />}
        {activeTab === 'leave' && <Table columns={leaveColumns} data={leaveTypes} />}
      </div>
    </div>
  );
};

export default AttendanceSetup;
