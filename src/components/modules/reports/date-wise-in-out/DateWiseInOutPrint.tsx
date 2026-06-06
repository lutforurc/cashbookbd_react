import React, { useMemo } from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import type { DateWiseInOutRow, InOutDetailRow } from './DateWiseInOut';
import { formatTransportationNumber } from '../../../utils/utils-functions/formatRoleName';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

type DateWiseInOutPrintProps = {
  rows: DateWiseInOutRow[];
  showProductColumn?: boolean;
  rowsPerPage: number;
  fontSize: number;
};

type DateWiseInOutDetailPrintProps = {
  detailDate: string;
  detailRows: {
    sales: InOutDetailRow[];
    purchase: InOutDetailRow[];
  };
  productName?: string;
  showProductColumn?: boolean;
  rowsPerPage: number;
  fontSize: number;
};

const chunkRows = <T,>(rows: T[], rowsPerPage: number): T[][] => {
  const perPage = Math.max(Number(rowsPerPage) || 12, 1);
  const pages: T[][] = [];

  for (let index = 0; index < rows.length; index += perPage) {
    pages.push(rows.slice(index, index + perPage));
  }

  return pages.length > 0 ? pages : [[]];
};

const formatNumber = (value: any, decimals = 0) => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue === 0) return '-';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericValue);
};

const signedVariance = (type: any, value: any) => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue === 0) return 0;
  return String(type || '').trim() === '-' ? -numericValue : numericValue;
};

const adjustedSalesTotal = (row: InOutDetailRow) => {
  const qty = Number(row?.out_qty || 0);
  const damage = Number(row?.damage || 0);
  const varianceType = String(row?.variance_type || '').trim();
  if (varianceType === '-') return qty + damage;
  if (varianceType === '+') return qty - damage;
  return qty;
};

const adjustedPurchaseTotal = (row: InOutDetailRow) =>
  Number(row?.in_qty || 0) + signedVariance(row?.variance_type, row?.over);

const getProductKey = (row: InOutDetailRow, fallbackProductName = '') => {
  const productId = String(row?.product_id || '').trim();
  if (productId) return `id:${productId}`;

  const productName = String(row?.product_name || fallbackProductName || 'Unknown Product').trim();
  return `name:${productName || 'Unknown Product'}`;
};

const getProductName = (row: InOutDetailRow, fallbackProductName = '') =>
  String(row?.product_name || fallbackProductName || 'Unknown Product').trim();

const getDetailTotals = (purchase: InOutDetailRow[], sales: InOutDetailRow[]) => {
  const totalOutQty = sales.reduce((sum, row) => sum + Number(row?.out_qty || 0), 0);
  const totalDamage = sales.reduce((sum, row) => sum + signedVariance(row?.variance_type, row?.damage), 0);
  const totalInQty = purchase.reduce((sum, row) => sum + Number(row?.in_qty || 0), 0);
  const totalOver = purchase.reduce((sum, row) => sum + signedVariance(row?.variance_type, row?.over), 0);

  return {
    totalOutQty,
    totalDamage,
    totalSales: sales.reduce((sum, row) => sum + adjustedSalesTotal(row), 0),
    totalInQty,
    totalOver,
    totalPurchase: purchase.reduce((sum, row) => sum + adjustedPurchaseTotal(row), 0),
  };
};

