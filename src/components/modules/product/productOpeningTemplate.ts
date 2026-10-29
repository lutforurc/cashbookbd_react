/**
 * The Product Opening Import template, in one place.
 *
 * ⚠️ THE SHEET'S SHAPE IS THE IMPORT'S CONTRACT. Products -> Opening Import
 * reads the headings in this order, matches them by name (not by position) and
 * expects `product_name` among them, so a file built to any other shape is a
 * file it refuses. The template the import screen hands out and the catalogue
 * the Product List downloads are both built from this module, so the two cannot
 * drift apart.
 */
export const PRODUCT_OPENING_SHEET = 'Product Opening';

/** The headings, in the owner's order. `sl_no` is the owner's own count and is not saved. */
export const PRODUCT_OPENING_HEADINGS: string[] = [
  'sl_no',
  'brand_name',
  'group',
  'category',
  'code',
  'product_name',
  'unit',
  'purchase_price',
  'sales_price',
  'stock',
];

/** The column widths the template sheet opens with. */
export const PRODUCT_OPENING_COL_WIDTHS: number[] = [8, 16, 14, 14, 14, 36, 10, 14, 14, 10];

const amount = (value: unknown): number => {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * One sheet row per product, in PRODUCT_OPENING_HEADINGS order.
 *
 * ⚠️ `stock` IS THE PRODUCT'S OPENING QUANTITY, NEVER ITS STOCK ON HAND.
 * Importing a row sets that product's opening stock (it replaces the opening
 * voucher), so exporting `current_stock` would write the balance back as the
 * opening and count purchases and sales a second time on the next import.
 * `openingbalance` is the column the list's own opening box edits.
 */
export const productOpeningImportRows = (products: any[]): (string | number)[][] =>
  products.map((row, index) => [
    index + 1,
    row?.brand ?? '',
    row?.group_name ?? row?.group ?? '',
    row?.category ?? '',
    row?.code ?? '',
    row?.name ?? '',
    row?.unit ?? '',
    amount(row?.purchase),
    amount(row?.sales),
    amount(row?.openingbalance ?? row?.qty),
  ]);
