import React from 'react';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { formatBdShortDate } from '../../utils/utils-functions/formatDate';
import PadPrinting from '../../utils/utils-functions/PadPrinting';

export type InstallmentRow = {
  sl_number?: string | number;
  customer_name?: string;
  father?: string;
  customer_address?: string;
  customer_mobile?: string;
  employee?: string;
  payments?: any[];
  installment_no?: string | number;
  due_date?: string | Date | undefined;
  amount?: number;
  due_amount?: number;
  paid_amount?: number;
  installment_id?: string | number;
  received_date?: string;
  status?: string;
};

type Props = {
  rows: InstallmentRow[];
  startDate?: string; // e.g. '2025-09-01'
  endDate?: string; // e.g. '2025-09-30'
  statusLabel?: string; // e.g. 'All' / 'Due Only'
  showAll?: boolean;

  /** How many data rows per printed page (header + subtotal included). */
  rowsPerPage?: number; // default 20
  fontSize?: number; // default 8

  /** Optional custom titles */
  title?: string; // default 'Due Installments Report'
};

const toNum = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const DueInstallmentsPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      startDate,
      endDate,
      statusLabel,
      showAll,
      rowsPerPage = 2,
      fontSize = 8,
      title = 'Due Installments Report',
    },
    ref,
  ) => {
    // Split into pages
    const pages = chunkRows(rows || [], rowsPerPage);
    const fs = Number.isFinite(fontSize) ? fontSize! : 9;

    // Grand totals
    const grand = rows.reduce(
      (acc: any, r) => {
        acc.amount += toNum(Number(r.amount));
        acc.paid += toNum(Number(r.paid_amount));
        acc.due += toNum(Number(r.due_amount));
        return acc;
      },
      { amount: 0, paid: 0, due: 0 },
    );

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        {/* Print-only styles */}
        <style>
          {`
            @media print {
              @page {
                size: A4 portrait;
                margin-top: 6mm;   /* top margin */
                margin-right: 6mm; /* right margin */
                margin-bottom: 8mm;/* bottom margin */
                margin-left: 10mm;  /* left margin */
              }
              .no-print { display: none !important; }
              .page-break { page-break-after: always; }
              .avoid-break { break-inside: avoid; }
            }
          `}
        </style>

        {/* Pages */}
        {pages.map((pageRows, pIdx) => {
          const pageTotal = pageRows.reduce(
            (acc: any, r) => {
              acc.amount += toNum(Number(r.amount));
              acc.paid += toNum(Number(r.paid_amount));
              acc.due += toNum(Number(r.due_amount));
              return acc;
            },
            { amount: 0, paid: 0, due: 0 },
          );

          return (
            <div key={pIdx} className="print-page">
              {/* Header repeated per page (prints on every page) */}
              <div className="">
                <PadPrinting />
                <div>
                  <h1 className="text-xl font-bold text-center">{title}</h1>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    <div>
                      <span className="font-semibold">Date Range:</span>{' '}
                      {startDate || '-'} — {endDate || '-'}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">Status:</span>{' '}
                      {statusLabel ?? (showAll ? 'All' : 'Due Only')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full overflow-hidden border border-gray-900 rounded rounded-bl-none rounded-br-none">
                <table className="w-full table-fixed border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-12"
                      >
                        #
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="text-left border border-gray-900 px-2 py-2"
                      >
                        Customer Details
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-24"
                      >
                        <span className="block">Inst. No</span>
                        <span className="block border-t border-gray-900">
                          Inst. Date
                        </span>
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-40"
                      >
                        <div className="text-right">
                          <span className="block">Inst. Amount</span>
                          <span className="block border-t border-gray-900">
                            Rcv Amount
                          </span>
                          <span className="block border-t border-gray-900">
                            Due Amount
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageRows.length ? (
                      pageRows.map((row, idx) => (
                        <tr key={idx} className="avoid-break align-top">
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-center"
                          >
                            {idx + 1 + pIdx * rowsPerPage}
                          </td>
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1"
                          >
                            <div className="leading-normal">
                              <div className="font-medium">
                                {row?.customer_name ?? ''}
                              </div>
                              {row?.father && <div>{row.father}</div>}
                              <div>{row?.customer_address ?? ''}</div>
                              <div>{row?.customer_mobile ?? ''}</div>
                              {row?.employee && (
                                <div className="">{row.employee}</div>
                              )}
                            </div>
                          </td>
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-center"
                          >
                            <div className="text-right">
                              <span className="block">
                                {row?.installment_no ?? '-'}
                              </span>
                              <span className="block border-t border-gray-900">
                                {formatBdShortDate(row?.due_date)}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1"
                          >
                            <div className="text-right">
                              <span className="block">
                                {thousandSeparator(Number(row?.amount), 0)}
                              </span>
                              <span className="block border-t border-gray-900">
                                {thousandSeparator(Number(row?.paid_amount), 0)}
                              </span>
                              <span className="block border-t border-gray-900">
                                {thousandSeparator(Number(row?.due_amount), 0)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                        >
                          No data found
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Per-page subtotal */}
                  <tfoot>
                    <tr
                      style={{ fontSize: fs }}
                      className="bg-gray-50 font-semibold"
                    >
                      <td
                        className="border border-gray-900 px-2 py-2 text-right"
                        colSpan={3}
                      >
                        Page {pIdx + 1} Total:
                      </td>
                      <td className="border border-gray-900 px-2 py-2 ">
                        <div className="text-right">
                          <span className="block">
                            {thousandSeparator(Number(pageTotal.amount), 0)}
                          </span>
                          <span className="block border-t border-gray-900">
                            {thousandSeparator(Number(pageTotal.paid), 0)}
                          </span>
                          <span className="block border-t border-gray-900">
                            {thousandSeparator(Number(pageTotal.due), 0)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Force break after each page except the last */}
              {pIdx !== pages.length - 1 && <div className="page-break" />}
            </div>
          );
        })}

        {/* Grand Total (after all pages) */}
        <div className="w-full sm:w-auto ml-auto">
          <div className="border border-gray-900 overflow-hidden sm:ml-auto">
            <table className="w-full table-fixed border-collapse border-top-0">
              <thead className="bg-gray-100">
                <tr style={{ fontSize: fs }} className="font-semibold">
                  <td
                    colSpan={3}
                    className="border-l border-r border-b border-gray-900 px-2 py-2 text-right font-semibold"
                  >
                    Grand Total:
                  </td>

                  <td className="border-l border-r border-b border-gray-900 px-2 py-2 w-40">
                    <div className="text-right">
                      <span className="block">
                        {thousandSeparator(Number(grand.amount), 0)}
                      </span>
                      <span className="block border-t border-gray-900">
                        {thousandSeparator(Number(grand.paid), 0)}
                      </span>
                      <span className="block border-t border-gray-900">
                        {thousandSeparator(Number(grand.due), 0)}
                      </span>
                    </div>
                  </td>
                </tr>
              </thead>
            </table>
          </div>
        </div>

        {/* Optional note */}
        <div style={{ fontSize: fs }} className="mt-4 text-xs text-gray-900">
          * This document is system generated.
        </div>
      </div>
    );
  },
);

DueInstallmentsPrint.displayName = 'DueInstallmentsPrint';
export default DueInstallmentsPrint;