export const DateWiseInOutPrint = React.forwardRef<HTMLDivElement, DateWiseInOutPrintProps>(
  ({ rows, showProductColumn = false, rowsPerPage, fontSize }, ref) => {
    const printPages = useMemo(() => chunkRows(rows, rowsPerPage), [rows, rowsPerPage]);
    const headers = [
      'Sl. No.',
      'Date',
      ...(showProductColumn ? ['Product'] : []),
      'In Qty',
      'Out Qty',
      'Damage',
      'Over',
      'Balance',
    ];

    return (
      <div ref={ref} className="p-6 text-black" style={{ fontSize }}>
        {printPages.map((pageRows, index) => (
          <div
            key={index}
            style={{
              pageBreakAfter: index === printPages.length - 1 ? 'auto' : 'always',
            }}
          >
            <PadPrinting />

            <h1 className="mb-3 text-center text-xl font-bold">Date Wise In Out</h1>

            <table className="w-full border-collapse" style={{ fontSize }}>
              <thead>
                <tr>
                  {headers.map((label, headerIndex) => (
                    <th
                      key={label}
                      className={`border border-black px-2 py-1 font-semibold ${
                        label === 'Product' ? 'text-left' : headerIndex > (showProductColumn ? 2 : 1) ? 'text-right' : 'text-center'
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length > 0 ? (
                  pageRows.map((row, rowIndex) => (
                    <tr key={`${row.vr_date}-${rowIndex}`}>
                      <td className="border border-black px-2 py-1 text-center">{row.sl_no || rowIndex + 1}</td>
                      <td className="border border-black px-2 py-1 text-center">{row.vr_date || '-'}</td>
                      {showProductColumn ? (
                        <td className="border border-black px-2 py-1 text-left">{row.product_name || '-'}</td>
                      ) : null}
                      <td className="border border-black px-2 py-1 text-right">{row.in_qty || '-'}</td>
                      <td className="border border-black px-2 py-1 text-right">{row.out_qty || '-'}</td>
                      <td className="border border-black px-2 py-1 text-right">{row.damage || '-'}</td>
                      <td className="border border-black px-2 py-1 text-right">{row.over || '-'}</td>
                      <td
                        className={`border border-black px-2 py-1 text-right ${
                          row.stockTone === 'negative'
                            ? 'font-bold text-red-700'
                            : row.stockTone === 'positive'
                              ? 'font-bold text-green-700'
                              : ''
                        }`}
                      >
                        { thousandSeparator ( Number(row.stock)) || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="border border-black px-2 py-3 text-center" colSpan={headers.length}>
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  },
);

DateWiseInOutPrint.displayName = 'DateWiseInOutPrint';

export const DateWiseInOutDetailPrint = React.forwardRef<HTMLDivElement, DateWiseInOutDetailPrintProps>(
  ({ detailDate, detailRows, productName, showProductColumn = false, rowsPerPage, fontSize }, ref) => {
    const productPages = useMemo(() => {
      const perPage = Math.max(Number(rowsPerPage) || 12, 1);
      const groups = new Map<string, { productName: string; purchase: InOutDetailRow[]; sales: InOutDetailRow[] }>();
      const fallbackProductName = productName && productName !== 'All Products' ? productName : '';

      const addRow = (row: InOutDetailRow, type: 'purchase' | 'sales') => {
        const key = showProductColumn ? getProductKey(row, fallbackProductName) : 'selected-product';
        const resolvedProductName = showProductColumn ? getProductName(row, fallbackProductName) : productName || fallbackProductName || 'Selected Product';
        const group = groups.get(key) || { productName: resolvedProductName, purchase: [], sales: [] };
        group[type].push(row);
        groups.set(key, group);
      };

      detailRows.purchase.forEach((row) => addRow(row, 'purchase'));
      detailRows.sales.forEach((row) => addRow(row, 'sales'));

      if (groups.size === 0) {
        groups.set('empty', {
          productName: productName || 'All Products',
          purchase: [],
          sales: [],
        });
      }

      return Array.from(groups.values()).flatMap((group, productIndex) => {
        const maxRows = Math.max(group.purchase.length, group.sales.length);
        const pageCount = Math.max(Math.ceil(maxRows / perPage), 1);

        return Array.from({ length: pageCount }, (_, pageIndex) => {
          const start = pageIndex * perPage;
          const end = start + perPage;
          const isLastProductPage = pageIndex === pageCount - 1;

          return {
            productName: group.productName,
            purchase: group.purchase.slice(start, end),
            sales: group.sales.slice(start, end),
            totals: getDetailTotals(group.purchase, group.sales),
            isLastProductPage,
            isLastPage: productIndex === groups.size - 1 && isLastProductPage,
            start,
          };
        });
      });
    }, [detailRows.purchase, detailRows.sales, productName, rowsPerPage, showProductColumn]);

    const headers = ['Sl. No.', 'Inv No', 'Inv Dt', 'Vehicle No', 'Weight', 'Variance', 'Total', 'Rate'];

    return (
      <div ref={ref} className="p-5 text-black" style={{ fontSize }}>
        <style>
          {'@page { size: landscape; margin: 10mm; }'}
        </style>
        {productPages.map((page, pageIndex) => (
          <div
            key={pageIndex}
            style={{
              pageBreakAfter: page.isLastPage ? 'auto' : 'always',
            }}
          >
            <PadPrinting />
            <h1 className="text-center text-xl font-bold">Date Wise In Out</h1>
            <div className="flex justify-center gap-6">
              <span><strong>Date:</strong> {detailDate || '-'}</span>
              {showProductColumn ? <span><strong>Product Group:</strong> All Products</span> : <span><strong>Product:</strong> {productName || '-'}</span>}
            </div>

            <h2 className="my-1 border-y border-black py-0.5 text-center text-sm font-bold">{page.productName || '-'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <h2 className="mb-1 text-center text-sm font-semibold">Purchase</h2>
                <table className="w-full border-collapse" style={{ fontSize }}>
                  <thead>
                    <tr>
                      {headers.map((label) => (
                        <th key={label} className="border border-black px-1 py-1 text-center">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.purchase.length > 0 ? (
                      page.purchase.map((row, index) => (
                        <tr key={`${row.vr_no || index}-purchase-${pageIndex}`}>
                          <td className="border border-black px-1 py-1 text-center">{page.start + index + 1}</td>
                          <td className="border border-black px-1 py-1 text-center">{row.vr_no || '-'}</td>
                          <td className="border border-black px-1 py-1 text-center">{detailDate || '-'}</td>
                          <td className="border border-black px-1 py-1 text-center">{formatTransportationNumber(row.vehicle_no) || '-'}</td>
                          <td className="border border-black px-1 py-1 text-right">{formatNumber(row.in_qty)}</td>
                          <td className="border border-black px-1 py-1 text-right">
                            {row.variance_type || ''}{formatNumber(row.over)}
                          </td>
                          <td className="border border-black px-1 py-1 text-right">{formatNumber(adjustedPurchaseTotal(row))}</td>
                          <td className="border border-black px-1 py-1 text-right">{formatNumber(row.rate, 2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="border border-black px-1 py-2 text-center" colSpan={headers.length}>No purchase data</td>
                      </tr>
                    )}
                    {page.isLastProductPage ? (
                      <tr>
                        <td className="border border-black px-1 py-1 text-right font-semibold" colSpan={4}>Total</td>
                        <td className="border border-black px-1 py-1 text-right font-semibold">{formatNumber(page.totals.totalInQty)}</td>
                        <td className="border border-black px-1 py-1 text-right font-semibold">{formatNumber(page.totals.totalOver)}</td>
                        <td className="border border-black px-1 py-1 text-right font-semibold">{formatNumber(page.totals.totalPurchase)}</td>
                        <td className="border border-black px-1 py-1" />
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div>
                <h2 className="mb-1 text-center text-sm font-semibold">Sales</h2>
                <table className="w-full border-collapse" style={{ fontSize }}>
                  <thead>
                    <tr>
                      {headers.map((label) => (
                        <th key={label} className="border border-black px-1 py-1 text-center">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.sales.length > 0 ? (
                      page.sales.map((row, index) => (
                        <tr key={`${row.vr_no || index}-sales-${pageIndex}`}>
                          <td className="border border-black px-1 py-1 text-center">{page.start + index + 1}</td>
                          <td className="border border-black px-1 py-1 text-center">{row.vr_no || '-'}</td>
                          <td className="border border-black px-1 py-1 text-center">{detailDate || '-'}</td>
                          <td className="border border-black px-1 py-1 text-center">{ formatTransportationNumber(row.vehicle_no) || '-'}</td>
                          <td className="border border-black px-1 py-1 text-right">{formatNumber(row.out_qty)}</td>
                          <td className="border border-black px-1 py-1 text-right">
                            {row.variance_type || ''} {formatNumber(row.damage)}
                          </td>
                          <td className="border border-black px-1 py-1 text-right">{formatNumber(adjustedSalesTotal(row))}</td>
                          <td className="border border-black px-1 py-1 text-right">{formatNumber(row.rate, 2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="border border-black px-1 py-2 text-center" colSpan={headers.length}>No sales data</td>
                      </tr>
                    )}
                    {page.isLastProductPage ? (
                      <tr>
                        <td className="border border-black px-1 py-1 text-right font-semibold" colSpan={4}>Total</td>
                        <td className="border border-black px-1 py-1 text-right font-semibold">{formatNumber(page.totals.totalOutQty)}</td>
                        <td className="border border-black px-1 py-1 text-right font-semibold">{formatNumber(page.totals.totalDamage)}</td>
                        <td className="border border-black px-1 py-1 text-right font-semibold">{formatNumber(page.totals.totalSales)}</td>
                        <td className="border border-black px-1 py-1" />
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  },
);

DateWiseInOutDetailPrint.displayName = 'DateWiseInOutDetailPrint';
