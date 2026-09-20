import dayjs from 'dayjs';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import type { PrintBranch } from '../../../utils/utils-functions/printBranch';
import SalesLedgerCalculator from '../../../utils/calculators/SalesLedgerCalculator';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { getRelevantCoaName } from '../utils/ledgerNameResolver';

/**
 * A Sales Ledger report, in the shape the print designer draws.
 *
 * The bespoke paper -- SalesLedgerPrint.tsx -- knows this report's columns by
 * hard-coded name. This hands the same facts over as data so a tenant can
 * arrange them: one entry per voucher, each carrying its own product lines as
 * LISTS (see LEDGER_LINE_FIELDS: a ledger cell holds several lines, not one
 * value), and the flat per-row figures the Grand Total foot adds up.
 *
 * ⚠️ EVERY PER-ROW FIGURE HERE MIRRORS THE ONE THE SCREEN FOOTS, rule for rule,
 * down to reading the first matching transaction and the first matching line
 * the way SalesLedgerCalculator does. That is not tidiness -- DocumentPrint
 * works its totals out from these rows, never from the calculator, so a
 * difference in any of the five would print a Grand Total that disagrees with
 * the one under the table on screen, and nobody reading the paper could tell
 * which of the two was lying.
 */
export type SalesLedgerDocumentOptions = {
  rows: any[];
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  /** The account and product the report was filtered to, if it was. */
  accountName?: string | null;
  productName?: string | null;
  /** The branch the report is ABOUT, not the reader's -- see usePrintBranch. */
  branch?: PrintBranch | null;
  /**
   * The same branch's name, for the heading.
   *
   * ⚠️ Separate from `branch` above, and both are wanted. `branch` is what
   * heads the page, and usePrintBranch deliberately answers with NOTHING when
   * the report is the reader's own branch -- the session's copy of it carries
   * more than the dropdown's, so overriding is a loss. That leaves a report on
   * one's own branch with no branch line at all, which reads as an oversight
   * rather than as a decision.
   */
  branchName?: string | null;
  /** settings.data.branch.stock_report_type === '1': prefix the category. */
  showCategory?: boolean;
};

const num = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * One amount posted against this voucher, by the account it was posted to.
 *
 * The first matching transaction and the first matching line in it -- not the
 * sum of every line carrying that account. Deliberately the calculator's rule
 * rather than the truthier one: see the note above about the two foots
 * agreeing.
 */
const postedDebit = (row: any, coa4Id: number) => {
  const masters = Array.isArray(row?.acc_transaction_master)
    ? row.acc_transaction_master
    : [];

  const master = masters.find((entry: any) =>
    entry?.acc_transaction_details?.some((detail: any) => detail?.coa4_id === coa4Id),
  );

  return num(
    master?.acc_transaction_details?.find((detail: any) => detail?.coa4_id === coa4Id)?.debit,
  );
};

const dateText = (value?: Date | string | null) =>
  value ? dayjs(value).format('DD/MM/YYYY') : '';

export const toSalesLedgerDocumentData = ({
  rows,
  startDate,
  endDate,
  accountName,
  productName,
  branch,
  branchName,
  showCategory,
}: SalesLedgerDocumentOptions): DocumentData => {
  const list = Array.isArray(rows) ? rows : [];
  const from = dateText(startDate);
  const to = dateText(endDate);

  const products = list.map((row) => {
    const details: any[] = Array.isArray(row?.sales_master?.details)
      ? row.sales_master.details
      : [];

    const coaName = getRelevantCoaName(row) ?? '';

    const label = (detail: any) => {
      const category = String(detail?.product?.category?.name ?? '').trim();
      const product = String(detail?.product?.name ?? '').trim();

      return `${showCategory && category ? `${category} ` : ''}${product}`.trim();
    };

    // A dash rather than nothing, where the voucher has no lines to show --
    // which is what the paper this replaces has always printed in an empty
    // column, and what stops a blank cell from reading as a missing figure.
    const perLine = (draw: (detail: any) => string) =>
      details.length ? details.map(draw) : ['-'];

    const discount = postedDebit(row, 23);
    const received = postedDebit(row, 17);
    const amount = details.reduce(
      (sum, detail) => sum + num(detail?.quantity) * num(detail?.sales_price),
      0,
    );

    return {
      id: row?.id ?? row?.mtmid,
      sl: row?.sl_number,
      challan_no: row?.challan_no ?? '',
      challan_date: row?.challan_date ?? '',
      coa_name: coaName,

      // The account, then the products, then the voucher's own note: exactly
      // the block the bespoke print draws in this cell, as lines.
      product_lines: [coaName, ...details.map(label), String(row?.sales_master?.notes ?? '')],

      qty_lines: perLine((detail) => thousandSeparator(num(detail?.quantity))),
      rate_lines: perLine((detail) =>
        num(detail?.sales_price) ? thousandSeparator(num(detail.sales_price)) : '-',
      ),
      amount_lines: perLine((detail) =>
        num(detail?.sales_price)
          ? thousandSeparator(Math.floor(num(detail?.quantity) * num(detail.sales_price)))
          : '-',
      ),

      qty: details.reduce((sum, detail) => sum + num(detail?.quantity), 0),
      amount,
      discount,
      received,
      // Charged, less what came off it and what was taken: the screen's Due
      // column, and the figure the report's own total is the sum of.
      balance: num(row?.sales_master?.total) - discount - received,
      notes: row?.sales_master?.notes ?? '',
    };
  });

  return {
    basic: {
      report_range: from && to ? `${from} to ${to}` : from || to,
      ledger_account: accountName ?? '',
      ledger_product: productName ?? '',
      branch_name: branchName || branch?.name || '',
    },
    products,
    branch: branch ?? null,
  };
};

/* ponytail: a row carrying money but no quantity and no value would trip
   DocumentPrint's isMoneyRow and have its middle columns merged into one cell.
   A sales ledger row is always a sale with lines, so it cannot happen here --
   if a payment-only row is ever fed to this report, give each row a real
   `amount` and the merge stops. */
