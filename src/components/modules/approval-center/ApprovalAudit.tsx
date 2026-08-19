import React, { useEffect, useRef, useState } from 'react';
import { FIELD_SELECT } from '../../../theme/fieldStyles';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiRefreshCcw } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

import Loader from '../../../common/Loader';
import { Button, ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import httpService from '../../services/httpService';
import { API_APPROVAL_CENTER_AUDIT_URL } from '../../services/apiRoutes';
import routes from '../../services/appRoutes';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import InputDatePicker from '../../utils/fields/DatePicker';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import InputElement from '../../utils/fields/InputElement';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { useDispatch, useSelector } from 'react-redux';
import { chartDate } from '../../utils/utils-functions/formatDate';
import { Select } from '../../utils/fields/FormControls';

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

const actionLabel = (value?: string) => {
  const text = String(value || '-');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const actionBadgeClass = (value?: string) => {
  if (value === 'approved') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (value === 'rejected') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  if (value === 'cancelled') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
};

const dateTimeText = (value?: string) => {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 16);
};

const ApprovalAudit = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<any>({ rows: [], counts: {}, meta: {} });
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    branch_id: '',
    action: '',
    search: '',
    per_page: 25,
    page: 1,
  });

  const printRef = useRef<HTMLDivElement>(null);
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const meta = data?.meta || {};
  const page = Number(meta.page || filters.page || 1);
  const lastPage = Number(meta.last_page || 1);
  const total = Number(data?.counts?.total || 0);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  const loadData = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const response = await httpService.get(API_APPROVAL_CENTER_AUDIT_URL, { params: currentFilters });
      const payload = response?.data?.data?.data || response?.data?.data || {};
      setData(payload);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Approval audit load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filters);
  }, [userBranchId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const loadWithFilters = () => {
    const nextFilters = { ...filters, page: 1 };
    setFilters(nextFilters);
    loadData(nextFilters);
  };

  const changePage = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(nextPage, 1), lastPage);
    const nextFilters = { ...filters, page: boundedPage };
    setFilters(nextFilters);
    loadData(nextFilters);
  };

  const fetchExportRows = async () => {
    const response = await httpService.get(API_APPROVAL_CENTER_AUDIT_URL, {
      params: { ...filters, page: 1, export: 1 },
    });
    const payload = response?.data?.data?.data || response?.data?.data || {};
    return Array.isArray(payload.rows) ? payload.rows : [];
  };

  const handleExcelExport = async () => {
    setExporting(true);
    try {
      const exportRows = await fetchExportRows();
      if (!exportRows.length) {
        toast.info('No audit records to export');
        return;
      }
      const sheetRows = exportRows.map((row: any) => ({
        'Action At': dateTimeText(row.action_at),
        'Attendance Date': row.attendance_date ? chartDate(row.attendance_date) : '-',
        Employee: row.employee_name || '-',
        Serial: row.employee_serial || '-',
        'Branch/Project': row.branch_name || '-',
        Action: actionLabel(row.action),
        'Action By': row.action_by_name || '-',
        Remarks: row.remarks || '-',
      }));
      const worksheet = XLSX.utils.json_to_sheet(sheetRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Approval Audit');
      const stamp = `${filters.date_from || 'all'}_${filters.date_to || 'all'}`;
      XLSX.writeFile(workbook, `approval-audit-${stamp}.xlsx`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Approval Audit',
  });

  const columns = [
    { key: 'action_at', header: 'Action At', render: (row: any) => dateTimeText(row.action_at) },
    { key: 'attendance_date', header: 'Attendance Date', render: (row: any) => (row.attendance_date ? chartDate(row.attendance_date) : '-') },
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
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${actionBadgeClass(row.action)}`}>
          {actionLabel(row.action)}
        </span>
      ),
    },
    { key: 'action_by_name', header: 'Action By', render: (row: any) => row.action_by_name || '-' },
    { key: 'remarks', header: 'Remarks', render: (row: any) => row.remarks || '-' },
  ];

  return (
    <div>
      <HelmetTitle title="Approval Audit" />
      {(loading || exporting) && <Loader />}

      <div className="mb-3 border border-stroke bg-white p-3 dark:border-strokedark dark:bg-boxdark">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4 xl:grid-cols-6">
          <InputDatePicker
            id="date_from"
            name="date_from"
            label="From"
            selectedDate={dateFromString(filters.date_from)}
            setSelectedDate={(date) => setFilters((prev) => ({ ...prev, date_from: dateToString(date), page: 1 }))}
            setCurrentDate={(date) => setFilters((prev) => ({ ...prev, date_from: dateToString(date), page: 1 }))}
            className="h-10 w-full"
          />
          <InputDatePicker
            id="date_to"
            name="date_to"
            label="To"
            selectedDate={dateFromString(filters.date_to)}
            setSelectedDate={(date) => setFilters((prev) => ({ ...prev, date_to: dateToString(date), page: 1 }))}
            setCurrentDate={(date) => setFilters((prev) => ({ ...prev, date_to: dateToString(date), page: 1 }))}
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
 className="w-full font-medium text-sm p-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-black dark:text-white">Action</label>
            <Select
 name="action"
 value={filters.action}
 onChange={handleChange}
 className={`${FIELD_SELECT} block w-full p-2 text-sm`}
            >
              <option value="">All Actions</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cleared / Cancelled</option>
            </Select>
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
            placeholder="Employee, user, remarks"
            className="h-10"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-black dark:text-white">Per Page</label>
            <Select
 name="per_page"
 value={filters.per_page}
 onChange={handleChange}
 className={`${FIELD_SELECT} block w-full p-2 text-sm`}
            >
              {[10, 25, 50, 100, 200].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ButtonLoading
            type="button"
            label="Load"
            onClick={loadWithFilters}
            className="h-10 min-w-[110px] whitespace-nowrap px-5"
            icon={<FiRefreshCcw className="mr-2" />}
          />
          <PrintButton label="Print" onClick={handlePrint} className="h-10" disabled={!rows.length} />
          <Button
            type="button"
            onClick={handleExcelExport}
            disabled={exporting}
            className="inline-flex h-10 items-center justify-center whitespace-nowrap bg-emerald-700 px-5 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-400"
          >
            <FiDownload className="mr-2" />
            Excel
          </Button>
          <Link
            to={routes.approval_center}
            className="ml-auto inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold text-slate-700 hover:text-primary dark:text-slate-200"
          >
            <FiArrowLeft />
            Back to Approval Center
          </Link>
        </div>
      </div>

      <div className="border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke px-4 py-3 dark:border-strokedark">
          <h5 className="text-sm font-bold text-black dark:text-white">Attendance Approval Audit</h5>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{total} record(s)</span>
        </div>

        <Table columns={columns} data={rows} noDataMessage="No audit records found" />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stroke px-4 py-3 text-sm dark:border-strokedark">
          <div className="font-medium text-slate-600 dark:text-slate-300">
            Page {page} of {lastPage} | {total} record(s)
          </div>
          <Pagination
            currentPage={page}
            totalPages={lastPage}
            handlePageChange={changePage}
          />
        </div>
      </div>

      {/* Hidden printable view */}
      <div className="hidden">
        <div ref={printRef} className="p-6 text-slate-900">
          <h2 className="mb-1 text-lg font-bold">Approval Audit History</h2>
          <p className="mb-3 text-sm">
            {filters.date_from || 'Beginning'} to {filters.date_to || 'Today'}
            {filters.action ? ` | Action: ${actionLabel(filters.action)}` : ''}
          </p>
          <table className="w-full border-collapse text-xs" style={{ borderColor: 'rgb(var(--c-slate-300))' }}>
            <thead>
              <tr>
                {['Action At', 'Attendance Date', 'Employee', 'Serial', 'Branch/Project', 'Action', 'Action By', 'Remarks'].map((head) => (
                  <th key={head} style={{ border: '1px solid rgb(var(--c-slate-300))', padding: '4px', textAlign: 'left' }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.id}>
                  <td style={{ border: '1px solid rgb(var(--c-slate-300))', padding: '4px' }}>{dateTimeText(row.action_at)}</td>
                  <td style={{ border: '1px solid rgb(var(--c-slate-300))', padding: '4px' }}>{row.attendance_date ? chartDate(row.attendance_date) : '-'}</td>
                  <td style={{ border: '1px solid rgb(var(--c-slate-300))', padding: '4px' }}>{row.employee_name || '-'}</td>
                  <td style={{ border: '1px solid rgb(var(--c-slate-300))', padding: '4px' }}>{row.employee_serial || '-'}</td>
                  <td style={{ border: '1px solid rgb(var(--c-slate-300))', padding: '4px' }}>{row.branch_name || '-'}</td>
                  <td style={{ border: '1px solid rgb(var(--c-slate-300))', padding: '4px' }}>{actionLabel(row.action)}</td>
                  <td style={{ border: '1px solid rgb(var(--c-slate-300))', padding: '4px' }}>{row.action_by_name || '-'}</td>
                  <td style={{ border: '1px solid rgb(var(--c-slate-300))', padding: '4px' }}>{row.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApprovalAudit;
