import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
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
import { API_REPORT_DAILY_ACCOUNT_BOOK_URL } from '../../../services/apiRoutes';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { Select } from '../../../utils/fields/FormControls';
import { FIELD_SELECT } from '../../../../theme/fieldStyles';
import DailyAccountBookPrint from './DailyAccountBookPrint';

/**
 * The day's cash book, both sides on one page.
 *
 * ⚠️ THE TWO SIDES ARE NEVER ADDED TOGETHER. Receipts and payments are two
 * different questions about the same till, and the closing figure is written as
 * Opening + Receipt - Payment rather than read off a column of its own. See
 * DailyAccountBook on the server for which voucher lands in which section.
 */

const money = (value: any) => {
  const amount = Number(value || 0);
  return amount ? thousandSeparator(amount) : '';
};

const asText = (date: any) => (date ? dayjs(date).format('YYYY-MM-DD') : '');

/**
 * The branch's transaction date, which the dropdown answers with as DD/MM/YYYY.
 *
 * ⚠️ PARSED BY HAND, not handed to Date or dayjs: "05/09/2026" is read by both
 * as the 9th of May, and the day book would then open three months wide of the
 * day the branch is actually working in without saying so.
 */
const parseBranchDate = (said: any): Date | null => {
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(said ?? ''));

  return parts ? new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1])) : null;
};

