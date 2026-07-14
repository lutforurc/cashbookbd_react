import React from 'react';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { formatTransportationNumber } from '../../../utils/utils-functions/formatRoleName';

const formatAmount = (value: any, precision = 0) => {
  const amount = Number(value || 0);
  const formatted = thousandSeparator(Math.abs(amount));
  return amount < 0 ? `(${formatted})` : formatted;
};

const formatSummaryAmount = (value: any) => {
  const amount = Number(value || 0);

  return Number.isFinite(amount) && amount ? thousandSeparator(amount) : '-';
};

const parseAmount = (value: any) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const normalized = String(value ?? '')
    .replace(/,/g, '')
    .trim();
  const isNegative = normalized.startsWith('(') && normalized.endsWith(')');
  const amount = Number(normalized.replace(/[()]/g, ''));

  if (!Number.isFinite(amount)) return 0;

  return isNegative ? -amount : amount;
};

const getVoucherType = (vrNo: any) => {
  const prefix = String(vrNo || '').split('-')[0]?.trim();
  const parsed = Number.parseInt(prefix, 10);
  return Number.isNaN(parsed) ? prefix : String(parsed);
};

const isOpeningRow = (row: any) =>
  String(row?.vr_no || '').toLowerCase() === 'opening' ||
  /opening balance/i.test(String(row?.remarks || ''));

const getDisplayedReceivedValue = (row: any) => {
  if (Number.isFinite(Number(row?.displayed_received))) {
    return Number(row.displayed_received);
  }

  if (isOpeningRow(row)) return 0;

  return Number(row?.received || 0);
};

const getDisplayedPaymentValue = (row: any) => {
  if (Number.isFinite(Number(row?.displayed_payment))) {
    return Number(row.displayed_payment);
  }

  const paymentValue = Number(row?.payment || 0);

  return paymentValue;
};

const getApiVoucherType = (row: any) => Number(row?.voucher_type ?? row?.voucher_type_id ?? 0);

const getVoucherSideAmount = (row: any) => {
  const receivedValue = getDisplayedReceivedValue(row);
  const paymentValue = getDisplayedPaymentValue(row);

  return paymentValue || receivedValue;
};

const getDisplayedDebitValue = (row: any) => {
  if (isOpeningRow(row)) {
    const debitValue = Number(row?.debit || 0);
    const balanceValue = Number(row?.balance || 0);

    return debitValue || (balanceValue > 0 ? balanceValue : 0);
  }

  const voucherType = getApiVoucherType(row);

  if (voucherType === 2) return getVoucherSideAmount(row);
  if (voucherType === 1) return 0;

  return getDisplayedReceivedValue(row);
};

const getDisplayedCreditValue = (row: any) => {
  if (isOpeningRow(row)) {
    const creditValue = Number(row?.credit || 0);
    const balanceValue = Number(row?.balance || 0);

    return creditValue || (balanceValue < 0 ? Math.abs(balanceValue) : 0);
  }

  const voucherType = getApiVoucherType(row);

  if (voucherType === 1) return getVoucherSideAmount(row);
  if (voucherType === 2) return 0;

  return getDisplayedPaymentValue(row);
};

const getPurchaseQty = (row: any) => {
  if (isOpeningRow(row)) return 0;
  return getVoucherType(row?.vr_no) === '4' ? Number(row?.quantity || 0) : 0;
};

const getSalesQty = (row: any) => {
  if (isOpeningRow(row)) return 0;
  return getVoucherType(row?.vr_no) === '3' ? Number(row?.quantity || 0) : 0;
};

const getPurchaseAmount = (row: any) =>
  getVoucherType(row?.vr_no) === '4' ? Number(row?.purchase_total || 0) : 0;

const getSalesAmount = (row: any) =>
  getVoucherType(row?.vr_no) === '3' ? Number(row?.sales_total || 0) : 0;

type Props = {
  rows: any[];
  branchName?: string | null;
  partyName?: string | null;
  ledgerPage?: string | null;
  mobile?: string | null;
  address?: string | null;
  startDate?: string;
  endDate?: string;
  rowsPerPage?: number;
  fontSize?: number;
  summary?: {
    opening_balance?: number;
    qty?: number;
    purchase_qty?: number;
    sales_qty?: number;
    purchase_amt?: number;
    sales_amt?: number;
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
    const footerFs = Math.max(fs - 1, 7);
    const dateWidthClass = fs >= 12 ? 'w-20' : fs <= 10 ? 'w-18' : 'w-22';
    const truckWidthClass = fs >= 12 ? 'w-22' : fs <= 10 ? 'w-18' : 'w-20';
    const printablePartyName = partyName || '-';
    const printableMobile = mobile || '';
    const printableAddress = address || '-';

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
                    <span className="font-semibold">Name:</span> {printablePartyName}
                  </div>
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
                style={{ fontSize: footerFs, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <div className="whitespace-nowrap">
                  <span>Opening:</span>{' '}
                  <span>{formatSummaryAmount(summary.opening_balance)}</span>
                </div>

                {Number(summary.purchase_qty || 0) > 0 && (
                  <div className="whitespace-nowrap">
                    <span>Pur. Qty:</span>{' '}
                    <span>{formatSummaryAmount(summary.purchase_qty)}</span>
                  </div>
                )}

                {Number(summary.sales_qty || 0) > 0 && (
                  <div className="whitespace-nowrap">
                    <span>Sal. Qty:</span>{' '}
                    <span>{formatSummaryAmount(summary.sales_qty)}</span>
                  </div>
                )}

                {Number(summary.purchase_amt || 0) > 0 && (
                  <div className="whitespace-nowrap">
                    <span>Pur. Amt:</span>{' '}
                    <span>{formatSummaryAmount(summary.purchase_amt)}</span>
                  </div>
                )}

                {Number(summary.sales_amt || 0) > 0 && (
                  <div className="whitespace-nowrap">
                    <span>Sal. Amt:</span>{' '}
                    <span>{formatSummaryAmount(summary.sales_amt)}</span>
                  </div>
                )}

                {Number(summary.total_received || 0) !== 0 && (
                  <div className="whitespace-nowrap">
                    <span>Debit:</span>{' '}
                    <span>{formatSummaryAmount(summary.total_received)}</span>
                  </div>
                )}

                {Number(summary.total_payment || 0) !== 0 && (
                  <div className="whitespace-nowrap">
                    <span>Credit:</span>{' '}
                    <span>{formatSummaryAmount(summary.total_payment)}</span>
                  </div>
                )}
                <div className="whitespace-nowrap">
                  <span>Closing:</span>{' '}
                  <span>{formatSummaryAmount(summary.closing_balance)}</span>
                </div>
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
