import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FIELD_SELECT } from '../../../../theme/fieldStyles';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { FaHouse, FaPrint } from 'react-icons/fa6';
import { FiCheckSquare } from 'react-icons/fi';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import InputDatePicker from '../../../utils/fields/DatePicker';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import httpService from '../../../services/httpService';
import { API_REPORT_GROUP_DATA_URL } from '../../../services/apiRoutes';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import GroupReportPrint from './GroupReportPrint';

type ReportEntry = {
  year?: string;
  debit?: number | string;
  credit?: number | string;
  qty?: number | string;
  total?: number | string;
};

type ReportSection = {
  title: string;
  rows: Record<string, ReportEntry[]>;
};

type NormalizedReport = {
  months: string[];
  sections: ReportSection[];
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
  // A string here would be a server this endpoint never shipped on: the JSON
  // shape and this screen landed in the same hour (api 0036ea2e / 3c77895b),
  // so the old HTML fallback never served a real deploy. It was also the
  // app's last dangerouslySetInnerHTML, so nothing may quietly revive it.
  if (typeof data === 'string') {
    return { months: [], sections: [] };
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
  };
};

const mergeReports = (reports: NormalizedReport[]): NormalizedReport => ({
  months: Array.from(new Set(reports.flatMap((report) => report.months))),
  sections: reports.flatMap((report) => report.sections),
});

const amountText = (value: number) => (value > 0 ? thousandSeparator(value) : '-');

const pairForMonth = (entries: ReportEntry[], month: string, isPurchase: boolean) =>
  entries
    .filter((entry) => entry.year === month)
    .reduce(
      (sum, entry) => ({
        left: sum.left + Number((isPurchase ? entry.qty : entry.debit) || 0),
        right: sum.right + Number((isPurchase ? entry.total : entry.credit) || 0),
      }),
      { left: 0, right: 0 },
    );

