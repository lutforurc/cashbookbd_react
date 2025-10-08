import React from 'react';

type StockRow = {
  sl_number?: number | string;
  product_name?: string;
  opening?: number;
  stock_in?: number;
  stock_out?: number;
  balance?: number;
  unit?: string;
};

type Props = {
  rows: StockRow[];
  startDate?: string;
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const StockBookPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ rows, startDate, endDate, title = 'Stock Report', rowsPerPage = 10, fontSize }, ref) => {
    const rowsArr: StockRow[] = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(rowsArr, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? fontSize! : 9;

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <style>
          {`
            @media print {
              @page { size: A4 portrait; margin: 6mm 8mm 8mm 10mm; }
              .no-print { display: none !important; }
              .page-break { page-break-after: always; }
              .avoid-break { break-inside: avoid; }
              .print-root { padding: 0 !important; }
              .print-page { padding: 8mm !important; display: flex; flex-direction: column; min-height: calc(297mm - 6mm - 8mm - 8mm - 8mm); }
              h1,h2,h3 { margin-top: 0; }
            }
          `}
        </style>

        {pages.map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">
            {/* Header */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-center">{title}</h1>
              <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                <div>
                  <span className="font-semibold">Report Date:</span> {startDate || '-'} — {endDate || '-'}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-8 text-center">#</th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2">Product Name</th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-28 text-right">Opening</th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-28 text-right">Stock In</th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-28 text-right">Stock Out</th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-28 text-right">Balance</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length ? (
                    pageRows.map((row, idx) => (
                      <tr key={idx} className="avoid-break align-top">
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">{row?.sl_number || ''}</td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">{row.product_name || '-'}</td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                          {row.opening != null ? <span className="text-sm">{row.opening} {row.unit && `(${row.unit})`}</span> : '-'}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                          {row.stock_in != null ? <span className="text-sm">{row.stock_in} {row.unit && `(${row.unit})`}</span> : '-'}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                          {row.stock_out != null ? <span className="text-sm">{row.stock_out} {row.unit && `(${row.unit})`}</span> : '-'}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                          {row.balance != null ? <span className="text-sm">{row.balance} {row.unit && `(${row.unit})`}</span> : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="border border-gray-900 px-3 py-6 text-center text-gray-500">No data found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: fs }} className="mt-auto text-right text-xs">
              Page {pIdx + 1} of {pages.length}
            </div>

            {pIdx !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}

        <div className="mt-2 text-xs text-gray-900">* This document is system generated.</div>
      </div>
    );
  },
);

StockBookPrint.displayName = 'StockBookPrint';
export default StockBookPrint;
