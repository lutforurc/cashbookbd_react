import dayjs from 'dayjs';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import type { PrintBranch } from '../../../utils/utils-functions/printBranch';

/**
 * The Product Stock report in the shape the print designer draws.
 *
 * The bespoke paper (StockBookPrint.tsx) knows these columns by hard-coded name
 * and builds a Brand heading and a Category heading over each group. This hands
 * the same facts over flat instead, so a tenant can arrange them: one row per
 * product, no headings, the brand and the category as ordinary columns they can
 * put wherever they like -- or leave out.
 *
 * ⚠️ THE SENTINEL ROWS ARE DROPPED HERE. What the screen holds is the report's
 * rows with `__type: 'BRAND' | 'CAT' | 'GRAND_TOTAL'` entries woven between them
 * (see buildBrandCategoryRows), and those are headings, not products. Passed
 * through, the Brand row would print as a product with no figures and the Grand
 * Total row as a product called "Grand Total" -- and DocumentPrint works its own
 * foot out from these rows, so it would count the total twice.
 *
 * ⚠️ `brand` AND `category` ARE THE SERVER'S `brand_name` AND `cat_name`, renamed.
 * A composed product pattern reads a token by the row's own key, verbatim, so
 * the catalogue's `{brand}` finds nothing under the server's name. `code` and
 * `group` are not in this report's answer at all: they are deliberately left off
 * rather than invented, so a layout asking for one prints blank on every page,
 * which is the truth about this report.
 */
export type ProductStockDocumentOptions = {
  rows: any[];
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  /** The Brand and Category the report was filtered to, if it was. */
  brandName?: string | null;
  categoryName?: string | null;
  /** The branch the report is ABOUT, not the reader's -- see usePrintBranch. */
  branch?: PrintBranch | null;
  /** The same branch's name, for the heading. Kept apart from `branch` above
   *  because usePrintBranch answers with nothing for the reader's own branch --
   *  see the note on SalesLedgerDocumentOptions. */
  branchName?: string | null;
};

const num = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const text = (value: any) => String(value ?? '').trim();

export const toProductStockDocumentData = ({
  rows,
  startDate,
  endDate,
  brandName,
  categoryName,
  branch,
  branchName,
}: ProductStockDocumentOptions): DocumentData => {
  const list = (Array.isArray(rows) ? rows : []).filter((row) => !row?.__type);

  const products = list.map((row) => ({
    sl: row?.sl_number,
    sl_number: row?.sl_number,
    product_id: row?.product_id,
    product_name: text(row?.product_name),
    brand: text(row?.brand_name),
    category: text(row?.cat_name),
    group: '',
    code: '',
    unit: text(row?.unit),
    opening: num(row?.opening),
    stock_in: num(row?.stock_in),
    stock_out: num(row?.stock_out),
    balance: num(row?.balance),
  }));

  const from = startDate ? dayjs(startDate).format('DD/MM/YYYY') : '';
  const to = endDate ? dayjs(endDate).format('DD/MM/YYYY') : '';

  return {
    basic: {
      report_range: from && to ? `${from} to ${to}` : from || to,
      report_brand: brandName ?? '',
      report_category: categoryName ?? '',
      branch_name: branchName || branch?.name || '',
    },
    products,
    branch: branch ?? null,
  };
};
