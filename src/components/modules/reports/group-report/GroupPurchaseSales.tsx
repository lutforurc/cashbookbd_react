import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { FaHouse, FaPrint } from 'react-icons/fa6';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import InputDatePicker from '../../../utils/fields/DatePicker';
import httpService from '../../../services/httpService';
import { API_REPORT_GROUP_DATA_URL } from '../../../services/apiRoutes';

type ReportEntry = {
  year?: string;
  debit?: number | string;
  credit?: number | string;
  total?: number | string;
};

type ReportSection = {
  title: string;
  rows: Record<string, ReportEntry[]>;
};

type NormalizedReport = {
  months: string[];
  sections: ReportSection[];
  html: string;
};

const reportGroups = [
  { id: '0', name: 'All group' },
  { id: '1', name: 'Operating Cost' },
  { id: '2', name: 'Purchase Cost' },
];

const unwrapResponse = (value: any) => {
  let result = value;
  for (let index = 0; index < 3; index += 1) {
    if (
      result &&
      typeof result === 'object' &&
      !Array.isArray(result) &&
      Object.keys(result).length === 1 &&
      'data' in result
    ) {
      result = result.data;
    }
  }
  return result;
};

const normalizeReport = (raw: any, reportGroup: string): NormalizedReport => {
  const data = unwrapResponse(raw);
  if (typeof data === 'string') {
    return { months: [], sections: [], html: data };
  }

  const months = data?.monthNames ?? data?.month_names ?? [];
  const operatingRows = data?.report_data ?? data?.reportData ?? {};
  const purchaseRows = data?.purchases_data ?? data?.purchasesData ?? {};
  const sections: ReportSection[] = [];

  if ((reportGroup === '0' || reportGroup === '1') && Object.keys(operatingRows).length) {
    sections.push({ title: 'Operating Cost', rows: operatingRows });
  }
  if ((reportGroup === '0' || reportGroup === '2') && Object.keys(purchaseRows).length) {
    sections.push({ title: 'Purchase Cost', rows: purchaseRows });
  }

  return {
    months: Array.isArray(months) ? months : [],
    sections,
    html: '',
  };
};

const mergeReports = (reports: NormalizedReport[]): NormalizedReport => ({
  months: Array.from(new Set(reports.flatMap((report) => report.months))),
  sections: reports.flatMap((report) => report.sections),
  html: reports.map((report) => report.html).filter(Boolean).join('<br />'),
});

