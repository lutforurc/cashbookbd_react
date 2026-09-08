import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import Table from '../../../utils/others/Table';
import httpService from '../../../services/httpService';
import {
  API_HEAD_OFFICE_CASH_RECEIVED_APPROVE_URL,
  API_REPORT_CASH_BOOK_TWO_COLUMN_URL,
} from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { Select } from '../../../utils/fields/FormControls';
import { FIELD_SELECT } from '../../../../theme/fieldStyles';
import { hasAnyPermission } from '../../../Sidebar/permissionUtils';
import { hasPermission } from '../../../utils/permissionChecker';
import {
  buildVoucherAutoEditState,
  getCombinedVoucherOpenState,
  getVoucherEditTarget,
} from '../../../utils/utils-functions/voucherEditNavigation';
import {
  useRemoveVoucherApproval,
  useVoucherPrint,
  VoucherActionButtons,
} from '../../vouchers';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
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

/**
 * A date out of the address bar, or null where there is none.
 *
 * Read by hand rather than handed to `new Date` for the same reason: an
 * 'YYYY-MM-DD' with no zone is read as UTC midnight, and east of Greenwich that
 * is still the day before -- the range would come back one day short of the one
 * that was left.
 */
const parseUrlDate = (said: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(said ?? ''));

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

