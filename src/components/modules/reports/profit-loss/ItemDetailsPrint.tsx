import React, { forwardRef, useMemo } from "react";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import { firstLetterCapitalize } from "../../../utils/utils-functions/formatRoleName";

const fmtNum = (n: any, dec = 0) => thousandSeparator(Number(n || 0), dec);
const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmtStock = (qty: any, unit?: string) => {
  const q = toNum(qty);
  if (!q) return "-";
  return `${fmtNum(q, 0)} (${unit || "Nos"})`;
};

type RowAny = Record<string, any>;

type Props = {
  report: any;
  title?: string;
  startDate?: string;
  endDate?: string;
  fontSize?: number;
  rowsPerPage?: number; // fixed row break
};

type RenderRow =
  | { type: "brand"; brand: string }
  | { type: "category"; brand: string; category: string }
  | { type: "item"; brand: string; category: string; idx: number; row: RowAny }
  | { type: "catTotal"; brand: string; category: string; total: number }
  | { type: "brandTotal"; brand: string; total: number }
  | { type: "grandTotal"; total: number };

const ItemDetailsPrint = forwardRef<HTMLDivElement, Props>(
  (
    {
      report,
      title = "STOCK DETAILS WITH RATE",
      startDate = "-",
      endDate = "-",
      fontSize,
      rowsPerPage,
    },
    ref
  ) => {
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 11;
    const cellPy = fs <= 11 ? "py-[0.5px]" : fs <= 15 ? "py-[.9px]" : "py-1";

    // rowsPerPage default (font অনুযায়ী)
    const rp =
      Number.isFinite(rowsPerPage)
        ? (rowsPerPage as number)
        : fs <= 11
        ? 30
        : fs <= 12
        ? 26
        : 22;

    // ✅ API map flatten: report.data = { BRAND: [..], "": [..] }
    const flatRows: RowAny[] = useMemo(() => {
      if (!report) return [];
      if (Array.isArray(report)) return report;

      // common array locations
      if (Array.isArray(report?.items)) return report.items;
      if (Array.isArray(report?.rows)) return report.rows;

      const map1 = report?.data;
      if (map1 && typeof map1 === "object" && !Array.isArray(map1)) {
        const out: RowAny[] = [];
        Object.entries(map1).forEach(([brandKey, list]) => {
          if (!Array.isArray(list)) return;
          list.forEach((it) => out.push({ ...(it || {}), __brandKey: brandKey }));
        });
        return out;
      }

      // fallback: report itself map
      if (typeof report === "object" && !Array.isArray(report)) {
        const values = Object.values(report);
        const looksLikeMap = values.some((v) => Array.isArray(v));
        if (looksLikeMap) {
          const out: RowAny[] = [];
          Object.entries(report).forEach(([brandKey, list]) => {
            if (!Array.isArray(list)) return;
            list.forEach((it) => out.push({ ...(it || {}), __brandKey: brandKey }));
          });
          return out;
        }
      }

      return [];
    }, [report]);

    // field readers (based on your response keys)
    const getBrand = (r: RowAny) => {
      const fromRow = (r?.brand ?? "").toString().trim();
      const fromKey = (r?.__brandKey ?? "").toString().trim();
      const b = fromRow || fromKey;
      return b ? b : "Others";
    };

    const getCategory = (r: RowAny) =>
      (r?.category ?? r?.category_name ?? "Uncategorized").toString();

    const getProductName = (r: RowAny) =>
      (r?.product_name ?? r?.name ?? "-").toString();

    const getUnit = (r: RowAny) => (r?.unit ?? "Nos").toString();

    const getQty = (r: RowAny) => r?.stock ?? r?.qty ?? 0;
    const getRate = (r: RowAny) => r?.rate ?? r?.avg_rate ?? 0;

    const getTotal = (r: RowAny) => {
      const direct = r?.total_stock ?? r?.amount ?? r?.total;
      if (direct !== undefined && direct !== null && direct !== "") return toNum(direct);
      return toNum(getQty(r)) * toNum(getRate(r));
    };

    // ✅ group: brand -> category -> items
    const grouped = useMemo(() => {
      const map = new Map<string, Map<string, RowAny[]>>();

      flatRows.forEach((r) => {
        const brand = getBrand(r);
        const category = getCategory(r);

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
    }, [flatRows]);

    // ✅ RenderRow list (linear) — Category Total শেষে Brand Total
    const renderRows: RenderRow[] = useMemo(() => {
      const out: RenderRow[] = [];
      let grand = 0;

      grouped.forEach((g) => {
        out.push({ type: "brand", brand: g.brand });

        let brandTotal = 0;

        g.categories.forEach((c) => {
          out.push({ type: "category", brand: g.brand, category: c.category });

          c.rows.forEach((r, idx) => {
            out.push({
              type: "item",
              brand: g.brand,
              category: c.category,
              idx: idx + 1,
              row: r,
            });
          });

          const catTotal = c.rows.reduce((acc, r) => acc + getTotal(r), 0);
          brandTotal += catTotal;

          out.push({
            type: "catTotal",
            brand: g.brand,
            category: c.category,
            total: catTotal,
          });
        });

        // ✅ Brand Total after all Category Totals
        out.push({ type: "brandTotal", brand: g.brand, total: brandTotal });
        grand += brandTotal;
      });

      out.push({ type: "grandTotal", total: grand });
      return out;
    }, [grouped]);

    // ✅ Pagination: rp rows পরে page break + header repeat
    const pages: RenderRow[][] = useMemo(() => {
      const pages: RenderRow[][] = [];
      let page: RenderRow[] = [];
      let count = 0;

      const pushPage = () => {
        if (page.length) pages.push(page);
        page = [];
        count = 0;
      };

      const addBrandHeader = (brand: string) => {
        page.push({ type: "brand", brand });
        count += 1;
      };

      const addContextHeaders = (brand: string, category: string) => {
        page.push({ type: "brand", brand });
        page.push({ type: "category", brand, category });
        count += 2;
      };

      for (let i = 0; i < renderRows.length; i++) {
        const r = renderRows[i];
        const next = renderRows[i + 1];

        const remaining = rp - count;

        // orphan brand/category header avoid
        if (
          page.length > 0 &&
          (r.type === "brand" || r.type === "category") &&
          remaining <= 1
        ) {
          pushPage();
        }

        // item শেষে catTotal/brandTotal কে একা না ফেলতে চাইলে
        if (
          page.length > 0 &&
          r.type === "item" &&
          (next?.type === "catTotal" || next?.type === "brandTotal") &&
          remaining === 1
        ) {
          pushPage();
        }

        // capacity check
        if (page.length > 0 && count + 1 > rp) {
          pushPage();
        }

        // new page শুরু হলে item/catTotal হলে brand+category repeat
        if (page.length === 0 && (r.type === "item" || r.type === "catTotal")) {
          addContextHeaders(r.brand, r.category);

          if (count + 1 > rp) {
            pushPage();
            addContextHeaders(r.brand, r.category);
          }
        }

        // new page শুরু হলে brandTotal হলে brand repeat
        if (page.length === 0 && r.type === "brandTotal") {
          addBrandHeader(r.brand);

          if (count + 1 > rp) {
            pushPage();
            addBrandHeader(r.brand);
          }
        }

        page.push(r);
        count += 1;
      }

      pushPage();
      return pages.length ? pages : [[]];
    }, [renderRows, rp]);

    const renderLine = (r: RenderRow) => {
      if (r.type === "brand") {
        return (
          <tr className="avoid-break bg-gray-50">
            <td
              colSpan={5}
              style={{ fontSize: fs }}
              className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} font-bold`}
            >
              { firstLetterCapitalize(r.brand)}
            </td>
          </tr>
        );
      }

      if (r.type === "category") {
        return (
          <tr className="avoid-break">
            <td
              colSpan={5}
              style={{ fontSize: fs }}
              className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} font-semibold`}
            >
              { firstLetterCapitalize(r.brand)} → { firstLetterCapitalize(r.category)}
            </td>
          </tr>
        );
      }

      if (r.type === "item") {
        const row = r.row;
        const qty = getQty(row);
        const unit = getUnit(row);
        const rate = getRate(row);
        const total = getTotal(row);

        return (
          <tr className="avoid-break">
            <td
              style={{ fontSize: fs }}
              className={`border border-l-0 border-gray-900 px-2 ${cellPy} w-[70px] text-center`}
            >
              {r.idx}
            </td>

            <td
              style={{ fontSize: fs }}
              className={`border border-gray-900 px-2 ${cellPy}`}
            >
              {getProductName(row)}
            </td>

            <td
              style={{ fontSize: fs }}
              className={`border border-gray-900 px-2 ${cellPy} text-right w-[120px]`}
            >
              {fmtStock(qty, unit)}
            </td>

            <td
              style={{ fontSize: fs }}
              className={`border border-gray-900 px-2 ${cellPy} text-right w-[110px]`}
            >
              {fmtNum(rate, 0)}
            </td>

            <td
              style={{ fontSize: fs }}
              className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right w-[130px]`}
            >
              {fmtNum(total, 0)}
            </td>
          </tr>
        );
      }

      if (r.type === "catTotal") {
        return (
          <tr className="avoid-break font-bold bg-gray-50">
            <td
              colSpan={4}
              style={{ fontSize: fs }}
              className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
            >
              { firstLetterCapitalize(r.category)} Total
            </td>
            <td
              style={{ fontSize: fs }}
              className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
            >
              {fmtNum(r.total, 0)}
            </td>
          </tr>
        );
      }

      if (r.type === "brandTotal") {
        return (
          <tr className="avoid-break font-bold">
            <td
              colSpan={4}
              style={{ fontSize: fs }}
              className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
            >
              { firstLetterCapitalize(r.brand)} Total
            </td>
            <td
              style={{ fontSize: fs }}
              className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
            >
              {fmtNum(r.total, 0)}
            </td>
          </tr>
        );
      }

      // grandTotal
      return (
        <tr className="avoid-break font-bold">
          <td
            colSpan={4}
            style={{ fontSize: fs }}
            className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
          >
            Grand Total
          </td>
          <td
            style={{ fontSize: fs }}
            className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
          >
            {fmtNum(r.total, 0)}
          </td>
        </tr>
      );
    };

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />

            {/* per page header repeat */}
            <div className="mb-2">
              <h1
                style={{ fontSize: fs + 3 }}
                className="font-bold text-center uppercase"
              >
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
                    <th
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy} w-[70px] text-center`}
                    >
                      SL. NO
                    </th>
                    <th
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-left`}
                    >
                      Product Name
                    </th>
                    <th
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} w-[120px] text-right`}
                    >
                      Stock
                    </th>
                    <th
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} w-[110px] text-right`}
                    >
                      Rate
                    </th>
                    <th
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} w-[130px] text-right`}
                    >
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.map((r, i) => (
                    <React.Fragment key={i}>{renderLine(r)}</React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: fs }} className="mt-auto text-right text-xs">
              Page {pIdx + 1} of {pages.length}
            </div>

            {pIdx !== pages.length - 1 && (
              <div className="page-break" style={{ pageBreakAfter: "always" }} />
            )}
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