import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { FiCheckSquare, FiRefreshCcw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';

import Loader from '../../../../common/Loader';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';
import { API_SOMITY_MONTHLY_REPORT_DATA_URL } from '../../../services/apiRoutes';
import MonthlyReportPrint, {
  getMonthlyReportRows,
  MonthlyReportRow,
  summarizeMonthlyRows,
  toNumber,
} from './MonthlyReportPrint';

const parseTransactionDate = (value?: string | null) => {
  if (!value) return new Date();
  const [day, month, year] = value.split('/').map((item) => Number(item.trim()));
  if (!day || !month || !year) return new Date();
  return new Date(year, month - 1, day);
};

const getFirstDayOfMonth = (date: Date | null) => {
  const source = date || new Date();
  return new Date(source.getFullYear(), source.getMonth(), 1);
};

const MonthlyReport = (user: any) => {
  const dispatch = useDispatch();
  const printRef = useRef<HTMLDivElement>(null);
  const branchDdlData = useSelector((state: any) => state.branchDdl);

  const [branchId, setBranchId] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(getFirstDayOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [rows, setRows] = useState<MonthlyReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [fontSize, setFontSize] = useState(12);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    if (user?.user?.branch_id) {
      setBranchId(String(user.user.branch_id));
    }
  }, [dispatch, user?.user?.branch_id]);

  useEffect(() => {
    const transactionDate = branchDdlData?.protectedData?.transactionDate;
    if (transactionDate) {
      const parsedDate = parseTransactionDate(transactionDate);
      setStartDate(getFirstDayOfMonth(parsedDate));
      setEndDate(parsedDate);
    }
  }, [branchDdlData?.protectedData?.transactionDate]);

  const branchOptions = branchDdlData?.protectedData?.data || [];
  const branchName = useMemo(
    () => branchOptions.find((branch: any) => String(branch.id) === String(branchId))?.name || 'Selected Project',
    [branchOptions, branchId],
  );
  const totals = useMemo(() => summarizeMonthlyRows(rows), [rows]);

  const handleLoad = async () => {
    if (!branchId) {
      toast.info('Please select project.');
      return;
    }
    if (!startDate || !endDate) {
      toast.info('Please select start and end date.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await httpService.post(API_SOMITY_MONTHLY_REPORT_DATA_URL, {
        branch_id: branchId,
        startdate: dayjs(startDate).format('DD/MM/YYYY'),
        enddate: dayjs(endDate).format('DD/MM/YYYY'),
      });

      setRows(getMonthlyReportRows(data));
    } catch (error: any) {
      setRows([]);
      toast.error(error?.response?.data?.message || 'Monthly report data load failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const parsedDate = parseTransactionDate(branchDdlData?.protectedData?.transactionDate);
    setBranchId(user?.user?.branch_id ? String(user.user.branch_id) : '');
    setStartDate(getFirstDayOfMonth(parsedDate));
    setEndDate(parsedDate);
    setRows([]);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Monthly Report',
    removeAfterPrint: true,
  });

  const controlClass =
    'h-9 w-full rounded-none border border-slate-600 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400 dark:border-[rgb(var(--c-gray-600))] dark:bg-[rgb(var(--c-boxdark))] dark:text-white dark:focus:border-slate-300';
  const labelClass = 'mb-1 block text-xs font-bold text-slate-950 dark:text-white';

  return (
    <div className="min-h-screen bg-slate-100 px-2 py-3 text-slate-900 dark:bg-[rgb(var(--c-gray-900))] dark:text-white">
      <HelmetTitle title="Monthly Report" />
      <div className="mb-3 grid grid-cols-1 items-end gap-2 md:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_minmax(150px,170px)_minmax(150px,170px)_minmax(390px,auto)]">
        <div>
          <label className={labelClass}>Select Project</label>
          <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={controlClass}>
            <option value="">Select Project</option>
            {branchOptions.map((branch: any) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Start Date</label>
          <InputDatePicker
            selectedDate={startDate}
            setSelectedDate={setStartDate}
            setCurrentDate={setStartDate}
            className="h-9 rounded-none !border !border-slate-600 bg-transparent px-3 text-sm font-bold dark:!border-[rgb(var(--c-gray-600))] dark:!bg-[rgb(var(--c-boxdark))]"
          />
        </div>

        <div>
          <label className={labelClass}>End Date</label>
          <InputDatePicker
            selectedDate={endDate}
            setSelectedDate={setEndDate}
            setCurrentDate={setEndDate}
            className="h-9 rounded-none !border !border-slate-600 bg-transparent px-3 text-sm font-bold dark:!border-[rgb(var(--c-gray-600))] dark:!bg-[rgb(var(--c-boxdark))]"
          />
        </div>

        <div className="grid w-full grid-cols-2 items-end gap-2 md:col-span-2 lg:col-span-1 lg:grid-cols-[minmax(78px,1fr)_minmax(78px,1fr)_64px_64px_minmax(78px,1fr)]">
          <ButtonLoading onClick={handleLoad} buttonLoading={loading} label="Apply" icon={<FiCheckSquare />} className="h-9 w-full px-2" />
          <ButtonLoading onClick={handleReset} buttonLoading={false} label="Reset" icon={<FiRefreshCcw />} className="h-9 w-full px-2" />
          <div>
            <label htmlFor="monthly-report-rows" className={labelClass}>Rows</label>
            <InputElement
              id="monthly-report-rows"
              name="monthly-report-rows"
              label=""
              value={String(rowsPerPage)}
              onChange={(event: any) => setRowsPerPage(Number(event.target.value) || 30)}
              type="text"
              className="h-9 !w-full rounded-none text-center text-sm font-bold"
            />
          </div>
          <div>
            <label htmlFor="monthly-report-font" className={labelClass}>Font</label>
            <InputElement
              id="monthly-report-font"
              name="monthly-report-font"
              label=""
              value={String(fontSize)}
              onChange={(event: any) => setFontSize(Number(event.target.value) || 12)}
              type="text"
              className="h-9 !w-full rounded-none text-center text-sm font-bold"
            />
          </div>
          <PrintButton onClick={handlePrint} label="Print" className="h-9 w-full px-2" disabled={rows.length === 0} />
        </div>
      </div>

      {loading ? (
        <div className="py-12"><Loader /></div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-[rgb(var(--c-boxdark))]">
          <table className="w-full min-w-[1080px] table-fixed border-collapse text-sm" style={{ fontSize }}>
            <thead>
              <tr className="bg-slate-300 text-xs font-bold text-slate-950 dark:bg-[rgb(var(--c-form-strokedark))] dark:text-white">
                <th className="w-20 px-3 py-4 text-center">ক্রমিক</th>
                <th className="w-40 px-3 py-4 text-center">তারিখ</th>
                <th className="px-3 py-4 text-right">বিতরণ</th>
                <th className="px-3 py-4 text-right">ডাউন পেমেন্ট</th>
                <th className="px-3 py-4 text-right">কিস্তি আদায়</th>
                <th className="px-3 py-4 text-right">নগদ বিক্রয়</th>
                <th className="px-3 py-4 text-right">খরচ</th>
                <th className="w-36 px-3 py-4 text-left">মন্তব্য</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900 dark:divide-[rgb(var(--c-strokedark))] dark:text-[rgb(var(--c-bodydark1))]">
              {rows.length > 0 ? (
                rows.map((row, index) => (
                  <tr key={`${row.selected_date}-${index}`} className="bg-white transition hover:bg-slate-50 dark:bg-[rgb(var(--c-boxdark))] dark:hover:bg-[rgb(var(--c-strokedark))]">
                    <td className="px-3 py-4 text-center">{index + 1}</td>
                    <td className="px-3 py-4 text-center">{row.selected_date || '-'}</td>
                    <td className="px-3 py-4 text-right">{thousandSeparator(toNumber(row.sales))}</td>
                    <td className="px-3 py-4 text-right">{thousandSeparator(toNumber(row.downpayment))}</td>
                    <td className="px-3 py-4 text-right">{thousandSeparator(toNumber(row.kistyaday))}</td>
                    <td className="px-3 py-4 text-right">{thousandSeparator(toNumber(row.cashsales))}</td>
                    <td className="px-3 py-4 text-right">{thousandSeparator(toNumber(row.expenditure))}</td>
                    <td className="px-3 py-4 text-left">{row.comments || row.remarks || ''}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500 dark:text-slate-300">No data found</td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot className="bg-slate-300 font-bold text-slate-950 dark:bg-[rgb(var(--c-form-strokedark))] dark:text-white">
                <tr>
                  <td colSpan={2} className="px-3 py-3 text-right text-base">Grand Total</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(totals.sales)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(totals.downpayment)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(totals.kistyaday)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(totals.cashsales)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(totals.expenditure)}</td>
                  <td className="px-3 py-3 text-left"></td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}

      <div className="hidden">
        <MonthlyReportPrint
          ref={printRef}
          rows={rows}
          branchName={branchName}
          startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : '-'}
          endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : '-'}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default MonthlyReport;