/** A date out of the address bar, read by hand for the same reason. */
const parseUrlDate = (said: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(said ?? ''));

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const SectionTable = ({ section }: { section: any }) => {
  const rows: any[] = section?.rows ?? [];

  return (
    <div className="mb-4">
      <div className="border-b border-slate-300 bg-slate-100 px-2 py-1 text-xs font-bold tracking-wide text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
        {section.title}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs md:text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <th className="w-10 border border-slate-200 px-2 py-1 text-center dark:border-slate-700">SL</th>
              <th className="w-24 border border-slate-200 px-2 py-1 text-center dark:border-slate-700">Date</th>
              <th className="border border-slate-200 px-2 py-1 text-left dark:border-slate-700">Description</th>
              <th className="w-28 border border-slate-200 px-2 py-1 text-right dark:border-slate-700">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row: any) => (
                <tr key={row.mtm_id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="border border-slate-200 px-2 py-1 text-center dark:border-slate-700">{row.sl}</td>
                  <td className="whitespace-nowrap border border-slate-200 px-2 py-1 dark:border-slate-700">
                    {row.vr_date ? dayjs(row.vr_date).format('DD/MM/YYYY') : ''}
                  </td>
                  <td className="border border-slate-200 px-2 py-1 dark:border-slate-700">{row.description}</td>
                  <td className="whitespace-nowrap border border-slate-200 px-2 py-1 text-right dark:border-slate-700">
                    {money(row.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="border border-slate-200 px-2 py-1 text-center text-slate-400 dark:border-slate-700">
                  No entry
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={3} className="border border-slate-200 px-2 py-1 text-right dark:border-slate-700">
                Total
              </td>
              <td className="whitespace-nowrap border border-slate-200 px-2 py-1 text-right dark:border-slate-700">
                {money(section.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const BalanceTable = ({ title, table }: { title: string; table: any }) => (
  <div className="mb-4">
    <div className="border-b border-slate-300 bg-slate-100 px-2 py-1 text-xs font-bold tracking-wide text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
      {title}
    </div>

    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs md:text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <th className="w-10 border border-slate-200 px-2 py-1 text-center dark:border-slate-700">SL</th>
            <th className="border border-slate-200 px-2 py-1 text-left dark:border-slate-700">Account Name</th>
            <th className="border border-slate-200 px-2 py-1 text-left dark:border-slate-700">Account Number</th>
            <th className="border border-slate-200 px-2 py-1 text-left dark:border-slate-700">Details</th>
            <th className="w-28 border border-slate-200 px-2 py-1 text-right dark:border-slate-700">Balance</th>
          </tr>
        </thead>
        <tbody>
          {(table?.rows ?? []).length ? (
            (table?.rows ?? []).map((row: any) => (
              <tr key={row.sl} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="border border-slate-200 px-2 py-1 text-center dark:border-slate-700">{row.sl}</td>
                <td className="border border-slate-200 px-2 py-1 dark:border-slate-700">{row.name}</td>
                <td className="border border-slate-200 px-2 py-1 dark:border-slate-700">{row.account_number}</td>
                <td className="border border-slate-200 px-2 py-1 dark:border-slate-700">{row.details}</td>
                <td className="whitespace-nowrap border border-slate-200 px-2 py-1 text-right dark:border-slate-700">
                  {money(row.balance)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="border border-slate-200 px-2 py-1 text-center text-slate-400 dark:border-slate-700">
                No account
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td colSpan={4} className="border border-slate-200 px-2 py-1 text-right dark:border-slate-700">
              Total
            </td>
            <td className="whitespace-nowrap border border-slate-200 px-2 py-1 text-right dark:border-slate-700">
              {money(table?.total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

const DailyAccountBook = ({ user }: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [cashAccountId, setCashAccountId] = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Nought is every row on one unbroken page -- what an accountant prints far
  // more often than a page of twelve.
  const [rowsPerPage, setRowsPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(10);

  const printRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useSearchParams();

  // Whether the range in the address bar has already been run on this visit.
  // A ref, not state: the effect that restores it fires again when the branch
  // list resolves, and re-running would ask for a report already on screen.
  const answered = useRef(false);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    const payload = branchDdlData?.protectedData;

    if (!payload?.data || !payload?.transactionDate) return;

    setDropdownData(payload.data);

    const onDate = parseBranchDate(payload.transactionDate);
    const asked = Number(params.get('branch')) || null;
    const branch = asked ?? user?.user?.branch_id ?? settings?.data?.branch?.id ?? null;

    setBranchId((current) => current ?? branch);
    setStartDate((current) => current ?? onDate);
    setEndDate((current) => current ?? onDate);

    // ⚠️ The address bar wins where it has something to say, and it is ASKED
    // rather than merely typed back into the boxes: restoring the question
    // without running it leaves a range stated above an empty table, which
    // reads as an answer -- and a false one.
    const from = parseUrlDate(params.get('from'));

    if (!from || answered.current) return;

    answered.current = true;

    const to = parseUrlDate(params.get('to')) ?? from;
    const cash = params.get('cash') ?? '';

    setStartDate(from);
    setEndDate(to);
    setCashAccountId(cash);

    void load({ branchId: branch, startDate: from, endDate: to, cashAccountId: cash });
  }, [branchDdlData, user, settings]);

  const load = async (asked?: {
    branchId?: number | string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    cashAccountId?: string;
  }) => {
    const branch = asked?.branchId ?? branchId;
    const from = asked?.startDate ?? startDate;
    const to = asked?.endDate ?? endDate;
    const cash = asked?.cashAccountId ?? cashAccountId;

    if (!branch) {
      toast.info('Choose a branch first.');
      return;
    }

    if (!from || !to) {
      toast.info('Choose a date range first.');
      return;
    }

    answered.current = true;

    const fromText = asText(from);
    const toText = asText(to);

    // Written on APPLY, not on every change of a box: what goes in the address
    // bar is the question actually asked, so a return trip lands on it.
    setParams(
      {
        from: fromText,
        to: toText,
        ...(branch == null ? {} : { branch: String(branch) }),
        ...(cash ? { cash: String(cash) } : {}),
      },
      { replace: true },
    );

    setLoading(true);
    setError('');

    try {
      const response = await httpService.get(API_REPORT_DAILY_ACCOUNT_BOOK_URL, {
        params: {
          branch_id: branch,
          start_date: fromText,
          end_date: toText,
          cash_account_id: cash || undefined,
        },
      });

      setReport(response?.data?.data?.data ?? response?.data?.data ?? null);
    } catch (caught: any) {
      const said = caught?.response?.data?.message || 'Could not read the daily account book.';
      setError(said);
      setReport(null);
      toast.error(said);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    // ⚠️ The address bar goes with it. With the applied question written there,
    // a Reset that only emptied the screen would leave the URL still asking for
    // it -- and a reload would put the report straight back.
    const onDate = parseBranchDate(branchDdlData?.protectedData?.transactionDate);

    if (onDate) {
      setStartDate(onDate);
      setEndDate(onDate);
    }

    setCashAccountId('');
    setReport(null);
    setError('');
    setParams({}, { replace: true });
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
    documentTitle: 'Daily Account Book',
  });

  const cashAccounts: any[] = report?.cash_accounts ?? [];
  const receipt: any[] = report?.sections?.receipt ?? [];
  const payment: any[] = report?.sections?.payment ?? [];

  const hasAnyRow =
    receipt.some((section: any) => (section.rows ?? []).length > 0) ||
    payment.some((section: any) => (section.rows ?? []).length > 0);

  if (!dropdownData.length) return <Loader />;

  return (
    <div>
      <HelmetTitle title="Daily Account Book" />

      {/* The same bar as the cash books beside it: the four questions the book
          answers on the left -- the branch, the two dates, then the till -- and
          on the right the two numbers that decide what the PAPER looks like,
          beside the button that uses them.

          ⚠️ FOUR ACROSS ONLY WHERE THERE IS ROOM FOR FOUR. One row on a
          desktop, two on a tablet, one on a phone. Every cell is `min-w-0` so a
          long branch name cannot widen its column past the row and push the
          page sideways, and the group that wraps is the BUTTONS -- never the
          page. */}
      <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid w-full min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:flex-1">
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Select Branch
            </label>
            <BranchDropdown
              defaultValue={user?.user?.branch_id}
              value={branchId == null ? '' : String(branchId)}
              onChange={(e: any) => setBranchId(e.target.value)}
              className="w-full px-3 text-sm font-medium"
              branchDdl={dropdownData}
            />
          </div>

          <div className="min-w-0">
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

          <div className="min-w-0">
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

          {/* Narrows the till the book is about. A branch with a single counter
              leaves this on "Every cash account" and sees no change. */}
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Cash Account
            </label>
            <Select
              className={`${FIELD_SELECT} w-full px-3 text-sm font-medium`}
              value={cashAccountId}
              onChange={(event) => setCashAccountId(event.target.value)}
            >
              <option value="">Every cash account</option>
              {cashAccounts.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-end gap-2 xl:shrink-0">
          <ButtonLoading
            onClick={() => load()}
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
              id="dab_rows"
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
              id="dab_font"
              name="fontSize"
              label=""
              value={fontSize.toString()}
              onChange={handleFontChange}
              type="text"
              className="w-20! text-center text-sm font-medium"
            />
          </div>

          <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={!report} />
        </div>
      </div>

      {loading ? <Loader /> : null}

      {error && !loading ? (
        <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {report ? (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-300 bg-slate-100 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-100">Opening Balance</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{money(report.opening)}</span>
          </div>

          {/* ⚠️ TWO SIDES, STACKED ON A NARROW SCREEN. Held side by side on a
              phone each table is a quarter of the width and every figure wraps,
              so below xl the payments follow the receipts down the page. */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <div className="mb-2 rounded bg-slate-200 py-1 text-center text-sm font-bold tracking-wide text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                RECEIPT
              </div>
              {receipt.map((section: any) => (
                <SectionTable key={section.key} section={section} />
              ))}
            </div>

            <div>
              <div className="mb-2 rounded bg-slate-200 py-1 text-center text-sm font-bold tracking-wide text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                PAYMENT
              </div>
              {payment.map((section: any) => (
                <SectionTable key={section.key} section={section} />
              ))}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded border border-slate-300 bg-slate-100 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-100">Total Receipt Amount</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{money(report.totals?.receipt)}</span>
            </div>
            <div className="flex items-center justify-between rounded border border-slate-300 bg-slate-100 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-100">Total Payment Amount</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{money(report.totals?.payment)}</span>
            </div>
          </div>

          {!hasAnyRow && !loading ? (
            <p className="mb-3 text-center text-sm text-gray-500 dark:text-gray-400">
              No cash movement in that period.
            </p>
          ) : null}

          <BalanceTable title="Closing Bank Balance" table={report.banks} />
          <BalanceTable title="Mobile Bank Balance" table={report.mobiles} />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded border border-slate-300 px-3 py-2 dark:border-slate-600">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Closing Receivable Amount</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{money(report.closing_receivable)}</span>
            </div>
            <div className="flex items-center justify-between rounded border border-slate-300 px-3 py-2 dark:border-slate-600">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Closing Payable Amount</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{money(report.closing_payable)}</span>
            </div>
            <div className="flex items-center justify-between rounded border border-emerald-400 bg-emerald-50 px-3 py-2 dark:border-emerald-600 dark:bg-emerald-900/30">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Closing Balance</span>
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{money(report.closing)}</span>
            </div>
          </div>
        </>
      ) : null}

      <div className="hidden">
        <DailyAccountBookPrint
          ref={printRef}
          report={report}
          fontSize={fontSize}
          rowsPerPage={rowsPerPage}
        />
      </div>
    </div>
  );
};

export default DailyAccountBook;
