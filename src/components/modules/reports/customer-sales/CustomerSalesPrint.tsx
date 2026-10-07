import React from 'react';

import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import type { CustomerSalesDisplayRow } from './customerSalesGroups';

type Props = {
  rows: CustomerSalesDisplayRow[];
  totalQuantity: number;
  totalAmount: number;
  /** "Branch: Head Office | Customer: Rahim Traders | Date: 01/07/2026 - 31/07/2026" */
  filterLine?: string;
  fontSize?: number;
  /** Rows per sheet; 0 means one unbroken page. */
  rowsPerPage?: number;
  title?: string;
};

const COLUMN_COUNT = 8;

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
 * Customer and Invoice are heading ROWS, not columns: one band for the customer
 * at the top of its block, one band for each invoice at the top of its lines,
 * with the invoice's subtotal on that band and the customer's on its own. The
 * grand total is footed once, on the sheet that ends the report.
 */
const CustomerSalesPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    { rows, totalQuantity, totalAmount, filterLine, fontSize = 10, rowsPerPage = 0, title = 'Customer Sales Report' },
    ref,
  ) => {
    const fs = fontSize;
    const cell = 'border border-gray-900 px-2 py-1';
    const allRows = Array.isArray(rows) ? rows : [];
    const pages = chunk(allRows, rowsPerPage);
    const pageCount = pages.length || 1;

    return (
      <div ref={ref} className="print-root p-8 text-gray-900">
        <PrintStyles />

        {(pages.length ? pages : [[]]).map((pageRows, pIdx) => {
          const isLastPage = pIdx === pageCount - 1;

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
                    <th style={{ fontSize: fs }} className={`${cell} w-8 text-center`}>SL</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-20`}>Brand</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-20`}>Group</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-20`}>Category</th>
                    <th style={{ fontSize: fs }} className={cell}>Product</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-14 text-right`}>Qty</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-14 text-right`}>Rate</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-20 text-right`}>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length ? (
                    pageRows.map((row, index) => {
                      if (row.__type === 'CUSTOMER') {
                        return (
                          <tr key={`${row.key}-${index}`} className="avoid-break">
                            <td
                              colSpan={COLUMN_COUNT}
                              style={{ fontSize: fs }}
                              className={`${cell} bg-gray-200 font-bold`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <span>{row.customer_name}</span>
                                <span className="whitespace-nowrap">
                                  Qty: {thousandSeparator(row.quantity)} | Amount: {thousandSeparator(row.amount)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      // The invoice heads its lines once: number and date on the
                      // one row, with the invoice's own subtotal beside them.
                      if (row.__type === 'INVOICE') {
                        return (
                          <tr key={`${row.key}-${index}`} className="avoid-break">
                            <td
                              colSpan={COLUMN_COUNT}
                              style={{ fontSize: fs }}
                              className={`${cell} bg-gray-50 font-semibold`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <span className="whitespace-nowrap">
                                  <span className="font-semibold">Invoice: {row.invoice_no}</span>
                                  {row.invoice_date && row.invoice_date !== '-' ? (
                                    <span className="ml-3">Date: {row.invoice_date}</span>
                                  ) : null}
                                </span>
                                <span className="whitespace-nowrap">
                                  Qty: {thousandSeparator(row.quantity)} | Amount: {thousandSeparator(row.amount)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const line = row.row;

                      return (
                        <tr key={`${row.key}-${index}`} className="avoid-break align-top">
                          <td style={{ fontSize: fs }} className={`${cell} text-center`}>{row.sl}</td>
                          <td style={{ fontSize: fs }} className={cell}>{line.brand_name || '-'}</td>
                          <td style={{ fontSize: fs }} className={cell}>{line.group_name || '-'}</td>
                          <td style={{ fontSize: fs }} className={cell}>{line.category_name || '-'}</td>
                          <td style={{ fontSize: fs }} className={cell}>
                            {String(line.product_code ?? '').trim()
                              ? `${line.product_code} - ${line.product_name || '-'}`
                              : line.product_name || '-'}
                          </td>
                          <td style={{ fontSize: fs }} className={`${cell} text-right`}>{thousandSeparator(line.quantity)}</td>
                          <td style={{ fontSize: fs }} className={`${cell} text-right`}>{thousandSeparator(line.rate)}</td>
                          <td style={{ fontSize: fs }} className={`${cell} text-right`}>{thousandSeparator(line.amount)}</td>
                        </tr>
                      );
                    })
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
                {allRows.length && isLastPage ? (
                  <tfoot>
                    <tr className="bg-gray-300 font-bold">
                      <td style={{ fontSize: fs }} className={`${cell} text-right`} colSpan={5}>
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
