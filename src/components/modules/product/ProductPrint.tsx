import React, { useMemo } from 'react';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

type ProductRow = {
  serial?: number | string;
  brand?: string;
  category?: string;
  name?: string;
  unit?: string;

  purchase?: number;
  sales?: number;

  openingbalance?: number;
  qty?: number;
  rate?: number;
  serial_no?: string;
};

type Props = {
  rows: ProductRow[];
  startDate?: string;
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;

  showPrice?: boolean;   // default true
  showOpening?: boolean; // default false
  showQtyRate?: boolean; // default false
};

// ✅ No Subtotal / Grand Total
type PrintRow =
  | { __type: 'CAT_HEADER'; category: string }
  | ({ __type: 'ITEM' } & ProductRow);

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (v: any) => {
  const n = toNum(v);
  return n > 0 ? thousandSeparator(n, 0) : '-';
};

const ProductPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      startDate,
      endDate,
      title = 'Product List',
      rowsPerPage = 12,
      fontSize,
      showPrice = true,
      showOpening = false,
      showQtyRate = false,
    },
    ref,
  ) => {
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 9;

    const printableRows: PrintRow[] = useMemo(() => {
      const rowsArr: ProductRow[] = Array.isArray(rows) ? rows : [];

      // ✅ sort: category first, then product name
      const sorted = [...rowsArr].sort((a, b) => {
        const c1 = String(a.category || '').localeCompare(String(b.category || ''));
        if (c1 !== 0) return c1;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });

      // ✅ group by category
      const map = new Map<string, ProductRow[]>();
      for (const r of sorted) {
        const key = (r.category || 'Uncategorized').trim() || 'Uncategorized';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      }

      const out: PrintRow[] = [];
      let serial = 1;

      for (const [cat, items] of map.entries()) {
        out.push({ __type: 'CAT_HEADER', category: cat });

        for (const it of items) {
          out.push({
            __type: 'ITEM',
            ...it,
            serial: it.serial ?? serial++,
          });
        }
      }

      return out;
    }, [rows]);

    const pages = useMemo(
      () => chunkRows(printableRows, rowsPerPage),
      [printableRows, rowsPerPage],
    );

    const colCount = useMemo(() => {
      let c = 4; // SL + Product + Category + Unit
      if (showQtyRate) c += 2; // Qty + Rate
      if (showOpening) c += 1; // Opening
      if (showPrice) c += 2; // Purchase + Sales
      return c;
    }, [showPrice, showOpening, showQtyRate]);

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />

            {/* Header */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-center">{title}</h1>
              {(startDate || endDate) && (
                <div className="mt-1 text-xs">
                  <span className="font-semibold">Report Date:</span>{' '}
                  {startDate || '-'} — {endDate || '-'}
                </div>
              )}
            </div>

            {/* Table */}
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 w-10 text-center"
                    >
                      SL
                    </th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2">
                      Product
                    </th>
                    <th
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 w-40"
                    >
                      Stock
                    </th>
                    <th
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 w-20"
                    >
                      Unit
                    </th>

                    {showQtyRate && (
                      <>
                        <th
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-2 w-20 text-right"
                        >
                          Qty
                        </th>
                        <th
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-2 w-24 text-right"
                        >
                          Rate
                        </th>
                      </>
                    )}

                    {showOpening && (
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-24 text-right"
                      >
                        Opening
                      </th>
                    )}

                    {showPrice && (
                      <>
                        <th
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-2 w-24 text-right"
                        >
                          P. Price
                        </th>
                        <th
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-2 w-24 text-right"
                        >
                          S. Price
                        </th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length ? (
                    pageRows.map((row, idx) => {
                      if (row.__type === 'CAT_HEADER') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td
                              colSpan={colCount}
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-2 font-semibold bg-gray-50"
                            >
                              Category: {row.category}
                            </td>
                          </tr>
                        );
                      }

                      // ITEM row
                      return (
                        <tr key={idx} className="avoid-break align-top">
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-center"
                          >
                            {row.serial ?? ''}
                          </td>

                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                            <span className="block">
                              {row.brand && (
                                <span className="text-xs text-gray-900">{row.brand} </span>
                              )}
                              {row.name && <span className="text-xs text-gray-900">{row.name}</span>}
                            </span>
                          </td>

                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                            {/* {row.category || '-'} */}
                          </td>

                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                            {row.unit || '-'}
                          </td>

                          {showQtyRate && (
                            <>
                              <td
                                style={{ fontSize: fs }}
                                className="border border-gray-900 px-2 py-1 text-right"
                              >
                                {toNum(row.qty) > 0 ? thousandSeparator(toNum(row.qty), 0) : '-'}
                              </td>
                              <td
                                style={{ fontSize: fs }}
                                className="border border-gray-900 px-2 py-1 text-right"
                              >
                                {toNum(row.rate) > 0 ? thousandSeparator(toNum(row.rate), 0) : '-'}
                              </td>
                            </>
                          )}

                          {showOpening && (
                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-right"
                            >
                              {toNum(row.openingbalance) > 0
                                ? thousandSeparator(toNum(row.openingbalance), 0)
                                : '-'}
                            </td>
                          )}

                          {showPrice && (
                            <>
                              <td
                                style={{ fontSize: fs }}
                                className="border border-gray-900 px-2 py-1 text-right"
                              >
                                {formatMoney(row.purchase)}
                              </td>
                              <td
                                style={{ fontSize: fs }}
                                className="border border-gray-900 px-2 py-1 text-right"
                              >
                                {formatMoney(row.sales)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={colCount}
                        className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: fs }} className="mt-auto text-right text-xs">
              Page {pIdx + 1} of {pages.length}
            </div>

            {pIdx !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}

        <div className="mt-2 text-xs text-gray-900">* This document is system generated.</div>
      </div>
    );
  },
);

ProductPrint.displayName = 'ProductPrint';
export default ProductPrint;
