import dayjs from 'dayjs';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';

/**
 * A plain Ledger report -- one account's own book -- in the shape the print
 * designer draws.
 *
 * The bespoke paper (LedgerPrint.tsx) knows this report's columns by hard-coded
 * name; this hands the same facts over as data so a tenant can arrange them:
 * one entry per VOUCHER, each with its debit, its credit and the balance carried
 * down, and the report's own two ends -- opening and closing -- in `basic` where
 * the heading and the totals band read them.
 *
 * ⚠️ THE SUMMARY ROWS THE SCREEN LISTS ARE NOT HANDED OVER AS ROWS. The screen
 * (generateTableData) ends an ascending report with Range Total, Total and
 * Balance, and opens a descending one with them; the bespoke sheet prints those
 * three as rows of the table. DocumentPrint's Grand Total foot adds up whatever
 * rows it is given, so handing it those sums as well would count the period's
 * movement twice and put a foot larger than the report on the page. The same
 * figures are offered instead where they belong: Total Debit and Total Credit
 * foot the two columns, and Opening and Closing stand on their own lines in the
 * totals band (see LEDGER_REPORT_INFO_FIELDS).
 *
 * ⚠️ THERE IS NO PRODUCT, QUANTITY OR RATE HERE, because there is none on the
 * row. The endpoint behind this screen (ReportsController::ledgerApi) posts the
 * account's own lines and joins no per-line inventory detail: whatever products
 * a voucher carried reach the paper as text, inside the description the server
 * itself composes. The designer's catalogue offers no column for them either --
 * the two go together, and they come back together the day the server puts a
 * voucher's lines on these rows.
 */
export type LedgerDocumentOptions = {
  /** The screen's own rows, straight from generateTableData -- summary rows and all. */
  rows: any[];
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  /** The account the report was filtered to. */
  accountName?: string | null;
  accountCode?: string | null;
  address?: string | null;
  mobile?: string | null;
  /** The branch the report is about, for the heading. */
  branchName?: string | null;
  /** Print the branch beside each row -- the screen does when it lists them all. */
  showBranchName?: boolean;
};

/**
 * The rows that are not the report's own arithmetic.
 *
 * ⚠️ Same set LedgerPrint walks around (`SUMMARY_ROW_NAMES`), plus Opening:
 * Opening is the state before the period, not a voucher in it, and it holds a
 * place in the running column rather than a movement of its own -- so it feeds
 * `opening_balance` in the heading and is kept out of the table the Grand Total
 * foot is drawn under.
 */
const NON_VOUCHER_NAMES = new Set([
  'Opening',
  'Range Total',
  'Total',
  'Balance',
  'Balance Receivable',
  'Balance Payable',
]);

/**
 * The name a row goes by on the paper -- the screen's own rule, kept in step
 * with it: a plain "Balance" row is a receivable or a payable by which side it
 * falls on.
 */
const getLedgerRowName = (row: any) => {
  if (String(row?.name || '').trim().toLowerCase() !== 'balance') {
    return row?.name || '';
  }

  if (Number(row?.debit || 0) > 0) return 'Balance Receivable';
  if (Number(row?.credit || 0) > 0) return 'Balance Payable';

  return 'Balance';
};

const num = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * ⚠️ `formatDayMonthYear`, NEVER THE MODULE'S DEFAULT `formatDate`. That one
 * hands back JSX -- it is meant to be dropped into markup, where it renders --
 * and everything here goes to the renderer as DATA. A React element reaching
 * DocumentPrint's `String(raw)` is the literal text "[object Object]" on the
 * paper, which is what printed under every voucher number the first time this
 * sheet came out: `formatDate` reads right on the screen and in the bespoke
 * sheet (both render it as a child) and nowhere else. Same output, as a string.
 */
const dateText = (value?: Date | string | null) => {
  if (!value) return '';

  const asDay = dayjs(value);
  return asDay.isValid() ? formatDayMonthYear(asDay.format('YYYY-MM-DD')) : '';
};

/** A string list, blanks dropped -- the shape a ledger cell draws one line per entry from. */
const list = (...parts: any[]): string[] =>
  parts.map((part) => String(part ?? '').trim()).filter(Boolean);

