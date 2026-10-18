import React from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

export type ProductStatementPrintRow = {
  sl?: number | string;
  product_name?: string;
  type?: string;
  invoice_no?: string | null;
  invoice_date?: string | null;
  qty?: number | string | null;
  purchase_price?: number | string | null;
  sales_price?: number | string | null;
  amount?: number | string | null;
  stock?: number | string | null;
};

type Props = {
  rows: ProductStatementPrintRow[];
  totals?: { in_qty?: number; out_qty?: number; closing?: number } | null;
  branchName?: string;
  productName?: string;
  startDate?: string;
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const toNumber = (value: any) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const formatQty = (value: any) => {
  if (value === null || value === undefined || value === '') return '-';
  const numericValue = toNumber(value);
  if (numericValue === 0) return '-';

  return numericValue.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    useGrouping: true,
  });
};

const formatDate = (value: any) => {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(value);
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }
  return out;
};

const ProductStatementPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      totals,
      branchName,
      productName,
      startDate,
      endDate,
      title = 'Product Statement',
      rowsPerPage = 0,
      fontSize,
    },
    ref,
  ) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const fs = Number.isFinite(fontSize) ? Number(fontSize) : 10;

    const pages = chunkRows(safeRows, rowsPerPage);
    const netQty = safeRows.reduce((sum, row) => sum + toNumber(row?.qty), 0);
    const totalAmount = safeRows.reduce((sum, row) => sum + toNumber(row?.amount), 0);

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
                <span className="font-semibold">Product:</span> {productName || 'All Products'}
              </div>
              <div className="mt-1 text-xs">
                <span className="font-semibold">Report Date:</span> {startDate || '-'} - {endDate || '-'}
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  {['#', 'NAME', 'TYPE', 'INV. NO.', 'INV. DATE', 'QTY', 'PUR PRICE', 'SAL PRICE', 'AMOUNT', 'STOCK'].map(
                    (header, index) => (
                      <th
                        key={header}
                        style={{ fontSize: fs }}
                        className={`border border-gray-900 px-2 py-2 ${
                          index >= 5 ? 'text-right' : index <= 1 ? 'text-left' : 'text-center'
                        }`}
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {pageRows.length ? (
                  pageRows.map((row, idx) => (
                    <tr key={`${row?.invoice_no || 'row'}-${row?.sl ?? idx}`} className="avoid-break">
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                        {row?.sl ?? '-'}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                        {row?.product_name || '-'}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                        {row?.type || '-'}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                        {row?.invoice_no || (row?.type === 'Opening' ? 'Opening' : '')}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                        {formatDate(row?.invoice_date)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {formatQty(row?.qty)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        { thousandSeparator( Number(row?.purchase_price) )}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator( Number(row?.sales_price) )}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        { thousandSeparator( Number(row?.amount) )}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator( Number(row?.stock) )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="border border-gray-900 px-3 py-6 text-center text-gray-500">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>

              {pageIndex === pages.length - 1 ? (
                <tfoot>
                  <tr>
                    <td
                      colSpan={5}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      Total
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      {formatQty(netQty)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right font-bold">
                      -
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right font-bold">
                      -
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      {totalAmount ? thousandSeparator(totalAmount) : '-'}
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      {formatQty(totals?.closing)}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>

            <PrintFooter page={pageIndex + 1} total={pages.length} fontSize={fs} />

            {pageIndex !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  },
);

ProductStatementPrint.displayName = 'ProductStatementPrint';

export default ProductStatementPrint;
