import React from 'react';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import { formatDayMonthYear } from '../../utils/utils-functions/formatDate';

export type ReceivablePrintRow = {
  id: number;
  imei: string;
  party_name: string | null;
  invoice_no: string;
  sale_date: string;
  product_name: string | null;
  buyer_name: string | null;
  buyer_mobile: string | null;
  amount: number;
  paid: number;
  balance: number;
  due_date: string;
  days_overdue: number;
};

type Props = {
  rows: ReceivablePrintRow[];
  totals: { count: number; amount: number; paid: number; balance: number } | null;
  companyName: string; // '' = all companies
  statusLabel: string;
  asOf: string; // dd/mm/yyyy
  rowsPerPage?: number; // 0 = all on one page
  fontSize?: number; // px
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const money = (value: number) => (Number(value) ? thousandSeparator(Number(value)) : '-');

/**
 * Company Scheme Receivable on paper, laid out as the Cash Book prints: the
 * branch pad, the title and what was asked for on every sheet, a ruled table,
 * the total once under the last row, and the footer line. The receive controls
 * of the screen (tick boxes, amounts) are not part of the paper.
 *
 * ⚠️ The phone, its buyer and (for all companies) the company are STACKED in
 * one Details cell. As a column each they shared what the fixed-width money
 * columns left over, and an IMEI broke one digit to a line.
 */
const CompanySchemeReceivablePrint = React.forwardRef<HTMLDivElement, Props>(
  ({ rows, totals, companyName, statusLabel, asOf, rowsPerPage = 0, fontSize }, ref) => {
    const list = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(list, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? fontSize! : 10;
    const showCompany = !companyName;
    const cell = 'border border-gray-900 px-2 py-1';
    const head = 'border border-gray-900 px-2 py-2';
    const columnCount = 8;

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />
            <div className="mb-2">
              <h1 className="text-lg font-bold text-center">Company Scheme Receivable</h1>
              <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold">Company:</span> {companyName || 'All companies'}
                  {'  ·  '}
                  <span className="font-semibold">Status:</span> {statusLabel}
                </div>
                <div>
                  <span className="font-semibold">As of:</span> {asOf}
                </div>
              </div>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th style={{ fontSize: fs }} className={`${head} w-8 text-center`}>#</th>
                    <th style={{ fontSize: fs }} className={`${head} w-24 text-center`}>Invoice</th>
                    <th style={{ fontSize: fs }} className={`${head} text-left`}>Details</th>
                    <th style={{ fontSize: fs }} className={`${head} w-24 text-right`}>Receivable</th>
                    <th style={{ fontSize: fs }} className={`${head} w-24 text-right`}>Received</th>
                    <th style={{ fontSize: fs }} className={`${head} w-24 text-right`}>Balance</th>
                    <th style={{ fontSize: fs }} className={`${head} w-22 text-center`}>Due Date</th>
                    <th style={{ fontSize: fs }} className={`${head} w-16 text-right`}>Overdue</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length ? (
                    pageRows.map((row, idx) => (
                      <tr key={row.id} className="avoid-break align-top">
                        <td style={{ fontSize: fs }} className={`${cell} text-center`}>
                          {pIdx * (rowsPerPage > 0 ? rowsPerPage : 0) + idx + 1}
                        </td>
                        <td style={{ fontSize: fs }} className={`${cell} text-center leading-normal`}>
                          <div>{row.invoice_no}</div>
                          <div>{formatDayMonthYear(row.sale_date)}</div>
                        </td>
                        <td style={{ fontSize: fs }} className={`${cell} leading-normal`}>
                          <div className="font-semibold break-all">{row.imei}</div>
                          {row.product_name ? <div>{row.product_name}</div> : null}
                          {row.buyer_name || row.buyer_mobile ? (
                            <div>
                              {row.buyer_name}
                              {row.buyer_name && row.buyer_mobile ? ', ' : ''}
                              {row.buyer_mobile}
                            </div>
                          ) : null}
                          {showCompany && row.party_name ? <div className="italic">{row.party_name}</div> : null}
                        </td>
                        <td style={{ fontSize: fs }} className={`${cell} text-right`}>{money(row.amount)}</td>
                        <td style={{ fontSize: fs }} className={`${cell} text-right`}>{money(row.paid)}</td>
                        <td style={{ fontSize: fs }} className={`${cell} text-right font-semibold`}>{money(row.balance)}</td>
                        <td style={{ fontSize: fs }} className={`${cell} text-center`}>{formatDayMonthYear(row.due_date)}</td>
                        <td style={{ fontSize: fs }} className={`${cell} text-right`}>
                          {row.days_overdue ? `${row.days_overdue} d` : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columnCount} className="border border-gray-900 px-3 py-6 text-center text-gray-500">
                        Nothing here.
                      </td>
                    </tr>
                  )}

                  {/* The total once, under the last sheet's rows. */}
                  {pIdx === pages.length - 1 && totals && list.length > 0 ? (
                    <tr className="avoid-break font-semibold">
                      <td style={{ fontSize: fs }} colSpan={3} className={`${cell} text-right`}>
                        Total ({totals.count})
                      </td>
                      <td style={{ fontSize: fs }} className={`${cell} text-right`}>{money(totals.amount)}</td>
                      <td style={{ fontSize: fs }} className={`${cell} text-right`}>{money(totals.paid)}</td>
                      <td style={{ fontSize: fs }} className={`${cell} text-right`}>{money(totals.balance)}</td>
                      <td style={{ fontSize: fs }} colSpan={2} className={cell} />
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

CompanySchemeReceivablePrint.displayName = 'CompanySchemeReceivablePrint';
export default CompanySchemeReceivablePrint;
