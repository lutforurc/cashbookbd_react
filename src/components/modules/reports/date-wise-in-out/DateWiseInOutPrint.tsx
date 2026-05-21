import React, { useMemo } from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import type { DateWiseInOutRow, InOutDetailRow } from './DateWiseInOut';
import { formatTransportationNumber } from '../../../utils/utils-functions/formatRoleName';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

type DateWiseInOutPrintProps = {
  rows: DateWiseInOutRow[];
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

export const DateWiseInOutPrint = React.forwardRef<HTMLDivElement, DateWiseInOutPrintProps>(
  ({ rows, rowsPerPage, fontSize }, ref) => {
    const printPages = useMemo(() => chunkRows(rows, rowsPerPage), [rows, rowsPerPage]);
    const headers = ['Sl. No.', 'Date', 'In Qty', 'Out Qty', 'Damage', 'Over', 'Balance'];

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
                        headerIndex > 1 ? 'text-right' : 'text-center'
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
  ({ detailDate, detailRows, productName, rowsPerPage, fontSize }, ref) => {
    const detailPrintPages = useMemo(() => {
      const perPage = Math.max(Number(rowsPerPage) || 12, 1);
      const maxRows = Math.max(detailRows.purchase.length, detailRows.sales.length);
      const pageCount = Math.max(Math.ceil(maxRows / perPage), 1);

      return Array.from({ length: pageCount }, (_, pageIndex) => {
        const start = pageIndex * perPage;
        const end = start + perPage;

        return {
          purchase: detailRows.purchase.slice(start, end),
          sales: detailRows.sales.slice(start, end),
          isLastPage: pageIndex === pageCount - 1,
          start,
        };
      });
    }, [detailRows.purchase, detailRows.sales, rowsPerPage]);

    const detailTotals = useMemo(() => {
      const totalOutQty = detailRows.sales.reduce((sum, row) => sum + Number(row?.out_qty || 0), 0);
      const totalDamage = detailRows.sales.reduce((sum, row) => sum + signedVariance(row?.variance_type, row?.damage), 0);
      const totalInQty = detailRows.purchase.reduce((sum, row) => sum + Number(row?.in_qty || 0), 0);
      const totalOver = detailRows.purchase.reduce((sum, row) => sum + signedVariance(row?.variance_type, row?.over), 0);

      return {
        totalOutQty,
        totalDamage,
        totalSales: detailRows.sales.reduce((sum, row) => sum + adjustedSalesTotal(row), 0),
        totalInQty,
        totalOver,
        totalPurchase: detailRows.purchase.reduce((sum, row) => sum + adjustedPurchaseTotal(row), 0),
      };
    }, [detailRows]);

    return (
      <div ref={ref} className="p-5 text-black" style={{ fontSize }}>
        <style>
          {'@page { size: landscape; margin: 10mm; }'}
        </style>
        {detailPrintPages.map((page, pageIndex) => (
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
              <span><strong>Product:</strong> {productName || '-'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <h2 className="mb-2 text-center text-lg font-semibold">Purchase</h2>
                <table className="w-full border-collapse" style={{ fontSize }}>
                  <thead>
                    <tr>
                      {['Sl. No.', 'Inv No', 'Inv Dt', 'Vehicle No', 'Weight', 'Variance', 'Total', 'Rate'].map((label) => (
                        <th key={label} className="border border-black px-1 py-1 text-center">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.purchase.map((row, index) => (
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
                    ))}
                    {page.isLastPage ? (
                      <tr>
                        <td className="border border-black px-1 py-1 text-right font-semibold" colSpan={4}>Total</td>
                        <td className="border border-black px-1 py-1 text-right font-semibold">{formatNumber(detailTotals.totalInQty)}</td>
                        <td className="border border-black px-1 py-1 text-right font-semibold">{formatNumber(detailTotals.totalOver)}</td>
                        <td className="border border-black px-1 py-1 text-right font-semibold">{formatNumber(detailTotals.totalPurchase)}</td>
                        <td className="border border-black px-1 py-1" />
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div>
                <h2 className="mb-2 text-center text-lg font-semibold">Sales</h2>
                <table className="w-full border-collapse" style={{ fontSize }}>
                  <thead>
                    <tr>
                      {['Sl. No.', 'Inv No', 'Inv Dt', 'Vehicle No', 'Weight', 'Variance', 'Total', 'Rate'].map((label) => (
                        <th key={label} className="border border-black px-1 py-1 text-center">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.sales.map((row, index) => (
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
                    ))}
                    {page.isLastPage ? (
                      <tr>
                        <td className="border border-black px-1 py-1 text-right font-semibold" colSpan={4}>Total</td>
                        <td className="border border-black px-1 py-1 text-right font-semibold">{formatNumber(detailTotals.totalOutQty)}</td>
                        <td className="border border-black px-1 py-1 text-right font-semibold">{formatNumber(detailTotals.totalDamage)}</td>
                        <td className="border border-black px-1 py-1 text-right font-semibold">{formatNumber(detailTotals.totalSales)}</td>
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
