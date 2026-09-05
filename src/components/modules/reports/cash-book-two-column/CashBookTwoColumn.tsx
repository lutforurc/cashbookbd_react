import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiRotateCcw } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';

import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import httpService from '../../../services/httpService';
import { API_REPORT_CASH_BOOK_TWO_COLUMN_URL } from '../../../services/apiRoutes';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { Select } from '../../../utils/fields/FormControls';
import { FIELD_SELECT } from '../../../../theme/fieldStyles';
import CashBookTwoColumnPrint from './CashBookTwoColumnPrint';

/**
 * The cash book with a bank column beside the cash one.
 *
 * The paper book: one row per voucher, four money cells, opened with Balance BD
 * and footed with what is left in each column.
 *
 * ⚠️ THE TWO COLUMNS ARE NEVER ADDED TOGETHER, here or anywhere below. They are
 * two balances -- what is in the till and what is at the bank -- and a voucher
 * that moves money from one to the other fills a cell in each on the SAME row.
 * A single "total" across them would count that money twice and reconcile
 * against nothing.
 */

const money = (value: any) => {
  const amount = Number(value || 0);
  return amount ? thousandSeparator(amount) : '';
};

const asText = (date: any) => (date ? dayjs(date).format('YYYY-MM-DD') : '');

/**
 * The branch's transaction date, which the dropdown answers with as DD/MM/YYYY.
 *
 * ⚠️ PARSED BY HAND, not handed to Date or dayjs. "05/09/2026" is read by both
 * as the 9th of May, so a screen that trusted them would open on a range three
 * months wide of the day the branch is actually working in -- and say nothing
 * about it.
 */
const parseBranchDate = (said: any): Date | null => {
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(said ?? ''));

  return parts ? new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1])) : null;
};

