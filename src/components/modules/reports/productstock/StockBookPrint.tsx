import React, { useMemo } from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

type StockRow = {
  sl_number?: number | string;
  brand_name?: string;
  cat_name?: string;
  product_name?: string;
  opening?: number;
  stock_in?: number;
  stock_out?: number;
  balance?: number;
  unit?: string;
};

type Props = {
  rows: StockRow[];
  startDate?: string;
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

type PrintRow =
  | { __type: 'CAT_HEADER'; cat_name: string }
  | { __type: 'CAT_TOTAL'; cat_name: string; opening: number; stock_in: number; stock_out: number; balance: number }
  | { __type: 'GRAND_TOTAL'; opening: number; stock_in: number; stock_out: number; balance: number }
  | ({ __type: 'ITEM' } & StockRow);

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

const StockBookPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ rows, startDate, endDate, title = 'Stock Report', rowsPerPage = 10, fontSize }, ref) => {
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 9;

    const printableRows: PrintRow[] = useMemo(() => {
      const rowsArr: StockRow[] = Array.isArray(rows) ? rows : [];

      const sorted = [...rowsArr].sort((a, b) => {
        const c1 = String(a.cat_name || '').localeCompare(String(b.cat_name || ''));
        if (c1 !== 0) return c1;
        return String(a.product_name || '').localeCompare(String(b.product_name || ''));
      });

      const map = new Map<string, StockRow[]>();
      for (const r of sorted) {
        const key = (r.cat_name || 'Uncategorized').trim() || 'Uncategorized';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      }

      const out: PrintRow[] = [];
      let serial = 1;

      // ✅ grand totals
      let gOpening = 0;
      let gIn = 0;
      let gOut = 0;
      let gBal = 0;

      for (const [cat, items] of map.entries()) {
        out.push({ __type: 'CAT_HEADER', cat_name: cat });

        let tOpening = 0;
        let tIn = 0;
        let tOut = 0;
        let tBal = 0;

        for (const it of items) {
          const opening = toNum(it.opening);
          const stockIn = toNum(it.stock_in);
          const stockOut = toNum(it.stock_out);
          const balance = it.balance != null ? toNum(it.balance) : opening + stockIn - stockOut;

          tOpening += opening;
          tIn += stockIn;
          tOut += stockOut;
          tBal += balance;

          out.push({
            __type: 'ITEM',
            ...it,
            sl_number: it.sl_number ?? serial++,
            balance,
          });
        }

        // ✅ category subtotal
        out.push({
          __type: 'CAT_TOTAL',
          cat_name: cat,
          opening: tOpening,
          stock_in: tIn,
          stock_out: tOut,
          balance: tBal,
        });

        // ✅ add into grand total
        gOpening += tOpening;
        gIn += tIn;
        gOut += tOut;
        gBal += tBal;
      }

      // ✅ add grand total at the end
      out.push({
        __type: 'GRAND_TOTAL',
        opening: gOpening,
        stock_in: gIn,
        stock_out: gOut,
        balance: gBal,
      });

      return out;
    }, [rows]);

    const pages = useMemo(() => chunkRows(printableRows, rowsPerPage), [printableRows, rowsPerPage]);

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />

            {/* Header */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-center">{title}</h1>
              <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                <div>
                  <span className="font-semibold">Report Date:</span>{' '}
                  {startDate || '-'} — {endDate || '-'}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-8 text-center">#</th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2">Product Name</th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-26 text-right">Opening</th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-26 text-right">Stock In</th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-26 text-right">Stock Out</th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 w-26 text-right">Balance</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length ? (
                    pageRows.map((row, idx) => {
                      if (row.__type === 'CAT_HEADER') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td colSpan={6} style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 font-semibold bg-gray-50">
                              Category: {row.cat_name}
                            </td>
                          </tr>
                        );
                      }

                      if (row.__type === 'CAT_TOTAL') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-center"></td>
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 font-semibold text-right">
                              Subtotal
                            </td>
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right font-semibold">
                              {thousandSeparator(Number(row.opening), 0)}
                            </td>
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right font-semibold">
                              {thousandSeparator(Number(row.stock_in), 0)}
                            </td>
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right font-semibold">
                              {thousandSeparator(Number(row.stock_out), 0)}
                            </td>
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right font-semibold">
                              {thousandSeparator(Number(row.balance), 0)}
                            </td>
                          </tr>
                        );
                      }

                      if (row.__type === 'GRAND_TOTAL') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-center"></td>
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 font-bold text-right bg-gray-100">
                              Grand Total
                            </td>
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right font-bold bg-gray-100">
                              {thousandSeparator(Number(row.opening), 0)}
                            </td>
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right font-bold bg-gray-100">
                              {thousandSeparator(Number(row.stock_in), 0)}
                            </td>
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right font-bold bg-gray-100">
                              {thousandSeparator(Number(row.stock_out), 0)}
                            </td>
                            <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right font-bold bg-gray-100">
                              {thousandSeparator(Number(row.balance), 0)}
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={idx} className="avoid-break align-top">
                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                            {row?.sl_number || ''}
                          </td>

                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                            <span className="block">
                              {row.brand_name && <span className="text-xs text-gray-900">{row.brand_name} </span>}
                              {row.product_name && <span className="text-xs text-gray-900">{row.product_name}</span>}
                            </span>
                          </td>

                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                            {Number(row?.opening) > 0 ? (
                              <span className="text-sm">
                                {thousandSeparator(Number(row.opening), 0)} {row.unit ? `(${row.unit})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                            {Number(row?.stock_in) > 0 ? (
                              <span className="text-sm">
                                {thousandSeparator(Number(row.stock_in), 0)} {row.unit ? `(${row.unit})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                            {Number(row?.stock_out) > 0 ? (
                              <span className="text-sm">
                                {thousandSeparator(Number(row.stock_out), 0)} {row.unit ? `(${row.unit})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                            {Number(row?.balance) !== 0 ? (  // balance 0 হলে "-"
                              <span className="text-sm">
                                {thousandSeparator(Number(row.balance), 0)} {row.unit ? `(${row.unit})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="border border-gray-900 px-3 py-6 text-center text-gray-500">
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

StockBookPrint.displayName = 'StockBookPrint';
export default StockBookPrint;
