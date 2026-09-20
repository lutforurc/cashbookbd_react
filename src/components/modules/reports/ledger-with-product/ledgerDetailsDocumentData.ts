import dayjs from 'dayjs';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import type {
  LedgerWithProductRow,
  LedgerWithProductSummary,
} from './ledgerWithProductTypes';
import {
  getBalanceCreditValue,
  getBalanceDebitValue,
  getPurchaseAmount,
  getPurchaseQty,
  getSalesAmount,
  getSalesQty,
  parseAmount,
} from './ledgerWithProductUtils';

/**
 * The Ledger Details statement -- one customer or supplier's account -- in the
 * shape the print designer draws.
 *
 * The bespoke paper (LedgerWithProductPrint.tsx) knows these twelve columns by
 * hard-coded name; this hands the same facts over as data so a tenant can
 * arrange them. One entry per voucher, no arrays anywhere: unlike the two
 * ledgers, a statement row holds one value per column and nothing inside a
 * cell, so every field here is a scalar.
 *
 * ⚠️ EVERY FIGURE MIRRORS THE ONE THE SCREEN PRINTS, asked of the same helpers
 * in ledgerWithProductUtils rather than re-derived. DocumentPrint works its
 * Grand Total row out from these rows, never from the screen's summary, so a
 * figure that drifted here would print a foot that disagrees with the column
 * above it.
 */
export type LedgerDetailsDocumentOptions = {
  rows: LedgerWithProductRow[];
  summary?: LedgerWithProductSummary;
  /** Whose statement this is: the party the report was filtered to. */
  partyName?: string | null;
  ledgerPage?: string | null;
  mobile?: string | null;
  address?: string | null;
  productName?: string | null;
  transactionTypeLabel?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  /** The branch the report is ABOUT, for the heading. */
  branchName?: string | null;
};

const dateText = (value?: Date | string | null) =>
  value ? dayjs(value).format('DD/MM/YYYY') : '';

/**
 * The one line the description column opens with.
 *
 * ⚠️ The item name goes INSIDE it rather than on a line of its own, which is
 * where the bespoke paper draws it -- set a size smaller, but on the same line
 * as the voucher's own name. A designer cell cannot say "this line, smaller":
 * what it can hold is a list of lines, so splitting the two would push the item
 * onto a second line and read as a second remark.
 */
const descriptionFirstLine = (row: LedgerWithProductRow) => {
  const name = String(row?.transaction_name ?? '').trim();
  const item = String(row?.sales_item_name ?? '').trim();

  return [name, item ? `(${item})` : ''].filter(Boolean).join(' ');
};

export const toLedgerDetailsDocumentData = ({
  rows,
  summary = {},
  partyName,
  ledgerPage,
  mobile,
  address,
  productName,
  transactionTypeLabel,
  startDate,
  endDate,
  branchName,
}: LedgerDetailsDocumentOptions): DocumentData => {
  const list = Array.isArray(rows) ? rows : [];
  const from = dateText(startDate);
  const to = dateText(endDate);

  const products = list.map((row) => ({
    sl: row?.sl_number,
    voucher_no: row?.vr_no ?? '',
    voucher_date: row?.vr_date ?? '',

    description_lines: [
      descriptionFirstLine(row),
      String(row?.remarks ?? '').trim(),
      String(row?.order_number ?? '').trim(),
    ].filter(Boolean),
    description_flat: [descriptionFirstLine(row), row?.remarks, row?.order_number]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(' '),

    vehicle_no: row?.truck_no ?? '',
    pur_qty: getPurchaseQty(row),
    sal_qty: getSalesQty(row),
    rate: Number(row?.rate || 0),
    pur_total: getPurchaseAmount(row),
    sal_total: getSalesAmount(row),
    debit: getBalanceDebitValue(row),
    credit: getBalanceCreditValue(row),
    // Carried down from the row above, so it is read off the row the rows
    // helper already walked -- never re-added here, which is what would make it
    // a second, different balance.
    //
    // ponytail: a figure below nought prints as -6,000 here where the bespoke
    // sheet has always put it in brackets, (6,000). The renderer does the
    // formatting for every paper alike and cannot be told otherwise per column;
    // add a `format` on the catalogue entry if the two papers must match.
    running_balance: parseAmount(row?.running_balance ?? row?.balance),
  }));

  /*
    ⚠️ THE TWO FOOTING FIGURES THE SERVER MAY SEND, PREFERRED THE WAY THE
    SCREEN PREFERS THEM. `summary.debit` / `summary.credit` are the server's own
    totals for this statement and the on-screen foot prints them when they are
    there; the client's sum of the column is the fallback. DocumentPrint can
    only sum the column (see the totals map), so on a statement where the two
    disagree the paper's foot follows the rows -- which is the figure a reader
    can add up for themselves.
  */
  const footDebit = Number.isFinite(Number(summary?.debit))
    ? Number(summary.debit)
    : list.reduce((sum, row) => sum + getBalanceDebitValue(row), 0);
  const footCredit = Number.isFinite(Number(summary?.credit))
    ? Number(summary.credit)
    : list.reduce((sum, row) => sum + getBalanceCreditValue(row), 0);

  return {
    basic: {
      report_range: from && to ? `${from} to ${to}` : from || to,
      party_name: partyName ?? '',
      mobile: mobile ?? '',
      manual_address: address ?? '',
      ledger_page: ledgerPage ?? '',
      ledger_product: productName ?? 'All',
      report_trx_type: transactionTypeLabel ?? 'All',
      opening_balance: parseAmount(summary?.opening_balance),
      closing_balance: list.length
        ? parseAmount(list[list.length - 1]?.running_balance ?? list[list.length - 1]?.balance)
        : parseAmount(summary?.closing_balance),
      branch_name: branchName ?? '',
    },
    products,
  };
};
