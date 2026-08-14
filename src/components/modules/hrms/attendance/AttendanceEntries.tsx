import React, { useEffect, useState } from 'react';
import { FiCheck, FiEdit2, FiRefreshCcw, FiSave, FiSearch, FiTrash2, FiUsers, FiX } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import EmployeeDropdownSearch from '../../../utils/utils-functions/EmployeeDropdownSearch';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import {
  approveAttendanceEntry,
  bulkClearAttendanceEntries,
  bulkSaveAttendanceEntries,
  deleteAttendanceEntry,
  fetchAttendanceEntries,
  fetchShiftRosters,
  fetchAttendanceShifts,
  saveAttendanceEntry,
} from './attendanceSlice';
import { fetchEmployeeById } from '../employee/employeeSlice';
import { chartDate, formatDateUsdToBd, formatLongDateUsdToBd } from '../../../utils/utils-functions/formatDate';

const today = new Date().toISOString().slice(0, 10);

const iconButtonClass = 'inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white transition hover:bg-opacity-90';
const iconSuccessClass = 'inline-flex h-8 w-8 items-center justify-center rounded-md bg-success text-white transition hover:bg-opacity-90';
const iconDangerClass = 'inline-flex h-8 w-8 items-center justify-center rounded-md bg-danger text-white transition hover:bg-opacity-90';
const iconNeutralClass = 'inline-flex h-8 w-8 items-center justify-center rounded-md bg-meta-3 text-white transition hover:bg-opacity-90';
const sectionLabelClass = 'mb-1 block text-sm font-medium text-black dark:text-white';

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

const employmentTypeOptions = [
  { id: 'monthly', name: 'Monthly Employee' },
  { id: 'daily', name: 'Daily Labour' },
  { id: 'shifting', name: 'Shift Based Employee' },
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
  employment_type: 'monthly',
  attendance_policy_id: '',
  default_shift_id: '',
  overtime_eligible: '0',
  daily_wage: '',
  ot_rate: '',
  standard_work_minutes: '',
};

const timeOnly = (value: any) => {
  if (!value) return '';
  const match = String(value).match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
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

const isLateAttendance = (row: any) => {
  const inMinutes = parseTimeMinutes(row?.in_time);
  const shiftStartMinutes = parseTimeMinutes(row?.shift_start_time || row?.start_time);
  const graceMinutes = Number(row?.grace_minutes || 0);

  return row?.status === 'late' || (
    row?.status === 'present'
    && inMinutes !== null
    && shiftStartMinutes !== null
    && inMinutes > shiftStartMinutes + graceMinutes
  );
};

const displayStatus = (row: any) => (isLateAttendance(row) ? 'late' : row?.status);

const statusBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    present: 'bg-success/10 text-success',
    absent: 'bg-danger/10 text-danger',
    late: 'bg-warning/10 text-warning',
    early_out: 'bg-warning/10 text-warning',
    half_day: 'bg-primary/10 text-primary',
    leave: 'bg-meta-3/10 text-meta-3',
    holiday: 'bg-bodydark2/10 text-bodydark2',
    weekly_holiday: 'bg-bodydark2/10 text-bodydark2',
    pending: 'bg-warning/10 text-warning',
  };
  return map[status] || 'bg-bodydark2/10 text-bodydark2';
};

const approvalBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    approved: 'bg-success/10 text-success',
    rejected: 'bg-danger/10 text-danger',
    pending: 'bg-warning/10 text-warning',
    'pending save': 'bg-primary/10 text-primary',
  };
  return map[status] || 'bg-warning/10 text-warning';
};

