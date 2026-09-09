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
import BankInformationPrint, {
  balanceLabels,
  splitBankRow,
  sumBankColumns,
} from './BankInformationPrint';
import { Select } from '../../../utils/fields/FormControls';
import { FIELD_HEIGHT } from '../../../../theme/fieldStyles';

type BankInformationRow = {
  coa4_id?: number | string;
  bank_name?: string;
  /** Signed: what the head held the day before the period opened. */
  opening?: number | string;
  /** Signed: what the period itself did to it. */
  movement?: number | string;
  movement_debit?: number | string;
  movement_credit?: number | string;
  /** Signed: opening + movement. A negative one is an overdraft. */
  closing?: number | string;
  dr_bal?: number | string;
  cr_bal?: number | string;
};

const reportTypes = [
  { id: '1', name: 'Bank Balance' },
  { id: '2', name: 'Bank Loan' },
];

const getRowsFromResponse = (response: any): BankInformationRow[] => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response)) return response;
  return [];
};

/**
 * A figure in one of the six money columns.
 *
 * Nothing here is signed any more -- which way the money went is said by the
 * column it stands under -- so the colour follows the side instead: what the
 * branch holds or took in reads green, what it owes or paid out red. Zero is
 * left as thousandSeparator's dash rather than a 0, so a column of untouched
 * accounts does not read as a column of figures. All six columns share this
 * because a rule applied six times by hand is a rule that drifts.
 */