const GroupReportTable = ({ section, months }: { section: ReportSection; months: string[] }) => {
  const rowEntries = Object.entries(section.rows);
  const isPurchase = section.title === 'Purchase Cost';
  const leftHeader = isPurchase ? 'Qty' : 'Payment';
  const rightHeader = isPurchase ? 'Amount' : 'Bill';
  const monthTotals = months.reduce<Record<string, { left: number; right: number }>>((totals, month) => {
    totals[month] = { left: 0, right: 0 };
    return totals;
  }, {});
  let grandLeft = 0;
  let grandRight = 0;

  return (
    <div className="mb-6">
      <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">{section.title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-left text-sm text-gray-700 dark:text-gray-300">
          <thead>
            <tr className="bg-gray-300 text-xs uppercase text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              <th rowSpan={2} className="w-[260px] px-3 py-3 text-left align-middle font-semibold">
                Description
              </th>
              {months.map((month) => (
                <th key={month} colSpan={2} className="px-3 py-3 text-center font-semibold">
                  {month}
                </th>
              ))}
              <th colSpan={2} className="px-3 py-3 text-center font-semibold">
                Line Total
              </th>
            </tr>
            <tr className="bg-gray-300 text-xs uppercase text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              {months.map((month) => (
                <React.Fragment key={`${month}-subhead`}>
                  <th className="px-3 py-3 text-center font-semibold">{leftHeader}</th>
                  <th className="px-3 py-3 text-center font-semibold">{rightHeader}</th>
                </React.Fragment>
              ))}
              <th className="px-3 py-3 text-center font-semibold">{leftHeader}</th>
              <th className="px-3 py-3 text-center font-semibold">{rightHeader}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {rowEntries.map(([name, entries], index) => {
              let rowLeft = 0;
              let rowRight = 0;
              const description = isPurchase ? `(${index + 1}) ${name}` : name;

              return (
                <tr key={name} className="transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2">{description}</td>
                  {months.map((month) => {
                    const pair = pairForMonth(entries, month, isPurchase);
                    rowLeft += pair.left;
                    rowRight += pair.right;
                    monthTotals[month].left += pair.left;
                    monthTotals[month].right += pair.right;
                    grandLeft += pair.left;
                    grandRight += pair.right;

                    return (
                      <React.Fragment key={`${name}-${month}`}>
                        <td className="px-3 py-2 text-right">{amountText(pair.left)}</td>
                        <td className="px-3 py-2 text-right">{amountText(pair.right)}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className="px-3 py-2 text-right">{amountText(rowLeft)}</td>
                  <td className="px-3 py-2 text-right">{amountText(rowRight)}</td>
                </tr>
              );
            })}
            <tr className="font-bold transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700">
              <td className="px-3 py-2 text-right">Grand Total</td>
              {months.map((month) => (
                <React.Fragment key={`${month}-total`}>
                  <td className="px-3 py-2 text-right">{amountText(monthTotals[month].left)}</td>
                  <td className="px-3 py-2 text-right">{amountText(monthTotals[month].right)}</td>
                </React.Fragment>
              ))}
              <td className="px-3 py-2 text-right">{amountText(grandLeft)}</td>
              <td className="px-3 py-2 text-right">{amountText(grandRight)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

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
  const [report, setReport] = useState<NormalizedReport>({ months: [], sections: [] });
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(14);
  const [fontSize, setFontSize] = useState(9);

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
      setReport({ months: [], sections: [] });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Group Report',
  });

  const handleActionButtonClick = () => {
    runReport();
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setRowsPerPage(Number.isNaN(value) ? 12 : value);
  };

  const handleFontSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setFontSize(Number.isNaN(value) ? 12 : value);
  };

  const hasReport = Boolean(report.sections.length);

  return (
    <div>
      <HelmetTitle title="Group Report" />

      <div className="py-3">
      
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.2fr)_minmax(220px,1fr)_minmax(170px,0.8fr)_minmax(170px,0.8fr)]">
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
              className={`${FIELD_SELECT} h-10 w-full rounded-sm px-3 text-sm`}
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
        </div>

        <div className="mt-3 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <ButtonLoading
            onClick={handleActionButtonClick}
            buttonLoading={loading}
            label="Apply"
            icon={<FiCheckSquare />}
            className="h-10 w-full px-6 sm:w-auto"
          />
          <PrintRowsInput
            id="groupReportRowsPerPage"
            name="groupReportRowsPerPage"
            label=""
            value={rowsPerPage.toString()}
            onChange={handleRowsPerPageChange}
            type="text"
            className="h-10 w-full! text-center text-sm font-medium sm:w-20!"
          />
          <PrintFontInput
            id="groupReportFontSize"
            name="groupReportFontSize"
            label=""
            value={fontSize.toString()}
            onChange={handleFontSizeChange}
            type="text"
            className="h-10 w-full! text-center text-sm font-medium sm:w-20!"
          />
          <button type="button" onClick={handlePrint} disabled={!hasReport} className="inline-flex h-10 w-full items-center justify-center gap-2 bg-gray-700 px-5 text-center text-sm font-medium text-white hover:bg-blue-400 focus:bg-blue-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            <FaPrint /> Print
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="col-span-2 inline-flex h-10 w-full items-center justify-center gap-2 bg-gray-700 px-5 text-center text-sm font-medium text-white hover:bg-blue-400 focus:bg-blue-400 focus:outline-none sm:col-span-1 sm:w-auto">
            <FaHouse /> Home
          </button>
        </div>
      </div>

      {loading ? <Loader /> : null}

      <div className={hasReport ? 'mt-4' : 'hidden'}>

        {report.sections.map((section) => (
          <GroupReportTable key={section.title} section={section} months={report.months} />
        ))}
      </div>

      <div className="hidden">
        <GroupReportPrint
          ref={printRef}
          title="Group Report"
          startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : undefined}
          endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
          sections={report.sections}
          months={report.months}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default GroupPurchaseSales;
