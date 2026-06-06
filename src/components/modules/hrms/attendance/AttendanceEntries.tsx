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
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import {
  approveAttendanceEntry,
  bulkSaveAttendanceEntries,
  deleteAttendanceEntry,
  fetchAttendanceEntries,
  fetchAttendanceShifts,
  saveAttendanceEntry,
} from './attendanceSlice';
import { chartDate, formatDateUsdToBd, formatLongDateUsdToBd } from '../../../utils/utils-functions/formatDate';

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

const attendanceRowKey = (row: any) => {
  if (row?.id) return `id:${row.id}`;
  return `employee:${row?.employee_id || ''}:date:${String(row?.attendance_date || '').slice(0, 10)}`;
};

const AttendanceEntries = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const location = useLocation();
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const shifts = Array.isArray(attendance.shifts) ? attendance.shifts : [];
  const entries = Array.isArray(attendance.entries) ? attendance.entries : [];
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const [form, setForm] = useState<any>({ ...initialForm, branch_id: userBranchId });
  const [filters, setFilters] = useState<any>({ date_from: today, date_to: today, branch_id: userBranchId });
  const [buttonLoading, setButtonLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkApproveLoading, setBulkApproveLoading] = useState(false);
  const [bulkLoadedKey, setBulkLoadedKey] = useState('');
  const [pendingRows, setPendingRows] = useState<Record<string, any>>({});
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

  const handleChange = (setter: any) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setter((prev: any) => ({ ...prev, [name]: value }));
  };

  const bulkLoadKey = (data = form) => [
    data.attendance_date || '',
    data.branch_id || '',
  ].join('|');

  const normalizePayload = (data: any) =>
    Object.fromEntries(
      Object.entries(data)
        .filter(([key]) => !['employee_name', 'approval_status', '__pending', 'shift_name'].includes(key))
        .map(([key, value]) => [key, value === '' ? null : value]),
    );

  const loadEntries = (params = filters) => {
    setPendingRows({});
    dispatch(fetchAttendanceEntries(params));
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
      toast.error('Single entry করতে employee select করুন; সব employee হলে Bulk Entry ব্যবহার করুন');
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

  const handleDelete = async (row: any) => {
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

    const confirmed = window.confirm(`Delete attendance for ${row.employee_name || 'this employee'} on ${chartDate(row.attendance_date)}?`);
    if (!confirmed) return;

    try {
      const response = await dispatch(deleteAttendanceEntry({ id: row.id })).unwrap();
      toast.success(response?.message || 'Attendance deleted successfully');
      loadEntries();
    } catch (error: any) {
      toast.error(error || 'Attendance delete failed');
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
    { key: 'shift_name', header: 'Shift', render: (row: any) => row.shift_name || '-' },
    { key: 'in_time', header: 'In', render: (row: any) => timeOnly(row.in_time) || '-' },
    { key: 'out_time', header: 'Out', render: (row: any) => timeOnly(row.out_time) || '-' },
    { key: 'status', header: 'Status', render: (row: any) => displayStatus(row) },
    { key: 'approval_status', header: 'Approval', render: (row: any) => (row.__pending ? 'pending save' : row.approval_status) },
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
                <button type="button" title="Cancel rejected" onClick={() => handleApproval(row, 'approved', 'Rejected attendance restored')} className={iconButtonClass}>
                  <FiRefreshCcw />
                </button>
              )}
              {row.id && row.approval_status !== 'approved' && row.status !== 'rejected' && (
                <button type="button" title="Approve" onClick={() => handleApproval(row, 'approved')} className={iconButtonClass}>
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
                  className={iconButtonClass}
                >
                  <FiX />
                </button>
              )}
              {row.id && row.approval_status === 'rejected' && (
                <button type="button" title="Delete attendance" onClick={() => handleDelete(row)} className={iconButtonClass}>
                  <FiTrash2 />
                </button>
              )}
            </>
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
              defaultValue={userBranchId}
              branchDdl={branches}
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
          <ButtonLoading
            type="submit"
            buttonLoading={buttonLoading}
            disabled={form.id && form.approval_status === 'approved'}
            label={form.employee_id ? 'Update Single' : 'Save Single'}
            className={commandButtonClass}
            icon={<FiSave className="mr-2" />}
          />
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
          <button type="button" onClick={handleBulkLoad} className={`inline-flex items-center justify-center ${commandButtonClass}`}>
            <FiSearch className="mr-2" />
            Load
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
            defaultValue={userBranchId}
            branchDdl={branches}
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
        <div className="flex items-end">
          <ButtonLoading
            type="button"
            onClick={handleBulkApprove}
            buttonLoading={bulkApproveLoading}
            disabled={bulkApproveLoading || (pendingRowsList().length === 0 && entries.every((row: any) => row?.approval_status === 'approved'))}
            label="Bulk Approve"
            className={commandButtonClass}
            icon={<FiCheck className="mr-2" />}
          />
        </div>
      </div>

      <Table columns={columns} data={displayEntries} />
    </div>
  );
};

export default AttendanceEntries;
