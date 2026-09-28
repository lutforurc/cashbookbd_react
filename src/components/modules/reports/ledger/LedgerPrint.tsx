import React from 'react';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import dayjs from 'dayjs';
import formatDate, { formatDateUsdToBd } from '../../../utils/utils-functions/formatDate';
import { formatMobile, useMobileFormat } from '../../../utils/utils-functions/mobileFormat';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';

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
  /** Newest voucher first, the way the screen is showing it. */
  descending?: boolean;
};

type LedgerRowWithBalance = LedgerRow & {
  runningBalance?: number;
};

const SUMMARY_ROW_NAMES = new Set([
  'Range Total',
  'Total',
  'Balance',
  'Balance Receivable',
  'Balance Payable',
]);

const getLedgerRowName = (row: LedgerRow) => {
  if (String(row?.name || '').trim().toLowerCase() !== 'balance') {
    return row?.name || '';
  }

  if (Number(row?.debit || 0) > 0) {
    return 'Balance Receivable';
  }

  if (Number(row?.credit || 0) > 0) {
    return 'Balance Payable';
  }

  return 'Balance';
};

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
      descending = false,
    },
    ref,
  ) => {
    // Safety: normalize rows

    const rowsArr: LedgerRow[] = Array.isArray(rows) ? rows : [];

    // ⚠️ THE BALANCE IS WALKED OLDEST FIRST WHATEVER THE LAYOUT. The figure
    // beside a row is the balance after that voucher, and that does not change
    // because the paper is read the other way up -- so a descending report only
    // turns the finished list round, it never walks it backwards.
    const walkOrder = descending ? [...rowsArr].reverse() : rowsArr;

    let previousAmount = 0;
    const walked: LedgerRowWithBalance[] = walkOrder.map((row) => {
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

    const rowsWithBalance = descending ? walked.reverse() : walked;
    const pages = chunkRows(rowsWithBalance, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 9;
    const partyInfo = coal4?.cust_party_infos || {};
    const ledgerCode = partyInfo?.idfr_code ?? coal4?.idfr_code;
    const ledgerAddress =
      partyInfo?.manual_address ||
      coal4?.manual_address ||
      partyInfo?.address ||
      coal4?.address ||
      '';
    const ledgerMobile = partyInfo?.mobile || coal4?.mobile || '';
    const mobileFormat = useMobileFormat();

    // Grand totals (for all rows)
    const grandDebit = sum(rowsArr.map((r) => Number(r.debit || 0)));
    const grandCredit = sum(rowsArr.map((r) => Number(r.credit || 0)));

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        {/* PrintStyles carries every rule this page needs. A copy of the same
            declarations used to stand here as well, and being later in the
            document it won over the shared one -- the page then had 8mm of
            padding under its content where every other report has none, which
            lifted the foot line off the sheet by that much. */}
        <PrintStyles />

        {pages.map((pageRows, pIdx) => {
          // ⚠️ VOUCHER ROWS ONLY. A descending report carries Range Total, Total
          // and Balance at the top of its first page, and those three are sums
          // themselves -- added into the page's own subtotal they would be
          // counted twice, and a page subtotal larger than the report is worse
          // than none. A row with a balance is a voucher (or Opening); the
          // summary rows are the ones without.
          const voucherRows = pageRows.filter((row) => row.runningBalance !== undefined);

          const pageDebit = sum(voucherRows.map((r) => Number(r.debit || 0)));
          const pageCredit = sum(voucherRows.map((r) => Number(r.credit || 0)));
          // The figure the page closes on is the last voucher read on it -- which
          // on a descending page is the newest one, at the top.
          const pageClosingBalance =
            (descending ? voucherRows[0] : voucherRows[voucherRows.length - 1])?.runningBalance ?? 0;

          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />

              {/* Header */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-center">{title}</h1>
                <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
                  {/* বাম পাশ */}
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
                        Mobile: {formatMobile(ledgerMobile, mobileFormat)}
                      </span>
                    )}
                  </div>

                  {/* ডান পাশ */}
                  <div className="text-right">
                    <span className="font-semibold">Report Date:</span>{' '}
                    {startDate || '-'} to {endDate || '-'}
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
                        className="border border-gray-900 px-2 py-2 w-26 text-left"
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
                            <div className={`flex text-left text-[${fs}px]`}>
                              {row?.vr_no ? row.vr_no : ''}
                            </div>

                            <div className={`text-left text-[${fs}px]`}>
                              {row?.vr_date && formatDate(dayjs(row?.vr_date).format('YYYY-MM-DD'))}
                              {/* { row?.vr_date } */}
                            </div>
                          </td>
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 align-middle"
                          >
	                            <div className="w-full max-w-4xl leading-normal">
	                              <div className="leading-normal wrap-break-word whitespace-normal">
	                                <span className={`text-[${fs}px]`}>
	                                  {getLedgerRowName(row)}
	                                </span>
	                              </div>
                              {row?.remarks != "-" && (
                                <div
                                  className={`text-[${fs}px] wrap-break-word whitespace-normal text-gray-700`}
                                >
                                  {row.remarks}
                                </div>
                              )}
                              {showBranchName && row?.branch_name && (
                                <div className={`text-[${fs}px] wrap-break-word whitespace-normal font-semibold`}>
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

              {/* The carried-forward figure belongs with the page whose rows it
                  sums, so it stays directly under the table. */}
              {pIdx !== pages.length - 1 && (
                <div style={{ fontSize: fs }} className="mt-2 font-semibold">
                  Balance: {thousandSeparator(pageClosingBalance)}
                </div>
              )}

              {/* ⚠️ THE FOOT LINE IS A CHILD OF THE PAGE, NOT OF A WRAPPER. Its
                  own `mt-auto` is what holds it at the foot of the sheet, and a
                  div around it becomes the flex item instead -- the line then
                  stands wherever the table happens to end.

                  ⚠️ AND IT IS PINNED WHEN THE REPORT DID NOT CUT ITS OWN PAGES.
                  The Rows box starts at 0, which makes the whole report one
                  block and leaves the breaks to the browser; a line left in the
                  flow then prints once, under the last row, on whichever sheet
                  the table ends. Pinned, it is repainted at the foot of every
                  sheet. Same rule and same reason as CashBookPrint. */}
              <PrintFooter
                fixed={pages.length === 1}
                page={pIdx + 1}
                total={pages.length}
                fontSize={fs}
              />

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
      </div>
    );
  },
);

LedgerPrint.displayName = 'LedgerPrint';
export default LedgerPrint;