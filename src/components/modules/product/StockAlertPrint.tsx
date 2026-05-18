import React, { useMemo } from 'react';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../utils/utils-functions/PrintStyles';

type StockAlertPrintType = 'lowStock' | 'negative' | 'slowMoving';

type Props = {
  rows: any[];
  title: string;
  type: StockAlertPrintType;
  emptyMessage: string;
  startSerial?: number;
  days?: number;
  rowsPerPage?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];

  const pages: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    pages.push(data.slice(i, i + size));
  }

  return pages.length ? pages : [[]];
};

const display = (value: any) =>
  value === null || value === undefined || value === '' ? '-' : value;

const formatQuantity = (value: any, zeroAsDash = false) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '-';
  if (zeroAsDash && numericValue === 0) return '-';

  return numericValue.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    useGrouping: true,
  });
};

const formatDate = (value: any) => {
  if (!value) return '-';
  return String(value).slice(0, 10);
};

const getStatusLabel = (type: StockAlertPrintType, row: any) => {
  if (type === 'lowStock') {
    return String(row?.stock_status || '').toLowerCase() === 'out_of_stock'
      ? 'Out of Stock'
      : 'Low Stock';
  }

  if (type === 'negative') return 'Negative Stock';
  return 'Slow Moving';
};

const StockAlertPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      title,
      type,
      emptyMessage,
      startSerial = 1,
      days,
      rowsPerPage = 22,
    },
    ref,
  ) => {
    const printableRows = Array.isArray(rows) ? rows : [];
    const pages = useMemo(
      () => chunkRows(printableRows, rowsPerPage),
      [printableRows, rowsPerPage],
    );
    const isSlowMoving = type === 'slowMoving';
    const isLowStock = type === 'lowStock';
    const colSpan = isSlowMoving ? 11 : isLowStock ? 10 : 9;

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />
        <style>
          {`
            @media print {
              @page { size: A4 landscape; margin: 6mm 8mm 8mm 8mm; }
              .print-page {
                min-height: calc(210mm - 6mm - 8mm - 8mm - 8mm);
              }
              .stock-alert-print-table th,
              .stock-alert-print-table td {
                font-size: 9px;
                line-height: 1.25;
              }
            }
          `}
        </style>

        {pages.map((pageRows, pageIndex) => (
          <div key={pageIndex} className="print-page">
            <PadPrinting />

            <div className="mb-4 text-center">
              <h1 className="text-xl font-bold">{title}</h1>
              {isSlowMoving ? (
                <div className="mt-1 text-xs">Days Idle: {formatQuantity(days || 0)}</div>
              ) : null}
            </div>

            <table className="stock-alert-print-table w-full table-fixed border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="w-10 border border-gray-900 px-1.5 py-1 text-center">SL</th>
                  <th className="w-32 border border-gray-900 px-1.5 py-1">Brand</th>
                  <th className="w-36 border border-gray-900 px-1.5 py-1">Category</th>
                  <th className="border border-gray-900 px-1.5 py-1">Product</th>
                  <th className="w-16 border border-gray-900 px-1.5 py-1">Unit</th>
                  {isLowStock ? (
                    <th className="w-20 border border-gray-900 px-1.5 py-1 text-right">
                      Min. Stock
                    </th>
                  ) : null}
                  <th className="w-18 border border-gray-900 px-1.5 py-1 text-right">Stock In</th>
                  <th className="w-18 border border-gray-900 px-1.5 py-1 text-right">Stock Out</th>
                  <th className="w-22 border border-gray-900 px-1.5 py-1 text-right">
                    Current Stock
                  </th>
                  {isSlowMoving ? (
                    <>
                      <th className="w-24 border border-gray-900 px-1.5 py-1 text-center">
                        Last Movement
                      </th>
                      <th className="w-18 border border-gray-900 px-1.5 py-1 text-right">
                        Days Idle
                      </th>
                    </>
                  ) : null}
                  <th className="w-24 border border-gray-900 px-1.5 py-1 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length > 0 ? (
                  pageRows.map((row: any, index: number) => (
                    <tr key={row?.id ?? row?.product_id ?? index} className="avoid-break align-top">
                      <td className="border border-gray-900 px-1.5 py-1 text-center">
                        {startSerial + pageIndex * rowsPerPage + index}
                      </td>
                      <td className="border border-gray-900 px-1.5 py-1">
                        {display(row?.brand?.name ?? row?.brand)}
                      </td>
                      <td className="border border-gray-900 px-1.5 py-1">
                        {display(row?.category?.name ?? row?.category)}
                      </td>
                      <td className="border border-gray-900 px-1.5 py-1">
                        {display(row?.name)}
                      </td>
                      <td className="border border-gray-900 px-1.5 py-1">
                        {display(row?.unit?.name ?? row?.unit)}
                      </td>
                      {isLowStock ? (
                        <td className="border border-gray-900 px-1.5 py-1 text-right">
                          {formatQuantity(row?.order_level ?? 0)}
                        </td>
                      ) : null}
                      <td className="border border-gray-900 px-1.5 py-1 text-right">
                        {formatQuantity(row?.stock_in ?? 0)}
                      </td>
                      <td className="border border-gray-900 px-1.5 py-1 text-right">
                        {formatQuantity(row?.stock_out ?? 0)}
                      </td>
                      <td className="border border-gray-900 px-1.5 py-1 text-right font-semibold">
                        {formatQuantity(row?.current_stock ?? row?.balance ?? 0, isLowStock)}
                      </td>
                      {isSlowMoving ? (
                        <>
                          <td className="border border-gray-900 px-1.5 py-1 text-center">
                            {formatDate(row?.last_movement_date)}
                          </td>
                          <td className="border border-gray-900 px-1.5 py-1 text-right">
                            {formatQuantity(row?.days_without_movement ?? 0)}
                          </td>
                        </>
                      ) : null}
                      <td className="border border-gray-900 px-1.5 py-1 text-center">
                        {getStatusLabel(type, row)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={colSpan}
                      className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="mt-auto text-right text-xs">
              Page {pageIndex + 1} of {pages.length}
            </div>

            {pageIndex !== pages.length - 1 ? <div className="page-break" /> : null}
          </div>
        ))}

        <div className="mt-2 text-xs text-gray-900">* This document is system generated.</div>
      </div>
    );
  },
);

StockAlertPrint.displayName = 'StockAlertPrint';

export default StockAlertPrint;
