import dayjs from 'dayjs';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import type { PrintBranch } from '../../../utils/utils-functions/printBranch';

/**
 * The Stock Details report in the shape the print designer draws.
 *
 * The bespoke paper (profit-loss/ItemDetailsPrint.tsx) knows these columns by
 * hard-coded name and bands the rows by brand or by category. This hands the
 * same facts over flat -- one row per stock layer, the brand, the category and
 * the group as ordinary columns.
 *
 * ⚠️ THE THREE READERS BELOW ARE THIS SCREEN'S OWN, copied from
 * ClosingStockReport.tsx rather than invented. That screen falls back through
 * several names for each fact -- `category` then `category_name` then
 * `cat_name`, and a brand that can arrive as `__brandKey` because normalizeRows
 * unpacks the server's brand-keyed map -- and a paper that read only the first
 * of each would print an empty cell under a heading the screen is filling in.
 * The two have to answer the same way, so they read the same way.
 *
 * ⚠️ `amount` IS THE ROW'S OWN Total, NOT `qty * price`. The report takes the
 * layer's purchase percentage off before it values anything, so multiplying the
 * two here would print a figure the screen never showed -- and DocumentPrint
 * foots its Grand Total from these rows, so the whole column would be wrong by
 * the deduction. See rowTotal in ClosingStockReport.tsx for the same rule.
 */
export type StockDetailsDocumentOptions = {
  rows: any[];
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  /** The Brand, Category and Group the report was filtered to, if it was. */
  brandName?: string | null;
  categoryName?: string | null;
  groupName?: string | null;
  /** The branch the report is ABOUT, not the reader's -- see usePrintBranch. */
  branch?: PrintBranch | null;
  /** The same branch's name, for the heading -- see the note on
   *  SalesLedgerDocumentOptions for why it is kept apart from `branch`. */
  branchName?: string | null;
};

const num = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstName = (...values: any[]) =>
  values.map((value) => String(value ?? '').trim()).find(Boolean) || '';

const rowProduct = (row: any) => String(row?.product_name ?? row?.name ?? '').trim();
const rowCode = (row: any) => String(row?.code ?? '').trim();
const rowUnit = (row: any) => String(row?.unit ?? row?.unit_name ?? '').trim();
const rowQty = (row: any) => num(row?.stock ?? row?.qty ?? row?.product_in);
const rowRate = (row: any) => num(row?.rate ?? row?.avg_rate);
const rowTotal = (row: any) => {
  const direct = row?.total_stock ?? row?.total ?? row?.amount;
  if (direct !== undefined && direct !== null && direct !== '') return num(direct);
  return rowQty(row) * rowRate(row);
};

export const toStockDetailsDocumentData = ({
  rows,
  startDate,
  endDate,
  brandName,
  categoryName,
  groupName,
  branch,
  branchName,
}: StockDetailsDocumentOptions): DocumentData => {
  const list = Array.isArray(rows) ? rows : [];

  const products = list.map((row, index) => ({
    sl: index + 1,
    product_id: row?.product_id,
    product_name: rowProduct(row),
    code: rowCode(row),
    brand: firstName(row?.brand, row?.brand_name, row?.__brandKey),
    category: firstName(row?.category, row?.category_name, row?.cat_name),
    group: firstName(row?.group, row?.group_name),
    unit: rowUnit(row),
    qty: rowQty(row),
    price: rowRate(row),
    amount: rowTotal(row),
    purchase_pct: num(row?.purchase_pct),
  }));

  const asOn = endDate ? dayjs(endDate).format('DD/MM/YYYY') : '';
  const from = startDate ? dayjs(startDate).format('DD/MM/YYYY') : '';

  return {
    basic: {
      as_on_date: asOn,
      report_range: from && asOn ? `${from} to ${asOn}` : from || asOn,
      report_brand: brandName ?? '',
      report_category: categoryName ?? '',
      report_group: groupName ?? '',
      branch_name: branchName || branch?.name || '',
    },
    products,
    branch: branch ?? null,
  };
};
