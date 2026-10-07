import React from 'react';

import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { flattenCustomerSales, groupCustomerSalesLines } from './customerSalesGroups';
import type { CustomerSalesCustomerGroup } from './customerSalesGroups';

type Props = {
  customers: CustomerSalesCustomerGroup[];
  totalQuantity: number;
  totalAmount: number;
  /** "Branch: Head Office | Customer: Rahim Traders | Date: 01/07/2026 - 31/07/2026" */
  filterLine?: string;
  fontSize?: number;
  /** Lines per sheet; 0 means one unbroken page. */
  rowsPerPage?: number;
  title?: string;
};

const COLUMN_COUNT = 10;

const chunk = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

/**
 * The Customer Sales Report on paper.
 *
 * ⚠️ A COMPONENT OF ITS OWN, AND THAT IS WHAT MAKES IT PRINT. The caller points
 * its ref at this node while hiding a WRAPPER, never this node: react-to-print
 * clones what the ref points at, so a `hidden` on the node itself is cloned too
 * and the sheet comes out blank.
 *
 * The Customer and Invoice cells merge down their blocks with rowSpan, exactly
 * as on the screen. ⚠️ A rowSpan cannot cross a page break, so the report is cut
 * into sheets FIRST and each sheet rebuilds its own groups -- a customer or an
 * invoice whose lines run past a fold has its heading repeated on the next
 * sheet, with the span counted from that sheet's lines alone.
 */
const CustomerSalesPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    { customers, totalQuantity, totalAmount, filterLine, fontSize = 10, rowsPerPage = 0, title = 'Customer Sales Report' },
    ref,
  ) => {
    const fs = fontSize;
    const cell = 'border border-gray-900 px-2 py-1 align-top';
    const lines = flattenCustomerSales(customers);
    const pages = chunk(lines, rowsPerPage);
    const pageCount = pages.length || 1;

    return (
      <div ref={ref} className="print-root p-8 text-gray-900">
        <PrintStyles />

        {(pages.length ? pages : [[]]).map((pageLines, pIdx) => {
          const isLastPage = pIdx === pageCount - 1;
          const groups = groupCustomerSalesLines(pageLines);

          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />

              <div className="mb-4 text-center">
                <h1 className="text-xl font-bold">{title}</h1>
                {filterLine ? <div className="mt-1 text-xs">{filterLine}</div> : null}
              </div>

              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th style={{ fontSize: fs }} className={`${cell} w-28 text-left`}>Customer</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-24 text-left`}>Invoice / Date</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-8 text-center`}>SL</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-16`}>Brand</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-16`}>Group</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-16`}>Category</th>
                    <th style={{ fontSize: fs }} className={cell}>Product</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-12 text-right`}>Qty</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-12 text-right`}>Rate</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-16 text-right`}>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {groups.length ? (
                    groups.map((customer) =>
                      customer.invoices.map((invoice, invoiceIndex) =>
                        invoice.lines.map((line, lineIndex) => (
                          <tr key={`${customer.key}-${invoice.key}-${line.key}`} className="avoid-break">
                            {invoiceIndex === 0 && lineIndex === 0 ? (
                              <td
                                rowSpan={customer.rowCount}
                                style={{ fontSize: fs }}
                                className={`${cell} bg-gray-200 font-bold`}
                              >
                                {customer.customer_name}
                              </td>
                            ) : null}

                            {lineIndex === 0 ? (
                              <td
                                rowSpan={invoice.lines.length}
                                style={{ fontSize: fs }}
                                className={`${cell} bg-gray-50`}
                              >
                                <div className="font-semibold">{invoice.invoice_no}</div>
                                {invoice.invoice_date && invoice.invoice_date !== '-' ? (
                                  <div>{invoice.invoice_date}</div>
                                ) : null}
                              </td>
                            ) : null}

                            <td style={{ fontSize: fs }} className={`${cell} text-center`}>{line.sl}</td>
                            <td style={{ fontSize: fs }} className={cell}>{line.row.brand_name || '-'}</td>
                            <td style={{ fontSize: fs }} className={cell}>{line.row.group_name || '-'}</td>
                            <td style={{ fontSize: fs }} className={cell}>{line.row.category_name || '-'}</td>
                            <td style={{ fontSize: fs }} className={cell}>
                              {String(line.row.product_code ?? '').trim()
                                ? `${line.row.product_code} - ${line.row.product_name || '-'}`
                                : line.row.product_name || '-'}
                            </td>
                            <td style={{ fontSize: fs }} className={`${cell} text-right`}>{thousandSeparator(line.row.quantity)}</td>
                            <td style={{ fontSize: fs }} className={`${cell} text-right`}>{thousandSeparator(line.row.rate)}</td>
                            <td style={{ fontSize: fs }} className={`${cell} text-right`}>{thousandSeparator(line.row.amount)}</td>
                          </tr>
                        )),
                      ),
                    )
                  ) : (
                    <tr>
                      <td
                        style={{ fontSize: fs }}
                        colSpan={COLUMN_COUNT}
                        className={`${cell} py-6 text-center text-gray-500`}
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* The report's total, so it goes on the sheet that ends it. */}
                {lines.length && isLastPage ? (
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td style={{ fontSize: fs }} className={`${cell} text-right`} colSpan={7}>
                        Grand Total
                      </td>
                      <td style={{ fontSize: fs }} className={`${cell} text-right`}>{thousandSeparator(totalQuantity)}</td>
                      <td style={{ fontSize: fs }} className={cell} />
                      <td style={{ fontSize: fs }} className={`${cell} text-right`}>{thousandSeparator(totalAmount)}</td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>

              <PrintFooter page={pIdx + 1} total={pageCount} fontSize={fs} />

              {!isLastPage && <div className="page-break" />}
            </div>
          );
        })}
      </div>
    );
  },
);

CustomerSalesPrint.displayName = 'CustomerSalesPrint';
export default CustomerSalesPrint;
