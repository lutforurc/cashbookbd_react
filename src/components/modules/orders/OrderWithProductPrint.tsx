import React from 'react';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { formatDate } from '../../utils/utils-functions/formatDate';

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
  unitName?: string;
  hasLineDetail?: boolean;
};

type PrintPayload = {
  order_number?: string;
  order_date?: string;
  last_delivery_date?: string;
  customer?: {
    name?: string;
  } | null;
  product?: {
    name?: string;
  } | null;
};

type Props = {
  title?: string;
  branchName?: string;
  transactionDate?: string;
  payload?: PrintPayload | null;
  rows?: PrintRow[];
  rowsPerPage?: number;
  fontSize?: number;
};

const toNumber = (value: Primitive) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatSignedAmount = (value: Primitive, decimal = 0) => {
  const amount = toNumber(value);
  if (amount === 0) {
    return {
      text: '0',
      isNegative: false,
    };
  }

  if (amount < 0) {
    return {
      text: `(-) ${thousandSeparator(Math.abs(amount), decimal)}`,
      isNegative: true,
    };
  }

  return {
    text: thousandSeparator(amount, decimal),
    isNegative: false,
  };
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
    },
    ref,
  ) => {
    const fs = Number.isFinite(fontSize) ? fontSize : 12;
    const pages = chunkRows(rows, Math.max(rowsPerPage, 1));
    const totals = rows.reduce(
      (acc, row) => {
        acc.quantity += toNumber(row.quantity);
        acc.payment += toNumber(row.payment);
        return acc;
      },
      { quantity: 0, payment: 0 },
    );

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

            <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div>Order for: <span className="font-semibold">{payload?.customer?.name || '-'}</span></div>
                <div>Order No: <span className="font-semibold">{payload?.order_number || '-'}</span></div>
              </div>
              <div className="space-y-1 text-right">
                <div>Order Date: {formatDate(payload?.order_date || '')}</div>
                <div>Product: {payload?.product?.name || '-'}</div>
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-center">SL. NO</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-left">CHAL. NO. & DATE</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-left">PRODUCT & DETAILS</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-left">VEHICLE NUMBER</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-right">QUANTITY</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-right">RATE</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-right">TOTAL</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-right">DISCOUNT</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-1 text-right">PAYMENT</th>
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
                        {row.vehicleNo || '-'}
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1 text-right">
                        {row.hasLineDetail
                          ? `${thousandSeparator(toNumber(row.quantity), 2)} ${row.unitName || ''}`
                          : '-'}
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1 text-right">
                        {row.hasLineDetail ? thousandSeparator(toNumber(row.rate), 2) : '-'}
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1 text-right">
                        {row.hasLineDetail ? thousandSeparator(toNumber(row.total), 0) : '-'}
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1 text-right">
                        {thousandSeparator(toNumber(row.discount), 0)}
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1 text-right">
                        {(() => {
                          const paymentDisplay = formatSignedAmount(row.payment, 0);
                          return <span className={paymentDisplay.isNegative ? 'font-bold' : ''}>{paymentDisplay.text}</span>;
                        })()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={{ fontSize: fs }} colSpan={9} className="border border-black px-2 py-2 text-center">
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
                      {thousandSeparator(totals.quantity, 2)}
                    </td>
                    <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1" />
                    <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1" />
                    <td style={{ fontSize: fs, lineHeight: 1.2 }} className="border border-black px-2 py-1" />
                    <td
                      style={{ fontSize: fs, lineHeight: 1.2 }}
                      className="border border-black px-2 py-1 text-right font-semibold"
                    >
                      {(() => {
                        const paymentDisplay = formatSignedAmount(totals.payment, 0);
                        return <span className={paymentDisplay.isNegative ? 'font-bold' : ''}>{paymentDisplay.text}</span>;
                      })()}
                    </td>
                  </tr>
                ) : null}
              </tfoot>
            </table>
          </div>
        ))}
      </div>
    );
  },
);

export default OrderWithProductPrint;
