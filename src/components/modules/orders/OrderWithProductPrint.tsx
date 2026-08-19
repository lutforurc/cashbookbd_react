import React from 'react';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { formatDate } from '../../utils/utils-functions/formatDate';
import { formatTransportationNumber } from '../../utils/utils-functions/formatRoleName';

type Primitive = string | number | null | undefined;

type PrintRow = {
  id: string | number;
  sl: number;
  challanNo: string;
  challanDate: string;
  detailLines?: string[];
  vehicleNo?: string;
  quantity?: Primitive;
  rate?: Primitive;
  total?: Primitive;
  discount?: Primitive;
  payment?: Primitive;
  balance?: Primitive;
  unitName?: string;
  hasLineDetail?: boolean;
};

type PrintPayload = {
  order_number?: string;
  order_date?: unknown;
  last_delivery_date?: unknown;
  order_for?: string | null;
  address?: string | null;
  duration?: unknown;
  delivery_location?: string | null;
  order_rate?: Primitive;
  total_order?: Primitive;
  contract_order_qty?: Primitive;
  order_amount?: Primitive;
  order_type?: Primitive;
  customer?: {
    name?: string;
    manual_address?: string | null;
    address?: string | null;
  } | null;
  supplier?: {
    name?: string;
    address?: string | null;
  } | null;
  product?: {
    name?: string;
    unit?: {
      name?: string;
      full_name?: string;
    } | null;
  } | null;
  product_name?: string | null;
};

type Props = {
  title?: string;
  branchName?: string;
  transactionDate?: string;
  payload?: PrintPayload | null;
  rows?: PrintRow[];
  rowsPerPage?: number;
  fontSize?: number;
  paymentColumnLabel?: string;
};

const toNumber = (value: Primitive) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatBalanceAmount = (value: Primitive, decimal = 0) => {
  const amount = toNumber(value);
  if (amount === 0) {
    return decimal > 0 ? amount.toFixed(decimal) : '0.00';
  }

  return amount < 0
    ? `(-) ${thousandSeparator(Math.abs(amount))}`
    : thousandSeparator(amount);
};

const formatNumberOrDash = (value: Primitive) => (
  value !== null && value !== undefined && value !== ''
    ? thousandSeparator(toNumber(value))
    : '-'
);

const toDateParts = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = String(value.getFullYear());
    return `${day}/${month}/${year}`;
  }

  if (typeof value === 'number') {
    return toDateParts(new Date(value));
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return '';

    const bdMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (bdMatch) {
      const [, day, month, year] = bdMatch;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

    const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? text : toDateParts(date);
  }

  if (typeof value === 'object') {
    const dateLike = value as {
      date?: unknown;
      value?: unknown;
      label?: unknown;
      $d?: unknown;
      toDate?: () => Date;
      format?: (format: string) => string;
    };

    if (typeof dateLike.format === 'function') {
      const formatted = dateLike.format('DD/MM/YYYY');
      if (formatted && formatted !== 'Invalid Date') return formatted;
    }

    if (typeof dateLike.toDate === 'function') {
      return toDateParts(dateLike.toDate());
    }

    return toDateParts(dateLike.date ?? dateLike.value ?? dateLike.label ?? dateLike.$d);
  }

  return '';
};

const formatDurationText = (value: unknown): string => {
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    const range = value as {
      from?: unknown;
      to?: unknown;
      start?: unknown;
      end?: unknown;
      startDate?: unknown;
      endDate?: unknown;
    };
    const start = toDateParts(range.from ?? range.start ?? range.startDate);
    const end = toDateParts(range.to ?? range.end ?? range.endDate);
    if (start || end) return [start, end].filter(Boolean).join(' to ');
  }

  return toDateParts(value);
};

const getOrderTypeLabel = (value: Primitive) => {
  if (String(value) === '1') return 'Purchase';
  if (String(value) === '2') return 'Sales';
  if (String(value) === '3') return 'Stock';
  return 'Order';
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }
  return out;
};

const OrderWithProductPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      title = 'Order With Transaction',
      branchName = '-',
      transactionDate = '',
      payload,
      rows = [],
      rowsPerPage = 12,
      fontSize = 12,
      paymentColumnLabel = 'PAYMENT',
    },
    ref,
  ) => {
    const fs = Number.isFinite(fontSize) ? fontSize : 12;
    const computedOrderAmount =
      toNumber(payload?.order_amount) || (toNumber(payload?.total_order) * toNumber(payload?.order_rate));
    const rowTotalAmount = rows.reduce((sum, row) => sum + toNumber(row.total), 0);
    const rowPaymentAmount = rows.reduce((sum, row) => sum + Math.abs(toNumber(row.payment)), 0);
    const shouldUseReceivedBalance = rowTotalAmount === 0 && rowPaymentAmount > 0;
    let cumulativeBalance = 0;
    const printableRows = rows.map((row) => {
      cumulativeBalance += shouldUseReceivedBalance
        ? Math.abs(toNumber(row.payment))
        : toNumber(row.total) - toNumber(row.discount) - Math.abs(toNumber(row.payment));

      return {
        ...row,
        balance: row.balance ?? cumulativeBalance,
      };
    });
    const pages = chunkRows(printableRows, Math.max(rowsPerPage, 1));
    const orderTypeLabel = getOrderTypeLabel(payload?.order_type);
    const partyLabel = orderTypeLabel === 'Purchase' ? 'Supplier Name' : 'Customer Name';
    const partyName = payload?.customer?.name || payload?.supplier?.name || '-';
    const productName = payload?.product?.name || payload?.product_name || '-';
    const unitName = payload?.product?.unit?.name || payload?.product?.unit?.full_name || '';
    const explicitDurationText = formatDurationText(payload?.duration);
    const orderStartDate = toDateParts(payload?.order_date);
    const orderEndDate = toDateParts(payload?.last_delivery_date);
    const durationText =
      explicitDurationText ||
      `${orderStartDate}${orderEndDate ? ` to ${orderEndDate}` : ''}`;
    const totals = printableRows.reduce(
      (acc, row) => {
        acc.quantity += toNumber(row.quantity);
        acc.total += toNumber(row.total);
        acc.discount += toNumber(row.discount);
        acc.payment += toNumber(row.payment);
        return acc;
      },
      { quantity: 0, total: 0, discount: 0, payment: 0 },
    );

  console.log('Printable Rows:', payload?.customer?.address);


    return (
      <div ref={ref} className="p-6 text-sm text-gray-900 print-root">
        <PrintStyles />
        <style>{`
          @media print {
            @page { size: landscape; }
            .order-with-transaction-print-page {
              display: block !important;
              min-height: auto !important;
              padding: 4mm 6mm !important;
            }
          }
        `}</style>

        {(pages.length > 0 ? pages : [[]]).map((pageRows, pageIndex) => (
          <div key={pageIndex} className="print-page order-with-transaction-print-page">
            <PadPrinting />

            <div className="mb-2 text-center text-2xl font-bold">{title}</div>

            <div className="mb-2 grid grid-cols-[1fr_220px] items-start justify-between gap-6 text-xs leading-4">
              <div className="space-y-1">
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <span>{partyLabel}:</span>
                  <span>{partyName}</span>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <span>Address:</span>
                  <span>{payload?.customer?.manual_address || payload?.customer?.address || '-'}</span>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <span>Duration:</span>
                  <span>{durationText || '-'}</span>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <span className="whitespace-nowrap">Delivery Location:</span>
                  <span>{payload?.delivery_location || '-'}</span>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <span>Order No.</span>
                  <span>{payload?.order_number || '-'}</span>
                </div>
              </div>
              <div className="space-y-1 text-left">
                <div className="grid grid-cols-[86px_1fr] gap-2">
                  <span>Product Name:</span>
                  <span>{productName}</span>
                </div>
                <div className="grid grid-cols-[86px_1fr] gap-2">
                  <span>Contact Qty:</span>
                  <span>{formatNumberOrDash(payload?.contract_order_qty)}</span>
                </div>
                <div className="grid grid-cols-[86px_1fr] gap-2">
                  <span>Order Rate:</span>
                  <span>{formatNumberOrDash(payload?.order_rate)}</span>
                </div>
                <div className="grid grid-cols-[86px_1fr] gap-2">
                  <span>Order Qty:</span>
                  <span>{formatNumberOrDash(payload?.total_order)} {unitName}</span>
                </div>
                <div className="grid grid-cols-[86px_1fr] gap-2">
                  <span>Amount:</span>
                  <span>Tk. {thousandSeparator(computedOrderAmount)}</span>
                </div>
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-center">Sl. No</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-left">Chal. No. & Date</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-left">Product & Details</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-left w-25">Truck Number</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 w-25  text-center">Quantity</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-center">Rate</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-center">Total</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-center">Discount</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-center">{paymentColumnLabel}</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-center">Balance</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length > 0 ? (
                  pageRows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1 text-center">
                        {row.sl}
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1">
                        <div>{row.challanNo}</div>
                        <div>{formatDate(row.challanDate)}</div>
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1">
                        {Array.isArray(row.detailLines) && row.detailLines.length > 0
                          ? row.detailLines.map((line, index) => <div key={`${row.id}-${index}`}>{line}</div>)
                          : '-'}
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1">
                        {formatTransportationNumber(row.vehicleNo) || '-'}
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1 text-right">
                        {row.hasLineDetail
                          ? `${thousandSeparator(toNumber(row.quantity))}`
                          : '-'}
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1 text-right">
                        {row.hasLineDetail ? thousandSeparator(toNumber(row.rate)) : '-'}
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1 text-right">
                        {row.hasLineDetail ? thousandSeparator(toNumber(row.total)) : '-'}
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1 text-right">
                        { row.discount ? thousandSeparator(toNumber(row.discount)) : '-' }
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1 text-right">
                        { row.payment ? thousandSeparator(Math.abs(toNumber(row.payment))) : '-' }
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1 text-right">
                        {formatBalanceAmount(row.balance, 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={{ fontSize: fs }} colSpan={10} className="border border-black px-2 py-2 text-center">
                      No order transaction data found.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                {pageIndex === pages.length - 1 ? (
                  <tr>
                    <td
                      style={{ fontSize: fs, lineHeight: 1.2 }}
                      colSpan={4}
                      className="border border-black px-2 py-1 text-right font-semibold"
                    >
                      Total
                    </td>
                    <td
                      style={{ fontSize: fs, lineHeight: 1.2 }}
                      className="border border-black px-2 py-1 text-right font-semibold"
                    >
                      {thousandSeparator(totals.quantity)}
                    </td>
                    <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1" />
                    <td
                      style={{ fontSize: fs, lineHeight: 1.2 }}
                      className="border border-black px-2 py-1 text-right font-semibold"
                    >
                      {thousandSeparator(totals.total)}
                    </td>
                    <td
                      style={{ fontSize: fs, lineHeight: 1.2 }}
                      className="border border-black px-2 py-1 text-right font-semibold"
                    >
                      {totals.discount ? thousandSeparator(totals.discount) : '-'}
                    </td>
                    <td
                      style={{ fontSize: fs, lineHeight: 1.2 }}
                      className="border border-black px-2 py-1 text-right font-semibold"
                    >
                      {Math.abs(totals.payment) ? thousandSeparator(Math.abs(totals.payment)) : '-'}
                    </td>
                    <td
                      style={{ fontSize: fs, lineHeight: 1.2 }}
                      className="border border-black px-2 py-1 text-right font-semibold"
                    >
                      {formatBalanceAmount(printableRows[printableRows.length - 1]?.balance ?? 0, 0)}
                    </td>
                  </tr>
                ) : null}
              </tfoot>
            </table>
            <PrintFooter page={pageIndex + 1} total={pages.length > 0 ? pages.length : 1} fontSize={fs} />
          </div>
        ))}
      </div>
    );
  },
);

export default OrderWithProductPrint;
