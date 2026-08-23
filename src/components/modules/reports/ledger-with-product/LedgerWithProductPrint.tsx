import React from 'react';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { formatTransportationNumber } from '../../../utils/utils-functions/formatRoleName';
import { formatMobile, useMobileFormat } from '../../../utils/utils-functions/mobileFormat';
import type {
  LedgerWithProductRow,
  LedgerWithProductSummary,
} from './ledgerWithProductTypes';
import {
  getBalanceCreditValue,
  getBalanceDebitValue,
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

/** Rows' worth of height the summary bar takes off the last page. */
const SUMMARY_ROW_ALLOWANCE = 1;

/**
 * The summary bar and the software line hold the foot of the page and never
 * move. So the last page — the only one carrying the summary — has room for
 * fewer rows than the rest: when its share is full, the rows that no longer fit
 * are carried onto a page of their own instead of pushing the foot down the
 * sheet and printing over it.
 */
const paginateRows = <T,>(data: T[], size: number): T[][] => {
  const chunks = chunkRows(data, size);
  if (size <= 0) return chunks;

  const lastIndex = chunks.length - 1;
  const lastPage = chunks[lastIndex] ?? [];
  const lastPageLimit = Math.max(1, size - SUMMARY_ROW_ALLOWANCE);

  if (lastPage.length > lastPageLimit) {
    chunks[lastIndex] = lastPage.slice(0, lastPageLimit);
    chunks.push(lastPage.slice(lastPageLimit));
  }

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
    const pages = paginateRows(rows, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? fontSize : 9;
    const dateWidthClass = fs >= 12 ? 'w-20' : fs <= 10 ? 'w-18' : 'w-22';
    const truckWidthClass = fs >= 12 ? 'w-22' : fs <= 10 ? 'w-18' : 'w-20';
    const printablePartyName = partyName || '-';
    const printableMobile = mobile || '';
    const mobileFormat = useMobileFormat();
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
        <PrintStyles orientation="landscape" />
        <style media="print">{`

          /*
            Each page block fills the sheet, so the foot of it — summary bar,
            software line, page number — sits at the same height on every sheet.
            The height is a floor, not a ceiling, and nothing is clipped: a row
            that will not fit carries onto the next sheet rather than being cut
            away, which would hide it while it still counted in the totals.

            The floor is the whole printable area (sheet less the 5mm page
            margins) less the 8mm top and 2mm bottom padding print gives
            .print-page, less 1mm so a sub-millimetre rounding cannot spill a
            blank sheet. Subtracting 8mm at the foot, as this did before, left
            16mm of the sheet unused and pushed rows onto the next page earlier
            than they had to go.
          */
          .print-page {
            box-sizing: border-box;
            min-height: var(--print-page-height) !important;
          }

          .print-page.ledger-break-after {
            break-after: page;
            page-break-after: always;
          }

          .print-page:last-child {
            page-break-after: auto !important;
          }
        `}</style>
        {pages.map((pageRows, pageIndex) => (
          <div
            key={pageIndex}
            className={`print-page ${pageIndex !== pages.length - 1 ? 'ledger-break-after' : ''}`}
          >
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
                      <span className="font-semibold">Mobile:</span> {formatMobile(printableMobile, mobileFormat)}
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
                        const displayValue = getBalanceDebitValue(row);

                        return displayValue ? formatAmount(displayValue) : '-';
                      })()}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {(() => {
                        const displayValue = getBalanceCreditValue(row);

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
                className="mt-1 flex w-full shrink-0 flex-nowrap items-center justify-between gap-x-2 overflow-hidden border border-gray-900 px-2 py-1 font-bold text-gray-900"
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

            {/*
              The software line sits here, in the page's normal flow, rather than
              coming from a position:fixed footer — pinned outside the flow, it
              was painted over the summary row whenever the rows reached the foot
              of the page. mt-auto holds it at the bottom of the flex column, so
              it keeps the same spot on every page and the rows stop above it.
            */}
            <PrintFooter page={pageIndex + 1} total={pages.length} />
          </div>
        ))}
      </div>
    );
  },
);

LedgerWithProductPrint.displayName = 'LedgerWithProductPrint';

export default LedgerWithProductPrint;
