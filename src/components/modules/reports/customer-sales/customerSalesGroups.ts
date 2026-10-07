import type { CustomerSalesRow } from './customerSalesSlice';

/**
 * A row of the report as the screen draws it.
 *
 * The endpoint answers one row per invoice line. The screen files them under
 * the customer they belong to, and then under the invoice they were billed on.
 *
 * ⚠️ NEITHER THE CUSTOMER NOR THE INVOICE IS A COLUMN. Each is a heading row of
 * its own -- one row for the customer at the top of its block, one row for the
 * invoice at the top of each invoice's lines -- and the lines below keep the
 * product's brand, group, category and name as columns.
 */
export type CustomerSalesDisplayRow =
  | {
      __type: 'CUSTOMER';
      key: string;
      customer_name: string;
      quantity: number;
      amount: number;
    }
  | {
      __type: 'INVOICE';
      key: string;
      invoice_no: string;
      invoice_date: string;
      manual_voucher_no: string;
      manual_challan_no: string;
      quantity: number;
      amount: number;
    }
  | { __type: 'ITEM'; key: string; sl: number; row: CustomerSalesRow };

export interface CustomerSalesBuilt {
  rows: CustomerSalesDisplayRow[];
  totalQuantity: number;
  totalAmount: number;
}

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const byName = (a: any, b: any) => String(a ?? '').localeCompare(String(b ?? ''));

/** Has the server actually sent an id? 0 is an id, "" is not. */
const hasId = (value: any) =>
  value !== null && value !== undefined && String(value) !== '';

/**
 * ⚠️ THE ID LEADS, THE NAME IS ONLY THE FALLBACK. Two customers who happen to
 * share a name are still two accounts, and one that is renamed must not merge
 * into another -- so a line with an id is filed under it and a line without one
 * (an install a version behind) is filed under the name instead.
 */
const customerKeyOf = (row: CustomerSalesRow) =>
  hasId(row?.customer_id)
    ? `c:${row.customer_id}`
    : `c:${String(row?.customer_name ?? '').trim()}`;

/**
 * One invoice: the main transaction's own id where the server sent it, and the
 * number and date together where it did not. Two invoices must never merge, and
 * a number alone is not unique across the book.
 */
const invoiceKeyOf = (row: CustomerSalesRow) =>
  hasId(row?.mtm_id)
    ? `i:${row.mtm_id}`
    : `i:${String(row?.invoice_no ?? '').trim()}|${String(row?.invoice_date ?? '').trim()}`;

const byInvoiceId = (a: CustomerSalesRow, b: CustomerSalesRow) =>
  (Number(a?.mtm_id) || 0) - (Number(b?.mtm_id) || 0);

/**
 * Files the flat invoice lines Customer -> Invoice -> Brand -> Group -> Category
 * -> Product.
 *
 * The customer heads its own block once; each invoice heads its lines once. The
 * serial restarts at each invoice, the way a grouped report numbers its rows.
 */
export const buildCustomerSalesRows = (
  rows: CustomerSalesRow[],
): CustomerSalesBuilt => {
  const source = Array.isArray(rows) ? [...rows] : [];

  const sorted = source.sort(
    (a, b) =>
      byName(a?.customer_name, b?.customer_name) ||
      byInvoiceId(a, b) ||
      byName(a?.brand_name, b?.brand_name) ||
      byName(a?.group_name, b?.group_name) ||
      byName(a?.category_name, b?.category_name) ||
      byName(a?.product_name, b?.product_name),
  );

  const byCustomer = new Map<string, { name: string; rows: CustomerSalesRow[] }>();

  for (const row of sorted) {
    const key = customerKeyOf(row);
    if (!byCustomer.has(key)) {
      byCustomer.set(key, {
        name: String(row?.customer_name ?? '').trim() || '-',
        rows: [],
      });
    }
    byCustomer.get(key)!.rows.push(row);
  }

  const out: CustomerSalesDisplayRow[] = [];
  let totalQuantity = 0;
  let totalAmount = 0;

  for (const [customerKey, customer] of byCustomer) {
    // Invoices of this customer, in the order the rows arrived (raised order).
    const byInvoice = new Map<
      string,
      {
        invoice_no: string;
        invoice_date: string;
        manual_voucher_no: string;
        manual_challan_no: string;
        rows: CustomerSalesRow[];
      }
    >();

    for (const row of customer.rows) {
      const key = invoiceKeyOf(row);
      if (!byInvoice.has(key)) {
        // ⚠️ EVERY LINE OF AN INVOICE CARRIES THE SAME MEMO AND CHALLAN, so the
        // line that raises the block is the one that names it -- reading them off
        // the block instead of the line would head the invoice with "undefined".
        byInvoice.set(key, {
          invoice_no: String(row?.invoice_no ?? '').trim() || '-',
          invoice_date: String(row?.invoice_date ?? '').trim() || '-',
          manual_voucher_no: String(row?.manual_voucher_no ?? '').trim(),
          manual_challan_no: String(row?.manual_challan_no ?? '').trim(),
          rows: [],
        });
      }
      byInvoice.get(key)!.rows.push(row);
    }

    let customerQuantity = 0;
    let customerAmount = 0;
    const blocks: CustomerSalesDisplayRow[] = [];

    for (const [invoiceKey, invoice] of byInvoice) {
      let invoiceQuantity = 0;
      let invoiceAmount = 0;

      const itemRows: CustomerSalesDisplayRow[] = invoice.rows.map((row, index) => {
        const quantity = toNumber(row?.quantity);
        const amount = toNumber(row?.amount);

        invoiceQuantity += quantity;
        invoiceAmount += amount;

        return {
          __type: 'ITEM',
          key: `${invoiceKey}-${index}-${row?.product_id ?? ''}`,
          sl: index + 1,
          row: {
            ...row,
            quantity,
            rate: toNumber(row?.rate),
            amount,
          },
        };
      });

      blocks.push({
        __type: 'INVOICE',
        key: invoiceKey,
        invoice_no: invoice.invoice_no,
        manual_voucher_no: invoice.manual_voucher_no,
        manual_challan_no: invoice.manual_challan_no,
        invoice_date: invoice.invoice_date,
        quantity: invoiceQuantity,
        amount: invoiceAmount,
      });
      blocks.push(...itemRows);

      customerQuantity += invoiceQuantity;
      customerAmount += invoiceAmount;
    }

    out.push({
      __type: 'CUSTOMER',
      key: customerKey,
      customer_name: customer.name,
      quantity: customerQuantity,
      amount: customerAmount,
    });
    out.push(...blocks);

    totalQuantity += customerQuantity;
    totalAmount += customerAmount;
  }

  return { rows: out, totalQuantity, totalAmount };
};