const StatusBadge = ({ value, tone }: { value: string; tone: string }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tone}`}>
    {String(value || '-').replace(/_/g, ' ')}
  </span>
);

const shiftWorkMinutes = (shift: any) => {
  const startMinutes = parseTimeMinutes(shift?.start_time || shift?.shift_start_time);
  const endMinutes = parseTimeMinutes(shift?.end_time || shift?.shift_end_time);
  if (startMinutes === null || endMinutes === null) return 0;
  return endMinutes >= startMinutes ? endMinutes - startMinutes : (24 * 60 - startMinutes) + endMinutes;
};

const workedMinutes = (data: any) => {
  const inMinutes = parseTimeMinutes(data?.in_time);
  const outMinutes = parseTimeMinutes(data?.out_time);
  if (inMinutes === null || outMinutes === null) return 0;
  return outMinutes >= inMinutes ? outMinutes - inMinutes : (24 * 60 - inMinutes) + outMinutes;
};

const attendanceOvertimeMinutes = (data: any, shifts: any[]) => {
  if (data?.employment_type === 'monthly' && !Number(data?.overtime_eligible || 0)) return 0;
  const shift = shifts.find((item: any) => String(item.id) === String(data?.shift_id || data?.default_shift_id));
  const standardMinutes = Number(data?.standard_work_minutes || shiftWorkMinutes(shift) || 0);
  const minutes = workedMinutes(data);
  if (!minutes || !standardMinutes) return 0;
  return Math.max(0, minutes - standardMinutes);
};

const formatOtHours = (minutes: number | string) => (Number(minutes || 0) / 60).toFixed(2);

const attendanceRowKey = (row: any) => {
  if (row?.id) return `id:${row.id}`;
  return `employee:${row?.employee_id || ''}:date:${String(row?.attendance_date || '').slice(0, 10)}`;
};

const selectedShift = (shiftId: any, shifts: any[]) =>
  shifts.find((shift: any) => String(shift.id) === String(shiftId));

const selectedShiftNightFlag = (shiftId: any, shifts: any[]) => {
  const shift = selectedShift(shiftId, shifts);
  if (!shift || shift.is_night_shift === undefined || shift.is_night_shift === null) return null;
  return Number(shift.is_night_shift) ? 1 : 0;
};

const attendanceShiftFilterParams = (shiftId: any, shifts: any[]) => {
  const isNightShift = selectedShiftNightFlag(shiftId, shifts);
  return isNightShift === null ? {} : { is_night_shift: isNightShift };
};

const AttendanceEntries = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const location = useLocation();
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const branches = branchDdlData?.protectedData?.data || [];
  const shifts = Array.isArray(attendance.shifts) ? attendance.shifts : [];
  const entries = Array.isArray(attendance.entries) ? attendance.entries : [];
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const [form, setForm] = useState<any>({ ...initialForm, branch_id: userBranchId });
  const [filters, setFilters] = useState<any>({ date_from: today, date_to: today, branch_id: userBranchId });
  const [buttonLoading, setButtonLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkApproveLoading, setBulkApproveLoading] = useState(false);
  const [bulkClearLoading, setBulkClearLoading] = useState(false);
  const [showBulkClearConfirm, setShowBulkClearConfirm] = useState(false);
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<any | null>(null);
  const [deletingAttendanceId, setDeletingAttendanceId] = useState<number | null>(null);
  const [bulkLoadedKey, setBulkLoadedKey] = useState('');
  const [pendingRows, setPendingRows] = useState<Record<string, any>>({});
  const [employeeMeta, setEmployeeMeta] = useState<any>(null);
  const [rosterMessage, setRosterMessage] = useState('');
  const manualAttendanceEdit = (location.state as any)?.manualAttendanceEdit;
  const displayEntries = entries.map((row: any) => {
    const pendingRow = pendingRows[attendanceRowKey(row)];
    return pendingRow ? { ...row, ...pendingRow, __pending: true } : row;
  });

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchAttendanceShifts());
  }, [dispatch]);

  useEffect(() => {
    const nextFilters = { date_from: today, date_to: today, branch_id: userBranchId };

    setForm((prev: any) => ({
      ...prev,
      branch_id: prev.branch_id || userBranchId,
    }));
    setFilters((prev: any) => ({
      ...prev,
      branch_id: prev.branch_id || userBranchId,
    }));
    dispatch(fetchAttendanceEntries(nextFilters));
  }, [dispatch, userBranchId]);

  useEffect(() => {
    if (!manualAttendanceEdit) return;

    const editDate = String(manualAttendanceEdit.attendance_date || today).slice(0, 10);
    const nextFilters = {
      date_from: editDate,
      date_to: editDate,
      branch_id: manualAttendanceEdit.branch_id || '',
    };

    setFilters(nextFilters);
    dispatch(fetchAttendanceEntries(nextFilters));

    if (manualAttendanceEdit.approval_status === 'approved') {
      toast.error('Approved attendance cannot be changed');
      return;
    }

    setForm({
      ...initialForm,
      ...manualAttendanceEdit,
      attendance_date: editDate,
      employee_name: manualAttendanceEdit.employee_name,
      in_time: timeOnly(manualAttendanceEdit.in_time),
      out_time: timeOnly(manualAttendanceEdit.out_time),
    });
  }, [dispatch, manualAttendanceEdit]);

  useEffect(() => {
    if (!form.employee_id || !form.attendance_date || employeeMeta?.employment_type !== 'shifting') return;
    loadRosterShift(form.employee_id, form.attendance_date, employeeMeta);
  }, [form.employee_id, form.attendance_date, employeeMeta?.employment_type]);

  const handleChange = (setter: any) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setter((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleShiftChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { value } = e.target;
    setForm((prev: any) => ({
      ...prev,
      shift_id: value,
      employee_id: '',
      employee_name: '',
    }));
    setEmployeeMeta(null);
    setRosterMessage('');
  };

  const handleEmploymentTypeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { value } = e.target;
    setForm((prev: any) => ({
      ...prev,
      employment_type: value,
      employee_id: '',
      employee_name: '',
      attendance_policy_id: '',
      default_shift_id: '',
      overtime_eligible: '0',
      daily_wage: '',
      ot_rate: '',
      standard_work_minutes: '',
    }));
    setEmployeeMeta(null);
    setRosterMessage('');
  };

  const applyEmployeeAttendanceDefaults = (employee: any) => {
    const defaultShiftId = employee?.default_shift_id || employee?.attendance_shift_id || employee?.shift_id || '';
    setForm((prev: any) => ({
      ...prev,
      employment_type: employee?.employment_type || 'monthly',
      attendance_policy_id: employee?.attendance_policy_id || '',
      default_shift_id: defaultShiftId,
      shift_id: prev.shift_id || defaultShiftId,
      overtime_eligible: String(employee?.overtime_eligible ?? 0),
      daily_wage: employee?.daily_wage || '',
      ot_rate: employee?.ot_rate || '',
      standard_work_minutes: employee?.standard_work_minutes || '',
    }));
  };

  const loadRosterShift = async (employeeId: any, attendanceDate: any, employee: any = employeeMeta) => {
    if (!employeeId || !attendanceDate) return;
    if ((employee?.employment_type || '') !== 'shifting') {
      setRosterMessage('');
      return;
    }

    try {
      const rosters = await dispatch(fetchShiftRosters({ employee_id: employeeId, duty_date: attendanceDate })).unwrap();
      const roster = Array.isArray(rosters) ? rosters[0] : null;
      if (roster?.shift_id) {
        setForm((prev: any) => ({
          ...prev,
          shift_id: roster.shift_id,
          branch_id: roster.branch_id || prev.branch_id,
        }));
        setRosterMessage(`Roster shift loaded${roster.shift_name ? `: ${roster.shift_name}` : ''}`);
        return;
      }

      setRosterMessage('No roster found for this shifting employee on selected date');
    } catch (error: any) {
      setRosterMessage(error || 'Roster lookup failed');
    }
  };

  const handleEmployeeSelect = async (option: any) => {
    const employeeId = option?.value || '';
    setForm((prev: any) => ({
      ...prev,
      employee_id: employeeId,
      employee_name: option?.label || '',
    }));
    setRosterMessage('');

    if (!employeeId) {
      setEmployeeMeta(null);
      return;
    }

    try {
      const employee = await dispatch(fetchEmployeeById(Number(employeeId))).unwrap();
      setEmployeeMeta(employee);
      applyEmployeeAttendanceDefaults(employee);
      await loadRosterShift(employeeId, form.attendance_date, employee);
    } catch {
      setEmployeeMeta(null);
    }
  };

  const bulkLoadKey = (data = form) => [
    data.attendance_date || '',
    data.branch_id || '',
    data.employment_type || '',
    data.shift_id || '',
    selectedShiftNightFlag(data.shift_id, shifts) ?? '',
  ].join('|');

  const normalizePayload = (data: any) =>
    Object.fromEntries(
      Object.entries({
        ...data,
        overtime_minutes: attendanceOvertimeMinutes(data, shifts),
      })
        .filter(([key]) => !['employee_name', 'approval_status', '__pending', 'shift_name', 'default_shift_id'].includes(key))
        .map(([key, value]) => [key, value === '' ? null : value]),
    );

  const loadEntries = (params = filters) => {
    setPendingRows({});
    dispatch(fetchAttendanceEntries({
      ...params,
      employment_type: params.employment_type || form.employment_type,
      ...attendanceShiftFilterParams(params.shift_id, shifts),
    }));
  };

  const pendingRowsList = () => Object.values(pendingRows);

  const commitPendingRows = async () => {
    const drafts = pendingRowsList();
    if (drafts.length === 0) return { saved: 0, failed: 0 };

    const results = await Promise.allSettled(
      drafts.map((row: any) => dispatch(saveAttendanceEntry(normalizePayload(row))).unwrap()),
    );

    return {
      saved: results.filter((result) => result.status === 'fulfilled').length,
      failed: results.filter((result) => result.status === 'rejected').length,
    };
  };

  const loadedListParams = (data = form) => ({
    branch_id: data.branch_id,
    shift_id: data.shift_id,
    employment_type: data.employment_type,
    ...attendanceShiftFilterParams(data.shift_id, shifts),
    date_from: data.attendance_date,
    date_to: data.attendance_date,
    in_time: data.in_time,
    out_time: data.out_time,
    status: data.status,
    remarks: data.remarks,
    include_employee_list: 1,
  });

  const reset = () => {
    setForm({ ...initialForm, branch_id: userBranchId });
    setBulkLoadedKey('');
    setPendingRows({});
    setEmployeeMeta(null);
    setRosterMessage('');
  };

  const handleBulkLoad = () => {
    if (!form.attendance_date) {
      toast.error('Please select attendance date');
      return;
    }

    const params = loadedListParams();

    setFilters((prev: any) => ({ ...prev, ...params }));
    setBulkLoadedKey(bulkLoadKey());
    loadEntries(params);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.id && form.approval_status === 'approved') {
      toast.error('Approved attendance cannot be changed');
      return;
    }
    if (!form.employee_id) {
      toast.error('Select an employee for single entry; use Bulk Entry for all employees');
      return;
    }
    if (form.employment_type === 'shifting' && !form.shift_id) {
      toast.error('Shift based employee attendance requires a roster/default shift');
      return;
    }
    setButtonLoading(true);
    try {
      const draftKey = attendanceRowKey(form);
      setPendingRows((prev) => ({
        ...prev,
        [draftKey]: {
          ...form,
          attendance_date: String(form.attendance_date || today).slice(0, 10),
          in_time: form.in_time,
          out_time: form.out_time,
          __pending: true,
        },
      }));
      toast.success('Attendance updated in list. Click Bulk Entry or Bulk Approve to save.');
      setForm((prev: any) => ({
        ...initialForm,
        branch_id: prev.branch_id,
        shift_id: prev.shift_id,
        attendance_date: prev.attendance_date,
        in_time: prev.in_time,
        out_time: prev.out_time,
        status: prev.status,
        remarks: prev.remarks,
      }));
    } catch (error: any) {
      toast.error(error || 'Failed to update attendance list');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!form.attendance_date) {
      toast.error('Please select attendance date');
      return;
    }
    if (bulkLoadedKey !== bulkLoadKey()) {
      toast.error('Please load attendance list before Bulk Entry');
      return;
    }

    setBulkLoading(true);
    try {
      const drafts = pendingRowsList();
      if (drafts.length > 0) {
        const result = await commitPendingRows();
        if (result.saved > 0) {
          toast.success(`Pending attendance saved. Updated: ${result.saved}${result.failed ? `, Failed: ${result.failed}` : ''}`);
          setPendingRows({});
          loadEntries(filters.include_employee_list ? filters : loadedListParams());
        } else {
          toast.error('Pending attendance save failed');
        }
        return;
      }

      const response = await dispatch(bulkSaveAttendanceEntries(normalizePayload({
        branch_id: form.branch_id,
        shift_id: form.shift_id,
        employment_type: form.employment_type,
        ...attendanceShiftFilterParams(form.shift_id, shifts),
        attendance_date: form.attendance_date,
        in_time: form.in_time,
        out_time: form.out_time,
        status: form.status,
        remarks: form.remarks,
        update_existing: true,
      }))).unwrap();
      const result = response?.data?.data || response?.data || {};
      toast.success(response?.message || `Bulk attendance saved. Created: ${result.created || 0}, Updated: ${result.updated || 0}, Skipped: ${result.skipped || 0}`);
      setFilters((prev: any) => ({
        ...prev,
        branch_id: form.branch_id || prev.branch_id,
        date_from: form.attendance_date,
        date_to: form.attendance_date,
      }));
      loadEntries(loadedListParams());
    } catch (error: any) {
      toast.error(error || 'Bulk attendance failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleApproval = async (row: any, approval_status: 'approved' | 'rejected', remarks?: string) => {
    if (row.__pending) {
      toast.info('Please click Bulk Entry or Bulk Approve to save pending changes first');
      return;
    }

    try {
      const response = await dispatch(
        approveAttendanceEntry({
          id: row.id,
          approval_status,
          remarks: remarks || (approval_status === 'approved' ? 'Approved from attendance list' : 'Rejected from attendance list'),
        }),
      ).unwrap();
      toast.success(response?.message || 'Approval updated');
      loadEntries();
    } catch (error: any) {
      toast.error(error || 'Approval failed');
    }
  };

  const handleDelete = (row: any) => {
    if (row.__pending) {
      toast.info('Pending attendance can be removed before save by resetting the list');
      return;
    }

    if (!row?.id) {
      toast.error('Attendance row not found');
      return;
    }

    if (row.approval_status === 'approved') {
      toast.error('Please cancel approval before deleting attendance');
      return;
    }

    setDeleteConfirmRow(row);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmRow?.id) return;

    setDeletingAttendanceId(deleteConfirmRow.id);
    try {
      const response = await dispatch(deleteAttendanceEntry({ id: deleteConfirmRow.id })).unwrap();
      toast.success(response?.message || 'Attendance deleted successfully');
      setDeleteConfirmRow(null);
      loadEntries();
    } catch (error: any) {
      toast.error(error || 'Attendance delete failed');
    } finally {
      setDeletingAttendanceId(null);
    }
  };
  const handleBulkApprove = async () => {
    const approvableEntries = displayEntries.filter((row: any) => row?.id && row?.approval_status !== 'approved');

    if (approvableEntries.length === 0 && pendingRowsList().length === 0) {
      toast.info('No pending attendance found for approval');
      return;
    }

    setBulkApproveLoading(true);
    try {
      const pendingResult = await commitPendingRows();
      if (pendingResult.failed > 0) {
        toast.error(`Pending attendance save failed. Failed: ${pendingResult.failed}`);
        return;
      }

      const results = await Promise.allSettled(
        approvableEntries.map((row: any) =>
          dispatch(
            approveAttendanceEntry({
              id: row.id,
              approval_status: 'approved',
              remarks: 'Bulk approved from attendance list',
            }),
          ).unwrap(),
        ),
      );

      const approvedCount = results.filter((result) => result.status === 'fulfilled').length;
      const failedCount = results.length - approvedCount;
      const savedText = pendingResult.saved ? ` Saved: ${pendingResult.saved}.` : '';

      if (approvedCount > 0) {
        toast.success(`Bulk approval completed.${savedText} Approved: ${approvedCount}${failedCount ? `, Failed: ${failedCount}` : ''}`);
      } else if (pendingResult.saved > 0) {
        toast.success(`Pending attendance saved. Saved: ${pendingResult.saved}`);
      } else {
        toast.error('Bulk approval failed');
      }

      setPendingRows({});
      loadEntries();
    } finally {
      setBulkApproveLoading(false);
    }
  };

  const approvedEntriesForClear = displayEntries.filter((row: any) => row?.id && row?.approval_status === 'approved');

  const openBulkClearConfirm = () => {
    if (approvedEntriesForClear.length === 0) {
      toast.info('No approved attendance found to clear');
      return;
    }

    setShowBulkClearConfirm(true);
  };

  const handleBulkClearApprovedEntries = async () => {
    const approvedEntries = displayEntries.filter((row: any) => row?.id && row?.approval_status === 'approved');

    if (approvedEntries.length === 0) {
      toast.info('No approved attendance found to clear');
      setShowBulkClearConfirm(false);
      return;
    }

    setBulkClearLoading(true);
    try {
      const response = await dispatch(
        bulkClearAttendanceEntries({
          entry_ids: approvedEntries.map((row: any) => row.id),
          remarks: 'Bulk attendance cleared',
        }),
      ).unwrap();
      const result = response?.data?.data || response?.data || {};
      toast.success(response?.message || `Bulk clear completed. Cleared: ${result.cleared || 0}, Skipped: ${result.skipped || 0}`);
      setShowBulkClearConfirm(false);
      loadEntries();
    } catch (error: any) {
      toast.error(error || 'Bulk clear failed');
    } finally {
      setBulkClearLoading(false);
    }
  };

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (_row: any, index: number) => index + 1,
    },
    { key: 'attendance_date', header: 'Date', render: (row: any) => chartDate(row.attendance_date) },
    { key: 'employee_name', header: 'Employee' },
    { key: 'employment_type', header: 'Type', render: (row: any) => row.employment_type || '-' },
    { key: 'shift_name', header: 'Shift', render: (row: any) => row.shift_name || '-' },
    { key: 'in_time', header: 'In', render: (row: any) => timeOnly(row.in_time) || '-' },
    { key: 'out_time', header: 'Out', render: (row: any) => timeOnly(row.out_time) || '-' },
    {
      key: 'overtime_minutes',
      header: 'OT Hr.',
      render: (row: any) => formatOtHours(row.overtime_minutes || attendanceOvertimeMinutes(row, shifts) || 0),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => {
        const value = displayStatus(row);
        return <StatusBadge value={value} tone={statusBadgeClass(value)} />;
      },
    },
    {
      key: 'approval_status',
      header: 'Approval',
      render: (row: any) => {
        const value = row.__pending ? 'pending save' : row.approval_status;
        return <StatusBadge value={value} tone={approvalBadgeClass(value)} />;
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          {row.is_leave_day ? (
            <span className="text-xs text-slate-500 dark:text-slate-300">{row.remarks || 'Approved leave'}</span>
          ) : (
            <>
              <button
                type="button"
                title={row.approval_status === 'approved' ? 'Approved attendance cannot be changed' : 'Edit'}
                disabled={row.approval_status === 'approved'}
                onClick={() => {
                  if (row.approval_status === 'approved') {
                    toast.error('Approved attendance cannot be changed');
                    return;
                  }

                  setForm({
                    ...initialForm,
                    ...row,
                    employee_name: row.employee_name,
                    in_time: timeOnly(row.in_time),
                    out_time: timeOnly(row.out_time),
                  });
                }}
                className={`${iconButtonClass} disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400`}
              >
                <FiEdit2 />
              </button>
              {row.id && row.status === 'rejected' && (
                <button type="button" title="Cancel rejected" onClick={() => handleApproval(row, 'approved', 'Rejected attendance restored')} className={iconNeutralClass}>
                  <FiRefreshCcw />
                </button>
              )}
              {row.id && row.approval_status !== 'approved' && row.status !== 'rejected' && (
                <button type="button" title="Approve" onClick={() => handleApproval(row, 'approved')} className={iconSuccessClass}>
                  <FiCheck />
                </button>
              )}
              {row.id && row.approval_status !== 'rejected' && (
                <button
                  type="button"
                  title={row.approval_status === 'approved' ? 'Cancel approval' : 'Reject'}
                  onClick={() =>
                    handleApproval(
                      row,
                      'rejected',
                      row.approval_status === 'approved'
                        ? 'Attendance approval cancelled'
                        : 'Attendance rejected from list',
                    )
                  }
                  className={iconDangerClass}
                >
                  <FiX />
                </button>
              )}
              {row.id && row.approval_status === 'rejected' && (
                <button type="button" title="Delete attendance" onClick={() => handleDelete(row)} className={iconDangerClass}>
                  <FiTrash2 />
                </button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  const overtimeMinutes = attendanceOvertimeMinutes(form, shifts);

  return (
    <div>
      {/* The walkthrough sits beside the heading, as it does on every other
          screen that has one, and only where the branch asked for them. */}
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Manual Attendance" screen="attendance-entry" />
      </div>

      {attendance.loading && <Loader />}

      <div className="mb-3 border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center gap-3 border-b border-stroke px-4 py-2.5 dark:border-strokedark sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FiEdit2 className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-black dark:text-white">Attendance Entry</h3>
            <p className="text-xs text-bodydark2">Single or bulk daily attendance</p>
          </div>
        </div>
        <div className="p-3 sm:p-4">
        <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <div>
            <label className={sectionLabelClass}>Employee</label>
            <EmployeeDropdownSearch
              id="employee_id"
              name="employee_id"
              placeholder="Search Employee"
              value={form.employee_id ? { value: form.employee_id, label: form.employee_name || `Employee #${form.employee_id}` } : null}
              onSelect={handleEmployeeSelect}
              searchParams={{
                branch_id: form.branch_id,
                shift_id: form.shift_id,
                employment_type: form.employment_type,
                attendance_date: form.attendance_date,
                is_night_shift: selectedShiftNightFlag(form.shift_id, shifts),
              }}
            />
          </div>
          <div>
            <label className={sectionLabelClass}>Branch</label>
            <BranchDropdown
              name="branch_id"
              defaultValue={userBranchId}
              branchDdl={branches}
              value={form.branch_id?.toString() ?? ''}
              onChange={handleChange(setForm)}
              className="h-9 w-full font-medium text-sm p-1.5"
            />
          </div>
          <DropdownCommon id="shift_id" name="shift_id" label="Shift" value={form.shift_id?.toString()} data={[{ id: '', name: 'Select Shift' }, ...shifts]} onChange={handleShiftChange} className="h-9" />
          {/* Attendance Type sits with Shift rather than down among the times:
              the two decide each other -- picking a type reloads the shifts --
              and both have to be settled before a time means anything. */}
          <DropdownCommon id="employment_type" name="employment_type" label="Attendance Type" value={form.employment_type} data={employmentTypeOptions} onChange={handleEmploymentTypeChange} className="h-9" />

          {/* Row two is when: the date, then the two clock fields. */}
          <InputDatePicker
            id="attendance_date"
            name="attendance_date"
            label="Date"
            selectedDate={dateFromString(form.attendance_date)}
            setSelectedDate={(date) => setForm((prev: any) => ({ ...prev, attendance_date: dateToString(date) }))}
            setCurrentDate={(date) => setForm((prev: any) => ({ ...prev, attendance_date: dateToString(date) }))}
            className="h-9 w-full"
          />
          {/* Holds the second column open so In and Out sit under Shift and
              Attendance Type, where the eye is already looking. */}
          <div className="hidden md:block" aria-hidden="true" />
          <InputElement name="in_time" label="In Time" type="time" value={form.in_time || ''} onChange={handleChange(setForm)} />
          <InputElement name="out_time" label="Out Time" type="time" value={form.out_time || ''} onChange={handleChange(setForm)} />

          {/* Row three is what came of it. */}
          <DropdownCommon id="status" name="status" label="Status" value={form.status} data={statusOptions} onChange={handleChange(setForm)} className="h-9" />
          <InputElement name="remarks" label="Remarks" value={form.remarks || ''} onChange={handleChange(setForm)} />
          <InputElement name="overtime_minutes" label="OT Hr." type="number" value={formatOtHours(overtimeMinutes)} onChange={() => {}} disabled />
        </div>
        {rosterMessage && (
          <div className={`mt-2 text-sm ${rosterMessage.startsWith('Roster shift loaded') ? 'text-emerald-600' : 'text-amber-600'}`}>
            {rosterMessage}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-stroke pt-3 dark:border-strokedark">
          <ButtonLoading
            type="submit"
            buttonLoading={buttonLoading}
            disabled={form.id && form.approval_status === 'approved'}
            label={form.employee_id ? 'Update Single' : 'Save Single'}
            // className={commandButtonClass}
            className =" h-9"
            icon={<FiSave className="mr-2" />}
          />
          <ButtonLoading
            type="button"
            onClick={handleBulkSubmit}
            buttonLoading={bulkLoading}
            label="Bulk Entry"
            className =" h-9"
            icon={<FiUsers className="mr-2" />}
          />
          <ButtonLoading
            type="button"
            onClick={reset}
            label="Reset"
            className =" h-9"
            icon={<FiRefreshCcw className="mr-2" />}
          />
          <ButtonLoading
            type="button"
            onClick={handleBulkLoad}
            label="Load"
            className =" h-9 w-30"
            icon={<FiSearch className="mr-2" />}
          />
        </div>
        </form>
        </div>
      </div>

      <div className="mb-3 border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center gap-3 border-b border-stroke px-4 py-2.5 dark:border-strokedark sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-meta-3/10 text-meta-3">
            <FiSearch className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-black dark:text-white">Filter &amp; Approval</h3>
            <p className="text-xs text-bodydark2">Load entries and approve in bulk</p>
          </div>
        </div>
        <div className="p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
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
          <label className={sectionLabelClass}>Branch</label>
          <BranchDropdown
            name="branch_id"
            defaultValue={userBranchId}
            branchDdl={branches}
            value={filters.branch_id?.toString() ?? ''}
            onChange={handleChange(setFilters)}
            className="h-9 w-full font-medium text-sm p-1.5"
          />
        </div>
        <div className="flex flex-wrap items-end gap-2 xl:flex-nowrap">
          <ButtonLoading
            type="button"
            onClick={() => loadEntries()}
            label="Load"
            className ="h-9 min-w-[92px] whitespace-nowrap px-4"
            icon={<FiSearch className="mr-2" />}
          />
        {/* </div>
        <div className="flex items-end"> */}
          <ButtonLoading
            type="button"
            onClick={handleBulkApprove}
            buttonLoading={bulkApproveLoading}
            disabled={bulkApproveLoading || (pendingRowsList().length === 0 && entries.every((row: any) => row?.approval_status === 'approved'))}
            label="Bulk Approve"
            className ="h-9 min-w-[135px] whitespace-nowrap px-4"
            icon={<FiCheck className="mr-2" />}
          />
          <ButtonLoading
            type="button"
            onClick={openBulkClearConfirm}
            buttonLoading={bulkClearLoading}
            disabled={bulkClearLoading || approvedEntriesForClear.length === 0}
            label="Bulk Clear"
            className ="h-9 min-w-[120px] whitespace-nowrap px-4"
            icon={<FiTrash2 className="mr-2" />}
          />
        </div>
        </div>
        </div>
      </div>

      <div className="border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center justify-between border-b border-stroke px-4 py-2.5 dark:border-strokedark sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FiUsers className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold text-black dark:text-white">Attendance List</h3>
          </div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {displayEntries.length} entries
          </span>
        </div>
        <Table columns={columns} data={displayEntries} />
      </div>

      <ConfirmModal
        show={showBulkClearConfirm}
        title="Confirm Deletion"
        message={
          <>
            Are you sure you want to clear attendance entries
            <span className="mt-1 block font-bold">
              {approvedEntriesForClear.length} approved entries ?
            </span>
          </>
        }
        loading={bulkClearLoading}
        cancelLabel="Cancel"
        confirmLabel="Confirm"
        onCancel={() => setShowBulkClearConfirm(false)}
        onConfirm={handleBulkClearApprovedEntries}
        className="bg-red-600 hover:bg-red-700"
      />
      <ConfirmModal
        show={Boolean(deleteConfirmRow)}
        title="Confirm Deletion"
        message={
          <>
            Delete attendance for
            <span className="mt-1 block font-bold">
              {deleteConfirmRow?.employee_name || 'this employee'}
            </span>
            <span className="mt-1 block">
              on {deleteConfirmRow?.attendance_date ? chartDate(deleteConfirmRow.attendance_date) : 'this date'} ?
            </span>
          </>
        }
        loading={deletingAttendanceId === deleteConfirmRow?.id}
        cancelLabel="Cancel"
        confirmLabel="Confirm"
        onCancel={() => setDeleteConfirmRow(null)}
        onConfirm={handleDeleteConfirmed}
        className="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default AttendanceEntries;
