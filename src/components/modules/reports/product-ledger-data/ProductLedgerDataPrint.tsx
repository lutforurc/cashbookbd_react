import React from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

export type ProductLedgerPrintRow = {
  id?: number | string;
  sl?: number;
  label?: string;
  invoice_no?: string;
  invoice?: string;
  vr_no?: string;
  vr_date?: string;
  date?: string;
  trx_date?: string;
  opening?: number | string | null;
  opening_qty?: number | string | null;
  purchase?: number | string | null;
  purchase_qty?: number | string | null;
  sales_return?: number | string | null;
  salesReturn?: number | string | null;
  sale_return?: number | string | null;
  sales?: number | string | null;
  sale?: number | string | null;
  sales_qty?: number | string | null;
  purchase_return?: number | string | null;
  purchaseReturn?: number | string | null;
  stock?: number | string | null;
  balance?: number | string | null;
  closing_stock?: number | string | null;
};

type Props = {
  rows: ProductLedgerPrintRow[];
  branchName?: string;
  ledgerName?: string;
  startDate?: string;
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const getValue = (row: ProductLedgerPrintRow, keys: string[], fallback: any = '-') => {
  for (const key of keys) {
    const value = (row as any)?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return fallback;
};

const toNumber = (value: any) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const formatQty = (value: any) => {
  if (value === null || value === undefined || value === '') return '-';
  return thousandSeparator(toNumber(value));
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }
  return out;
};

const ProductLedgerDataPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      branchName,
      ledgerName,
      startDate,
      endDate,
      title = 'Product In Out',
      rowsPerPage = 12,
      fontSize,
    },
    ref,
  ) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const fs = Number.isFinite(fontSize) ? Number(fontSize) : 10;

    const openingRow = safeRows.find((row) => row?.label === 'Opening') ?? null;
    let runningStock = toNumber(getValue(openingRow || {}, ['stock', 'balance', 'opening', 'opening_qty'], 0));

    const detailRows = safeRows
      .filter((row) => row?.label !== 'Opening' && row?.label !== 'Total')
      .map((row, index) => {
        const purchase = toNumber(getValue(row, ['purchase', 'purchase_qty'], 0));
        const salesReturn = toNumber(getValue(row, ['sales_return', 'salesReturn', 'sale_return'], 0));
        const sales = toNumber(getValue(row, ['sales', 'sale', 'sales_qty'], 0));
        const purchaseReturn = toNumber(getValue(row, ['purchase_return', 'purchaseReturn'], 0));

        runningStock += purchase + salesReturn - sales - purchaseReturn;

        return {
          ...row,
          sl: row?.sl ?? index + 1,
          running_stock: runningStock,
        };
      });

    const printableRows: any[] = [
      {
        rowType: 'opening',
        sl: '-',
        invoice_no: 'Opening',
        vr_date: '',
        opening: getValue(openingRow || {}, ['opening', 'opening_qty'], '-'),
        purchase: '-',
        sales_return: '-',
        sales: '-',
        purchase_return: '-',
        stock: getValue(openingRow || {}, ['stock', 'balance', 'opening', 'opening_qty'], '-'),
      },
      ...detailRows.map((row) => ({
        rowType: 'detail',
        sl: row.sl,
        invoice_no: getValue(row, ['invoice_no', 'invoice', 'vr_no', 'label'], '-'),
        vr_date: getValue(row, ['vr_date', 'date', 'trx_date'], '-'),
        opening: '-',
        purchase: getValue(row, ['purchase', 'purchase_qty'], '-'),
        sales_return: getValue(row, ['sales_return', 'salesReturn', 'sale_return'], '-'),
        sales: getValue(row, ['sales', 'sale', 'sales_qty'], '-'),
        purchase_return: getValue(row, ['purchase_return', 'purchaseReturn'], '-'),
        stock: row.running_stock,
      })),
    ];

    const pages = chunkRows(printableRows, rowsPerPage);
    const summary = {
      totalPurchase: detailRows.reduce((sum, row) => sum + toNumber(getValue(row, ['purchase', 'purchase_qty'], 0)), 0),
      totalSalesReturn: detailRows.reduce((sum, row) => sum + toNumber(getValue(row, ['sales_return', 'salesReturn', 'sale_return'], 0)), 0),
      totalSales: detailRows.reduce((sum, row) => sum + toNumber(getValue(row, ['sales', 'sale', 'sales_qty'], 0)), 0),
      totalPurchaseReturn: detailRows.reduce((sum, row) => sum + toNumber(getValue(row, ['purchase_return', 'purchaseReturn'], 0)), 0),
    };

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pageIndex) => (
          <div key={pageIndex} className="print-page">
            <PadPrinting />

            <div className="mb-4">
              <h1 className="text-center text-2xl font-bold">{title}</h1>
              <div className="mt-1 text-xs">
                <span className="font-semibold">Branch:</span> {branchName || '-'}
              </div>
              <div className="mt-1 text-xs">
                <span className="font-semibold">Item / Product:</span> {ledgerName || '-'}
              </div>
              <div className="mt-1 text-xs">
                <span className="font-semibold">Report Date:</span> {startDate || '-'} - {endDate || '-'}
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-center">
                    SL. NO.
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-left">
                    INVOICE NO.
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-center">
                    VR. DATE
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                    OPENING
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                    PURCHASE
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                    SALES RETURN
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                    SALES
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                    PURCHASE RETURN
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                    STOCK
                  </th>
                </tr>
              </thead>

              <tbody>
                {pageRows.length ? (
                  pageRows.map((row, idx) => (
                    <tr key={`${row.invoice_no || 'row'}-${idx}`} className="avoid-break">
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                        {row?.sl ?? '-'}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                        {row?.invoice_no || '-'}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                        {row?.vr_date || ''}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {formatQty(row?.opening)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {formatQty(row?.purchase)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {formatQty(row?.sales_return)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {formatQty(row?.sales)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {formatQty(row?.purchase_return)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {formatQty(row?.stock)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="border border-gray-900 px-3 py-6 text-center text-gray-500">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>

              {pageIndex === pages.length - 1 ? (
                <tfoot>
                  <tr>
                    <td
                      colSpan={3}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      Total
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      -
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      {summary.totalPurchase > 0 ? thousandSeparator(summary.totalPurchase) : '-'}
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      {summary.totalSalesReturn > 0 ? thousandSeparator(summary.totalSalesReturn) : '-'}
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      {summary.totalSales > 0 ? thousandSeparator(summary.totalSales) : '-'}
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      {summary.totalPurchaseReturn > 0 ? thousandSeparator(summary.totalPurchaseReturn) : '-'}
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      -
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>

            <div style={{ fontSize: fs }} className="mt-3 text-right text-xs">
              Page {pageIndex + 1} of {pages.length}
            </div>

            {pageIndex !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  },
);

ProductLedgerDataPrint.displayName = 'ProductLedgerDataPrint';

export default ProductLedgerDataPrint;
