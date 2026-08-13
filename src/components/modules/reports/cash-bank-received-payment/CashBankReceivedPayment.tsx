import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiRefreshCcw } from 'react-icons/fi';

import Loader from '../../../../common/Loader';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import { API_REPORT_CASH_BANK_RECEIVED_PAYMENT_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import CashBankReceivedPaymentPrint from './CashBankReceivedPaymentPrint';

export type CashBankSummaryRow = {
  name?: string;
  cash_debit?: number | string;
  cash_credit?: number | string;
  bank_debit?: number | string;
  bank_credit?: number | string;
};

export type BankDetailRow = {
  bank_account_id?: number | string;
  bank_name?: string;
  received?: number | string;
  payment?: number | string;
};

const numberValue = (value: unknown) => {
  const result = Number(String(value ?? 0).replace(/,/g, ''));
  return Number.isFinite(result) ? result : 0;
};

const responseRows = (value: any): CashBankSummaryRow[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  return [];
};

const transactionDate = (value?: string) => {
  const [day, month, year] = String(value || '').split('/').map(Number);
  return day && month && year ? new Date(year, month - 1, day) : new Date();
};

const CashBankReceivedPayment = ({ user }: { user: any }) => {
  const dispatch = useDispatch();
  const branchData = useSelector((state: any) => state.branchDdl);
  const printRef = useRef<HTMLDivElement>(null);
  const defaultBranch = String(user?.user?.branch_id ?? '');
  const [branchId, setBranchId] = useState(defaultBranch);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [rows, setRows] = useState<CashBankSummaryRow[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [fontSize, setFontSize] = useState(12);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
  }, [dispatch]);

  useEffect(() => {
    const date = branchData?.protectedData?.transactionDate;
    if (date) {
      const parsed = transactionDate(date);
      setStartDate(parsed);
      setEndDate(parsed);
    }
  }, [branchData?.protectedData?.transactionDate]);

  const totals = useMemo(() => rows.reduce((sum, row) => ({
    cashReceived: sum.cashReceived + numberValue(row.cash_debit),
    cashPayment: sum.cashPayment + numberValue(row.cash_credit),
    bankReceived: sum.bankReceived + numberValue(row.bank_debit),
    bankPayment: sum.bankPayment + numberValue(row.bank_credit),
  }), { cashReceived: 0, cashPayment: 0, bankReceived: 0, bankPayment: 0 }), [rows]);

  const balance = {
    cashReceived: Math.max(totals.cashReceived - totals.cashPayment, 0),
    cashPayment: Math.max(totals.cashPayment - totals.cashReceived, 0),
    bankReceived: Math.max(totals.bankReceived - totals.bankPayment, 0),
    bankPayment: Math.max(totals.bankPayment - totals.bankReceived, 0),
  };

  const loadReport = async () => {
    if (!branchId || !startDate || !endDate) {
      toast.info('Please select project and date range.');
      return;
    }
    if (dayjs(startDate).isAfter(dayjs(endDate), 'day')) {
      toast.info('Start date cannot be after end date.');
      return;
    }
    setLoading(true);
    try {
      const response = await httpService.get(API_REPORT_CASH_BANK_RECEIVED_PAYMENT_URL, {
        params: {
          branch_id: branchId,
          start_date: dayjs(startDate).format('DD/MM/YYYY'),
          end_date: dayjs(endDate).format('DD/MM/YYYY'),
        },
      });
      setRows(responseRows(response.data));
      setBankDetails(Array.isArray(response.data?.bank_details) ? response.data.bank_details : []);
    } catch (error: any) {
      setRows([]);
      setBankDetails([]);
      toast.error(error?.response?.data?.message || 'Report data load failed.');
    } finally {
      setLoading(false);
    }
  };

  const print = useReactToPrint({ content: () => printRef.current, documentTitle: 'Cash & Bank Received & Payment', removeAfterPrint: true });
  const branches = branchData?.protectedData?.data || [];

  useEffect(() => {
    if (branches.length === 1) {
      setBranchId(String(branches[0].id));
    }
  }, [branches]);

  const selectedBranch = branches.find((branch: any) => String(branch.id) === branchId)?.name || '';
  const labelClass = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200';
  const amounts = [totals.cashReceived, totals.cashPayment, totals.bankReceived, totals.bankPayment];
  const balances = [balance.cashReceived, balance.cashPayment, balance.bankReceived, balance.bankPayment];

  return (
    <div className="text-slate-900 dark:text-white">
      <HelmetTitle title="Cash & Bank (Received & Payment)" />
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="grid min-w-[320px] flex-1 grid-cols-1 items-end gap-3 md:grid-cols-3 xl:max-w-[75%]">
          <div>
            <label className={labelClass}>Select Branch</label>
            {branchData.isLoading ? <Loader /> : ''}
            <BranchDropdown
              defaultValue={defaultBranch}
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className="h-10 w-full p-2 text-sm font-medium"
              branchDdl={branches}
            />
          </div>
          <div><label className={labelClass}>Start Date <span className="text-red-500">*</span></label><InputDatePicker selectedDate={startDate} setSelectedDate={setStartDate} setCurrentDate={setStartDate} className="font-medium text-sm w-full h-10" /></div>
          <div><label className={labelClass}>End Date <span className="text-red-500">*</span></label><InputDatePicker selectedDate={endDate} setSelectedDate={setEndDate} setCurrentDate={setEndDate} className="font-medium text-sm w-full h-10" /></div>
        </div>
        <div className="grid min-w-max grid-cols-[auto_auto_88px_88px_auto] items-end gap-2 overflow-x-auto xl:ml-auto">
          <ButtonLoading onClick={loadReport} buttonLoading={loading} label="Apply" icon={<FiCheckSquare />} className="h-10 px-5" />
          <ButtonLoading onClick={() => { setRows([]); setBankDetails([]); }} buttonLoading={false} label="Reset" icon={<FiRefreshCcw />} className="h-10 px-5" />
          <InputElement id="cash-bank-rows" name="cash-bank-rows" label="" value={String(rowsPerPage)} onChange={(event: any) => setRowsPerPage(Number(event.target.value) || 12)} type="text" className="h-10 !w-full text-center text-sm font-medium" />
          <InputElement id="cash-bank-font" name="cash-bank-font" label="" value={String(fontSize)} onChange={(event: any) => setFontSize(Number(event.target.value) || 12)} type="text" className="h-10 !w-full text-center text-sm font-medium" />
          <PrintButton onClick={print} label="Print" className="h-10 px-5" disabled={!rows.length} />
        </div>
      </div>

      {loading ? <div className="py-12"><Loader /></div> : <div className="overflow-x-auto bg-white dark:bg-[rgb(var(--c-boxdark))]">
        <table className="w-full min-w-[760px] border-collapse" style={{ fontSize }}>
          <thead className="bg-slate-300 text-xs font-bold uppercase text-slate-950 dark:bg-[rgb(var(--c-form-strokedark))] dark:text-white"><tr><th rowSpan={2} className="border border-slate-200 px-3 py-3 text-center dark:border-[rgb(var(--c-gray-600))]">Sl. No.</th><th rowSpan={2} className="border border-slate-200 px-3 py-3 text-left dark:border-[rgb(var(--c-gray-600))]">Account Name</th><th colSpan={2} className="border border-slate-200 px-3 py-2 text-center dark:border-[rgb(var(--c-gray-600))]">Cash Details</th><th colSpan={2} className="border border-slate-200 px-3 py-2 text-center dark:border-[rgb(var(--c-gray-600))]">Bank Details</th></tr><tr><th className="border border-slate-200 px-3 py-3 text-center dark:border-[rgb(var(--c-gray-600))]">Received (Tk.)</th><th className="border border-slate-200 px-3 py-3 text-center dark:border-[rgb(var(--c-gray-600))]">Payment (Tk.)</th><th className="border border-slate-200 px-3 py-3 text-center dark:border-[rgb(var(--c-gray-600))]">Received (Tk.)</th><th className="border border-slate-200 px-3 py-3 text-center dark:border-[rgb(var(--c-gray-600))]">Payment (Tk.)</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[rgb(var(--c-strokedark))]">{rows.length ? rows.map((row, index) => <tr key={`${row.name}-${index}`} className="bg-white dark:bg-[rgb(var(--c-boxdark))]"><td className="px-3 py-3 text-center">{index + 1}</td><td className="px-3 py-3">{row.name || '-'}</td>{[row.cash_debit, row.cash_credit, row.bank_debit, row.bank_credit].map((amount, cell) => <td key={cell} className="px-3 py-3 text-right">{thousandSeparator(numberValue(amount))}</td>)}</tr>) : <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No report data found</td></tr>}</tbody>
          <tfoot className="bg-slate-100 font-bold text-slate-950 dark:bg-[rgb(var(--c-meta-4))] dark:text-white"><tr><td colSpan={2} className="px-3 py-3 text-right">Total</td>{amounts.map((amount, index) => <td key={index} className="px-3 py-3 text-right">{thousandSeparator(amount)}</td>)}</tr><tr><td colSpan={2} className="px-3 py-3 text-right">Balance</td>{balances.map((amount, index) => <td key={index} className="px-3 py-3 text-right">{thousandSeparator(amount)}</td>)}</tr></tfoot>
        </table>
      </div>}

      {!loading && bankDetails.length > 0 && <div className="mt-5 overflow-x-auto bg-white dark:bg-[rgb(var(--c-boxdark))]">
        <h2 className="bg-slate-200 px-3 py-3 text-center text-sm font-bold uppercase text-slate-950 dark:bg-[rgb(var(--c-strokedark))] dark:text-white">Bank-wise Details</h2>
        <table className="w-full min-w-[620px] border-collapse" style={{ fontSize }}>
          <thead className="bg-slate-300 text-xs font-bold uppercase text-slate-950 dark:bg-[rgb(var(--c-form-strokedark))] dark:text-white"><tr><th className="px-3 py-3 text-center">Sl. No.</th><th className="px-3 py-3 text-left">Bank Account</th><th className="px-3 py-3 text-right">Received (Tk.)</th><th className="px-3 py-3 text-right">Payment (Tk.)</th><th className="px-3 py-3 text-right">Balance (Tk.)</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[rgb(var(--c-strokedark))]">{bankDetails.map((bank, index) => {
            const received = numberValue(bank.received);
            const payment = numberValue(bank.payment);
            return <tr key={`${bank.bank_account_id ?? bank.bank_name}-${index}`}><td className="px-3 py-3 text-center">{index + 1}</td><td className="px-3 py-3 font-medium">{bank.bank_name || '-'}</td><td className="px-3 py-3 text-right">{received > 0 ? thousandSeparator(received) : '-'}</td><td className="px-3 py-3 text-right">{payment > 0 ? thousandSeparator(payment) : '-'}</td><td className="px-3 py-3 text-right font-bold">{thousandSeparator(received - payment)}</td></tr>;
          })}</tbody>
          <tfoot className="bg-slate-100 font-bold text-slate-950 dark:bg-[rgb(var(--c-meta-4))] dark:text-white"><tr><td colSpan={2} className="px-3 py-3 text-right">Total</td><td className="px-3 py-3 text-right">{thousandSeparator(bankDetails.reduce((sum, bank) => sum + numberValue(bank.received), 0))}</td><td className="px-3 py-3 text-right">{thousandSeparator(bankDetails.reduce((sum, bank) => sum + numberValue(bank.payment), 0))}</td><td className="px-3 py-3 text-right">{thousandSeparator(bankDetails.reduce((sum, bank) => sum + numberValue(bank.received) - numberValue(bank.payment), 0))}</td></tr></tfoot>
        </table>
      </div>}
      <div className="hidden"><CashBankReceivedPaymentPrint ref={printRef} rows={rows} bankDetails={bankDetails} projectName={selectedBranch} startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : '-'} endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : '-'} rowsPerPage={rowsPerPage} fontSize={fontSize} /></div>
    </div>
  );
};

export default CashBankReceivedPayment;
