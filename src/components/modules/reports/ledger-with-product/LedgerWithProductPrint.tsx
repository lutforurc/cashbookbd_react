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
 * ⚠️ THE ROWS BOX LEFT EMPTY NOW MEANS WHAT IT MEANS EVERYWHERE ELSE: every row
 * on one unbroken run, and the browser breaks the sheets.
 *
 * It used to mean something else here -- "fit as many rows as the paper takes",
 * worked out by adding up guessed row heights against a guessed page budget,
 * because the print block is mounted inside a `hidden` div and measures zero
 * until it is already printing. The guesses were deliberately generous (a
 * letterhead allowance of 120px, a heading of 110), since under-filling costs a
 * finger of white and over-filling silently prints rows off the edge of the
 * sheet.
 *
 * That white was the whole problem. A clerk who had asked for All watched the
 * report break early with a hand's depth of empty paper at the foot, on a
 * screen where thirty-nine other reports take All to mean no break at all --
 * and no guess, however carefully tuned, ever closes that gap: the rows are
 * different heights, so there is always a last one that did not fit.
 *
 * What is lost is the letterhead on the second sheet and after, which is what
 * every other report in this app does -- one letterhead, a repeating column
 * header, and the page number at the foot.
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
    const fs = Number.isFinite(fontSize) ? fontSize : 9;
    // A number in the Rows box is an instruction and is obeyed exactly. Left
    // empty, the whole report is one run and the paper decides where it breaks.
    const asked = Number(rowsPerPage);
    /** One unbroken run, the sheets cut by the browser rather than by us. */
    const continuous = !(asked > 0);
    const pages = continuous ? [rows] : paginateRows(rows, asked);
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

    /** The totals bar. Printed once, at the end of the last page's rows. */
    const summaryBar = (
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
            <span>{label}:</span> <span>{formatSummaryAmount(value)}</span>
          </div>
        ))}
      </div>
    );

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
            /*
              The foot of the page stands a quarter inch above the edge of the
              paper -- 6.35mm, stated here rather than left to fall out of the
              shared height, which reaches 6.00mm by way of a 1mm rounding
              allowance and says nothing about where the footer lands.

              The page block is the sheet less the 6mm top margin and that
              quarter inch. --print-page-height is the sheet less 6mm, 5mm and
              1mm, so it is 0.35mm too tall for this: taking that back off is
              the whole difference, and it keeps working if the sheet or the
              orientation ever changes.
            */
            min-height: calc(var(--print-page-height) - 0.35mm) !important;
          }

          .print-page.ledger-break-after {
            break-after: page;
            page-break-after: always;
          }

          .print-page:last-child {
            page-break-after: auto !important;
          }

          /*
            ⚠️ WHAT CARRIES ACROSS WHEN THE ROWS BOX IS LEFT EMPTY. The whole
            report is then one block and the browser decides where the sheets
            end -- so the column header has to come with it, or every sheet
            after the first is a wall of figures with nothing saying which
            column is the rate and which the balance.

            No effect at all on a numbered run: each page there is its own
            table, and a table that does not cross a sheet has nothing to
            repeat.
          */
          thead { display: table-header-group; }

          /*
            ⚠️ AND A ROW IS NEVER CUT IN HALF -- said of the cells as well as
            the row. A break through the middle of a line puts the top of the
            figures on one sheet and their tails on the next, which reads as two
            rows that are each half wrong. Chrome honours this on the row, and
            on a row of several lines it needs hearing on the cell that is
            actually tall: the description, with its remarks and order number
            under it, is what a break lands in the middle of.
          */
          tr, td, th {
            break-inside: avoid;
            page-break-inside: avoid;
            -webkit-column-break-inside: avoid;
          }

          /*
            ⚠️ AND THE SOFTWARE LINE COMES WITH IT, at the foot of every sheet.
            A table footer group is repeated by the browser at the bottom of
            each sheet the table crosses, in the flow, which is the whole
            reason it is the mechanism for this and position:fixed is not.

            Nothing to repeat on a numbered run: each page there is its own
            table with its own line under it, and the tfoot is not drawn at all.
          */
          tfoot { display: table-footer-group; }

          /*
            ⚠️ AND NO FLOOR UNDER AN UNBROKEN RUN. min-height is a sheet's worth
            of height, which on a two-row ledger holds the block open to the
            full sheet and pushes the repeated foot -- rows, totals and all --
            down onto a second page that has nothing else on it. A run as tall
            as its rows cannot do that.
          */
          .print-page.ledger-continuous {
            min-height: 0 !important;
          }
        `}</style>
        {pages.map((pageRows, pageIndex) => (
          <div
            key={pageIndex}
            className={`print-page ${continuous ? 'ledger-continuous' : ''} ${
              pageIndex !== pages.length - 1 ? 'ledger-break-after' : ''
            }`}
          >
            <PadPrinting />
            <div className="mb-1">
              <div className="text-center">
                <h1 className="text-xl font-bold">Ledger Details</h1>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div>
                    <span className="font-semibold">Name:</span> {printablePartyName}
                  </div>
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

                {/*
                  ⚠️ ON AN UNBROKEN RUN THE TOTALS ARE A ROW OF THE TABLE, not a
                  bar underneath it. The software line below is a tfoot, and a
                  tfoot prints AFTER everything the table holds -- so a summary
                  left outside the table would have come after the line rather
                  than above it, on the one page that carries both.
                */}
                {continuous && pageIndex === pages.length - 1 ? (
                  <tr>
                    <td colSpan={12} className="border-0 p-0">
                      {summaryBar}
                    </td>
                  </tr>
                ) : null}
              </tbody>

              {/*
                ⚠️ THE FOOT OF EVERY SHEET, AND THE BROWSER PUTS IT THERE.

                position:fixed was tried and is not to be trusted: Chrome
                repainted the line at the TOP of the second sheet and every one
                after it, straight across the column headings. A table footer
                group is the mechanism meant for this -- the browser repeats it
                at the foot of each sheet the table crosses, IN FLOW, so it can
                neither land in the wrong place nor be printed through by the
                rows above it.

                Space above it is real space for the same reason: pt-3 is white
                the rows cannot enter, where padding on the page block reserved
                nothing at all -- a block spanning eight sheets has one foot, at
                the end of the eighth.
              */}
              {continuous ? (
                <tfoot>
                  <tr>
                    <td colSpan={12} className="border-0 p-0 pt-3">
                      <PrintFooter fontSize={fs} />
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>

            {!continuous && pageIndex === pages.length - 1 ? summaryBar : null}

            {/*
              ⚠️ TWO FEET, BECAUSE THERE ARE TWO WAYS THIS REPORT IS BROKEN UP.

              A NUMBERED RUN cuts its own pages, so each page block carries its
              own line in the normal flow. mt-auto holds it at the bottom of the
              flex column: it keeps the same spot on every sheet, the rows stop
              above it, and it can say which page of how many this is because we
              are the ones who decided.

              AN UNBROKEN RUN is one block and the browser cuts it, so a line in
              the flow appears once, at the very end -- which is what was
              reported: eight sheets and the software line on the last of them.
              The pinned form is repainted on every printed sheet instead, and
              carries no page count, since nothing here can count pages somebody
              else decided on. The space it needs is reserved above -- see
              .ledger-continuous, and the note there about why this line was
              taken out of the foot once before.
            */}
            {continuous ? null : (
              <PrintFooter page={pageIndex + 1} total={pages.length} fontSize={fs} />
            )}
          </div>
        ))}
      </div>
    );
  },
);

LedgerWithProductPrint.displayName = 'LedgerWithProductPrint';

export default LedgerWithProductPrint;
