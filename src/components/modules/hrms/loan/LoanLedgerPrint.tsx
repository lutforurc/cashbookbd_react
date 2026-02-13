import React from 'react';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import dayjs from 'dayjs';
import { formatDateUsdToBd } from '../../../utils/utils-functions/formatDate';

export type EmployeeData = {
  id?: number | string;
  name?: string;
  designation_name?: string;
  branch_name?: string;
};

export type LoanLedgerRow = {
  sl?: string | number;
  vr_date?: string;
  vr_no?: string | number;
  remarks?: string;
  received_amt?: number | string;
  payment_amt?: number | string;
  branch_name?: string;
};

export type Props = {
  rows: LoanLedgerRow[];
  startDate?: string;
  endDate?: string;
  title?: string;
  coal4?: any;
  rowsPerPage?: number;
  fontSize?: number;
  showBranchName?: boolean;
  employeeData?: EmployeeData;   // ✅ add this
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (!Array.isArray(data)) return [[]];
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

const LoanLedgerPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      startDate,
      endDate,
      title = 'Loan Ledger',
      coal4,
      rowsPerPage = 12,
      fontSize,
      showBranchName = false,
      employeeData,
    },
    ref,
  ) => {
    const rowsArr: LoanLedgerRow[] = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(rowsArr, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 9;
    const grandReceived = sum(rowsArr.map((r) => Number(r.received_amt ?? 0)));
    const grandPayment = sum(rowsArr.map((r) => Number(r.payment_amt ?? 0)));
    const grandBalance = grandReceived - grandPayment;

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 5mm 4mm 8mm 8mm; }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
            .avoid-break { break-inside: avoid; }
            .print-root { padding: 0 !important; }
            .print-page { padding: 8mm !important; }
            .print-page {
              display: flex;
              flex-direction: column;
              min-height: calc(297mm - 5mm - 4mm - 8mm - 8mm);
            }
            h1, h2, h3 { margin-top: 0; }
          }
        `}</style>

        {pages.map((pageRows, pIdx) => {
          const pageReceived = sum(pageRows.map((r) => Number(r.received_amt ?? 0)));
          const pagePayment = sum(pageRows.map((r) => Number(r.payment_amt ?? 0)));

          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />

              {/* Header */}
              <div className="mb-4">
                <h1 className="text-base font-bold text-center">{title}</h1>

                <div className="mt-1 grid grid-cols-2 gap-1 text-xs">

                  <div>
                    <span className="block ">
                      <span className='block'>Name: Mr. {employeeData?.name ?? ''}</span>
                      <span className='block'>Designation: {employeeData?.designation_name ?? ''}</span>
                    </span>
                  </div>

                  {/* Right */}
                  <div className="text-right">
                    <span className="font-semibold">Report Date:</span>{' '}
                    {startDate || '-'} — {endDate || '-'}
                  </div>
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <table className="w-full table-fixed border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-10 text-center">
                        #
                      </th>
                      <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-32 text-center">
                        Vr No
                      </th>
                      <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2">
                        Remarks
                      </th>
                      <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-28 text-right">
                        Received
                      </th>
                      <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-28 text-right">
                        Payment
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageRows.length ? (
                      pageRows.map((row, idx) => {
                        const vrDate = row?.vr_date
                          ? formatDateUsdToBd(dayjs(row.vr_date).format('YYYY-MM-DD'))
                          : '';

                        const sl = row?.sl === 0 || row?.sl === '0' ? '' : (row?.sl ?? '');

                        return (
                          <tr key={idx} className="avoid-break align-top">
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                              {sl}
                            </td>

                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                              <div style={{ fontSize: fs }} className="leading-normal">
                                {row?.vr_no ?? ''}
                              </div>
                              <div style={{ fontSize: fs }} className="leading-normal">
                                {vrDate}
                              </div>
                            </td>

                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 align-middle">
                              <div className="leading-normal break-words whitespace-normal">
                                {row?.remarks ?? ''}
                              </div>

                              {showBranchName && row?.branch_name ? (
                                <div className="font-semibold break-words whitespace-normal">{row.branch_name}</div>
                              ) : null}
                            </td>

                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right align-middle">
                              {thousandSeparator(Number(row?.received_amt ?? 0), 0)}
                            </td>

                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right align-middle">
                              {thousandSeparator(Number(row?.payment_amt ?? 0), 0)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="border border-gray-900 px-3 py-6 text-center text-gray-500">
                          No data found
                        </td>
                      </tr>
                    )}

                    {/* Page subtotal (except last page) */}
                    {pageRows.length > 0 && pIdx !== pages.length - 1 && (
                      <tr className="font-semibold bg-gray-50">
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right" colSpan={3}>
                          Subtotal (Page {pIdx + 1})
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                          {thousandSeparator(pageReceived, 0)}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                          {thousandSeparator(pagePayment, 0)}
                        </td>
                      </tr>
                    )}
                    {/* ✅ Final Balance row (only on last page) */}
                    {/* {pIdx === pages.length - 1 && pageRows.length > 0 && (
                      <tr className="font-semibold bg-gray-100">
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-1 text-right"
                          colSpan={3}
                        >
                          Balance
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-1 text-right"
                        >
                          {thousandSeparator(grandBalance, 0)}
                        </td> 
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-1 text-right"
                        >
                          {thousandSeparator(grandBalance, 0)}
                        </td> 
                      </tr>
                    )} */}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: fs }} className="mt-2 text-right text-xs">
                Page {pIdx + 1} of {pages.length}
              </div>

              {pIdx !== pages.length - 1 && <div className="page-break" />}
            </div>
          );
        })}

        <div className="mt-2 text-xs text-gray-900">* This document is system generated.</div>
      </div>
    );
  },
);

LoanLedgerPrint.displayName = 'LoanLedgerPrint';
export default LoanLedgerPrint;
