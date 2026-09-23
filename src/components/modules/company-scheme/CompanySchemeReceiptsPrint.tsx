import React from 'react';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import { formatDayMonthYear } from '../../utils/utils-functions/formatDate';

export type ReceiptLine = {
  key: string;
  first: boolean;
  sl: number;
  vr_no: string;
  vr_date: string;
  method: string;
  party_name: string | null;
  voucher_amount: number;
  imei: string;
  product_name: string | null;
  invoice_no: string;
  amount: number;
};

type Props = {
  lines: ReceiptLine[];
  total: number;
  startDate?: string; // dd/mm/yyyy
  endDate?: string; // dd/mm/yyyy
  rowsPerPage?: number; // 0 = all on one page
  fontSize?: number; // px
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

/**
 * Company Scheme Receipts on paper, laid out as the Cash Book prints: the
 * branch pad, the title and report dates on every sheet, a ruled table, and
 * the footer line. One row per IMEI; a voucher's number, date and company
 * stand on its first IMEI, as on screen.
 *
 * The IMEI, its product and its invoice are stacked in one Details cell, as on
 * the Receivable paper, so no one of them is squeezed into a sliver.
 */
const CompanySchemeReceiptsPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ lines, total, startDate, endDate, rowsPerPage = 0, fontSize }, ref) => {
    const rows = Array.isArray(lines) ? lines : [];
    const pages = chunkRows(rows, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? fontSize! : 10;
    const cell = 'border border-gray-900 px-2 py-1';
    const head = 'border border-gray-900 px-2 py-2';

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />
            <div className="mb-2">
              <h1 className="text-lg font-bold text-center">Company Scheme Receipts</h1>
              <div className="mt-1 text-xs">
                <span className="font-semibold">Report Date:</span> {startDate || '-'} to {endDate || '-'}
              </div>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th style={{ fontSize: fs }} className={`${head} w-8 text-center`}>#</th>
                    <th style={{ fontSize: fs }} className={`${head} w-28 text-center`}>Vr No</th>
                    <th style={{ fontSize: fs }} className={`${head} text-left`}>Company</th>
                    <th style={{ fontSize: fs }} className={`${head} text-left`}>Details</th>
                    <th style={{ fontSize: fs }} className={`${head} w-28 text-right`}>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length ? (
                    pageRows.map((row) => (
                      <tr key={row.key} className="avoid-break align-top">
                        <td style={{ fontSize: fs }} className={`${cell} text-center`}>
                          {row.first ? row.sl : ''}
                        </td>
                        <td style={{ fontSize: fs }} className={`${cell} text-center leading-normal`}>
                          {row.first ? (
                            <>
                              <div>{row.vr_no}</div>
                              <div>{formatDayMonthYear(row.vr_date)}</div>
                              <div className="uppercase">{row.method}</div>
                            </>
                          ) : null}
                        </td>
                        <td style={{ fontSize: fs }} className={cell}>
                          {row.first ? row.party_name : ''}
                        </td>
                        <td style={{ fontSize: fs }} className={`${cell} leading-normal`}>
                          <div className="font-semibold break-all">{row.imei}</div>
                          {row.product_name ? <div>{row.product_name}</div> : null}
                          {row.invoice_no ? <div>Invoice {row.invoice_no}</div> : null}
                        </td>
                        <td style={{ fontSize: fs }} className={`${cell} text-right`}>
                          {thousandSeparator(Number(row.amount))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="border border-gray-900 px-3 py-6 text-center text-gray-500">
                        No receipt in this range.
                      </td>
                    </tr>
                  )}

                  {/* The total once, under the last sheet's rows. */}
                  {pIdx === pages.length - 1 && rows.length > 0 ? (
                    <tr className="avoid-break font-semibold">
                      <td style={{ fontSize: fs }} colSpan={4} className={`${cell} text-right`}>
                        Total
                      </td>
                      <td style={{ fontSize: fs }} className={`${cell} text-right`}>
                        {thousandSeparator(Number(total))}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <PrintFooter fixed={pages.length === 1} page={pIdx + 1} total={pages.length} fontSize={fs} />

            {pIdx !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  },
);

CompanySchemeReceiptsPrint.displayName = 'CompanySchemeReceiptsPrint';
export default CompanySchemeReceiptsPrint;
