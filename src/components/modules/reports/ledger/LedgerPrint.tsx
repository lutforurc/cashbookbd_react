import React from 'react';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import dayjs from 'dayjs';
import { formatDateUsdToBd } from '../../../utils/utils-functions/formatDate';

export type LedgerRow = {
  sl_number?: string | number;
  vr_date?: string; // already formatted string or ISO
  vr_no?: string | number;
  name?: string; // plain text description
  remarks?: string;
  debit?: number; // money out
  credit?: number; // money in
  branchPad?: string;
  branch_name?: string;
  is_approved?: boolean;
};

export type Props = {
  rows: LedgerRow[];
  startDate?: string; // e.g. '01/10/2025'
  endDate?: string; // e.g. '31/10/2025'
  title?: string; // default 'Ledger'
  coal4?: any; // new prop for coal4 data
  rowsPerPage?: number; // default 8 (fits the provided layout)
  fontSize?: number; // default 9 (px)
  showBranchName?: boolean;
};

type LedgerRowWithBalance = LedgerRow & {
  runningBalance?: number;
};

const SUMMARY_ROW_NAMES = new Set(['Range Total', 'Total', 'Balance']);

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (!Array.isArray(data)) return [[]];
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const sum = (arr: number[]) =>
  arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

const LedgerPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      startDate,
      endDate,
      title = 'Ledger',
      coal4,
      rowsPerPage = 8,
      fontSize,
      showBranchName = false,
    },
    ref,
  ) => {
    // Safety: normalize rows

    const rowsArr: LedgerRow[] = Array.isArray(rows) ? rows : [];
    let previousAmount = 0;
    const rowsWithBalance: LedgerRowWithBalance[] = rowsArr.map((row) => {
      if (SUMMARY_ROW_NAMES.has(String(row.name || ''))) {
        return {
          ...row,
          runningBalance: undefined,
        };
      }

      const debit = Number(row.debit || 0);
      const credit = Number(row.credit || 0);
      previousAmount = previousAmount + debit - credit;

      return {
        ...row,
        runningBalance: previousAmount,
      };
    });
    const pages = chunkRows(rowsWithBalance, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 9;
    const partyInfo = coal4?.cust_party_infos || {};
    const ledgerCode = partyInfo?.idfr_code ?? coal4?.idfr_code;
    const ledgerAddress =
      coal4?.address ||
      partyInfo?.address ||
      coal4?.manual_address ||
      partyInfo?.manual_address ||
      '';
    const ledgerMobile = partyInfo?.mobile || coal4?.mobile || '';

    // Grand totals (for all rows)
    const grandDebit = sum(rowsArr.map((r) => Number(r.debit || 0)));
    const grandCredit = sum(rowsArr.map((r) => Number(r.credit || 0)));

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 5mm 4mm 8mm 8mm;
            }
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
          // page totals
          const pageDebit = sum(pageRows.map((r) => Number(r.debit || 0)));
          const pageCredit = sum(pageRows.map((r) => Number(r.credit || 0)));
          const lastBalanceRow = [...pageRows].reverse().find((row) => row.runningBalance !== undefined);
          const pageClosingBalance = lastBalanceRow?.runningBalance ?? 0;

          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />

              {/* Header */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-center">{title}</h1>
                <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
                  {/* à¦¬à¦¾à¦® à¦ªà¦¾à¦¶ */}
                  <div>
                    <span className="block font-semibold">
                      <span>Name: {coal4?.name} {ledgerCode && <span className=''>Ledger Name: ({ledgerCode})</span>}</span>
                    </span>
                    {ledgerAddress && (
                      <span className='block'>
                        Address: {ledgerAddress}
                      </span>
                    )}
                    {ledgerMobile && ledgerMobile.length >= 5 && (
                      <span className='block'>
                        Mobile: {ledgerMobile}
                      </span>
                    )}
                  </div>

                  {/* à¦¡à¦¾à¦¨ à¦ªà¦¾à¦¶ */}
                  <div className="text-right">
                    <span className="font-semibold">Report Date:</span>{' '}
                    {startDate || '-'} â€” {endDate || '-'}
                  </div>
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <table className="w-full table-fixed border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-8 text-center"
                      >
                        #
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-30 text-center"
                      >
                        Vr No
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2"
                      >
                        Description
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-28 text-right"
                      >
                        Debit
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-28 text-right"
                      >
                        Credit
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-28 text-right"
                      >
                        Balance
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
                            {row?.sl_number == 0 ? '' : row?.sl_number}
                          </td>
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-center leading-normal "
                          >
                            <div className={`flex justify-center text-[${fs}px]`}>
                              {row?.vr_no ? row.vr_no : ''}
                            </div>

                            <div className={`text-[${fs}px]`}>
                              {formatDateUsdToBd(dayjs(row?.vr_date).format('YYYY-MM-DD'))}
                              {/* { row?.vr_date } */}
                            </div>
                          </td>
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 align-middle"
                          >
                            <div className="w-full max-w-4xl leading-normal">
                              <div className="leading-normal break-words whitespace-normal">
                                <span className={`text-[${fs}px]`}>
                                  {row?.name || ''}
                                </span>
                              </div>
                              {row?.remarks != "-" && (
                                <div
                                  className={`text-[${fs}px] break-words whitespace-normal text-gray-700`}
                                >
                                  {row.remarks}
                                </div>
                              )}
                              {showBranchName && row?.branch_name && (
                                <div className={`text-[${fs}px] break-words whitespace-normal font-semibold`}>
                                  {row.branch_name}
                                </div>
                              )}
                            </div>
                          </td>
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-right align-middle"
                          >
                            {thousandSeparator(Number(row?.debit || 0))}
                          </td>
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-right align-middle"
                          >
                            {thousandSeparator(Number(row?.credit || 0))}
                          </td>
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-right align-middle"
                          >
                            {row?.runningBalance === undefined
                              ? ''
                              : thousandSeparator(Number(row.runningBalance))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                        >
                          No data found
                        </td>
                      </tr>
                    )}

                    {/* Page subtotal row */}
                    {pageRows.length > 0 && pIdx !== pages.length - 1 && (
                      <tr className="font-semibold">
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-1 text-right"
                          colSpan={3}
                        >
                          Subtotal (Page {pIdx + 1})
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-1 text-right"
                        >
                          {thousandSeparator(pageDebit)}
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-1 text-right"
                        >
                          {thousandSeparator(pageCredit)}
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-1 text-right"
                        >
                          {thousandSeparator(pageClosingBalance)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-2 flex items-center justify-between text-xs">
                <div style={{ fontSize: fs }} className="font-semibold">
                  {pIdx !== pages.length - 1 ? `Balance: ${thousandSeparator(pageClosingBalance)}` : ''}
                </div>
                <div style={{ fontSize: fs }} className="text-right">
                  Page {pIdx + 1} of {pages.length}
                </div>
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
                  {thousandSeparator(grandDebit)}
                </td>
                <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right w-28">
                  {thousandSeparator(grandCredit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div> */}

        {/* Note */}
        <div className="mt-2 text-xs text-gray-900">
          * This document is system generated.
        </div>
      </div>
    );
  },
);

LedgerPrint.displayName = 'LedgerPrint';
export default LedgerPrint;
