import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { FaHouse, FaPrint } from 'react-icons/fa6';
import { FiCheckSquare } from 'react-icons/fi';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import InputDatePicker from '../../../utils/fields/DatePicker';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import httpService from '../../../services/httpService';
import { API_REPORT_BUSINESS_SUMMARY_URL } from '../../../services/apiRoutes';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import BusinessSummaryPrint from './BusinessSummaryPrint';
import BusinessSummaryDetailModal from './BusinessSummaryDetailModal';
import { businessBlocks } from './businessSummaryData';
import type {
  BusinessGroupRow,
  BusinessLine,
  BusinessMonthInfo,
  BusinessMonthValue,
  BusinessSummaryData,
} from './businessSummaryData';
import { useLanguage } from '../../../../i18n/useLanguage';
import { localizeReport } from '../../../../i18n/displayName';
import { useLocalDigits } from '../../../../i18n/useLocalDigits';
import { rl } from '../../../../i18n/reportLabel';

const figure = (v: BusinessMonthValue | undefined, field: 'opening' | 'closing') =>
  v ? thousandSeparator(v[field]) : '-';

// Laid out as Group Report's screen table, with Assets, Liabilities and
// Equity running on in one table, each under a heading row of its own.
const BusinessSummaryTable = ({
  lines,
  months,
  onGroupClick,
}: {
  lines: BusinessLine[];
  months: BusinessMonthInfo[];
  onGroupClick: (row: BusinessGroupRow) => void;
}) => (
  <div className="mb-6 overflow-x-auto">
    <table className="min-w-full table-fixed text-left text-sm text-gray-700 dark:text-gray-300">
      <thead>
        <tr className="bg-gray-300 text-xs uppercase text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          <th rowSpan={2} className="w-[260px] px-3 py-3 text-left align-middle font-semibold">
            {rl("Description")}
          </th>
          {months.map((month) => (
            <th key={month.month} colSpan={2} className="px-3 py-3 text-center font-semibold">
              {month.label}
            </th>
          ))}
        </tr>
        <tr className="bg-gray-300 text-xs uppercase text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          {months.map((month) => (
            <React.Fragment key={`${month.month}-subhead`}>
              <th className="px-3 py-3 text-center font-semibold">{rl("Opening")}</th>
              <th className="px-3 py-3 text-center font-semibold">{rl("Closing")}</th>
            </React.Fragment>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-[rgb(var(--c-table-body))] dark:divide-gray-700">
        {lines.map((line, index) => {
          if (line.kind === 'section') {
            return (
              <tr key={`section-${rl(line.title)}`} className="bg-gray-100 dark:bg-gray-800">
                <td colSpan={1 + months.length * 2} className="px-3 py-2 font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {rl(line.title)}
                </td>
              </tr>
            );
          }

          if (line.kind === 'group') {
            const row = line.row;
            return (
              <tr key={`${row.side}-${row.name}`} className="transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700">
                <td className="px-3 py-2">
                  {/* A row is the sum of its accounts: the name opens them. */}
                  <button
                    type="button"
                    className="text-left text-blue-600 hover:underline dark:text-blue-300"
                    onClick={() => onGroupClick(row)}
                    title={rl("Show accounts")}
                  >
                    {row.name}
                  </button>
                </td>
                {months.map((month) => (
                  <React.Fragment key={`${row.name}-${month.month}`}>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{figure(row.months?.[month.month], 'opening')}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{figure(row.months?.[month.month], 'closing')}</td>
                  </React.Fragment>
                ))}
              </tr>
            );
          }

          return (
            <tr key={`total-${rl(line.label)}-${index}`} className="font-bold transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700">
              <td className="px-3 py-2 text-right">{rl(line.label)}</td>
              {months.map((month) => (
                <React.Fragment key={`${rl(line.label)}-${month.month}`}>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{figure(line.values[month.month], 'opening')}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{figure(line.values[month.month], 'closing')}</td>
                </React.Fragment>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const BusinessSummary = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const { me } = useSelector((state: any) => state.auth);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState('');
  // A run of months, twelve at the most; each picker is a date and only its
  // month and year count.
  const [startMonth, setStartMonth] = useState<Date | null>(null);
  const [endMonth, setEndMonth] = useState<Date | null>(null);
  const [rawData, setData] = useState<BusinessSummaryData | null>(null);
  const { code: languageCode } = useLanguage();
  const digitsRef = useRef<HTMLDivElement>(null);
  // Bangla digits too when the screen is in Bangla.
  useLocalDigits(digitsRef, languageCode !== 'en');
  // Head names in Bangla when the screen is in Bangla.
  const data = useMemo(() => localizeReport(rawData, languageCode), [rawData, languageCode]);
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(0);
  const [fontSize, setFontSize] = useState(9);
  const [detailGroup, setDetailGroup] = useState<BusinessGroupRow | null>(null);

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
      // The working month alone; the reader widens it, twelve months at most.
      setStartMonth(new Date(year, month - 1, 1));
      setEndMonth(new Date(year, month - 1, day));
    }
  }, [branchDdlData?.protectedData, me?.branch_id]);

  const lines = useMemo(() => businessBlocks(data).flat(), [data]);

  const runReport = async () => {
    if (!branchId || !startMonth || !endMonth) {
      toast.error('Branch, start month and end month are required.');
      return;
    }

    const from = dayjs(startMonth).startOf('month');
    const to = dayjs(endMonth).startOf('month');
    const span = to.diff(from, 'month') + 1;

    if (span < 1) {
      toast.error('End month cannot be before start month.');
      return;
    }
    if (span > 12) {
      toast.error('Start month to end month can be 12 months at the most.');
      return;
    }

    setLoading(true);
    try {
      const response = await httpService.post(API_REPORT_BUSINESS_SUMMARY_URL, {
        branch_id: branchId,
        start_month: from.format('YYYY-MM'),
        end_month: to.format('YYYY-MM'),
      });
      const payload = response?.data;
      if (!payload?.success) {
        throw new Error(payload?.message || 'Unable to load business summary.');
      }
      setData(payload?.data?.data ?? payload?.data ?? null);
      setPeriod(`${from.format('MMM-YY')} to ${to.format('MMM-YY')}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to load business summary.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: rl("Business Summary"),
  });

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setRowsPerPage(Number.isNaN(value) ? 12 : value);
  };

  const handleFontSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setFontSize(Number.isNaN(value) ? 12 : value);
  };

  const hasReport = lines.length > 0;

  return (
    <div ref={digitsRef}>
      <HelmetTitle title="Business Summary" />

      {/* `@container`: the row follows the panel's own width, not the
          screen's -- inside the tab page the panel is far narrower than the
          viewport. One column on a phone; the three fields side by side from
          @xl with the actions in a full row beneath them; and from @6xl, where
          the fields still keep ~200px each, the actions join them on one row.
          ⚠️ `min-w-0` on each cell: a column may narrow to whatever the row
          leaves instead of painting over the actions beside it. */}
      <div className="@container py-3">
          <div className="grid min-w-0 grid-cols-1 items-end gap-3 @xl:grid-cols-3 @6xl:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {rl("Select Branch")} <span className="text-red-500">*</span>
              </label>
              {branchDdlData?.isLoading ? <Loader /> : null}
              <BranchDropdown
                branchDdl={branches}
                value={branchId}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setBranchId(event.target.value)}
                className="h-10 w-full p-2 text-sm font-medium"
              />
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{rl("Start Month")} *</label>
              <InputDatePicker
                selectedDate={startMonth}
                setSelectedDate={setStartMonth}
                setCurrentDate={setStartMonth}
                month
                className="w-full text-sm"
              />
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{rl("End Month")} *</label>
              <InputDatePicker
                selectedDate={endMonth}
                setSelectedDate={setEndMonth}
                setCurrentDate={setEndMonth}
                month
                className="w-full text-sm"
              />
            </div>

          {/* On a phone the actions are a two-column grid -- Apply across the
              full width, then All beside the font size and Print beside Home --
              so no box is left half-width. From @md they are one wrapping row,
              never nowrap: a row that no longer fits breaks onto the next line
              instead of running off the edge. */}
          <div className="grid grid-cols-2 items-end gap-2 @md:flex @md:flex-wrap @md:justify-end @xl:col-span-3 @6xl:col-span-1">
            <ButtonLoading
              onClick={runReport}
              buttonLoading={loading}
              label="Apply"
              icon={<FiCheckSquare />}
              className="col-span-2 w-full px-6 @md:w-auto"
            />
            <PrintRowsInput
              id="businessSummaryRowsPerPage"
              name="businessSummaryRowsPerPage"
              label=""
              value={rowsPerPage.toString()}
              onChange={handleRowsPerPageChange}
              type="text"
              className="w-full! text-center text-sm font-medium @md:w-20!"
            />
            <PrintFontInput
              id="businessSummaryFontSize"
              name="businessSummaryFontSize"
              label=""
              value={fontSize.toString()}
              onChange={handleFontSizeChange}
              type="text"
              className="w-full! text-center text-sm font-medium @md:w-20!"
            />
            <Button type="button" onClick={handlePrint} disabled={!hasReport} variant="default"
              className="inline-flex w-full items-center justify-center gap-2 px-5 text-center text-sm font-medium focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 @md:w-auto">
              <FaPrint /> Print
            </Button>
            <Button type="button" onClick={() => navigate('/dashboard')} variant="default"
              className="inline-flex w-full items-center justify-center gap-2 px-5 text-center text-sm font-medium focus:outline-none @md:w-auto">
              <FaHouse /> Home
            </Button>
          </div>
          </div>
      </div>

      {loading ? <Loader /> : null}

      <div className={hasReport ? 'mt-4' : 'hidden'}>
        {data ? (
          <BusinessSummaryTable lines={lines} months={data.months} onGroupClick={setDetailGroup} />
        ) : null}
      </div>

      {detailGroup && data ? (
        <BusinessSummaryDetailModal
          branchId={Number(branchId)}
          months={data.months}
          group={detailGroup}
          onClose={() => setDetailGroup(null)}
        />
      ) : null}

      <div className="hidden">
        <BusinessSummaryPrint
          ref={printRef}
          title={rl("Business Summary")}
          period={period}
          data={data}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default BusinessSummary;