const money = (value: number, side: 'debit' | 'credit') => (
  <span
    className={
      value === 0
        ? 'text-slate-400'
        : side === 'debit'
          ? 'font-bold text-green-700'
          : 'font-bold text-red-600'
    }
  >
    {thousandSeparator(value)}
  </span>
);

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
  // A balance cannot be an OPENING one without a day to stand before, so the
  // report takes a period now rather than a single date. Month to date is what
  // a bank statement is usually read against, so that is where it starts.
  const [startDate, setStartDate] = useState<Date | null>(dayjs().startOf('month').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [rows, setRows] = useState<BankInformationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(0);
  const [fontSize, setFontSize] = useState(10);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
  }, [dispatch]);

  useEffect(() => {
    const transactionDate = branchDdlData?.protectedData?.transactionDate;
    if (transactionDate) {
      const asOf = parseTransactionDate(transactionDate);
      setEndDate(asOf);
      setStartDate(dayjs(asOf).startOf('month').toDate());
    }
  }, [branchDdlData?.protectedData?.transactionDate]);

  const branchOptions = branchDdlData?.protectedData?.data || [];
  const selectedReportType = reportTypes.find((item) => item.id === reportTypeId)?.name || 'Bank Balance';

  // Footed from the rows on screen rather than read off the payload, so the
  // foot of the report can never disagree with the column above it.
  const totals = useMemo(() => sumBankColumns(rows), [rows]);

  // What a balance on either side is called here -- an overdraft on a bank
  // account is an outstanding amount on a loan. Taken from the report type the
  // dropdown currently holds, so the header changes with it.
  const balanceHeads = balanceLabels(reportTypeId);

  const handleLoad = async () => {
    if (!startDate || !endDate) {
      toast.info('Please select the start and end date.');
      return;
    }

    if (dayjs(startDate).isAfter(dayjs(endDate), 'day')) {
      toast.info('The start date cannot be after the end date.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await httpService.get(API_REPORT_BANK_INFORMATION_DATA_URL, {
        params: {
          branch_id: branchId,
          report_type_id: reportTypeId,
          startdate: dayjs(startDate).format('DD/MM/YYYY'),
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
    const asOf = parseTransactionDate(branchDdlData?.protectedData?.transactionDate);
    setEndDate(asOf);
    setStartDate(dayjs(asOf).startOf('month').toDate());
    setRows([]);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Bank Information',
  });

  // The height comes from FIELD_HEIGHT, not from an `h-` written here. These
  // two selects stood at h-10 while the End Date beside them -- an
  // InputDatePicker, which draws itself from FIELD_BASE -- stood at the app's
  // one control height, so the filter row had a 40px box sharing an edge with a
  // 34px one.
  const controlClass =
    `${FIELD_HEIGHT} w-full rounded-none border border-slate-600 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400 dark:border-[rgb(var(--c-gray-600))] dark:bg-[rgb(var(--c-boxdark))] dark:text-[rgb(var(--c-text))] dark:focus:border-slate-300`;
  const labelClass = 'mb-1 block text-xs font-bold text-slate-950 dark:text-[rgb(var(--c-text))]';

  // One rule for the grid, written once. Both header rows and every body cell
  // draw the same border token, which is what keeps the line under a merged
  // heading meeting the lines between the columns below it.
  const headCell = 'border border-[rgb(var(--c-border))] px-3 py-2 text-center';
  const bodyCell = 'border border-[rgb(var(--c-border))] px-3 py-2';

  return (
    <div className="min-h-screen bg-slate-100 px-2 py-3 text-slate-900 dark:bg-[rgb(var(--c-gray-900))] dark:text-[rgb(var(--c-text))]">
      <HelmetTitle title="Bank Information" />
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="grid min-w-[320px] flex-1 grid-cols-1 items-end gap-3 md:grid-cols-2 lg:grid-cols-4 md:max-xl:w-full md:max-xl:min-w-0 md:max-xl:flex-none xl:max-[1880px]:w-full xl:max-[1880px]:min-w-0 xl:max-[1880px]:flex-none min-[1881px]:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
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
            <label className={labelClass}>Start Date</label>
            <InputDatePicker
              selectedDate={startDate}
              setSelectedDate={setStartDate}
              setCurrentDate={setStartDate}
              className="border! border-slate-600! bg-transparent px-3 text-sm font-bold dark:border-[rgb(var(--c-gray-600))]! dark:bg-[rgb(var(--c-boxdark))]!"
            />
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
              onChange={(event: any) => setRowsPerPage(Number(event.target.value) || 0)}
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
          <table className="w-full min-w-270 table-fixed border-collapse text-sm" style={{ fontSize }}>
            {/* The widths live here rather than on the header cells. Under
                table-fixed the browser sizes the columns off the FIRST row
                alone, and that row is now all merged cells -- a width written on
                the row of sub-headings underneath would never be read. w-32
                holds "Outstanding", the longest of the six, on one line. */}
            <colgroup>
              <col className="w-16" />
              <col />
              <col span={6} className="w-32" />
            </colgroup>
            {/* Two header rows: the period a pair belongs to on top, the side of
                the money underneath. Sl. No. and Bank Name are one question
                rather than two, so they span both rows and sit centred against
                them. The cells are ruled on all four sides -- with six money
                columns, a row of figures with nothing between them is a row
                that gets read off against the wrong heading. */}
            <thead>
              <tr className="bg-slate-300 text-xs font-bold uppercase text-slate-950 dark:bg-[rgb(var(--c-form-strokedark))] dark:text-[rgb(var(--c-text))]">
                <th rowSpan={2} className={`${headCell} align-middle`}>Sl. No.</th>
                <th rowSpan={2} className={`${headCell} text-left align-middle`}>Bank Name</th>
                <th colSpan={2} className={headCell}>Opening</th>
                <th colSpan={2} className={headCell}>Movement</th>
                <th colSpan={2} className={headCell}>Closing</th>
              </tr>
              <tr className="bg-slate-300 text-xs font-bold uppercase text-slate-950 dark:bg-[rgb(var(--c-form-strokedark))] dark:text-[rgb(var(--c-text))]">
                <th className={headCell}>{balanceHeads.debit}</th>
                <th className={headCell}>{balanceHeads.credit}</th>
                <th className={headCell}>Received</th>
                <th className={headCell}>Payment</th>
                <th className={headCell}>{balanceHeads.debit}</th>
                <th className={headCell}>{balanceHeads.credit}</th>
              </tr>
            </thead>
            <tbody className="text-slate-900 dark:text-[rgb(var(--c-bodydark1))]">
              {rows.length > 0 ? (
                rows.map((row, index) => {
                  const columns = splitBankRow(row);

                  return (
                    <tr key={`${row.coa4_id ?? row.bank_name ?? index}-${index}`} className="bg-white dark:bg-[rgb(var(--c-boxdark))]">
                      <td className={`${bodyCell} text-center`}>{index + 1}</td>
                      <td className={`${bodyCell} text-sky-950 dark:text-slate-100`}>
                        {row.bank_name || '-'}
                      </td>
                      <td className={`${bodyCell} text-right`}>{money(columns.openingDebit, 'debit')}</td>
                      <td className={`${bodyCell} text-right`}>{money(columns.openingCredit, 'credit')}</td>
                      <td className={`${bodyCell} text-right`}>{money(columns.movementDebit, 'debit')}</td>
                      <td className={`${bodyCell} text-right`}>{money(columns.movementCredit, 'credit')}</td>
                      <td className={`${bodyCell} text-right`}>{money(columns.closingDebit, 'debit')}</td>
                      <td className={`${bodyCell} text-right`}>{money(columns.closingCredit, 'credit')}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className={`${bodyCell} py-6 text-center text-slate-500 dark:text-slate-300`}>
                    No {selectedReportType.toLowerCase()} data found
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold text-slate-950 dark:bg-[rgb(var(--c-meta-4))] dark:text-[rgb(var(--c-text))]">
              <tr className="font-bold">
                <td colSpan={2} className={`${bodyCell} text-right`}>Total</td>
                <td className={`${bodyCell} text-right`}>{money(totals.openingDebit, 'debit')}</td>
                <td className={`${bodyCell} text-right`}>{money(totals.openingCredit, 'credit')}</td>
                <td className={`${bodyCell} text-right`}>{money(totals.movementDebit, 'debit')}</td>
                <td className={`${bodyCell} text-right`}>{money(totals.movementCredit, 'credit')}</td>
                <td className={`${bodyCell} text-right`}>{money(totals.closingDebit, 'debit')}</td>
                <td className={`${bodyCell} text-right`}>{money(totals.closingCredit, 'credit')}</td>
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
          balanceLabels={balanceHeads}
          startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : '-'}
          endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : '-'}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default BankInformation;
