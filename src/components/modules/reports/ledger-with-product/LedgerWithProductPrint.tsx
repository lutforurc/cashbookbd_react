import React from 'react';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

type Props = {
  rows: any[];
  branchName?: string;
  partyName?: string;
  ledgerPage?: string;
  mobile?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  rowsPerPage?: number;
  fontSize?: number;
  summary?: {
    opening_balance?: number;
    total_received?: number;
    total_payment?: number;
    closing_balance?: number;
  };
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (!Array.isArray(data) || size <= 0) return [Array.isArray(data) ? data : []];
  const chunks: T[][] = [];
  for (let i = 0; i < data.length; i += size) chunks.push(data.slice(i, i + size));
  return chunks;
};

const LedgerWithProductPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows = [],
      branchName = '-',
      partyName = '-',
      ledgerPage = '-',
      mobile = '-',
      address = '-',
      startDate = '-',
      endDate = '-',
      rowsPerPage = 16,
      fontSize = 9,
      summary = {},
    },
    ref,
  ) => {
    const pages = chunkRows(rows, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? fontSize : 9;
    const dateWidthClass = fs >= 12 ? 'w-20' : fs <= 10 ? 'w-18' : 'w-22';
    const vrNoWidthClass = fs >= 12 ? 'w-26' : fs <= 10 ? 'w-22' : 'w-24';
    const truckWidthClass = fs >= 12 ? 'w-24' : fs <= 10 ? 'w-20' : 'w-22';

    return (
      <div ref={ref} className="p-8 text-gray-900 print-root">
        <PrintStyles />
        <style media="print">{`
          @page {
            size: A4 landscape;
            margin: 5mm;
          }

          .print-page {
            min-height: calc(210mm - 5mm - 5mm - 8mm - 8mm) !important;
          }

          .print-page:last-child {
            page-break-after: auto !important;
          }
        `}</style>
        {pages.map((pageRows, pageIndex) => (
          <div key={pageIndex} className="print-page">
            <PadPrinting />
            <div className="mb-1">
              <div className="text-center">
                <h1 className="text-xl font-bold">Ledger with Product</h1>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div>
                    <span className="font-semibold">Name:</span> {partyName}
                  </div>
                  <div>
                    <span className="font-semibold">Mobile:</span> {mobile || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Address:</span> {address || '-'}
                  </div>
                </div>
                <div className="text-right self-end">
                  <div className="text-xs">
                    Report Date: {startDate} to {endDate}
                  </div>
                </div>
              </div>
            </div>
            <table className="w-full table-fixed border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-10 text-center">Sl</th>
                  <th
                    style={{ fontSize: fs }}
                    className={`border border-gray-900 px-2 py-2 text-center ${dateWidthClass}`}
                  >
                    Date
                  </th>
                  <th
                    style={{ fontSize: fs }}
                    className={`border border-gray-900 px-2 py-2 text-left ${vrNoWidthClass}`}
                  >
                    Vr No
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-left">Description</th>
                  <th
                    style={{ fontSize: fs }}
                    className={`border border-gray-900 px-2 py-2 text-center ${truckWidthClass}`}
                  >
                    Truck
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-14 text-center">Qty</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-16 text-center">Rate</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-18 text-center">Total</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-18 text-center">Received</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-18 text-center">Payment</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-18 text-center">Balance</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => (
                  <tr key={`${pageIndex}-${index}`} className="align-top">
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                      {row.sl_number}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                      {row.vr_date || ''}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                      {row.vr_no || ''}
                    </td>
                    <td
                      style={{ fontSize: fs, lineHeight: 0.95 }}
                      className="border border-gray-900 px-2 py-[2px] align-middle"
                    >
                      <div style={{ lineHeight: 1.15, margin: 0, padding: 0 }}>
                        {row.product_name || row.trx_type || ''}
                      </div>
                      {/* {row.remarks ? <div className="text-xs">{row.remarks}</div> : null} */}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                      {row.truck_no || ''}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {Number(row.quantity || 0) ? thousandSeparator(Number(row.quantity || 0), 0) : '-'}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {Number(row.rate || 0) ? thousandSeparator(Number(row.rate || 0), 2) : '-'}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {Number(row.total || 0) ? thousandSeparator(Number(row.total || 0), 0) : '-'}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {Number(row.received || 0) ? thousandSeparator(Number(row.received || 0), 0) : '-'}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {Number(row.payment || 0) ? thousandSeparator(Number(row.payment || 0), 0) : '-'}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {thousandSeparator(Number(row.balance || 0), 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pageIndex === pages.length - 1 ? (
              <div className="mt-3 flex justify-end gap-6 text-xs font-bold">
                <div>Opening: {thousandSeparator(Number(summary.opening_balance), 0)}</div>
                <div>Received: {thousandSeparator(Number(summary.total_received), 0)}</div>
                <div>Payment: {thousandSeparator(Number(summary.total_payment), 0)}</div>
                <div>Closing: {thousandSeparator(Number(summary.closing_balance), 0)}</div>
              </div>
            ) : null}

            <div className="mt-2 text-right text-xs">Page {pageIndex + 1} of {pages.length}</div>
            {pageIndex !== pages.length - 1 ? <div className="page-break" /> : null}
          </div>
        ))}
      </div>
    );
  },
);

LedgerWithProductPrint.displayName = 'LedgerWithProductPrint';

export default LedgerWithProductPrint;
