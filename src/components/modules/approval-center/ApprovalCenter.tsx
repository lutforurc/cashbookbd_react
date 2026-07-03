import React, { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiRefreshCcw, FiTrash2, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import httpService from '../../services/httpService';
import { API_APPROVAL_CENTER_ACTION_URL, API_APPROVAL_CENTER_SUMMARY_URL } from '../../services/apiRoutes';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import InputDatePicker from '../../utils/fields/DatePicker';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import InputElement from '../../utils/fields/InputElement';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { useDispatch, useSelector } from 'react-redux';
import { chartDate } from '../../utils/utils-functions/formatDate';

const commandButtonClass = 'h-10 min-w-[110px] whitespace-nowrap rounded-none bg-slate-700 px-5 text-sm font-medium text-white hover:bg-slate-600 focus:bg-slate-600';

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

const timeOnly = (value: any) => {
  if (!value) return '-';
  const match = String(value).match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '-';
};

const statusText = (value?: string) => String(value || '-').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const ApprovalCenter = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const [activeTab, setActiveTab] = useState<'attendance' | 'voucher'>('attendance');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [data, setData] = useState<any>({ counts: {}, attendance: [], vouchers: [] });
  const [selectedAttendance, setSelectedAttendance] = useState<number[]>([]);
  const [selectedVouchers, setSelectedVouchers] = useState<number[]>([]);
  const [confirmAction, setConfirmAction] = useState<null | { type: 'attendance' | 'voucher'; action: 'approve' | 'reject' | 'clear' }>(null);
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    branch_id: '',
    search: '',
    per_page: 25,
    attendance_page: 1,
    voucher_page: 1,
  });

  const attendanceRows = Array.isArray(data.attendance) ? data.attendance : [];
  const voucherRows = Array.isArray(data.vouchers) ? data.vouchers : [];
  const activeSelection = activeTab === 'attendance' ? selectedAttendance : selectedVouchers;
  const activeRows = activeTab === 'attendance' ? attendanceRows : voucherRows;
  const meta = data?.meta || {};
  const activePage = activeTab === 'attendance' ? Number(meta.attendance_page || filters.attendance_page || 1) : Number(meta.voucher_page || filters.voucher_page || 1);
  const activeLastPage = activeTab === 'attendance' ? Number(meta.attendance_last_page || 1) : Number(meta.voucher_last_page || 1);
  const activeTotal = activeTab === 'attendance' ? Number(data?.counts?.attendance || 0) : Number(data?.counts?.voucher || 0);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  const loadData = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const response = await httpService.get(API_APPROVAL_CENTER_SUMMARY_URL, { params: currentFilters });
      const payload = response?.data?.data?.data || response?.data?.data || {};
      setData(payload);
      setSelectedAttendance([]);
      setSelectedVouchers([]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Approval center data load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filters);
  }, [userBranchId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      attendance_page: 1,
      voucher_page: 1,
    }));
  };

  const loadWithFilters = () => {
    const nextFilters = {
      ...filters,
      attendance_page: 1,
      voucher_page: 1,
    };
    setFilters(nextFilters);
    loadData(nextFilters);
  };

  const changePage = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(nextPage, 1), activeLastPage);
    const nextFilters = {
      ...filters,
      [activeTab === 'attendance' ? 'attendance_page' : 'voucher_page']: boundedPage,
    };
    setFilters(nextFilters);
    loadData(nextFilters);
  };

  const toggleSelected = (type: 'attendance' | 'voucher', id: number) => {
    const setter = type === 'attendance' ? setSelectedAttendance : setSelectedVouchers;
    setter((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    const ids = activeRows.map((row: any) => Number(row.id)).filter(Boolean);
    if (activeTab === 'attendance') {
      setSelectedAttendance(selectedAttendance.length === ids.length ? [] : ids);
      return;
    }
    setSelectedVouchers(selectedVouchers.length === ids.length ? [] : ids);
  };

  const runAction = async () => {
    if (!confirmAction) return;
    const ids = confirmAction.type === 'attendance' ? selectedAttendance : selectedVouchers;
    if (!ids.length) {
      toast.info('Please select at least one item');
      setConfirmAction(null);
      return;
    }

    setActionLoading(true);
    try {
      const response = await httpService.post(API_APPROVAL_CENTER_ACTION_URL, {
        ...confirmAction,
        ids,
        remarks: `${statusText(confirmAction.action)} from Approval Center`,
      });
      toast.success(response?.data?.message || 'Approval action completed');
      setConfirmAction(null);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Approval action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const summaryCards = useMemo(() => [
    { label: 'Total Pending', value: data?.counts?.total || 0 },
    { label: 'Attendance', value: data?.counts?.attendance || 0 },
    { label: 'Vouchers', value: data?.counts?.voucher || 0 },
    { label: 'Selected', value: activeSelection.length },
  ], [activeSelection.length, data?.counts]);

  const selectionColumn = (type: 'attendance' | 'voucher') => ({
    key: 'select',
    header: (
      <input
        type="checkbox"
        checked={activeRows.length > 0 && activeSelection.length === activeRows.length}
        onChange={toggleAll}
        className="h-4 w-4"
      />
    ),
    headerClass: 'text-center',
    cellClass: 'text-center',
    render: (row: any) => {
      const selected = type === 'attendance' ? selectedAttendance : selectedVouchers;
      return (
        <input
          type="checkbox"
          checked={selected.includes(Number(row.id))}
          onChange={() => toggleSelected(type, Number(row.id))}
          className="h-4 w-4"
        />
      );
    },
  });

  const attendanceColumns = [
    selectionColumn('attendance'),
    { key: 'attendance_date', header: 'Date', render: (row: any) => chartDate(row.attendance_date) },
    {
      key: 'employee_name',
      header: 'Employee',
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{row.employee_name || '-'}</div>
          <div className="text-xs text-slate-500">{row.employee_serial || ''}</div>
        </div>
      ),
    },
    { key: 'branch_name', header: 'Branch/Project', render: (row: any) => row.branch_name || '-' },
    { key: 'in_time', header: 'In', render: (row: any) => timeOnly(row.in_time) },
    { key: 'out_time', header: 'Out', render: (row: any) => timeOnly(row.out_time) },
    { key: 'status', header: 'Status', render: (row: any) => statusText(row.status) },
  ];

  const voucherColumns = [
    selectionColumn('voucher'),
    { key: 'vr_no', header: 'Voucher No', render: (row: any) => <span className="font-semibold">{row.vr_no}</span> },
    { key: 'vr_date', header: 'Date', render: (row: any) => chartDate(row.vr_date) },
    { key: 'branch_name', header: 'Branch/Project', render: (row: any) => row.branch_name || '-' },
    { key: 'transaction_type', header: 'Type', render: (row: any) => row.transaction_type || '-' },
    { key: 'created_by_name', header: 'Created By', render: (row: any) => row.created_by_name || '-' },
  ];

  return (
    <div>
      <HelmetTitle title="Approval Center" />
      {(loading || actionLoading) && <Loader />}

      <div className="mb-3 border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-boxdark">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4 xl:grid-cols-6">
          <InputDatePicker
            id="date_from"
            name="date_from"
            label="From"
            selectedDate={dateFromString(filters.date_from)}
            setSelectedDate={(date) => setFilters((prev) => ({ ...prev, date_from: dateToString(date) }))}
            setCurrentDate={(date) => setFilters((prev) => ({ ...prev, date_from: dateToString(date) }))}
            className="h-10 w-full"
          />
          <InputDatePicker
            id="date_to"
            name="date_to"
            label="To"
            selectedDate={dateFromString(filters.date_to)}
            setSelectedDate={(date) => setFilters((prev) => ({ ...prev, date_to: dateToString(date) }))}
            setCurrentDate={(date) => setFilters((prev) => ({ ...prev, date_to: dateToString(date) }))}
            className="h-10 w-full"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-black dark:text-white">Branch/Project</label>
            <BranchDropdown
              name="branch_id"
              defaultValue={userBranchId}
              branchDdl={[{ id: '', name: 'All Branches' }, ...branches]}
              value={filters.branch_id?.toString() ?? ''}
              onChange={handleChange}
              className="h-10 w-full font-medium text-sm p-2"
            />
          </div>
          <InputElement
            id="search"
            name="search"
            label="Search"
            value={filters.search}
            onChange={handleChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter') loadWithFilters();
            }}
            placeholder="Employee, voucher, branch"
            className="h-10"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-black dark:text-white">Per Page</label>
            <select
              name="per_page"
              value={filters.per_page}
              onChange={handleChange}
              className="block h-10 w-full rounded-xs border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-boxdark dark:text-white"
            >
              {[10, 25, 50, 100, 200].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={loadWithFilters} className={`inline-flex items-center justify-center ${commandButtonClass}`}>
              <FiRefreshCcw className="mr-2" />
              Load
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-boxdark">
            <div className="text-xs font-semibold uppercase text-slate-500">{card.label}</div>
            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="border border-slate-200 bg-white dark:border-slate-700 dark:bg-boxdark">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex gap-2">
            <button type="button" onClick={() => setActiveTab('attendance')} className={`h-9 px-4 text-sm font-semibold ${activeTab === 'attendance' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
              Attendance ({data?.counts?.attendance || 0})
            </button>
            <button type="button" onClick={() => setActiveTab('voucher')} className={`h-9 px-4 text-sm font-semibold ${activeTab === 'voucher' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
              Vouchers ({data?.counts?.voucher || 0})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ButtonLoading
              type="button"
              label="Approve"
              disabled={!activeSelection.length}
              onClick={() => setConfirmAction({ type: activeTab, action: 'approve' })}
              className="h-9 min-w-[110px] whitespace-nowrap px-4"
              icon={<FiCheck className="mr-2" />}
            />
            <ButtonLoading
              type="button"
              label="Reject"
              disabled={activeTab !== 'attendance' || !activeSelection.length}
              onClick={() => setConfirmAction({ type: 'attendance', action: 'reject' })}
              className="h-9 min-w-[105px] whitespace-nowrap px-4"
              icon={<FiX className="mr-2" />}
            />
            <ButtonLoading
              type="button"
              label="Clear"
              disabled={activeTab !== 'attendance' || !activeSelection.length}
              onClick={() => setConfirmAction({ type: 'attendance', action: 'clear' })}
              className="h-9 min-w-[100px] whitespace-nowrap px-4"
              icon={<FiTrash2 className="mr-2" />}
            />
          </div>
        </div>

        <Table
          columns={activeTab === 'attendance' ? attendanceColumns : voucherColumns}
          data={activeTab === 'attendance' ? attendanceRows : voucherRows}
          noDataMessage="No pending approvals found"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
          <div className="font-medium text-slate-600 dark:text-slate-300">
            Page {activePage} of {activeLastPage} | {activeTotal} item(s)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activePage <= 1}
              onClick={() => changePage(activePage - 1)}
              className="h-9 min-w-[90px] bg-slate-700 px-4 text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={activePage >= activeLastPage}
              onClick={() => changePage(activePage + 1)}
              className="h-9 min-w-[90px] bg-slate-700 px-4 text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        show={Boolean(confirmAction)}
        title="Confirm Approval Action"
        message={
          <>
            Are you sure you want to {confirmAction?.action} selected {confirmAction?.type} items
            <span className="mt-1 block font-bold">
              {confirmAction?.type === 'attendance' ? selectedAttendance.length : selectedVouchers.length} item(s) ?
            </span>
          </>
        }
        loading={actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runAction}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        className="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default ApprovalCenter;
