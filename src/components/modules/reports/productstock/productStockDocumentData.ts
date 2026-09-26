import dayjs from 'dayjs';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import type { PrintBranch } from '../../../utils/utils-functions/printBranch';

/**
 * The Product Stock report in the shape the print designer draws.
 *
 * The bespoke paper (StockBookPrint.tsx) knows these columns by hard-coded name
 * and builds a Brand heading and a Category heading over each group. This hands
 * the same facts over, each product on a row the tenant can arrange, and the
 * headings the screen already grouped it by as heading rows of their own.
 *
 * ⚠️ THE SENTINEL ROWS COME THROUGH AS HEADINGS, EXCEPT THE GRAND TOTAL. What
 * the screen holds is the report's rows with `__type: 'BRAND' | 'CAT' | 'GROUP'
 * | 'GRAND_TOTAL'` entries woven between them (see buildBrandCategoryRows and
 * buildCategoryWiseRows), and the first three are headings, not products. They
 * are turned into `__heading` rows, which DocumentPrint draws as one cell across
 * the table -- so the paper groups exactly as the screen behind it does. The
 * Grand Total row is still dropped: DocumentPrint works its own foot out from
 * these rows, so passing it through would print it as a product called "Grand
 * Total" and count every figure twice.
 *
 * ⚠️ `brand` AND `category` ARE THE SERVER'S `brand_name` AND `cat_name`, renamed.
 * A composed product pattern reads a token by the row's own key, verbatim, so
 * the catalogue's `{brand}` finds nothing under the server's name.
 *
 * ⚠️ `code` COMES FROM THE SERVER NOW, `group` STILL DOES NOT. The report's
 * query carries the product code (guarded -- older databases have no such
 * column, in which case it answers an empty string and a `{code}` in a pattern
 * prints blank, which is the truth there). `group` is a different matter: it is
 * not in this report's answer at all, and it is deliberately left off rather
 * than invented, so a layout asking for it prints blank on every page.
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
  const source = Array.isArray(rows) ? rows : [];

  /**
   * ⚠️ THE GROUP HEADINGS ARE HANDED THROUGH, THE GRAND TOTAL ROW IS NOT.
   *
   * How this report is grouped is not decided here -- the screen has already
   * decided it. A branch that turns on Edit Branch -> "Stock: Brand->Category->
   * Item" gets brand and category rows woven among its products by
   * buildBrandCategoryRows, and one that does not gets category rows from
   * buildCategoryWiseRows. Passing those rows on is what makes this paper print
   * the same grouping as the screen behind it, with no second setting to keep in
   * step.
   *
   * ⚠️ Their NAME comes out of the fact each row is built around, and a category
   * heading says which brand it sits under -- `ATI → Tiles`, the arrow the screen
   * and the bespoke sheet both draw there (ProductStock.tsx prints exactly that).
   * A category row from the straight-listing branch carries no brand, so it
   * comes out as its own name alone.
   *
   * ⚠️ AND THE GRAND TOTAL IS STILL DROPPED. DocumentPrint works its own foot
   * out from these rows, so a Grand Total row passed through would print as a
   * product called "Grand Total" and count every figure twice.
   */
  const products: any[] = [];

  for (const row of source) {
    if (row?.__type === 'GRAND_TOTAL') continue;

    if (row?.__type) {
      const brand = text(row.brand_name);
      const heading =
        row.__type === 'BRAND' ? brand : [brand, text(row.cat_name)].filter(Boolean).join(' → ');

      /**
       * ⚠️ ONE STEP IN, AND ONLY WHERE THERE IS SOMETHING TO SIT UNDER. On the
       * grouped branch a category hangs off its brand (depth 1); on the
       * straight-listing branch there is no brand, so its category stands at the
       * margin like the brand would. See the heading branch in DocumentPrint.
       */
      if (heading) {
        products.push({ __heading: heading, __depth: row.__type === 'CAT' && brand ? 1 : 0 });
      }
      continue;
    }

    products.push({
      sl: row?.sl_number,
      sl_number: row?.sl_number,
      product_id: row?.product_id,
      product_name: text(row?.product_name),
      brand: text(row?.brand_name),
      category: text(row?.cat_name),
      group: '',
      code: text(row?.code),
      unit: text(row?.unit),
      opening: num(row?.opening),
      stock_in: num(row?.stock_in),
      stock_out: num(row?.stock_out),
      balance: num(row?.balance),
    });
  }

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
