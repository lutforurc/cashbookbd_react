import React, { useMemo } from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { humanizeEnumText } from '../../../utils/hooks/humanizeEnumText';

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
  | { __type: 'BRAND_HEADER'; brand_name: string }
  | { __type: 'CAT_HEADER'; brand_name: string; cat_name: string }
  | { __type: 'CAT_TOTAL'; brand_name: string; cat_name: string; opening: number; stock_in: number; stock_out: number; balance: number }
  | { __type: 'BRAND_TOTAL'; brand_name: string; opening: number; stock_in: number; stock_out: number; balance: number }
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

      // ✅ Sort by Brand -> Category -> Product
      const sorted = [...rowsArr].sort((a, b) => {
        const b1 = String(a.brand_name || '').localeCompare(String(b.brand_name || ''));
        if (b1 !== 0) return b1;

        const c1 = String(a.cat_name || '').localeCompare(String(b.cat_name || ''));
        if (c1 !== 0) return c1;

        return String(a.product_name || '').localeCompare(String(b.product_name || ''));
      });

      // ✅ Group by Brand
      const brandMap = new Map<string, StockRow[]>();
      for (const r of sorted) {
        const brandKey = (r.brand_name || 'Unknown Brand').trim() || 'Unknown Brand';
        if (!brandMap.has(brandKey)) brandMap.set(brandKey, []);
        brandMap.get(brandKey)!.push(r);
      }

      const out: PrintRow[] = [];

      // ✅ grand totals
      let gOpening = 0;
      let gIn = 0;
      let gOut = 0;
      let gBal = 0;

      for (const [brand, brandItems] of brandMap.entries()) {
        out.push({ __type: 'BRAND_HEADER', brand_name: brand });

        // ✅ group inside brand by Category
        const catMap = new Map<string, StockRow[]>();
        for (const it of brandItems) {
          const catKey = (it.cat_name || 'Uncategorized').trim() || 'Uncategorized';
          if (!catMap.has(catKey)) catMap.set(catKey, []);
          catMap.get(catKey)!.push(it);
        }

        let bOpening = 0;
        let bIn = 0;
        let bOut = 0;
        let bBal = 0;

        for (const [cat, items] of catMap.entries()) {
          out.push({ __type: 'CAT_HEADER', brand_name: brand, cat_name: cat });

          // ✅ serial reset per category (inside brand)
          let serial = 1;

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
              sl_number: serial++, // ✅ override
              balance,
            });
          }

          out.push({
            __type: 'CAT_TOTAL',
            brand_name: brand,
            cat_name: cat,
            opening: tOpening,
            stock_in: tIn,
            stock_out: tOut,
            balance: tBal,
          });

          // ✅ add into brand total
          bOpening += tOpening;
          bIn += tIn;
          bOut += tOut;
          bBal += tBal;
        }

        // ✅ brand total
        out.push({
          __type: 'BRAND_TOTAL',
          brand_name: brand,
          opening: bOpening,
          stock_in: bIn,
          stock_out: bOut,
          balance: bBal,
        });

        // ✅ add into grand total
        gOpening += bOpening;
        gIn += bIn;
        gOut += bOut;
        gBal += bBal;
      }

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
                  <span className="font-semibold">Report Date:</span> {startDate || '-'} — {endDate || '-'}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 w-8 text-center">
                      #
                    </th>
                    <th style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-left">
                      Product Name
                    </th>
                    <th style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 w-26 text-right">
                      Opening
                    </th>
                    <th style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 w-26 text-right">
                      Stock In
                    </th>
                    <th style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 w-26 text-right">
                      Stock Out
                    </th>
                    <th style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 w-26 text-right">
                      Balance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length ? (
                    pageRows.map((row, idx) => {
                      if (row.__type === 'BRAND_HEADER') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td colSpan={6} style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 font-bold bg-gray-50">
                              {(row.brand_name)}
                            </td>
                          </tr>
                        );
                      }

                      if (row.__type === 'CAT_HEADER') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td colSpan={6} style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 font-semibold bg-white">
                              <span className="font-semibold">{(row.brand_name)}</span>
                              <span className="mx-1 text-gray-900">→</span>
                              <span>{(row.cat_name)}</span>
                            </td>
                          </tr>
                        );
                      }

                      if (row.__type === 'CAT_TOTAL') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-center"></td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 font-semibold text-right">
                              Subtotal
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-semibold">
                              {thousandSeparator(Number(row.opening), 0)}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-semibold">
                              {thousandSeparator(Number(row.stock_in), 0)}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-semibold">
                              {thousandSeparator(Number(row.stock_out), 0)}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-semibold">
                              {thousandSeparator(Number(row.balance), 0)}
                            </td>
                          </tr>
                        );
                      }

                      if (row.__type === 'BRAND_TOTAL') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-center"></td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 font-bold text-right bg-gray-50">
                              Brand Total
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.opening), 0)}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.stock_in), 0)}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.stock_out), 0)}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.balance), 0)}
                            </td>
                          </tr>
                        );
                      }

                      if (row.__type === 'GRAND_TOTAL') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-center"></td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 font-bold text-right bg-gray-50">
                              Grand Total
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.opening), 0)}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.stock_in), 0)}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.stock_out), 0)}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.balance), 0)}
                            </td>
                          </tr>
                        );
                      }

                      // ✅ ITEM row
                      return (
                        <tr key={idx} className="avoid-break align-top">
                          <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-center">
                            {row?.sl_number || ''}
                          </td>

                          <td
                            style={{ fontSize: fs, borderWidth: '0.5px', verticalAlign: 'middle' }}
                            className="border border-gray-500 px-2 py-0 align-middle"
                          >
                            <span className="text-xs text-gray-900 leading-tight">
                              {(row.product_name) || ''}
                            </span>
                          </td>

                          <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right">
                            {Number(row?.opening) > 0 ? (
                              <span className="text-sm">
                                {thousandSeparator(Number(row.opening), 0)} {row.unit ? `(${row.unit})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right">
                            {Number(row?.stock_in) > 0 ? (
                              <span className="text-sm">
                                {thousandSeparator(Number(row.stock_in), 0)} {row.unit ? `(${row.unit})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right">
                            {Number(row?.stock_out) > 0 ? (
                              <span className="text-sm">
                                {thousandSeparator(Number(row.stock_out), 0)} {row.unit ? `(${row.unit})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right">
                            {Number(row?.balance) !== 0 ? (
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
                      <td colSpan={6} className="border border-gray-500 px-3 py-6 text-center text-gray-900">
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