export const toLedgerDocumentData = ({
  rows,
  startDate,
  endDate,
  accountName,
  accountCode,
  address,
  mobile,
  branchName,
  showBranchName,
}: LedgerDocumentOptions): DocumentData => {
  const all = Array.isArray(rows) ? rows : [];

  const openingRow = all.find((row) => String(row?.name || '').trim() === 'Opening');
  const openingBalance = num(openingRow?.running_balance);

  // The vouchers only -- the report's own totals and its opening are read
  // separately, never as rows (see NON_VOUCHER_NAMES).
  const vouchers = all.filter(
    (row) => !NON_VOUCHER_NAMES.has(String(row?.name || '').trim()),
  );

  const products = vouchers.map((row, index) => {
    const name = getLedgerRowName(row);
    const remarks = row?.remarks === '-' ? '' : String(row?.remarks ?? '').trim();
    const branch = showBranchName ? String(row?.branch_name ?? '').trim() : '';

    // The description the bespoke sheet draws: the row's own name, its remark
    // under it, and the branch when the report is listing them all. Handed over
    // as LINES (and flattened) so a tenant may stack or run them together, the
    // same way every other ledger cell works.
    const descriptionLines = list(name, remarks, branch);

    return {
      /**
       * ⚠️ THE POSITION IS PART OF THE KEY. A discounted bill is printed as two
       * rows of the same voucher -- the bill and the discount broken out beside
       * it -- so `mid` alone repeats, and React takes a repeated key as a
       * mistake in the list. The row's own number is blank on that second line,
       * so it cannot carry the key on its own either.
       */
      id: `${row?.mid ?? row?.mtm_id ?? 'row'}-${index}`,
      sl: row?.sl_number,
      voucher_no: row?.vr_no ?? '',
      voucher_date: dateText(row?.vr_date),

      /**
       * ⚠️ THE THREE PARTS AS WELL AS THE WHOLE, because a description column
       * written to order names them one at a time -- `description_format`
       * resolves its tokens off the ROW, and the keys are the ones
       * DESCRIPTION_TOKENS offers. They are not catalogue line fields, so they
       * are not columns in their own right; they are what the description is
       * made of, which is the only thing a pattern over it may say.
       */
      name,
      remarks,
      branch_name: branch,

      description_lines: descriptionLines,
      description_flat: [name, remarks, branch].filter(Boolean).join(' '),

      /**
       * ⚠️ THE TRADE'S OWN NUMBERS, READ FROM THE VOUCHER AND NEVER DERIVED --
       * and never confused with `voucher_no` above, which is the software's.
       * These are what a Tiles & Sanitary shop wrote in its khata (the paper
       * voucher and the paper challan), carried on the voucher itself; a branch
       * that keeps none sends nothing and these read blank.
       *
       * ⚠️ THE SERVER ALSO PUTS EACH ONE IN THE DESCRIPTION, in brackets after
       * the account's own name -- "Cash (KBR 12331)" -- for every voucher type,
       * which is how the desk finds a voucher by the number written on the
       * paper. So a layout naming these in a column of their own says the same
       * number twice; the two are the same figure, and a paper wants one or the
       * other.
       */
      manual_voucher_no: row?.manual_voucher_no ?? '',
      manual_challan_no: row?.manual_challan_no ?? '',

      debit: num(row?.debit),
      credit: num(row?.credit),
      running_balance: row?.running_balance === '' || row?.running_balance === undefined
        ? row?.running_balance
        : num(row.running_balance),
    };
  });

  const totalDebit = products.reduce((sum, row) => sum + num(row.debit), 0);
  const totalCredit = products.reduce((sum, row) => sum + num(row.credit), 0);
  // Where the account finishes: opening plus the period's movement. Read off
  // the rows the running column was walked over, so it cannot disagree with the
  // last balance printed beside them -- and it does not depend on which way up
  // the report is shown, which a "last row" would.
  const closingBalance = openingBalance + totalDebit - totalCredit;

  const from = dateText(startDate);
  const to = dateText(endDate);

  return {
    basic: {
      report_range: from && to ? `${from} to ${to}` : from || to,
      ledger_account: accountName ?? '',
      idfr_code: accountCode ?? '',
      manual_address: address ?? '',
      mobile: mobile ?? '',
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      total_debit: totalDebit,
      total_credit: totalCredit,
      branch_name: branchName ?? '',
    },
    products,
  };
};
