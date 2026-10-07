import type { CustomerSalesRow } from './customerSalesSlice';

/**
 * One line of an invoice, as the screen draws it: the serial and the row.
 */
export interface CustomerSalesLine {
  /** Stable key for React, unique within the report. */
  key: string;
  sl: number;
  row: CustomerSalesRow;
}

/**
 * One invoice and the lines billed on it.
 *
 * The invoice's heading cell spans `lines.length` rows, so the number and date
 * sit beside the block rather than above it.
 */
export interface CustomerSalesInvoiceGroup {
  key: string;
  invoice_no: string;
  invoice_date: string;
  lines: CustomerSalesLine[];
}

/**
 * One customer and its invoices.
 *
 * `rowCount` is the whole block's height in rows -- every line of every invoice
 * -- which is what the customer's own cell spans.
 */
export interface CustomerSalesCustomerGroup {
  key: string;
  customer_name: string;
  rowCount: number;
  invoices: CustomerSalesInvoiceGroup[];
}

export interface CustomerSalesBuilt {
  customers: CustomerSalesCustomerGroup[];
  totalQuantity: number;
  totalAmount: number;
}

/** A flat line, carrying the group labels it belongs to. Used to paginate. */
export interface CustomerSalesFlatLine {
  key: string;
  customerKey: string;
  customerName: string;
  invoiceKey: string;
  invoiceNo: string;
  invoiceDate: string;
  sl: number;
  row: CustomerSalesRow;
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
 * Splits flat rows into customers, and each customer into its invoices.
 *
 * Shared by the first build and by the print's per-page rebuild, so a page's
 * rowSpans are counted the same way the whole report's are.
 */
const groupRows = (rows: CustomerSalesRow[]): CustomerSalesCustomerGroup[] => {
  const byCustomer = new Map<string, { name: string; rows: CustomerSalesRow[] }>();

  for (const row of rows) {
    const key = customerKeyOf(row);
    if (!byCustomer.has(key)) {
      byCustomer.set(key, {
        name: String(row?.customer_name ?? '').trim() || '-',
        rows: [],
      });
    }
    byCustomer.get(key)!.rows.push(row);
  }

  const customers: CustomerSalesCustomerGroup[] = [];

  for (const [customerKey, customer] of byCustomer) {
    // Invoices of this customer, in the order the rows arrived (raised order).
    const byInvoice = new Map<
      string,
      { invoice_no: string; invoice_date: string; rows: CustomerSalesRow[] }
    >();

    for (const row of customer.rows) {
      const key = invoiceKeyOf(row);
      if (!byInvoice.has(key)) {
        byInvoice.set(key, {
          invoice_no: String(row?.invoice_no ?? '').trim() || '-',
          invoice_date: String(row?.invoice_date ?? '').trim() || '-',
          rows: [],
        });
      }
      byInvoice.get(key)!.rows.push(row);
    }

    const invoices: CustomerSalesInvoiceGroup[] = [];
    let rowCount = 0;

    for (const [invoiceKey, invoice] of byInvoice) {
      const lines: CustomerSalesLine[] = invoice.rows.map((row, index) => ({
        key: `${invoiceKey}-${index}-${row?.product_id ?? ''}`,
        // The serial restarts at each invoice, the way a grouped report numbers
        // its rows.
        sl: index + 1,
        row: {
          ...row,
          quantity: toNumber(row?.quantity),
          rate: toNumber(row?.rate),
          amount: toNumber(row?.amount),
        },
      }));

      rowCount += lines.length;
      invoices.push({
        key: invoiceKey,
        invoice_no: invoice.invoice_no,
        invoice_date: invoice.invoice_date,
        lines,
      });
    }

    customers.push({
      key: customerKey,
      customer_name: customer.name,
      rowCount,
      invoices,
    });
  }

  return customers;
};

/**
 * Files the flat invoice lines Customer -> Invoice -> Brand -> Group -> Category
 * -> Product.
 *
 * The server sends them in a related order; the sort is kept here as well so a
 * row that arrives out of place cannot open a gap in the middle of an invoice's
 * block. Invoices run in the order they were raised.
 */
export const buildCustomerSalesGroups = (
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

  const customers = groupRows(sorted);

  let totalQuantity = 0;
  let totalAmount = 0;

  for (const customer of customers) {
    for (const invoice of customer.invoices) {
      for (const line of invoice.lines) {
        totalQuantity += toNumber(line.row?.quantity);
        totalAmount += toNumber(line.row?.amount);
      }
    }
  }

  return { customers, totalQuantity, totalAmount };
};

/** Every line of the report, in drawing order, with its group labels. */
export const flattenCustomerSales = (
  customers: CustomerSalesCustomerGroup[],
): CustomerSalesFlatLine[] => {
  const out: CustomerSalesFlatLine[] = [];

  for (const customer of Array.isArray(customers) ? customers : []) {
    for (const invoice of customer.invoices) {
      for (const line of invoice.lines) {
        out.push({
          key: `${customer.key}-${invoice.key}-${line.key}`,
          customerKey: customer.key,
          customerName: customer.customer_name,
          invoiceKey: invoice.key,
          invoiceNo: invoice.invoice_no,
          invoiceDate: invoice.invoice_date,
          sl: line.sl,
          row: line.row,
        });
      }
    }
  }

  return out;
};

/**
 * Rebuilds the nested groups from a page's own lines.
 *
 * ⚠️ EACH PRINTED PAGE RE-GROUPS ITS OWN LINES. A rowSpan cannot cross a page
 * break, so a customer's or an invoice's heading is repeated on every sheet its
 * lines reach -- and the span is counted from the lines on that sheet alone.
 */
export const groupCustomerSalesLines = (
  lines: CustomerSalesFlatLine[],
): CustomerSalesCustomerGroup[] => {
  const byCustomer = new Map<
    string,
    {
      name: string;
      invoices: Map<
        string,
        { invoice_no: string; invoice_date: string; lines: CustomerSalesLine[] }
      >;
    }
  >();

  for (const line of Array.isArray(lines) ? lines : []) {
    if (!byCustomer.has(line.customerKey)) {
      byCustomer.set(line.customerKey, { name: line.customerName, invoices: new Map() });
    }

    const customer = byCustomer.get(line.customerKey)!;

    if (!customer.invoices.has(line.invoiceKey)) {
      customer.invoices.set(line.invoiceKey, {
        invoice_no: line.invoiceNo,
        invoice_date: line.invoiceDate,
        lines: [],
      });
    }

    customer.invoices.get(line.invoiceKey)!.lines.push({
      key: line.key,
      sl: line.sl,
      row: line.row,
    });
  }

  const customers: CustomerSalesCustomerGroup[] = [];

  for (const [customerKey, customer] of byCustomer) {
    const invoices: CustomerSalesInvoiceGroup[] = [];
    let rowCount = 0;

    for (const [invoiceKey, invoice] of customer.invoices) {
      rowCount += invoice.lines.length;
      invoices.push({
        key: invoiceKey,
        invoice_no: invoice.invoice_no,
        invoice_date: invoice.invoice_date,
        lines: invoice.lines,
      });
    }

    customers.push({
      key: customerKey,
      customer_name: customer.name,
      rowCount,
      invoices,
    });
  }

  return customers;
};
