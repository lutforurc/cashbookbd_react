import React from 'react';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

type OrderSummary = {
  totalOrder?: number;
  baseOrderQuantity?: number;
  linkedQuantity?: number;
  remainingQuantity?: number;
};

type Props = {
  rows: any[];
  title?: string;
  searchText?: string;
  orderTypeLabel?: string;
  summary?: OrderSummary;
  rowsPerPage?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];

  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }

  return out;
};

const buildSummary = (rows: any[]): OrderSummary =>
  (Array.isArray(rows) ? rows : []).reduce(
    (acc, row) => {
      acc.totalOrder = Number(acc.totalOrder || 0) + Number(row?.total_order || 0);
      acc.baseOrderQuantity =
        Number(acc.baseOrderQuantity || 0) + Number(row?.base_order_quantity || 0);
      acc.linkedQuantity = Number(acc.linkedQuantity || 0) + Number(row?.linked_quantity || 0);
      acc.remainingQuantity =
        Number(acc.remainingQuantity || 0) + Number(row?.remaining_quantity || 0);

      return acc;
    },
    {
      totalOrder: 0,
      baseOrderQuantity: 0,
      linkedQuantity: 0,
      remainingQuantity: 0,
    },
  );

const OrdersPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      title = 'Orders List Print',
      searchText,
      orderTypeLabel,
      summary,
      rowsPerPage = 12,
    },
    ref,
  ) => {
    const rowsArr = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(rowsArr, rowsPerPage);
    const grandSummary = summary || buildSummary(rowsArr);

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
          const pageSummary = buildSummary(pageRows);

          return (
            <div key={pageIndex} className="print-page orders-print-page">
              <PadPrinting />

              <div className="mb-4">
                <h1 className="text-2xl font-bold text-center">{title}</h1>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-semibold">Search:</span> {searchText || '-'}
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">Order Type:</span> {orderTypeLabel || 'All'}
                  </div>
                </div>
              </div>

              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="w-12 border border-gray-900 px-2 py-2 text-center">Sl.</th>
                    <th className="border border-gray-900 px-2 py-2 text-left">Order For</th>
                    <th className="border border-gray-900 px-2 py-2 text-left">Product / Trx. Qty</th>
                    <th className="border border-gray-900 px-2 py-2 text-left">Order No. / Date</th>
                    <th className="w-32 border border-gray-900 px-2 py-2 text-right">Order Rate / Qty</th>
                    <th className="w-32 border border-gray-900 px-2 py-2 text-right">Reference / Base Qty</th>
                    <th className="w-36 border border-gray-900 px-2 py-2 text-right">Linked / Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length > 0 ? (
                    pageRows.map((row: any, index: number) => (
                      <tr key={row?.id ?? index} className="align-top">
                        <td className="border border-gray-900 px-2 py-2 text-center">
                          {row?.serial ?? index + 1}
                        </td>
                        <td className="border border-gray-900 px-2 py-2">
                          {row?.order_for || '-'}
                        </td>
                        <td className="border border-gray-900 px-2 py-2">
                          <span className="block">{row?.product_name || '-'}</span>
                          <span className="block text-right">
                            Trx. Qty {thousandSeparator(Number(row?.trx_quantity || 0), 0)}
                          </span>
                        </td>
                        <td className="border border-gray-900 px-2 py-2">
                          <span className="block font-semibold">{row?.order_number || '-'}</span>
                          <span className="block">{row?.order_date || '-'}</span>
                        </td>
                        <td className="border border-gray-900 px-2 py-2 text-right">
                          <span className="block">{thousandSeparator(Number(row?.order_rate || 0), 2)}</span>
                          <span className="block">
                            {thousandSeparator(Number(row?.total_order || 0), 0)}
                          </span>
                        </td>
                        <td className="border border-gray-900 px-2 py-2 text-right">
                          <span className="block">
                            {row?.reference_order?.order_number || row?.ref_order_number || '-'}
                          </span>
                          <span className="block">
                            {thousandSeparator(Number(row?.base_order_quantity || 0), 0)}
                          </span>
                        </td>
                        <td className="border border-gray-900 px-2 py-2 text-right">
                          <span className="block">
                            Linked {thousandSeparator(Number(row?.linked_quantity || 0), 0)}
                          </span>
                          <span className="block">
                            Remaining {thousandSeparator(Number(row?.remaining_quantity || 0), 0)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={4} className="border border-gray-900 px-2 py-2 text-right">
                      Page Total
                    </td>
                    <td className="border border-gray-900 px-2 py-2 text-right">
                      Order Qty {thousandSeparator(Number(pageSummary.totalOrder || 0), 0)}
                    </td>
                    <td className="border border-gray-900 px-2 py-2 text-right">
                      Base Qty {thousandSeparator(Number(pageSummary.baseOrderQuantity || 0), 0)}
                    </td>
                    <td className="border border-gray-900 px-2 py-2 text-right">
                      <span className="block">
                        Linked Qty {thousandSeparator(Number(pageSummary.linkedQuantity || 0), 0)}
                      </span>
                      <span className="block">
                        Remaining Qty {thousandSeparator(Number(pageSummary.remainingQuantity || 0), 0)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="mt-3 flex items-center justify-between text-xs text-gray-900">
                <span>* This document is system generated.</span>
                <span>
                  Page {pageIndex + 1} of {pages.length}
                </span>
              </div>

              {pageIndex !== pages.length - 1 ? <div className="page-break" /> : null}
            </div>
          );
        })}

        <div className="page-break" />

        <div className="print-page orders-print-page">
          <PadPrinting />

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-center">{title}</h1>
            <div className="mt-2 text-center text-sm font-semibold">Grand Total Summary</div>
          </div>

          <table className="w-full table-fixed border-collapse">
            <tbody>
              <tr className="bg-slate-200 font-bold">
                <td className="w-1/2 border border-gray-900 px-3 py-3 text-right">Order Qty</td>
                <td className="border border-gray-900 px-3 py-3 text-right">
                  {thousandSeparator(Number(grandSummary.totalOrder || 0), 0)}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-900 px-3 py-3 text-right font-semibold">Base Qty</td>
                <td className="border border-gray-900 px-3 py-3 text-right">
                  {thousandSeparator(Number(grandSummary.baseOrderQuantity || 0), 0)}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-900 px-3 py-3 text-right font-semibold">Linked Qty</td>
                <td className="border border-gray-900 px-3 py-3 text-right">
                  {thousandSeparator(Number(grandSummary.linkedQuantity || 0), 0)}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-900 px-3 py-3 text-right font-semibold">Remaining Qty</td>
                <td className="border border-gray-900 px-3 py-3 text-right">
                  {thousandSeparator(Number(grandSummary.remainingQuantity || 0), 0)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3 flex items-center justify-between text-xs text-gray-900">
            <span>* This document is system generated.</span>
            <span>
              Summary Page
            </span>
          </div>
        </div>
      </div>
    );
  },
);

OrdersPrint.displayName = 'OrdersPrint';

export default OrdersPrint;
