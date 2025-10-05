import React from 'react';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';

export type LedgerRow = {
  sl_number?: string | number;
  vr_date?: string; // already formatted string or ISO
  vr_no?: string | number;
  name?: string; // plain text description
  remarks?: string;
  debit?: number; // money out
  credit?: number; // money in
  branchPad?: string;
  is_approved?: boolean;
};

export type Props = {
  rows: LedgerRow[];
  startDate?: string; // e.g. '01/10/2025'
  endDate?: string; // e.g. '31/10/2025'
  title?: string; // default 'Ledger'
  ledgerId?: number | string; // new prop for ledger ID
  rowsPerPage?: number; // default 8 (fits the provided layout)
  fontSize?: number; // default 9 (px)
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (!Array.isArray(data)) return [[]];
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

const LedgerPrint = React.forwardRef<HTMLDivElement, Props>(({ rows, startDate, endDate, title = 'Ledger', ledgerId, rowsPerPage = 8, fontSize }, ref,) => {
    // Safety: normalize rows
    const rowsArr: LedgerRow[] = Array.isArray(rows) ? rows : [];

    const pages = chunkRows(rowsArr, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 9;

    // Grand totals (for all rows)
    const grandDebit = sum(rowsArr.map((r) => Number(r.debit || 0)));
    const grandCredit = sum(rowsArr.map((r) => Number(r.credit || 0)));

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 6mm 8mm 8mm 10mm;
            }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
            .avoid-break { break-inside: avoid; }
            .print-root { padding: 0 !important; }
            .print-page { padding: 8mm !important; }

            .print-page {
              display: flex;
              flex-direction: column;
              min-height: calc(297mm - 6mm - 8mm - 8mm - 8mm);
            }

            h1, h2, h3 { margin-top: 0; }
          }
        `}</style>

        {pages.map((pageRows, pIdx) => {
          // page totals
          const pageDebit = sum(pageRows.map((r) => Number(r.debit || 0)));
          const pageCredit = sum(pageRows.map((r) => Number(r.credit || 0)));

          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />

              {/* Header */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-center">{title}</h1>
                <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                  <div>
                    <span className="font-semibold">Report Date:</span>{' '}
                    {startDate || '-'} — {endDate || '-'}
                  </div>
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <table className="w-full table-fixed border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-8 text-center">#</th>
                      <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-30 text-center">Vr No</th>
                      <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2">Description</th>
                      <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-28 text-right">Debit</th>
                      <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-28 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length ? (
                      pageRows.map((row, idx) => (
                        <tr key={idx} className="avoid-break align-top">
                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                            {row?.sl_number == 0 ? '' : row?.sl_number}
                          </td>
                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center leading-normal">
                            <div className={`text-[${fs}px]`}>
                              {row?.vr_no ? row.vr_no : ''}
                            </div>
                            <div className={`text-[${fs}px]`}>
                              {row?.vr_date}
                            </div>
                          </td>
                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                            <div className="w-full max-w-4xl leading-normal">
                              <div className="leading-normal break-words whitespace-normal">
                                <span className={`text-[${fs}px]`}>{row?.name || ''}</span>
                              </div>
                              {row?.remarks && (
                                <div className={`text-[${fs}px] break-words whitespace-normal text-gray-700`}>
                                  {row.remarks}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right align-middle">
                            {thousandSeparator(Number(row?.debit || 0), 0)}
                          </td>
                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right align-middle">
                            {thousandSeparator(Number(row?.credit || 0), 0)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="border border-gray-900 px-3 py-6 text-center text-gray-500">
                          No data found
                        </td>
                      </tr>
                    )}

                    {/* Page subtotal row */}
                    {pageRows.length > 0 && pIdx !== pages.length - 1 && (
                      <tr className="font-semibold">
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right" colSpan={3}>
                          Subtotal (Page {pIdx + 1})
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                          {thousandSeparator(pageDebit, 0)}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                          {thousandSeparator(pageCredit, 0)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div style={{ fontSize: fs }} className="mt-2 text-right text-xs">
                Page {pIdx + 1} of {pages.length}
              </div>

              {pIdx !== pages.length - 1 && <div className="page-break" />}
            </div>
          );
        })}

        {/* Grand totals */}
        {/* <div className="mt-2 w-full overflow-hidden border border-gray-900">
          <table className="w-full table-fixed border-collapse">
            <tbody>
              <tr className="bg-gray-100 font-semibold">
                <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right" colSpan={3}>
                  Grand Total
                </td>
                <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right w-28">
                  {thousandSeparator(grandDebit, 0)}
                </td>
                <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right w-28">
                  {thousandSeparator(grandCredit, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div> */}

        {/* Note */}
        <div className="mt-2 text-xs text-gray-900">* This document is system generated.</div>
      </div>
    );
  },
);

LedgerPrint.displayName = 'LedgerPrint';
export default LedgerPrint;