const CashBookTwoColumn = ({ user }: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  // ⚠️ The settings are the fallback for whose branch this is. The `user` prop
  // arrives from the auth store and is not always filled by the time this
  // screen first draws -- and a branch that never got set is why Apply used to
  // answer "choose a branch and a date range first" over a screen that was
  // showing both.
  const settings = useSelector((state: any) => state.settings);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [bankAccountId, setBankAccountId] = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // ⚠️ Nought is ALL of them, on one unbroken page -- which is what an
  // accountant prints far more often than a page of twelve. PrintRowsInput
  // draws an empty box with "All" behind it rather than a nought, which would
  // read as a number somebody had cleared by accident.
  const [rowsPerPage, setRowsPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(10);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    const payload = branchDdlData?.protectedData;

    if (!payload?.data || !payload?.transactionDate) return;

    setDropdownData(payload.data);

    // The branch's own transaction date, which is what a fresh visit means --
    // the same rule the single-column book follows.
    const onDate = parseBranchDate(payload.transactionDate);
    const branch = user?.user?.branch_id ?? settings?.data?.branch?.id ?? null;

    setBranchId((current) => current ?? branch);
    setStartDate((current) => current ?? onDate);
    setEndDate((current) => current ?? onDate);
  }, [branchDdlData, user, settings]);

  const load = async () => {
    if (!branchId) {
      toast.info('Choose a branch first.');
      return;
    }

    if (!startDate || !endDate) {
      toast.info('Choose a date range first.');
      return;
    }

    setLoading(true);

    try {
      const response = await httpService.get(API_REPORT_CASH_BOOK_TWO_COLUMN_URL, {
        params: {
          branch_id: branchId,
          start_date: asText(startDate),
          end_date: asText(endDate),
          bank_account_id: bankAccountId || undefined,
        },
      });

      setReport(response?.data?.data?.data ?? response?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the cash book.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBankAccountId('');
    setReport(null);
  };

  const handleRowsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setRowsPerPage(Number.isNaN(value) ? 0 : value);
  };

  const handleFontChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setFontSize(Number.isNaN(value) ? 10 : value);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Cash & Bank Book',
  });

  const rows: any[] = report?.rows ?? [];
  const banks: any[] = report?.banks ?? [];

  if (!dropdownData.length) return <Loader />;

  return (
    <div>
      <HelmetTitle title="Cash & Bank Book" />

      <h2 className="mb-3 text-center text-xl font-semibold text-black dark:text-white">
        Cash &amp; Bank Book
      </h2>

      {/* Laid out like the single-column book's bar, because it is the same
          job: the branch and the period on the left, and on the right the two
          numbers that decide what the PAPER looks like -- how many rows to a
          page and how big the print is -- beside the button that uses them. */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Select Branch
            </label>
            <BranchDropdown
              defaultValue={user?.user?.branch_id}
              value={branchId == null ? '' : String(branchId)}
              onChange={(e: any) => setBranchId(e.target.value)}
              className="w-full p-2 text-sm font-medium"
              branchDdl={dropdownData}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Start Date
            </label>
            <InputDatePicker
              className="w-full text-sm font-medium"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
              setCurrentDate={setStartDate}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              End Date
            </label>
            <InputDatePicker
              className="w-full text-sm font-medium"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
              setCurrentDate={setEndDate}
            />
          </div>

          {/* ⚠️ Narrows the BANK column only. The cash column is the branch's
              one till whichever bank is being looked at, so it never changes
              here -- and that is the point of the filter: one bank's book,
              beside the cash it was fed from. */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Bank Account
            </label>
            <Select
              className={`${FIELD_SELECT} w-full px-2 text-sm font-medium`}
              value={bankAccountId}
              onChange={(event) => setBankAccountId(event.target.value)}
            >
              <option value="">Every bank account</option>
              {banks.map((bank: any) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid min-w-max grid-cols-[auto_auto_minmax(88px,0.45fr)_minmax(88px,0.45fr)_auto] items-end gap-2 overflow-x-auto max-md:ml-0 max-md:w-full xl:ml-auto">
          <ButtonLoading
            onClick={load}
            buttonLoading={loading}
            label="Apply"
            icon={<FiCheckSquare />}
            className="px-6"
          />

          <ButtonLoading
            onClick={handleReset}
            buttonLoading={false}
            label="Reset"
            icon={<FiRotateCcw />}
            className="px-4"
          />

          <div>
            <PrintRowsInput
              id="cbtc_rows"
              name="rowsPerPage"
              label=""
              value={rowsPerPage.toString()}
              onChange={handleRowsChange}
              type="text"
              className="w-20! text-center text-sm font-medium"
            />
          </div>

          <div>
            <PrintFontInput
              id="cbtc_font"
              name="fontSize"
              label=""
              value={fontSize.toString()}
              onChange={handleFontChange}
              type="text"
              className="w-20! text-center text-sm font-medium"
            />
          </div>

          <PrintButton
            onClick={handlePrint}
            label="Print"
            className="px-6"
            disabled={!report}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            {/* Two rows of heading, because Cash and Bank sit UNDER Debit and
                Credit -- that is the shape of the book, and flattening it into
                four unrelated columns is what makes a reader stop and work out
                which is which. */}
            <tr className="bg-gray-2 dark:bg-meta-4">
              <th rowSpan={2} className="border border-stroke px-2 py-1 text-left text-sm dark:border-strokedark">Date</th>
              <th rowSpan={2} className="border border-stroke px-2 py-1 text-left text-sm dark:border-strokedark">Voucher#</th>
              <th rowSpan={2} className="border border-stroke px-2 py-1 text-left text-sm dark:border-strokedark">Description</th>
              <th colSpan={2} className="border border-stroke px-2 py-1 text-center text-sm dark:border-strokedark">Debit</th>
              <th colSpan={2} className="border border-stroke px-2 py-1 text-center text-sm dark:border-strokedark">Credit</th>
            </tr>
            <tr className="bg-gray-2 dark:bg-meta-4">
              <th className="border border-stroke px-2 py-1 text-right text-sm dark:border-strokedark">Cash</th>
              <th className="border border-stroke px-2 py-1 text-right text-sm dark:border-strokedark">Bank</th>
              <th className="border border-stroke px-2 py-1 text-right text-sm dark:border-strokedark">Cash</th>
              <th className="border border-stroke px-2 py-1 text-right text-sm dark:border-strokedark">Bank</th>
            </tr>
          </thead>

          <tbody style={{ fontSize: `${fontSize}px` }}>
            {report ? (
              <tr className="font-semibold">
                <td className="border border-stroke px-2 py-1 dark:border-strokedark">
                  {dayjs(report.from).format('DD/MM/YYYY')}
                </td>
                <td className="border border-stroke px-2 py-1 dark:border-strokedark" />
                <td className="border border-stroke px-2 py-1 dark:border-strokedark">Balance BD</td>
                <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">{money(report.opening?.cash_debit)}</td>
                <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">{money(report.opening?.bank_debit)}</td>
                <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">{money(report.opening?.cash_credit)}</td>
                <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">{money(report.opening?.bank_credit)}</td>
              </tr>
            ) : null}

            {rows.map((row: any) => (
              <tr key={row.mtm_id} className="align-top">
                <td className="border border-stroke px-2 py-1 whitespace-nowrap dark:border-strokedark">
                  {dayjs(row.vr_date).format('DD/MM/YYYY')}
                </td>
                <td className="border border-stroke px-2 py-1 whitespace-nowrap font-mono text-xs dark:border-strokedark">
                  {row.vr_no}
                </td>
                <td className="border border-stroke px-2 py-1 dark:border-strokedark">
                  <div>
                    {row.description}
                    {/* The mark every cash book carries against money that only
                        moved between the till and the bank, so nobody posts it
                        to the ledger a second time. */}
                    {row.is_contra ? (
                      <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">(C)</span>
                    ) : null}
                  </div>
                  {row.note && !row.is_contra ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400">({row.note})</div>
                  ) : null}
                </td>
                <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">{money(row.debit_cash)}</td>
                <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">{money(row.debit_bank)}</td>
                <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">{money(row.credit_cash)}</td>
                <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">{money(row.credit_bank)}</td>
              </tr>
            ))}

            {report && !rows.length ? (
              <tr>
                <td colSpan={7} className="border border-stroke px-2 py-4 text-center text-sm text-gray-500 dark:border-strokedark">
                  No cash or bank movement in that period.
                </td>
              </tr>
            ) : null}

            {report ? (
              <>
                <tr className="bg-gray-2 font-semibold dark:bg-meta-4">
                  <td colSpan={3} className="border border-stroke px-2 py-1 text-right dark:border-strokedark">
                    Total
                  </td>
                  <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">{money(report.totals?.debit_cash)}</td>
                  <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">{money(report.totals?.debit_bank)}</td>
                  <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">{money(report.totals?.credit_cash)}</td>
                  <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">{money(report.totals?.credit_bank)}</td>
                </tr>

                {/* Carried down on the side it belongs to: a balance in hand is
                    a debit, and an overdrawn bank is a credit. */}
                <tr className="font-semibold">
                  <td colSpan={3} className="border border-stroke px-2 py-1 text-right dark:border-strokedark">
                    Balance C/D
                  </td>
                  <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">
                    {money(report.closing?.cash > 0 ? report.closing.cash : 0)}
                  </td>
                  <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">
                    {money(report.closing?.bank > 0 ? report.closing.bank : 0)}
                  </td>
                  <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">
                    {money(report.closing?.cash < 0 ? Math.abs(report.closing.cash) : 0)}
                  </td>
                  <td className="border border-stroke px-2 py-1 text-right dark:border-strokedark">
                    {money(report.closing?.bank < 0 ? Math.abs(report.closing.bank) : 0)}
                  </td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>
      </div>

      {!report && !loading ? (
        <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
          Choose a period and press Apply.
        </p>
      ) : null}

      <div className="hidden">
        {/* The branch is not passed: PadPrinting heads the page with the
            branch BranchDropdown published, so naming it again in the title
            block would print it twice. */}
        <CashBookTwoColumnPrint
          ref={printRef}
          report={report}
          fontSize={fontSize}
          rowsPerPage={rowsPerPage}
        />
      </div>
    </div>
  );
};

export default CashBookTwoColumn;
