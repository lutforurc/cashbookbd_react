import React from 'react';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

type OrderSummary = {
  totalOrder?: number;
  totalTrxQuantity?: number;
  orderRemainingQuantity?: number;
  linkedOrderCount?: number;
  linkedQuantity?: number;
  remainingQuantity?: number;
  purchaseQuantity?: number;
  salesQuantity?: number;
  purchaseTrxQuantity?: number;
  salesTrxQuantity?: number;
  purchaseAmount?: number;
  salesAmount?: number;
};

type Props = {
  rows: any[];
  title?: string;
  searchText?: string;
  orderTypeLabel?: string;
  startDate?: string;
  endDate?: string;
  summary?: OrderSummary;
  rowsPerPage?: number;
  fontSize?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];

  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }

  return out;
};

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumberOrDash = (value: any) => {
  const numericValue = toNumber(value);
  return numericValue === 0 ? '-' : thousandSeparator(numericValue);
};

const getOrderRemainingQuantity = (row: any) =>
  toNumber(row?.total_order) - toNumber(row?.trx_quantity);

const getLinkedRemainingQuantity = (row: any) => {
  const totalOrder = row?.total_order;
  const linkedQuantity = row?.linked_quantity;

  if (
    totalOrder !== undefined &&
    totalOrder !== null &&
    totalOrder !== '' &&
    linkedQuantity !== undefined &&
    linkedQuantity !== null &&
    linkedQuantity !== ''
  ) {
    return toNumber(totalOrder) - toNumber(linkedQuantity);
  }

  return toNumber(row?.remaining_quantity);
};

const getLinkedOrderCount = (row: any) =>
  toNumber(row?.linked_order_count ?? row?.linked_orders_count);

// What an order is worth. The API sends the amount it computed from the order's
// own lines; older payloads carry no amount at all, and for those a single rate
// across the ordered quantity is the closest honest answer.
const getOrderAmount = (row: any) => {
  if (row?.total_amount !== undefined && row?.total_amount !== null && row?.total_amount !== '') {
    return toNumber(row.total_amount);
  }

  const items = Array.isArray(row?.items) ? row.items : [];
  if (items.length > 0) {
    return items.reduce((sum: number, item: any) => {
      const lineAmount = toNumber(item?.line_amount);
      return sum + (lineAmount !== 0 ? lineAmount : toNumber(item?.order_rate) * toNumber(item?.total_order));
    }, 0);
  }

  return toNumber(row?.order_rate) * toNumber(row?.total_order);
};

const buildSummary = (rows: any[]): OrderSummary =>
  (Array.isArray(rows) ? rows : []).reduce(
    (acc, row) => {
      acc.totalOrder = Number(acc.totalOrder || 0) + toNumber(row?.total_order);
      acc.totalTrxQuantity =
        Number(acc.totalTrxQuantity || 0) + toNumber(row?.trx_quantity);
      acc.orderRemainingQuantity =
        Number(acc.orderRemainingQuantity || 0) + getOrderRemainingQuantity(row);
      acc.linkedOrderCount =
        Number(acc.linkedOrderCount || 0) + getLinkedOrderCount(row);
      acc.linkedQuantity = Number(acc.linkedQuantity || 0) + toNumber(row?.linked_quantity);
      acc.remainingQuantity =
        Number(acc.remainingQuantity || 0) + getLinkedRemainingQuantity(row);
      if (toNumber(row?.order_type) === 1) {
        acc.purchaseQuantity = Number(acc.purchaseQuantity || 0) + toNumber(row?.total_order);
        acc.purchaseTrxQuantity =
          Number(acc.purchaseTrxQuantity || 0) + toNumber(row?.trx_quantity);
        acc.purchaseAmount = Number(acc.purchaseAmount || 0) + getOrderAmount(row);
      }
      if (toNumber(row?.order_type) === 2) {
        acc.salesQuantity = Number(acc.salesQuantity || 0) + toNumber(row?.total_order);
        acc.salesTrxQuantity =
          Number(acc.salesTrxQuantity || 0) + toNumber(row?.trx_quantity);
        acc.salesAmount = Number(acc.salesAmount || 0) + getOrderAmount(row);
      }

      return acc;
    },
    {
      totalOrder: 0,
      totalTrxQuantity: 0,
      orderRemainingQuantity: 0,
      linkedOrderCount: 0,
      linkedQuantity: 0,
      remainingQuantity: 0,
      purchaseQuantity: 0,
      salesQuantity: 0,
      purchaseTrxQuantity: 0,
      salesTrxQuantity: 0,
      purchaseAmount: 0,
      salesAmount: 0,
    },
  );

const OrdersPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      title = 'Order List',
      searchText,
      orderTypeLabel,
      startDate,
      endDate,
      summary,
      rowsPerPage = 12,
      fontSize = 12,
    },
    ref,
  ) => {
    const rowsArr = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(rowsArr, rowsPerPage);
    const grandSummary = summary || buildSummary(rowsArr);
    const purchaseTrxBalance =
      toNumber(grandSummary.purchaseQuantity) - toNumber(grandSummary.purchaseTrxQuantity);
    const salesTrxBalance =
      toNumber(grandSummary.salesQuantity) - toNumber(grandSummary.salesTrxQuantity);
    const trxDefQuantity = purchaseTrxBalance - salesTrxBalance;
    const purchaseAmount = toNumber(grandSummary.purchaseAmount);
    const salesAmount = toNumber(grandSummary.salesAmount);
    const amountDifference = purchaseAmount - salesAmount;
    const fs = Number.isFinite(fontSize) ? fontSize : 12;
    const printTextStyle = { fontSize: fs, lineHeight: 1.28 };

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles orientation="landscape" />
        <style>
          {`
            @media print {

              /*
                Landscape printable height = 210mm - 6mm(top margin) - 5mm(bottom margin) = 199mm.
                .print-page adds 8mm top + 2mm bottom padding (from PrintStyles). The page fills
                almost the whole printable area (so the inside footer sits at the bottom via
                mt-auto); the tiny 1mm buffer keeps a sub-millimetre overflow off a second page.
              */
              .orders-print-page {
                min-height: var(--print-page-height);
              }
            }
          `}
        </style>

        {pages.map((pageRows, pageIndex) => {
          return (
            <div key={pageIndex} className="print-page orders-print-page">
              <PadPrinting />

              <div className="mb-2">
                <h1 className="text-2xl font-bold text-center">{title}</h1>
              </div>

              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th style={printTextStyle} className="w-12 border border-gray-900 px-2 py-1 text-center">Sl. No.</th>
                    <th style={printTextStyle} className="border border-gray-900 px-2 py-1 text-left">Description</th>
                    <th style={printTextStyle} className="w-30 border border-gray-900 px-2 py-1 text-left">
                      <span className="block">Product</span>
                      <span className="block">Trx. Qty</span>
                    </th>
                    <th style={printTextStyle} className="w-36 border border-gray-900 px-2 py-1 text-left">
                      <span className="block">Order Rate</span>
                      <span className="block">Order No.</span>
                      <span className="block">Order Date</span>
                    </th>
                    <th style={printTextStyle} className="w-40 border border-gray-900 px-2 py-1 text-right">
                      <span className="block">Contract Qty</span>
                      <span className="block">Order Qty</span>
                      <span className="block">Remaining Qty</span>
                    </th>
                    <th style={printTextStyle} className="w-40 border border-gray-900 px-2 py-1 text-right">
                      <span className="block">Linked Orders</span>
                      <span className="block">Linked Qty</span>
                      <span className="block">Remaining Qty</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length > 0 ? (
                    pageRows.map((row: any, index: number) => (
                      <tr key={row?.id ?? index} className="align-top">
                        <td style={printTextStyle} className="border border-gray-900 px-2 py-1 text-center align-middle">
                          {row?.serial ?? index + 1}
                        </td>
                        <td style={printTextStyle} className="border border-gray-900 px-2 py-1">
                          <span className="block">{row?.order_for || '-'}</span>
                          {row?.delivery_location ? (
                            <span className="block">{row.delivery_location}</span>
                          ) : null}
                          {row?.notes ? (
                            <span className="block font-semibold">{row.notes}</span>
                          ) : null}
                        </td>
                        <td style={printTextStyle} className="border border-gray-900 px-2 py-1">
                          <span className="block">{row?.product_name || '-'}</span>
                          <span className="block">
                            {row?.trx_quantity != null && row?.trx_quantity !== ''
                              ? formatNumberOrDash(row.trx_quantity)
                              : '-'}
                          </span>
                        </td>
                        <td style={printTextStyle} className="border border-gray-900 px-2 py-1">
                          <span className="block">
                            {row?.order_rate != null && row?.order_rate !== ''
                              ? formatNumberOrDash(row.order_rate)
                              : '-'}
                          </span>
                          <span className={`block ${row?.order_number?.length > 17 ? 'text-[0.6rem]' : ''}`}>
                            {row?.order_number?.length > 0 ? row.order_number : '-'}
                          </span>
                          <span className="block">{row?.order_date || '-'}</span>
                        </td>
                        <td style={printTextStyle} className="border border-gray-900 px-2 py-1 text-right">

                          <span className="block">
                            {row?.contract_order_qty != null && row?.contract_order_qty !== ''
                              ? formatNumberOrDash(row.contract_order_qty)
                              : '-'}
                          </span>
                          <span className="block">
                            {formatNumberOrDash(row?.total_order)}
                          </span>
                          <span className="block font-semibold">
                            {formatNumberOrDash(getOrderRemainingQuantity(row))}
                          </span>
                        </td>
                        <td style={printTextStyle} className="border border-gray-900 px-2 py-1 text-right">
                          <span className="block">
                            {row?.linked_order_count != null || row?.linked_orders_count != null
                              ? formatNumberOrDash(getLinkedOrderCount(row))
                              : '-'}
                          </span>
                          <span className="block">
                            {row?.linked_quantity != null
                              ? formatNumberOrDash(row.linked_quantity)
                              : '-'}
                          </span>
                          <span className="block">
                            {formatNumberOrDash(getLinkedRemainingQuantity(row))}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        style={printTextStyle}
                        className="border border-gray-900 px-3 py-3 text-center text-gray-500"
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {pageIndex === pages.length - 1 ? (
                <table className="mt-2 w-full table-fixed border-collapse">
                  <tbody>
                    <tr className="font-semibold">
                      <td
                        style={printTextStyle}
                        className="border border-gray-900 px-2 py-1 text-center"
                      >
                        PO Trx. Bal. Qty: {thousandSeparator(purchaseTrxBalance)}
                        <span className="mx-6">
                          DO Trx. Bal. Qty: {thousandSeparator(salesTrxBalance)}
                        </span>
                        Trx. Def. Qty: {thousandSeparator(trxDefQuantity)}
                      </td>
                    </tr>
                    <tr className="font-semibold">
                      <td
                        style={printTextStyle}
                        className="border border-gray-900 px-2 py-1 text-center"
                      >
                        PO Amount: {thousandSeparator(purchaseAmount)}
                        <span className="mx-6">DO Amount: {thousandSeparator(salesAmount)}</span>
                        Amt Difference: {thousandSeparator(amountDifference)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : null}

              <PrintFooter page={pageIndex + 1} total={pages.length} fontSize={fs} />

              {pageIndex !== pages.length - 1 ? <div className="page-break" /> : null}
            </div>
          );
        })}
      </div>
    );
  },
);

OrdersPrint.displayName = 'OrdersPrint';

export default OrdersPrint;
