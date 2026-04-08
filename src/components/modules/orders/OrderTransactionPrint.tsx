import React from 'react';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

type OrderRow = {
  id?: number | string;
  order_type?: number | string;
  order_for?: string;
  address?: string;
  mobile?: string;
  duration?: string;
  delivery_location?: string;
  order_number?: string;
  product_name?: string;
  total_order?: number | string;
  trx_quantity?: number | string;
  order_rate?: number | string;
  order_date?: string;
  last_delivery_date?: string;
  order_amount?: number | string;
  order_details_text?: string;
  notes?: string;
  unit?: string;
  transaction_rows?: PrintTransactionRow[];
};

export type PrintTransactionRow = {
  id: string | number;
  vr_no?: string;
  date?: string;
  vehicle_no?: string;
  weight?: number | string;
  unit?: string;
  rate?: number | string;
  amount?: number | string;
  freight_charge?: number | string;
  due_amount?: number | string;
};

type Props = {
  order: OrderRow | null;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getOrderTypeLabel = (value: string | number | undefined) => {
  if (String(value) === '1') return 'Purchase';
  if (String(value) === '2') return 'Sales';
  if (String(value) === '3') return 'Stock';
  return 'Order';
};

const formatPrintDate = (value?: string) => {
  if (!value) return '-';

  const parts = value.includes('-') ? value.split('-') : value.split('/');
  if (parts.length !== 3) return value;

  if (value.includes('-')) {
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  }

  const [day, month, year] = parts;
  return `${day}.${month}.${year}`;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];

  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }

  return out;
};

const buildFallbackTransactions = (order: OrderRow | null): PrintTransactionRow[] => {
  if (!order) return [];

  const trxQty = toNumber(order.trx_quantity);
  if (trxQty <= 0) return [];

  return [
    {
      id: `${order.id ?? 'order'}-summary`,
      vr_no: '-',
      date: order.order_date || '-',
      vehicle_no: '-',
      weight: trxQty,
      unit: order.unit || '',
      rate: toNumber(order.order_rate),
      freight_charge: 0,
    },
  ];
};

const OrderTransactionPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ order, title, rowsPerPage = 20, fontSize = 11 }, ref) => {
    const fs = Number.isFinite(fontSize) ? fontSize : 11;
    const orderTypeLabel = getOrderTypeLabel(order?.order_type);
    const partyLabel = orderTypeLabel === 'Purchase' ? 'Supplier Name' : 'Customer Name';
    const transactionRows = Array.isArray(order?.transaction_rows) && order.transaction_rows.length > 0
      ? order.transaction_rows
      : buildFallbackTransactions(order);
    const pages = chunkRows(transactionRows, rowsPerPage);

    const totals = transactionRows.reduce(
      (acc, row) => {
        const weight = toNumber(row.weight);
        const rate = toNumber(row.rate);
        const freight = toNumber(row.freight_charge);
        const amount = toNumber(row.amount) || (weight * rate);
        const due = toNumber(row.due_amount) || (amount - freight);

        acc.weight += weight;
        acc.amount += amount;
        acc.freight += freight;
        acc.due += due;

        return acc;
      },
      { weight: 0, amount: 0, freight: 0, due: 0 },
    );
    const computedOrderAmount = toNumber(order?.order_amount) || (toNumber(order?.total_order) * toNumber(order?.order_rate));
    const orderDetailsText =
      order?.order_details_text ||
      `Order Qty: ${thousandSeparator(toNumber(order?.total_order), 0)} ${order?.unit || ''}, Rate: ${thousandSeparator(toNumber(order?.order_rate), 2)}`;


    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {(pages.length > 0 ? pages : [[]]).map((pageRows, pageIndex) => (
          <div key={pageIndex} className="print-page">
            <PadPrinting />

            <div className="mt-5 grid grid-cols-[1fr_auto] gap-x-10 gap-y-6 text-xs md:text-sm">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap">
                  <span className="w-36 shrink-0">{partyLabel}:</span>
                  <span className="font-semibold">{order?.order_for || '-'}</span>
                </div>
                <div className="flex flex-wrap">
                  <span className="w-36 shrink-0">Address:</span>
                  <span className="font-semibold">{order?.address || '-'}</span>
                </div>
                { order?.mobile !=0  && (
                <div className="flex flex-wrap">
                  <span className="w-36 shrink-0">Mobile:</span>
                  <span className="font-semibold">{order?.mobile || '-'}</span>
                </div>
                )}
                <div className="flex flex-wrap">
                  <span className="w-36 shrink-0">Duration:</span>
                  <span className="font-semibold">{order?.duration || '-'}</span>
                </div>
                <div className="flex flex-wrap">
                  <span className="w-36 shrink-0">Delivery Location:</span>
                  <span className="font-semibold">{order?.delivery_location || '-'}</span>
                </div>
                <div className="flex flex-wrap">
                  <span className="w-36 shrink-0">Order No.</span>
                  <span className="font-semibold">{order?.order_number || '-'}</span>
                </div>
              </div>

              <div className="w-[290px] justify-self-end space-y-2 text-left">
                <div className="flex flex-wrap">
                  <span className="w-36 shrink-0">Product Name:</span>
                  <span className="font-semibold">{order?.product_name || '-'}</span>
                </div>
                <div className="flex flex-wrap">
                  <span className="w-36 shrink-0">Order Amount:</span>
                  <span className="font-semibold">
                    {thousandSeparator(computedOrderAmount, 0)}
                  </span>
                </div>
                
                <div className="flex flex-wrap">
                  <span className="w-36 shrink-0">Order Date</span>
                  <span className="font-semibold">{formatPrintDate(order?.order_date)}</span>
                </div>
                <div className="flex flex-wrap">
                  <span className="w-36 shrink-0">Delivery Date</span>
                  <span className="font-semibold">{formatPrintDate(order?.last_delivery_date)}</span>
                </div>
              </div>
            </div>

            <div className="my-4 text-center text-base font-bold underline">
              {title || `${orderTypeLabel} Details`}
            </div>

            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Sl. No.</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Inv. No.</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Inv. Date</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Vehicle No.</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Weight</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Rate</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Amount</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Freight Charge</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Due Amount</th>
                </tr>
              </thead>

              <tbody>
                {pageRows.length > 0 ? (
                  pageRows.map((row, index) => {
                    const weight = toNumber(row.weight);
                    const rate = toNumber(row.rate);
                    const freight = toNumber(row.freight_charge);
                    const amount = toNumber(row.amount) || (weight * rate);
                    const due = toNumber(row.due_amount) || (amount - freight);

                    return (
                      <tr key={row.id}>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">
                          {pageIndex * rowsPerPage + index + 1}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">
                          {row.vr_no || '-'}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">
                          {row.date || '-'}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">
                          {row.vehicle_no || '-'}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                          {thousandSeparator(weight, 0)} {row.unit || order?.unit || ''}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                          {thousandSeparator(rate, 2)}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                          {thousandSeparator(amount, 0)}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                          {freight > 0 ? thousandSeparator(freight, 0) : '-'}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                          {thousandSeparator(due, 0)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ fontSize: fs }}
                      className="border border-black px-3 py-6 text-center text-gray-500"
                    >
                      No transaction rows found
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot>
                {pageIndex === pages.length - 1 ? (
                  <tr className="bg-gray-100 font-semibold">
                    <td style={{ fontSize: fs }} colSpan={4} className="border border-black px-2 py-2 text-right">
                      Total
                    </td>
                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                      {thousandSeparator(totals.weight, 0)} {order?.unit || ''}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right"></td>
                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                      {thousandSeparator(totals.amount, 0)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                      {totals.freight > 0 ? thousandSeparator(totals.freight, 0) : '-'}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                      {thousandSeparator(totals.due, 0)}
                    </td>
                  </tr>
                ) : null}
              </tfoot>
            </table>

            {order?.notes ? (
              <div style={{ fontSize: fs }} className="mt-4 text-xs md:text-sm">
                <span className="font-semibold">Notes:</span> {order.notes}
              </div>
            ) : null}

            <div style={{ fontSize: fs }} className="mt-auto text-right text-xs">
              Page {pageIndex + 1} of {pages.length || 1}
            </div>

            {pageIndex !== pages.length - 1 ? <div className="page-break" /> : null}
          </div>
        ))}
      </div>
    );
  },
);

OrderTransactionPrint.displayName = 'OrderTransactionPrint';

export default OrderTransactionPrint;