const amountForMonth = (entries: ReportEntry[], month: string, sectionTitle: string) => {
  const entry = entries.find((item) => item.year === month);
  if (!entry) return 0;
  if (sectionTitle === 'Purchase Cost') return Number(entry.total) || 0;
  return (Number(entry.debit) || 0) - (Number(entry.credit) || 0);
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const GroupPurchaseSales = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const { me } = useSelector((state: any) => state.auth);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState('');
  const [reportGroup, setReportGroup] = useState('1');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [report, setReport] = useState<NormalizedReport>({ months: [], sections: [], html: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
  }, [dispatch]);

  useEffect(() => {
    const protectedData = branchDdlData?.protectedData;
    if (!protectedData) return;
    setBranches(protectedData.data || []);
    setBranchId(String(me?.branch_id || ''));

    const transactionDate = protectedData.transactionDate;
    if (transactionDate) {
      const [day, month, year] = transactionDate.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      setStartDate(new Date(year, 0, 1));
      setEndDate(date);
    }
  }, [branchDdlData?.protectedData, me?.branch_id]);

  const selectedBranch = useMemo(
    () => branches.find((branch) => String(branch.id) === branchId),
    [branches, branchId],
  );

  const runReport = async () => {
    if (!branchId || !startDate || !endDate) {
      toast.error('Branch, report group and date range are required.');
      return;
    }
    if (startDate > endDate) {
      toast.error('Start date cannot be after end date.');
      return;
    }

    setLoading(true);
    try {
      const groups = reportGroup === '0' ? ['1', '2'] : [reportGroup];
      const responses = await Promise.all(
        groups.map((group) =>
          httpService.post(API_REPORT_GROUP_DATA_URL, {
            branch_id: branchId,
            report_group: group,
            startdate: dayjs(startDate).format('DD/MM/YYYY'),
            enddate: dayjs(endDate).format('DD/MM/YYYY'),
          }),
        ),
      );
      setReport(mergeReports(responses.map((response, index) => normalizeReport(response.data, groups[index]))));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to load group report.');
      setReport({ months: [], sections: [], html: '' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Group Report',
    removeAfterPrint: true,
  });

  const hasReport = Boolean(report.html || report.sections.length);

  return (
    <div>
      <HelmetTitle title="Group Report" />

      <div className="grid grid-cols-1 items-end gap-3 py-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_minmax(180px,0.8fr)_minmax(170px,0.65fr)_minmax(170px,0.65fr)_auto_auto_auto]">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Select Branch <span className="text-red-500">*</span>
          </label>
          {branchDdlData?.isLoading ? <Loader /> : null}
          <BranchDropdown
            branchDdl={branches}
            value={branchId}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setBranchId(event.target.value)}
            className="h-10 w-full p-2 text-sm font-medium"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Select Report Group <span className="text-red-500">*</span>
          </label>
          <select
            value={reportGroup}
            onChange={(event) => setReportGroup(event.target.value)}
            className="h-10 w-full rounded-sm border border-stroke bg-transparent px-3 text-sm outline-none dark:border-strokedark dark:bg-form-input"
          >
            {reportGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date *</label>
          <InputDatePicker
            selectedDate={startDate}
            setSelectedDate={setStartDate}
            setCurrentDate={setStartDate}
            className="h-10 w-full text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date *</label>
          <InputDatePicker
            selectedDate={endDate}
            setSelectedDate={setEndDate}
            setCurrentDate={setEndDate}
            className="h-10 w-full text-sm"
          />
        </div>

        <button type="button" onClick={runReport} disabled={loading} className="h-10 rounded-sm bg-primary px-6 text-sm font-medium text-white disabled:opacity-60">
          {loading ? 'Loading...' : 'OK'}
        </button>
        <button type="button" onClick={handlePrint} disabled={!hasReport} className="flex h-10 items-center justify-center gap-2 rounded-sm bg-primary px-5 text-sm font-medium text-white disabled:opacity-50">
          <FaPrint /> Print
        </button>
        <button type="button" onClick={() => navigate('/dashboard')} className="flex h-10 items-center justify-center gap-2 rounded-sm bg-primary px-5 text-sm font-medium text-white">
          <FaHouse /> Home
        </button>
      </div>

      {loading ? <Loader /> : null}

      <div ref={printRef} className={hasReport ? 'mt-4' : 'hidden'}>
        <div className="mb-4 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Group Report</h2>
          <p className="text-sm">{selectedBranch?.name || ''}</p>
          <p className="text-sm">
            Date Range: {startDate ? dayjs(startDate).format('DD/MM/YYYY') : ''} to {endDate ? dayjs(endDate).format('DD/MM/YYYY') : ''}
          </p>
        </div>

        {report.html ? <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: report.html }} /> : null}

        {report.sections.map((section) => {
          const rowEntries = Object.entries(section.rows);
          const monthTotals = report.months.map((month) =>
            rowEntries.reduce((sum, [, entries]) => sum + amountForMonth(entries, month, section.title), 0),
          );

          return (
            <div key={section.title} className="mb-6 overflow-x-auto">
              <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">{section.title}</h3>
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-gray-200 text-gray-900">
                  <tr>
                    <th className="border border-gray-400 px-3 py-2 text-left">Group Name</th>
                    {report.months.map((month) => <th key={month} className="border border-gray-400 px-3 py-2 text-right">{month}</th>)}
                    <th className="border border-gray-400 px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rowEntries.map(([name, entries]) => {
                    const values = report.months.map((month) => amountForMonth(entries, month, section.title));
                    return (
                      <tr key={name}>
                        <td className="border border-gray-300 px-3 py-2 font-medium">{name}</td>
                        {values.map((value, index) => <td key={`${name}-${report.months[index]}`} className="border border-gray-300 px-3 py-2 text-right">{formatAmount(value)}</td>)}
                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{formatAmount(values.reduce((sum, value) => sum + value, 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td className="border border-gray-400 px-3 py-2">Grand Total</td>
                    {monthTotals.map((total, index) => <td key={report.months[index]} className="border border-gray-400 px-3 py-2 text-right">{formatAmount(total)}</td>)}
                    <td className="border border-gray-400 px-3 py-2 text-right">{formatAmount(monthTotals.reduce((sum, total) => sum + total, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupPurchaseSales;
