import React from 'react';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { formatTransportationNumber } from '../../../utils/utils-functions/formatRoleName';
import type {
  LedgerWithProductRow,
  LedgerWithProductSummary,
} from './ledgerWithProductTypes';
import {
  getDisplayedCreditValue,
  getDisplayedDebitValue,
  getPurchaseAmount,
  getPurchaseQty,
  getSalesAmount,
  getSalesQty,
  parseAmount,
} from './ledgerWithProductUtils';

const formatAmount = (value: unknown) => {
  const amount = Number(value || 0);
  const formatted = thousandSeparator(Math.abs(amount));
  return amount < 0 ? `(${formatted})` : formatted;
};

const formatSummaryAmount = (value: unknown) => {
  const amount = Number(value || 0);

  return Number.isFinite(amount) && amount ? thousandSeparator(amount) : '-';
};

type Props = {
  rows: LedgerWithProductRow[];
  branchName?: string | null;
  partyName?: string | null;
  ledgerPage?: string | null;
  mobile?: string | null;
  address?: string | null;
  productName?: string | null;
  transactionTypeLabel?: string | null;
  startDate?: string;
  endDate?: string;
  rowsPerPage?: number;
  fontSize?: number;
  summary?: LedgerWithProductSummary;
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
      productName = 'All',
      transactionTypeLabel = 'All',
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
    const truckWidthClass = fs >= 12 ? 'w-22' : fs <= 10 ? 'w-18' : 'w-20';
    const printablePartyName = partyName || '-';
    const printableMobile = mobile || '';
    const printableAddress = address || '-';
    const footerItems = [
      ['Opening', summary.opening_balance],
      Number(summary.purchase_qty || 0) > 0 ? ['Pur. Qty', summary.purchase_qty] : null,
      Number(summary.sales_qty || 0) > 0 ? ['Sal. Qty', summary.sales_qty] : null,
      Number(summary.purchase_amt || 0) > 0 ? ['Pur. Amt', summary.purchase_amt] : null,
      Number(summary.sales_amt || 0) > 0 ? ['Sal. Amt', summary.sales_amt] : null,
      Number(summary.total_received || 0) !== 0 ? ['Debit', summary.total_received] : null,
      Number(summary.total_payment || 0) !== 0 ? ['Credit', summary.total_payment] : null,
      ['Closing', summary.closing_balance],
    ].filter(Boolean) as [string, unknown][];
    const footerFs = fs;

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
                <h1 className="text-xl font-bold">Ledger Details</h1>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div>
                    <span className="font-semibold">Branch:</span> {branchName || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Name:</span> {printablePartyName}
                  </div>
                  {ledgerPage ? (
                    <div>
                      <span className="font-semibold">Ledger Page:</span> {ledgerPage}
                    </div>
                  ) : null}
                  {printableMobile.length >= 5 && (
                    <div>
                      <span className="font-semibold">Mobile:</span> {printableMobile}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Address:</span> {printableAddress}
                  </div>
                </div>
                <div className="text-right self-end">
                  <div className="text-xs">
                    Product: {productName || 'All'}
                  </div>
                  <div className="text-xs">
                    Transaction Type: {transactionTypeLabel || 'All'}
                  </div>
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
                    Vr No & Date
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-36 text-left">Description</th>
                  <th
                    style={{ fontSize: fs }}
                    className={`border border-gray-900 px-2 py-2 text-center ${truckWidthClass}`}
                  >
                    Truck
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-16 text-center">Pur. Qty.</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-16 text-center">Sal. Qty.</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-14 text-center">Rate</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-16 text-center">Pur. Total</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-16 text-center">Sal. Total</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-18 text-center">Debit</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-18 text-center">Credit</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-18 text-center">Balance</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => (
                  <tr key={`${pageIndex}-${index}`} className="align-middle">
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                      {row.sl_number}
                    </td>
                    <td
                      style={{ fontSize: fs, lineHeight: 0.95 }}
                      className="border border-gray-900 px-2 py-[2px] text-center"
                    >
                      <div style={{ fontSize: fs, lineHeight: 1.15, margin: 0, padding: 0 }}>{row.vr_no || ''}</div>
                      <div style={{ fontSize: fs, lineHeight: 1.15, margin: 0, padding: 0 }} className="block align-middle ">{row.vr_date || ''}</div>
                    </td>

                    <td
                      style={{ fontSize: fs, lineHeight: 0.95 }}
                      className="border border-gray-900 px-2 py-[2px] align-middle w-36"
                    >
                      <div style={{ lineHeight: 1.15, margin: 0, padding: 0 }} className="whitespace-normal">
                        {row.transaction_name}
                        {row.sales_item_name ? (
                          <span style={{ fontSize: fs }} className="text-xs"> &nbsp;({row.sales_item_name})</span>
                        ) : null}
                      </div>
                      {row.remarks ? <div style={{ fontSize: fs, lineHeight: 1.15, margin: 0, padding: 0 }} className="text-xs">{row.remarks}</div> : null}
                      {row.order_number ? <div style={{ fontSize: fs, lineHeight: 1.15, margin: 0, padding: 0 }} className="text-xs">{row.order_number}</div> : null}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                      {formatTransportationNumber(row.truck_no || '')}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {getPurchaseQty(row) ? thousandSeparator(getPurchaseQty(row)) : '-'}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {getSalesQty(row) ? thousandSeparator(getSalesQty(row)) : '-'}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {Number(row.rate || 0) ? thousandSeparator(Number(row.rate || 0)) : '-'}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {getPurchaseAmount(row) ? formatAmount(getPurchaseAmount(row)) : '-'}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {getSalesAmount(row) ? formatAmount(getSalesAmount(row)) : '-'}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {(() => {
                        const displayValue = getDisplayedDebitValue(row);

                        return displayValue ? formatAmount(displayValue) : '-';
                      })()}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {(() => {
                        const displayValue = getDisplayedCreditValue(row);

                        return displayValue ? formatAmount(displayValue) : '-';
                      })()}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {formatAmount(parseAmount(row.running_balance ?? row.balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pageIndex === pages.length - 1 ? (
              <div
                className="mt-1 flex w-full flex-nowrap items-center justify-between gap-x-2 overflow-hidden border border-gray-900 px-2 py-1 font-bold text-gray-900"
                style={{
                  fontSize: footerFs,
                  lineHeight: 1.15,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                {footerItems.map(([label, value]) => (
                  <div key={label} className="min-w-0 whitespace-nowrap">
                    <span>{label}:</span>{' '}
                    <span>{formatSummaryAmount(value)}</span>
                  </div>
                ))}
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
