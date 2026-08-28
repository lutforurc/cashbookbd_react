import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { FiCheckSquare, FiRefreshCcw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';

import Loader from '../../../../common/Loader';
import {
  ButtonLoading,
  PrintButton,
} from '../../../../pages/UiElements/CustomButtons';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';
import { API_REPORT_BANK_INFORMATION_DATA_URL } from '../../../services/apiRoutes';
import BankInformationPrint from './BankInformationPrint';
import { Select } from '../../../utils/fields/FormControls';

type BankInformationRow = {
  coa4_id?: number | string;
  bank_name?: string;
  dr_bal?: number | string;
  cr_bal?: number | string;
};

const reportTypes = [
  { id: '1', name: 'Bank Balance' },
  { id: '2', name: 'Bank Loan' },
];

const toNumber = (value: unknown) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getRowsFromResponse = (response: any): BankInformationRow[] => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response)) return response;
  return [];
};

const parseTransactionDate = (value?: string | null) => {
  if (!value) return new Date();
  const [day, month, year] = value.split('/').map((item) => Number(item.trim()));
  if (!day || !month || !year) return new Date();
  return new Date(year, month - 1, day);
};

const BankInformation = () => {
  const dispatch = useDispatch();
  const printRef = useRef<HTMLDivElement>(null);
  const branchDdlData = useSelector((state: any) => state.branchDdl);

  const [branchId, setBranchId] = useState('');
  const [reportTypeId, setReportTypeId] = useState('1');
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [rows, setRows] = useState<BankInformationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(0);
  const [fontSize, setFontSize] = useState(12);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
  }, [dispatch]);

  useEffect(() => {
    const transactionDate = branchDdlData?.protectedData?.transactionDate;
    if (transactionDate) {
      setEndDate(parseTransactionDate(transactionDate));
    }
  }, [branchDdlData?.protectedData?.transactionDate]);

  const branchOptions = branchDdlData?.protectedData?.data || [];
  const selectedReportType = reportTypes.find((item) => item.id === reportTypeId)?.name || 'Bank Balance';

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc.debit += toNumber(row.dr_bal);
          acc.credit += toNumber(row.cr_bal);
          return acc;
        },
        { debit: 0, credit: 0 },
      ),
    [rows],
  );

  const balance = useMemo(
    () => ({
      debit: totals.debit > totals.credit ? totals.debit - totals.credit : 0,
      credit: totals.credit > totals.debit ? totals.credit - totals.debit : 0,
    }),
    [totals],
  );

  const handleLoad = async () => {
    if (!endDate) {
      toast.info('Please select end date.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await httpService.get(API_REPORT_BANK_INFORMATION_DATA_URL, {
        params: {
          branch_id: branchId,
          report_type_id: reportTypeId,
          enddate: dayjs(endDate).format('DD/MM/YYYY'),
        },
      });

      setRows(getRowsFromResponse(data));
    } catch (error: any) {
      setRows([]);
      toast.error(error?.response?.data?.message || 'Bank information data load failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBranchId('');
    setReportTypeId('1');
    setEndDate(parseTransactionDate(branchDdlData?.protectedData?.transactionDate));
    setRows([]);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Bank Information',
  });

  const controlClass =
    'h-10 w-full rounded-none border border-slate-600 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400 dark:border-[rgb(var(--c-gray-600))] dark:bg-[rgb(var(--c-boxdark))] dark:text-[rgb(var(--c-text))] dark:focus:border-slate-300';
  const labelClass = 'mb-1 block text-xs font-bold text-slate-950 dark:text-[rgb(var(--c-text))]';

  return (
    <div className="min-h-screen bg-slate-100 px-2 py-3 text-slate-900 dark:bg-[rgb(var(--c-gray-900))] dark:text-[rgb(var(--c-text))]">
      <HelmetTitle title="Bank Information" />
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="grid min-w-[320px] flex-1 grid-cols-1 items-end gap-3 md:grid-cols-3 md:max-xl:w-full md:max-xl:min-w-0 md:max-xl:flex-none xl:max-[1880px]:w-full xl:max-[1880px]:min-w-0 xl:max-[1880px]:flex-none min-[1881px]:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
          <div>
            <label className={labelClass}>Select Branch</label>
            <Select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={controlClass}>
              <option value="">All Branch</option>
              {branchOptions.map((branch: any) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className={labelClass}>Report Type</label>
            <Select value={reportTypeId} onChange={(event) => setReportTypeId(event.target.value)} className={controlClass}>
              {reportTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className={labelClass}>End Date</label>
            <InputDatePicker
 selectedDate={endDate}
 setSelectedDate={setEndDate}
 setCurrentDate={setEndDate}
 className="border! border-slate-600! bg-transparent px-3 text-sm font-bold dark:border-[rgb(var(--c-gray-600))]! dark:bg-[rgb(var(--c-boxdark))]!"
            />
          </div>
        </div>

        <div className="grid min-w-max grid-cols-[auto_auto_80px_80px_auto] items-end gap-2 overflow-x-auto xl:ml-auto">
          <ButtonLoading
          onClick={handleLoad}
            buttonLoading={loading}
            label="Apply"
            icon={<FiCheckSquare />}
            className="px-6"
          />
          <ButtonLoading
          onClick={handleReset}
            buttonLoading={false}
            label="Reset"
            icon={<FiRefreshCcw />}
            className="px-5"
          />
          <div>
            <label htmlFor="bank-info-rows" className={labelClass}>Rows</label>
            <PrintRowsInput
              id="bank-info-rows"
              name="bank-info-rows"
              label=""
              value={String(rowsPerPage)}
              onChange={(event: any) => setRowsPerPage(Number(event.target.value) || 12)}
              type="text"
              className="w-full! rounded-none text-center text-sm font-bold"
            />
          </div>
          <div>
            <label htmlFor="bank-info-font" className={labelClass}>Font</label>
            <PrintFontInput
              id="bank-info-font"
              name="bank-info-font"
              label=""
              value={String(fontSize)}
              onChange={(event: any) => setFontSize(Number(event.target.value) || 12)}
              type="text"
              className="w-full! rounded-none text-center text-sm font-bold"
            />
          </div>
          <PrintButton
            onClick={handlePrint}
            label="Print"
            className="px-6"
            disabled={rows.length === 0}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12">
          <Loader />
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-[rgb(var(--c-boxdark))]">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-sm" style={{ fontSize }}>
            <thead>
              <tr className="bg-slate-300 text-xs font-bold uppercase text-slate-950 dark:bg-[rgb(var(--c-form-strokedark))] dark:text-[rgb(var(--c-text))]">
                <th className="w-24 px-3 py-4 text-center">Sl. No.</th>
                <th className="px-3 py-4 text-left">Bank Name</th>
                <th className="w-40 px-3 py-4 text-right">Debit Balance</th>
                <th className="w-40 px-3 py-4 text-right">Credit Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900 dark:divide-[rgb(var(--c-strokedark))] dark:text-[rgb(var(--c-bodydark1))]">
              {rows.length > 0 ? (
                rows.map((row, index) => {
                  const debit = toNumber(row.dr_bal);
                  const credit = toNumber(row.cr_bal);

                  return (
                    <tr key={`${row.coa4_id ?? row.bank_name ?? index}-${index}`} className="bg-white dark:bg-[rgb(var(--c-boxdark))]">
                      <td className="px-3 py-3 text-center">{index + 1}</td>
                      <td className="px-3 py-3 text-sky-950 dark:text-slate-100">
                        {row.bank_name || '-'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {debit > 0 ? <span className="font-bold text-green-700">{thousandSeparator(debit)}</span> : 0}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {credit > 0 ? <span className="font-bold text-red-600">{thousandSeparator(credit)}</span> : 0}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500 dark:text-slate-300">
                    No {selectedReportType.toLowerCase()} data found
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold text-slate-950 dark:bg-[rgb(var(--c-meta-4))] dark:text-[rgb(var(--c-text))]">
              <tr className="font-bold">
                <td colSpan={2} className="px-3 py-3 text-right">Total</td>
                <td className="px-3 py-3 text-right">
                  {totals.debit > 0 ? <span className="text-green-700">{thousandSeparator(totals.debit)}</span> : 0}
                </td>
                <td className="px-3 py-3 text-right">
                  {totals.credit > 0 ? <span className="text-red-600">{thousandSeparator(totals.credit)}</span> : 0}
                </td>
              </tr>
              <tr className="font-bold">
                <td colSpan={2} className="px-3 py-3 text-right">Balance</td>
                <td className="px-3 py-3 text-right">
                  {balance.debit > 0 ? <span className="text-green-700">{thousandSeparator(balance.debit)}</span> : 0}
                </td>
                <td className="px-3 py-3 text-right">
                  {balance.credit > 0 ? <span className="text-red-600">{thousandSeparator(balance.credit)}</span> : 0}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="hidden">
        <BankInformationPrint
          ref={printRef}
          rows={rows}
          reportType={selectedReportType}
          endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : '-'}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default BankInformation;
