import React, { forwardRef, useMemo } from "react";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";

const fmtNum = (n: any, dec = 0) => thousandSeparator(Number(n || 0), dec);
const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtQtyDash = (qty: any, unit?: string) => {
  const q = toNum(qty);
  if (!q) return "-";
  return `${fmtNum(q, 0)} (${unit || "Nos"})`;
};

type RowAny = Record<string, any>;

type Props = {
  report: any; // closing stock / item details api response
  title?: string;
  startDate?: string;
  endDate?: string;
  fontSize?: number; // px
};

type Grouped = {
  brand: string;
  categories: {
    category: string;
    rows: RowAny[];
  }[];
};

const ItemDetailsPrint = forwardRef<HTMLDivElement, Props>(
  ({ report, title = "Item Details", startDate = "-", endDate = "-", fontSize }, ref) => {
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 11;
    const cellPy = fs <= 11 ? "py-[0.5px]" : fs <= 15 ? "py-[.9px]" : "py-1";

    // ✅ rows extract (report.items / report.data / report.rows / array)
    const rows: RowAny[] = useMemo(() => {
      if (Array.isArray(report)) return report;
      if (Array.isArray(report?.items)) return report.items;
      if (Array.isArray(report?.data)) return report.data;
      if (Array.isArray(report?.rows)) return report.rows;
      return [];
    }, [report]);

    // ✅ grouping: Brand -> Category
    const grouped: Grouped[] = useMemo(() => {
      const map = new Map<string, Map<string, RowAny[]>>();

      rows.forEach((r) => {
        const brand =
          r?.brand_name ||
          r?.brand?.name ||
          r?.brand ||
          "Unknown Brand";

        const category =
          r?.category_name ||
          r?.category?.name ||
          r?.category ||
          "Uncategorized";

        if (!map.has(brand)) map.set(brand, new Map());
        const catMap = map.get(brand)!;
        if (!catMap.has(category)) catMap.set(category, []);
        catMap.get(category)!.push(r);
      });

      return Array.from(map.entries()).map(([brand, catMap]) => ({
        brand,
        categories: Array.from(catMap.entries()).map(([category, rows]) => ({
          category,
          rows,
        })),
      }));
    }, [rows]);

    // ✅ helpers to read fields safely
    const getProductName = (r: RowAny) =>
      r?.product_name || r?.name || r?.item_name || r?.item?.name || "-";

    const getUnitName = (r: RowAny) =>
      r?.unit_name || r?.unit?.name || r?.unit || "Nos";

    const getOpening = (r: RowAny) =>
      r?.opening ?? r?.opening_qty ?? r?.op_qty ?? 0;

    const getStockIn = (r: RowAny) =>
      r?.stock_in ?? r?.in_qty ?? r?.stockin ?? r?.qty_in ?? 0;

    const getStockOut = (r: RowAny) =>
      r?.stock_out ?? r?.out_qty ?? r?.stockout ?? r?.qty_out ?? 0;

    const getBalance = (r: RowAny) => {
      // balance না থাকলে opening + in - out
      const b =
        r?.balance ??
        r?.balance_qty ??
        r?.closing_qty ??
        r?.qty_balance;

      if (b !== undefined && b !== null && b !== "") return b;

      const opening = toNum(getOpening(r));
      const sin = toNum(getStockIn(r));
      const sout = toNum(getStockOut(r));
      return opening + sin - sout;
    };

    const getRate = (r: RowAny) =>
      r?.rate ?? r?.avg_rate ?? r?.price ?? r?.unit_rate ?? 0;

    const pages = [1];

    // ✅ grand total amount (rate * balance)
    const grandTotal = useMemo(() => {
      return rows.reduce((acc, r) => {
        const qty = toNum(getBalance(r));
        const rate = toNum(getRate(r));
        return acc + qty * rate;
      }, 0);
    }, [rows]);

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((_, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />

            {/* Header */}
            <div className="mb-2">
              <h1 style={{ fontSize: fs + 3 }} className="font-bold text-center uppercase">
                {title}
              </h1>

              <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                <div>
                  <span className="font-semibold">Report Date:</span>{" "}
                  {startDate} — {endDate}
                </div>
              </div>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th style={{ fontSize: fs }} className={`border border-l-0 border-gray-900 px-2 ${cellPy} w-[70px] text-left`}>
                      SL. NO
                    </th>

                    <th style={{ fontSize: fs }} className={`border border-gray-900 border-r-0 px-2 ${cellPy} text-left`}>
                      PRODUCT NAME
                    </th>

                    <th style={{ fontSize: fs }} className={`border border-gray-900 px-2 ${cellPy} w-[120px] text-right`}>
                      OPENING
                    </th>

                    <th style={{ fontSize: fs }} className={`border border-gray-900 px-2 ${cellPy} w-[120px] text-right`}>
                      STOCK IN
                    </th>

                    <th style={{ fontSize: fs }} className={`border border-gray-900 px-2 ${cellPy} w-[120px] text-right`}>
                      STOCK OUT
                    </th>

                    <th style={{ fontSize: fs }} className={`border border-gray-900 px-2 ${cellPy} w-[120px] text-right`}>
                      BALANCE
                    </th>

                    <th style={{ fontSize: fs }} className={`border border-gray-900 px-2 ${cellPy} w-[110px] text-right`}>
                      RATE
                    </th>

                    <th style={{ fontSize: fs }} className={`border border-r-0 border-gray-900 px-2 ${cellPy} w-[130px] text-right`}>
                      TOTAL
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {grouped.map((g, gIdx) => (
                    <React.Fragment key={`brand-${gIdx}`}>
                      {/* Brand Row */}
                      <tr className="avoid-break bg-gray-50">
                        <td
                          colSpan={8}
                          style={{ fontSize: fs }}
                          className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} font-bold`}
                        >
                          {g.brand}
                        </td>
                      </tr>

                      {g.categories.map((c, cIdx) => {
                        // category total
                        const catTotal = c.rows.reduce((acc, r) => {
                          const qty = toNum(getBalance(r));
                          const rate = toNum(getRate(r));
                          return acc + qty * rate;
                        }, 0);

                        return (
                          <React.Fragment key={`cat-${gIdx}-${cIdx}`}>
                            {/* Category Row */}
                            <tr className="avoid-break">
                              <td
                                colSpan={8}
                                style={{ fontSize: fs }}
                                className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} font-semibold`}
                              >
                                {g.brand} → {c.category}
                              </td>
                            </tr>

                            {/* Items */}
                            {c.rows.map((r, idx) => {
                              const unit = getUnitName(r);
                              const opening = getOpening(r);
                              const sin = getStockIn(r);
                              const sout = getStockOut(r);
                              const balance = getBalance(r);
                              const rate = getRate(r);
                              const total = toNum(balance) * toNum(rate);

                              return (
                                <tr key={`row-${gIdx}-${cIdx}-${idx}`} className="avoid-break">
                                  <td
                                    style={{ fontSize: fs }}
                                    className={`border border-l-0 border-gray-900 px-2 ${cellPy}`}
                                  >
                                    {idx + 1}
                                  </td>

                                  <td
                                    style={{ fontSize: fs }}
                                    className={`border border-r-0 border-gray-900 px-2 ${cellPy}`}
                                  >
                                    {getProductName(r)}
                                  </td>

                                  <td
                                    style={{ fontSize: fs }}
                                    className={`border border-gray-900 px-2 ${cellPy} text-right`}
                                  >
                                    {fmtQtyDash(opening, unit)}
                                  </td>

                                  <td
                                    style={{ fontSize: fs }}
                                    className={`border border-gray-900 px-2 ${cellPy} text-right`}
                                  >
                                    {fmtQtyDash(sin, unit)}
                                  </td>

                                  <td
                                    style={{ fontSize: fs }}
                                    className={`border border-gray-900 px-2 ${cellPy} text-right`}
                                  >
                                    {fmtQtyDash(sout, unit)}
                                  </td>

                                  <td
                                    style={{ fontSize: fs }}
                                    className={`border border-gray-900 px-2 ${cellPy} text-right`}
                                  >
                                    {fmtQtyDash(balance, unit)}
                                  </td>

                                  <td
                                    style={{ fontSize: fs }}
                                    className={`border border-gray-900 px-2 ${cellPy} text-right`}
                                  >
                                    {fmtNum(rate, 0)}
                                  </td>

                                  <td
                                    style={{ fontSize: fs }}
                                    className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                                  >
                                    {fmtNum(total, 0)}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Category Total Row */}
                            <tr className="avoid-break font-bold bg-gray-50">
                              <td
                                colSpan={7}
                                style={{ fontSize: fs }}
                                className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
                              >
                                Category Total
                              </td>
                              <td
                                style={{ fontSize: fs }}
                                className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                              >
                                {fmtNum(catTotal, 0)}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ))}

                  {/* Grand Total */}
                  <tr className="avoid-break font-bold">
                    <td
                      colSpan={7}
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      Grand Total
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtNum(grandTotal, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ fontSize: fs }} className="mt-auto text-right text-xs">
              Page {pIdx + 1} of {pages.length}
            </div>

            {pIdx !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}

        <div className="mt-2 text-xs text-gray-900">
          * This document is system generated.
        </div>
      </div>
    );
  }
);

ItemDetailsPrint.displayName = "ItemDetailsPrint";
export default ItemDetailsPrint;