/**
 * The applied range rides in the ADDRESS BAR, and only there.
 *
 * ⚠️ A ROUND TRIP IS NOT A NEW VISIT. Opening a voucher from a row and coming
 * back used to land on the branch's transaction date with an empty table, so a
 * clerk correcting the 6th of September was returned to today and had to type
 * the question in again -- and the correction he had just made was the one
 * thing he wanted to see.
 *
 * Coming back lands on the URL that was left, so the range, the branch and the
 * bank come with it and the report is asked again. Opening the book from the
 * menu carries no query and gets the transaction date with an empty table.
 * Nothing is kept between sessions and nothing is inherited from whoever used
 * the browser last, which is the rule the single-column book follows.
 */
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
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useSearchParams();

  /**
   * Whether the range in the address bar has already been run on this visit.
   *
   * A ref, not state: the effect that restores it fires again when the branch
   * list resolves, and re-running would ask for a report already on screen.
   */
  const answered = useRef(false);

  // The row's own buttons, the same ones the single-column book carries: the
  // voucher opened from its number, approved, unapproved, edited. A report that
  // shows a wrong figure is only useful if the voucher behind it can be reached
  // from the line it is on.
  const navigate = useNavigate();
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);
  const { removingApprovalId, removeVoucherApproval, getVoucherId } = useRemoveVoucherApproval();

  const userPermissions = settings?.data?.permissions || [];
  const canApproveCashbook = hasAnyPermission(userPermissions, ['cashbook.approved']);
  const canRemoveApproval = hasPermission(userPermissions, 'remove.approval');
  const canEditVoucher = hasAnyPermission(userPermissions, [
    'purchase.edit',
    'sales.edit',
    'cash.received.edit',
    'cash.payment.edit',
  ]);

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
    const asked = Number(params.get('branch')) || null;
    const branch = asked ?? user?.user?.branch_id ?? settings?.data?.branch?.id ?? null;

    setBranchId((current) => current ?? branch);
    setStartDate((current) => current ?? onDate);
    setEndDate((current) => current ?? onDate);

    // ⚠️ The address bar wins where it has something to say, and it is ASKED
    // rather than merely typed back into the boxes. Restoring the question
    // without running it left the screen stating a range above an empty table,
    // which reads as an answer -- and a false one: a book with no entries for a
    // fortnight that has vouchers in it.
    const from = parseUrlDate(params.get('from'));

    if (!from || answered.current) return;

    answered.current = true;

    const to = parseUrlDate(params.get('to')) ?? from;
    const bank = params.get('bank') ?? '';

    setStartDate(from);
    setEndDate(to);
    setBankAccountId(bank);

    // Asked with these values rather than through the state this effect has
    // only just asked React to set, which would still be the previous render's.
    void load({ branchId: branch, startDate: from, endDate: to, bankAccountId: bank });
  }, [branchDdlData, user, settings]);

  const load = async (asked?: {
    branchId?: number | string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    bankAccountId?: string;
  }) => {
    const branch = asked?.branchId ?? branchId;
    const from = asked?.startDate ?? startDate;
    const to = asked?.endDate ?? endDate;
    const bank = asked?.bankAccountId ?? bankAccountId;

    if (!branch) {
      toast.info('Choose a branch first.');
      return;
    }

    if (!from || !to) {
      toast.info('Choose a date range first.');
      return;
    }

    // Asked once on this visit, however it was asked. Apply writes the range to
    // the address bar, and without this the effect that reads it back would see
    // its own writing on the next render and ask the server all over again.
    answered.current = true;

    const fromText = asText(from);
    const toText = asText(to);

    /**
     * ⚠️ Written on APPLY, not on every change of a box. What goes in the
     * address bar is the question actually asked -- a half-typed range nobody
     * ran is not somewhere to come back to.
     *
     * The branch and the bank go in with the dates because they are half the
     * question: the right fortnight of the wrong branch would put someone
     * else's figures under the heading being read. `replace`, so pressing Apply
     * four times does not leave four entries for Back to walk out of one at a
     * time.
     */
    setParams(
      {
        from: fromText,
        to: toText,
        ...(branch == null ? {} : { branch: String(branch) }),
        ...(bank ? { bank: String(bank) } : {}),
      },
      { replace: true },
    );

    setLoading(true);

    try {
      const response = await httpService.get(API_REPORT_CASH_BOOK_TWO_COLUMN_URL, {
        params: {
          branch_id: branch,
          start_date: fromText,
          end_date: toText,
          bank_account_id: bank || undefined,
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
    // ⚠️ The address bar goes with it. With the applied question written there,
    // a Reset that only emptied the screen would leave the URL still asking for
    // it -- and coming back, or a reload, would put the report straight back.
    const onDate = parseBranchDate(branchDdlData?.protectedData?.transactionDate);

    if (onDate) {
      setStartDate(onDate);
      setEndDate(onDate);
    }

    setBankAccountId('');
    setReport(null);
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
    documentTitle: 'Cash & Bank Book',
  });

  const handleApproveVoucher = async (row: any) => {
    const voucherId = getVoucherId(row);

    if (!voucherId) {
      toast.error('Approval id not found.');
      return;
    }

    try {
      setApprovingId(voucherId);
      const response = await httpService.post(`${API_HEAD_OFFICE_CASH_RECEIVED_APPROVE_URL}/${voucherId}`, {});
      const result = response?.data;

      if (result === '1' || result?.success) {
        toast.success('Voucher approved successfully.');
        // The book is read again rather than patched in place: an approval
        // changes what the row's own buttons may do next.
        void load();
        return;
      }

      if (result === '2') {
        toast.error('Voucher not found.');
        return;
      }

      toast.error(typeof result === 'string' ? result : 'Voucher approval failed.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Voucher approval failed.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRemoveApproval = async (row: any) => {
    await removeVoucherApproval(row, { onSuccess: () => void load() });
  };

  const handleEditVoucher = (row: any) => {
    // A combined voucher is opened by its combined number, not by the leg that
    // happens to have touched the till -- editing that leg alone would leave
    // the other half of the entry behind.
    const combinedNumber = String(row?.combined_number || '').trim();

    if (combinedNumber) {
      const combinedOpenState = getCombinedVoucherOpenState(row);

      if (combinedOpenState.hasApprovedVoucher) {
        if (!combinedOpenState.editableVoucherNo) {
          toast.error('Approved voucher cannot be opened.');
          return;
        }

        const approvedEditTarget = getVoucherEditTarget(combinedOpenState.editableVoucherNo);
        const approvedEditState = buildVoucherAutoEditState(combinedOpenState.editableVoucherNo);

        if (!approvedEditTarget || !approvedEditState) {
          toast.error('Edit route not found for this voucher.');
          return;
        }

        navigate(approvedEditTarget.route, { state: approvedEditState });
        return;
      }

      navigate(routes.inv_trading_combined, {
        state: { combinedAutoEdit: true, combinedNumber },
      });
      return;
    }

    /**
     * ⚠️ THE NUMBER CANNOT SAY WHICH SCREEN. Its prefix is the voucher type --
     * 1 received, 2 paid -- so money banked is numbered 1-... exactly as a cash
     * receipt is, and a bank voucher opened on the cash screen is saved back
     * with its money leg moved off the bank and into Cash. The server marks
     * each row instead; absent, it falls back to the cash screens rather than
     * guessing.
     */
    const voucherNo = String(row?.vr_no || '').trim();
    const openOnBankScreen = row?.is_bank_voucher === true;
    const editTarget = getVoucherEditTarget(voucherNo, { bank: openOnBankScreen });
    const editState = buildVoucherAutoEditState(voucherNo, { bank: openOnBankScreen });

    if (!voucherNo || !editTarget || !editState) {
      toast.error('Edit route not found for this voucher.');
      return;
    }

    navigate(editTarget.route, { state: editState });
  };

  const rows: any[] = report?.rows ?? [];
  const banks: any[] = report?.banks ?? [];

  /**
   * Balance b/d goes in WITH the rows rather than above them.
   *
   * It is the book's first entry, not a caption, and putting it through the
   * same columns as everything else is what lets the shared table draw the
   * whole book in one piece -- the same table, and so the same type and the
   * same colours, as the single-column cash book beside it.
   */
  const bodyRows: any[] = report
    ? [
        {
          mtm_id: '__opening',
          is_opening: true,
          vr_date: report.from,
          description: 'Balance b/d',
          debit_cash: report.opening?.cash_debit,
          debit_bank: report.opening?.bank_debit,
          credit_cash: report.opening?.cash_credit,
          credit_bank: report.opening?.bank_credit,
        },
        ...rows,
      ]
    : [];

  /**
   * How a cash book is ruled.
   *
   * The four money columns are boxed off from the narrative beside them: a
   * reader running a finger down Payment Bank should not have to hold his place
   * against a column of descriptions, and on a book this wide the eye slides a
   * row without a rule to stop it. The footing is closed with a line above and
   * below, which is how the total of an account has always been written by
   * hand -- the line above says "everything over this is what I added up", and
   * the one below says the account is closed.
   *
   * Stated here rather than at each of the sixteen cells that need it, so the
   * rule cannot end up one colour in the heading and another in the footing.
   *
   * The colour is the table's own --c-border, the one the rest of the grid
   * uses. ⚠️ IT IS FAINT WHERE IT CROSSES THE HEADING, and that is accepted
   * rather than missed: --c-border resolves to --c-strokedark in dark mode,
   * which is the same #2F3844 as --c-table-head, so there is almost nothing
   * for it to show against up there. It reads clearly across the body and
   * quietly across the heading, which is the weight this book is meant to
   * have. A louder token was tried and read as a wireframe laid over the page.
   * If the heading rules ever do need to carry, reach for --c-gray-400: it
   * holds a value per theme and clears 3:1 on all four of this table's grounds
   * (heading and body, light and dark).
   */
  const RULE = 'border-[rgb(var(--c-border))]';
  const moneyCol = `w-32 text-right border-l ${RULE}`;
  const moneyColLast = `w-32 text-right border-x ${RULE}`;
  const moneyHead = `text-right border-l ${RULE}`;
  const moneyHeadLast = `text-right border-x ${RULE}`;
  // Two pixels, not one: the footing has to read as heavier than the rules
  // between the rows it closes off.
  //
  // ⚠️ EVERY CELL OF THE TOTAL ROW TAKES IT, the label and the empty action
  // cell included. Given only to the four money cells the closing line stopped
  // under the figures and started again under them, leaving the rule broken
  // either side -- and a rule that stops halfway does not read as "the account
  // is closed", it reads as a border somebody forgot to finish.
  const footRuleClose = `border-y-2 ${RULE}`;

  const columns = [
    {
      key: 'vr_date',
      header: 'Date',
      cellClass: 'w-28 whitespace-nowrap',
      render: (row: any) => (row.vr_date ? dayjs(row.vr_date).format('DD/MM/YYYY') : ''),
    },
    {
      key: 'vr_no',
      header: 'Voucher#',
      cellClass: 'w-32 whitespace-nowrap',
      render: (row: any) =>
        row.vr_no ? (
          <div
            className="cursor-pointer hover:underline"
            onClick={() => handleVoucherPrint({ ...row, mtm_id: row?.mtm_id })}
          >
            {row.vr_no}
          </div>
        ) : null,
    },
    {
      key: 'description',
      header: 'Description',
      render: (row: any) => (
        <div className="w-full whitespace-normal">
          <div>
            {row.description}
            {/* ⚠️ WHICH bank the money went through. The Bank column gives the
                amount and stops there, so a receipt from Mohona Traders and a
                payment to Sultana Agro read alike whichever of the branch's
                accounts each passed through. A contra already names both heads
                in its description, so it is not named twice. */}
            {row.bank_name && !row.is_contra ? (
              <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
                → ({row.bank_name})
              </span>
            ) : null}
            {/* The mark every cash book carries against money that only moved
                between the till and the bank, so nobody posts it to the ledger
                a second time. */}
            {row.is_contra ? (
              <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">(C)</span>
            ) : null}
          </div>
          {row.note && !row.is_contra ? (
            <div className="wrap-break-word whitespace-normal text-sm text-gray-500 dark:text-gray-400">
              ({row.note})
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'debit_cash',
      header: 'Cash',
      cellClass: moneyCol,
      render: (row: any) => money(row.debit_cash),
    },
    {
      key: 'debit_bank',
      header: 'Bank',
      cellClass: moneyCol,
      render: (row: any) => money(row.debit_bank),
    },
    {
      key: 'credit_cash',
      header: 'Cash',
      cellClass: moneyCol,
      render: (row: any) => money(row.credit_cash),
    },
    {
      key: 'credit_bank',
      header: 'Bank',
      cellClass: moneyColLast,
      render: (row: any) => money(row.credit_bank),
    },
    {
      key: 'action',
      header: 'Action',
      cellClass: 'w-28 text-center',
      render: (row: any) => {
        // Balance b/d is not a voucher: there is nothing to open, approve or
        // edit on the line the book opens with.
        if (row.is_opening) return null;

        const voucherId = getVoucherId(row);
        const isApproved = Number(row?.is_approved ?? 0) === 1;

        return (
          <VoucherActionButtons
            row={row}
            voucherId={voucherId}
            isApproved={isApproved}
            approvingId={approvingId}
            removingApprovalId={removingApprovalId}
            canShowApproveAction={canApproveCashbook && !!row?.vr_no && voucherId > 0}
            canShowRemoveApprovalAction={
              canRemoveApproval && !!row?.vr_no && voucherId > 0 && isApproved
            }
            canShowEditAction={canEditVoucher && !isApproved}
            canEditVoucher={canEditVoucher}
            confirmInline
            onApprove={handleApproveVoucher}
            onRemoveApproval={handleRemoveApproval}
            onEdit={handleEditVoucher}
          />
        );
      },
    },
  ];

  // Two rows of heading, because Cash and Bank sit UNDER Receive and Payment --
  // that is the shape of the book, and flattening it into four unrelated
  // columns is what makes a reader stop and work out which is which.
  const headerRows = [
    [
      { label: 'Date', rowSpan: 2 },
      { label: 'Voucher#', rowSpan: 2 },
      { label: 'Description', rowSpan: 2 },
      // ⚠️ NO RULE THROUGH THE MIDDLE OF THESE. Receive covers Cash and Bank
      // together, and a line splitting the band would claim the heading belongs
      // to one of them. The Cash|Bank rule begins on the row below, where the
      // two columns are first named -- which is how the band is read: one
      // heading over two columns, not two headings.
      { label: 'Receive', colSpan: 2, className: `text-center border-b border-l ${RULE}` },
      { label: 'Payment', colSpan: 2, className: `text-center border-b border-x ${RULE}` },
      { label: 'Action', rowSpan: 2, className: 'text-center' },
    ],
    [
      { label: 'Cash', className: moneyHead },
      { label: 'Bank', className: moneyHead },
      { label: 'Cash', className: moneyHead },
      { label: 'Bank', className: moneyHeadLast },
    ],
  ];

  /**
   * ⚠️ THE BALANCE IS CARRIED DOWN ON THE OPPOSITE SIDE TO THE ONE IT OPENS ON,
   * and it comes BEFORE the footing. Money in hand is a debit balance and is
   * carried down as a credit -- that entry is what makes the two sides of the
   * account equal. An overdrawn bank is a credit balance and carries down on
   * the debit side. The API decides which cell; the screen prints it.
   */
  const footerRows = report
    ? [
        [
          { label: 'Balance c/d', colSpan: 3, className: 'text-right' },
          { label: money(report.closing?.cash_debit), className: moneyHead },
          { label: money(report.closing?.bank_debit), className: moneyHead },
          { label: money(report.closing?.cash_credit), className: moneyHead },
          { label: money(report.closing?.bank_credit), className: moneyHeadLast },
          { label: '' },
        ],
        // The whole account, balances included, which is why the two sides of
        // each come to the same figure.
        [
          { label: 'Total', colSpan: 3, className: `text-right ${footRuleClose}` },
          { label: money(report.totals?.debit_cash), className: `${moneyHead} ${footRuleClose}` },
          { label: money(report.totals?.debit_bank), className: `${moneyHead} ${footRuleClose}` },
          { label: money(report.totals?.credit_cash), className: `${moneyHead} ${footRuleClose}` },
          { label: money(report.totals?.credit_bank), className: `${moneyHeadLast} ${footRuleClose}` },
          { label: '', className: footRuleClose },
        ],
      ]
    : [];

  if (!dropdownData.length) return <Loader />;

  return (
    <div>
      <HelmetTitle title="Cash & Bank Book" />



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

      <div className="overflow-y-auto">
        {loading ? <Loader /> : null}

        {/* The single-column book's table, so the two read as one pair of
            reports: the same type, the same heading and row colours, the same
            row of buttons at the end of the line. */}
        <Table
          columns={columns}
          data={bodyRows}
          headerRows={headerRows}
          footerRows={footerRows}
          getRowKey={(row: any) => row.mtm_id}
          rowClassName={(row: any) => (row.is_opening ? 'font-semibold' : 'align-top')}
          noDataMessage="Choose a period and press Apply."
        />

        {report && !rows.length ? (
          <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
            No cash or bank movement in that period.
          </p>
        ) : null}
      </div>

      {report && (report.balanced?.cash === false || report.balanced?.bank === false) ? (
        <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          This book does not foot: the debit and credit totals of the{' '}
          {report.balanced?.cash === false ? 'cash' : ''}
          {report.balanced?.cash === false && report.balanced?.bank === false ? ' and ' : ''}
          {report.balanced?.bank === false ? 'bank' : ''} column disagree. Report it rather than
          working from these figures.
        </div>
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

        {/* What a voucher number is clicked into: the paper for that one
            voucher, printed off the row it was read on. */}
        <VoucherPrintRegistry
          ref={voucherRegistryRef}
          rowsPerPage={Number(rowsPerPage)}
          fontSize={Number(fontSize)}
        />
      </div>
    </div>
  );
};

export default CashBookTwoColumn;
