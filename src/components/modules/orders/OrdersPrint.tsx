import React from 'react';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

type OrderSummary = {
  totalOrder?: number;
  totalTrxQuantity?: number;
  orderRemainingQuantity?: number;
  linkedOrderCount?: number;
  linkedQuantity?: number;
  remainingQuantity?: number;
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

      return acc;
    },
    {
      totalOrder: 0,
      totalTrxQuantity: 0,
      orderRemainingQuantity: 0,
      linkedOrderCount: 0,
      linkedQuantity: 0,
      remainingQuantity: 0,
    },
  );

const OrdersPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      title = 'Orders List',
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
    const fs = Number.isFinite(fontSize) ? fontSize : 12;

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />
        <style>
          {`
            @media print {
              @page {
                size: A4 landscape;
                margin: 6mm 8mm 8mm 10mm;
              }

              .orders-print-page {
                min-height: calc(210mm - 6mm - 8mm - 8mm - 8mm);
              }
            }
          `}
        </style>

        {pages.map((pageRows, pageIndex) => {
          return (
            <div key={pageIndex} className="print-page orders-print-page">
              <PadPrinting />

              <div className="mb-4">
                <h1 className="text-2xl font-bold text-center">{title}</h1>
                {/* <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-semibold">Search:</span> {searchText || '-'}
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">Order Type:</span> {orderTypeLabel || 'All'}
                  </div>
                  <div>
                    <span className="font-semibold">Start Date:</span> {startDate || '-'}
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">End Date:</span> {endDate || '-'}
                  </div>
                </div> */}
              </div>

              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th style={{ fontSize: fs }} className="w-12 border border-gray-900 px-2 py-2 text-center">Sl. No.</th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-left">Description</th>
                    <th style={{ fontSize: fs }} className="w-30 border border-gray-900 px-2 py-2 text-left">
                      <span className="block">Product</span>
                      <span className="block">Trx. Qty</span>
                    </th>
                    <th style={{ fontSize: fs }} className="w-36 border border-gray-900 px-2 py-2 text-left">
                      <span className="block">Order Rate</span>
                      <span className="block">Order No.</span>
                      <span className="block">Order Date</span>
                    </th>
                    <th style={{ fontSize: fs }} className="w-40 border border-gray-900 px-2 py-2 text-right">
                      <span className="block">Contract Qty</span>
                      <span className="block">Order Qty</span>
                      <span className="block">Remaining Qty</span>
                    </th>
                    <th style={{ fontSize: fs }} className="w-40 border border-gray-900 px-2 py-2 text-right">
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
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-center">
                          {row?.serial ?? index + 1}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2">
                          <span className="block">{row?.order_for || '-'}</span>
                          {row?.delivery_location ? (
                            <span className="block">{row.delivery_location}</span>
                          ) : null}
                          {row?.notes ? (
                            <span className="block font-semibold">{row.notes}</span>
                          ) : null}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2">
                          <span className="block">{row?.product_name || '-'}</span>
                          <span className="block">
                            {row?.trx_quantity != null && row?.trx_quantity !== ''
                              ? thousandSeparator(Number(row.trx_quantity || 0))
                              : '-'}
                          </span>
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2">
                           <span className="block">{row?.order_rate ?? '-'}</span>
                          <span className={`block ${row?.order_number?.length > 17 ? 'text-[0.6rem]' : ''}`}>
                            {row?.order_number?.length > 0 ? row.order_number : '-'}
                          </span>
                          <span className="block">{row?.order_date || '-'}</span>
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                         
                          <span className="block">
                            {row?.contract_order_qty != null && row?.contract_order_qty !== ''
                              ? thousandSeparator(Number(row.contract_order_qty || 0))
                              : '-'}
                          </span>
                          <span className="block">
                            {thousandSeparator(Number(row?.total_order || 0))}
                          </span>
                          <span className="block font-semibold">
                            {thousandSeparator(getOrderRemainingQuantity(row))}
                          </span>
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                          <span className="block">
                            {row?.linked_order_count != null || row?.linked_orders_count != null
                              ? thousandSeparator(getLinkedOrderCount(row))
                              : '-'}
                          </span>
                          <span className="block">
                            {row?.linked_quantity != null
                              ? thousandSeparator(Number(row.linked_quantity || 0))
                              : '-'}
                          </span>
                          <span className="block">
                            {thousandSeparator(getLinkedRemainingQuantity(row))}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                  {pageIndex === pages.length - 1 ? (
                    <tr className="bg-gray-100 font-semibold">
                        <td
                          style={{ fontSize: fs }}
                          colSpan={2}
                          className="border border-gray-900 px-2 py-2 text-right"
                        >
                          Grand Total
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-2 text-right"
                        >
                          Trx Qty {thousandSeparator(Number(grandSummary.totalTrxQuantity || 0))}
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-2 text-right"
                        >
                          Order Qty {thousandSeparator(Number(grandSummary.totalOrder || 0))}
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-2 text-right"
                        >
                          Remaining Qty {thousandSeparator(Number(grandSummary.orderRemainingQuantity || 0))}
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-2 text-right"
                        >
                          Linked Qty {thousandSeparator(Number(grandSummary.linkedQuantity || 0))}
                          <span className="block">
                            Remaining Qty {thousandSeparator(Number(grandSummary.remainingQuantity || 0))}
                          </span>
                        </td>
                      </tr>
                  ) : null}
                </tbody>
              </table>

              <div style={{ fontSize: fs }} className="mt-3 flex items-center justify-between text-xs text-gray-900">
                <span>* This document is system generated.</span>
                <span>
                  Page {pageIndex + 1} of {pages.length}
                </span>
              </div>

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
