import React, { forwardRef, useMemo } from "react";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import { firstLetterCapitalize } from "../../../utils/utils-functions/formatRoleName";
import { FiArrowRight } from "react-icons/fi";
import { useSelector } from "react-redux";
import { isBranchSettingOn } from "../../../utils/userFeatureSettings";

const fmtNum = (n: any, dec = 0) => thousandSeparator(Number(n || 0));
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
  | { type: "group"; brand: string; group: string }
  | { type: "category"; brand: string; group: string; category: string }
  | { type: "item"; brand: string; group: string; category: string; idx: number; row: RowAny }
  | { type: "catTotal"; brand: string; group: string; category: string; stock: number; unit: string; total: number }
  | { type: "brandTotal"; brand: string; stock: number; unit: string; total: number }
  | { type: "grandTotal"; stock: number; unit: string; total: number };

/**
 * A heading's path on the paper, drawn as `A → B → C`. ⚠️ Empty parts are
 * dropped, so an item with no group prints `Brand → Category` rather than a
 * blank step where a group's name would be, and a branch that lists its stock
 * straight by category prints a one-part path, which is its name.
 */
const PrintPath = ({ parts, className = "" }: { parts: any[]; className?: string }) => {
  const shown = parts.map((part) => String(part ?? "").trim()).filter(Boolean);

  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}>
      {shown.map((part, index) => (
        <React.Fragment key={`${index}-${part}`}>
          {index > 0 && <FiArrowRight className="shrink-0 text-gray-900" />}
          <span>{part}</span>
        </React.Fragment>
      ))}
    </span>
  );
};

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
    const settings = useSelector((state: any) => state.settings);
    const groupByBrand = isBranchSettingOn(settings, "stock_report_type");
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 11;
    const cellPy = fs <= 11 ? "py-[0.5px]" : fs <= 15 ? "py-[.9px]" : "py-1";

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
      // Accept the API envelope, its data wrapper, a brand map, or flat rows.
      for (const data of [report, report?.data, report?.data?.data, report?.data?.data?.data]) {
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== "object") continue;
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.rows)) return data.rows;
        if (Array.isArray(data.data)) return data.data;
        const out: RowAny[] = [];
        Object.entries(data).forEach(([brandKey, list]) => {
          if (!Array.isArray(list)) return;
          list.forEach((it) => out.push({ ...(it || {}), __brandKey: brandKey }));
        });
        if (out.length) return out;
      }

      return [];
    }, [report]);

    // field readers (based on your response keys)
    const getBrand = (r: RowAny) => {
      const fromRow = (r?.brand ?? r?.brand_name ?? "").toString().trim();
      const fromKey = (r?.__brandKey ?? "").toString().trim();
      const b = fromRow || fromKey;
      return b ? b : "Others";
    };

    const getCategory = (r: RowAny) =>
      (r?.category ?? r?.category_name ?? r?.cat_name ?? "Uncategorized").toString();

    /**
     * ⚠️ '' MEANS "NO GROUP", NOT A GROUP CALLED SOMETHING. An item with no group
     * has no Group level at all and its category hangs straight off the brand, so
     * an empty string is what says so -- the heading draws the parts it has.
     */
    const getGroup = (r: RowAny) => (r?.group ?? r?.group_name ?? "").toString().trim();

    const getProductName = (r: RowAny) =>
      (r?.product_name ?? r?.name ?? "-").toString();

    const getCode = (r: RowAny) => (r?.code ?? "").toString().trim();

    const getUnit = (r: RowAny) => (r?.unit ?? "Nos").toString();

    /**
     * ⚠️ FIVE, ALWAYS. The separate Code column is gone: the code rides in front
     * of the product's name, exactly as it does on Product Stock's paper, so the
     * second column was printing a string the product cell already carried. Every
     * colSpan in this file counts off this one number.
     */
    const colCount = 5;

    const getQty = (r: RowAny) => r?.stock ?? r?.qty ?? 0;
    const getRate = (r: RowAny) => r?.rate ?? r?.avg_rate ?? 0;
    const getTotalUnit = (rows: RowAny[]) => {
      const units = Array.from(new Set(rows.map((row) => getUnit(row)).filter(Boolean)));
      return units.length === 1 ? units[0] : "";
    };

    const getTotal = (r: RowAny) => {
      const direct = r?.total_stock ?? r?.amount ?? r?.total;
      if (direct !== undefined && direct !== null && direct !== "") return toNum(direct);
      return toNum(getQty(r)) * toNum(getRate(r));
    };

    // ✅ group: brand -> group -> category -> items, with the categories of the
    // items that have no group hanging straight off their brand.
    const grouped = useMemo(() => {
      type CatBucket = { category: string; rows: RowAny[] };
      type BrandBucket = {
        brand: string;
        groups: Map<string, { group: string; cats: Map<string, CatBucket> }>;
        ungrouped: Map<string, CatBucket>;
      };

      const byName = (a: any, b: any) => String(a ?? "").localeCompare(String(b ?? ""));

      // ⚠️ SORTED HERE, not left in the order the API sent: a branch that lists
      // its stock straight by category has the brands interleaved in that order,
      // so the same category would print as two separate headings.
      const sorted = [...flatRows].sort((a, b) => {
        if (!groupByBrand) {
          return byName(getCategory(a), getCategory(b)) || byName(getProductName(a), getProductName(b));
        }
        return (
          byName(getBrand(a), getBrand(b)) ||
          byName(getGroup(a), getGroup(b)) ||
          byName(getCategory(a), getCategory(b)) ||
          byName(getProductName(a), getProductName(b))
        );
      });

      const brands = new Map<string, BrandBucket>();

      for (const r of sorted) {
        const brandKey = groupByBrand ? getBrand(r) : "";
        if (!brands.has(brandKey)) {
          brands.set(brandKey, { brand: brandKey, groups: new Map(), ungrouped: new Map() });
        }
        const brand = brands.get(brandKey)!;
        const catKey = getCategory(r);
        const groupLabel = groupByBrand ? getGroup(r) : "";

        if (!groupLabel) {
          if (!brand.ungrouped.has(catKey)) brand.ungrouped.set(catKey, { category: catKey, rows: [] });
          brand.ungrouped.get(catKey)!.rows.push(r);
          continue;
        }

        if (!brand.groups.has(groupLabel)) {
          brand.groups.set(groupLabel, { group: groupLabel, cats: new Map() });
        }
        const group = brand.groups.get(groupLabel)!;

        if (!group.cats.has(catKey)) group.cats.set(catKey, { category: catKey, rows: [] });
        group.cats.get(catKey)!.rows.push(r);
      }

      return Array.from(brands.values()).map((brand) => ({
        brand: brand.brand,
        /**
         * ✅ Flat, in print order, each category carrying the group it sits in.
         * The named groups come first and the ungrouped categories after them,
         * so a group heading is emitted wherever the group changes -- which
         * keeps the walk below the one it always was.
         */
        categories: [
          ...Array.from(brand.groups.values()).flatMap((group) =>
            Array.from(group.cats.values(), (cat) => ({ ...cat, group: group.group })),
          ),
          ...Array.from(brand.ungrouped.values(), (cat) => ({ ...cat, group: "" })),
        ],
      }));
    }, [flatRows, groupByBrand]);

    // ✅ RenderRow list (linear) — Category Total শেষে Brand Total
    const renderRows: RenderRow[] = useMemo(() => {
      const out: RenderRow[] = [];
      let grand = 0;
      let grandStock = 0;
      const grandRows: RowAny[] = [];

      grouped.forEach((g) => {
        if (groupByBrand) out.push({ type: "brand", brand: g.brand });

        let brandTotal = 0;
        let brandStock = 0;
        const brandRows: RowAny[] = [];

        let lastGroup = "";

        g.categories.forEach((c) => {
          /**
           * A group heading wherever the group changes. The categories of the
           * items that have none arrive last, carrying no group, so they print
           * under the brand directly -- which is where they belong.
           */
          if (groupByBrand && c.group && c.group !== lastGroup) {
            out.push({ type: "group", brand: g.brand, group: c.group });
            lastGroup = c.group;
          }

          out.push({ type: "category", brand: g.brand, group: c.group, category: c.category });

          c.rows.forEach((r, idx) => {
            out.push({
              type: "item",
              brand: g.brand,
              group: c.group,
              category: c.category,
              idx: idx + 1,
              row: r,
            });
          });

          const catTotal = c.rows.reduce((acc, r) => acc + getTotal(r), 0);
          const catStock = c.rows.reduce((acc, r) => acc + toNum(getQty(r)), 0);
          brandTotal += catTotal;
          brandStock += catStock;
          brandRows.push(...c.rows);

          out.push({
            type: "catTotal",
            brand: g.brand,
            group: c.group,
            category: c.category,
            stock: catStock,
            unit: getTotalUnit(c.rows),
            total: catTotal,
          });
        });

        // ✅ Brand Total after all Category Totals
        if (groupByBrand) out.push({
          type: "brandTotal",
          brand: g.brand,
          stock: brandStock,
          unit: getTotalUnit(brandRows),
          total: brandTotal,
        });
        grand += brandTotal;
        grandStock += brandStock;
        grandRows.push(...brandRows);
      });

      out.push({
        type: "grandTotal",
        stock: grandStock,
        unit: getTotalUnit(grandRows),
        total: grand,
      });
      return out;
    }, [grouped, groupByBrand]);

    // ✅ Pagination: rp rows পরে page break + header repeat
    const pages: RenderRow[][] = useMemo(() => {
      if (rp <= 0) return [renderRows];
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

      const addContextHeaders = (brand: string, group: string, category: string) => {
        if (groupByBrand) page.push({ type: "brand", brand });
        if (groupByBrand && group) page.push({ type: "group", brand, group });
        page.push({ type: "category", brand, group, category });
        count += groupByBrand ? (group ? 3 : 2) : 1;
      };

      for (let i = 0; i < renderRows.length; i++) {
        const r = renderRows[i];
        const next = renderRows[i + 1];

        const remaining = rp - count;

        // orphan brand/group/category header avoid
        if (
          page.length > 0 &&
          (r.type === "brand" || r.type === "group" || r.type === "category") &&
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

        // new page শুরু হলে item/catTotal হলে brand+group+category repeat
        if (page.length === 0 && (r.type === "item" || r.type === "catTotal")) {
          addContextHeaders(r.brand, r.group, r.category);

          if (count + 1 > rp) {
            pushPage();
            addContextHeaders(r.brand, r.group, r.category);
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
    }, [renderRows, rp, groupByBrand]);

    const renderLine = (r: RenderRow) => {
      if (r.type === "brand") {
        return (
          <tr className="avoid-break bg-gray-50">
            <td
              colSpan={colCount}
              style={{ fontSize: fs }}
              className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} font-bold`}
            >
              { firstLetterCapitalize(r.brand)}
            </td>
          </tr>
        );
      }

      if (r.type === "group") {
        return (
          <tr className="avoid-break">
            <td
              colSpan={colCount}
              style={{ fontSize: fs }}
              className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} font-semibold`}
            >
              <PrintPath parts={[firstLetterCapitalize(r.brand), r.group]} />
            </td>
          </tr>
        );
      }

      /**
       * Each heading spells out the whole path down to it -- the group prints the
       * brand it hangs from, the category prints both -- with PrintPath dropping
       * the steps it has none of. Same shape as Product Stock's screen and paper.
       */
      if (r.type === "category") {
        return (
          <tr className="avoid-break">
            <td
              colSpan={colCount}
              style={{ fontSize: fs }}
              className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} font-semibold`}
            >
              <PrintPath
                parts={
                  groupByBrand
                    ? [firstLetterCapitalize(r.brand), r.group, r.category]
                    : [r.category]
                }
              />
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

            {/*
              ⚠️ CODE AND NAME, NOTHING ELSE. The chain this line used to spell
              out was taken back off it by the owner on 2026-10-10, hours after
              he asked for it: the headings above already carry the chain, once
              per band instead of once per product.

              ⚠️ THE CODE RIDES IN FRONT OF THE NAME, as it does on Product
              Stock's paper, which is why there is no Code column beside it any
              more. A product without one prints its name alone rather than a
              lone dash.
            */}
            <td
              style={{ fontSize: fs }}
              className={`border border-gray-900 px-2 ${cellPy}`}
            >
              <PrintPath
                parts={[
                  getCode(row)
                    ? `${getCode(row)} - ${getProductName(row)}`
                    : getProductName(row),
                ]}
              />
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
              colSpan={colCount - 3}
              style={{ fontSize: fs }}
              className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
            >
              { r.category } Total
            </td>
            <td
              style={{ fontSize: fs }}
              className={`border border-gray-900 px-2 ${cellPy} text-right`}
            >
              {fmtStock(r.stock, r.unit)}
            </td>
            <td
              style={{ fontSize: fs }}
              className={`border border-gray-900 px-2 ${cellPy} text-right`}
            />
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
              colSpan={colCount - 3}
              style={{ fontSize: fs }}
              className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
            >
              { firstLetterCapitalize(r.brand)} Total
            </td>
            <td
              style={{ fontSize: fs }}
              className={`border border-gray-900 px-2 ${cellPy} text-right`}
            >
              {fmtStock(r.stock, r.unit)}
            </td>
            <td
              style={{ fontSize: fs }}
              className={`border border-gray-900 px-2 ${cellPy} text-right`}
            />
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
            colSpan={colCount - 3}
            style={{ fontSize: fs }}
            className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
          >
            Grand Total
          </td>
          <td
            style={{ fontSize: fs }}
            className={`border border-gray-900 px-2 ${cellPy} text-right`}
          >
            {fmtStock(r.stock, r.unit)}
          </td>
          <td
            style={{ fontSize: fs }}
            className={`border border-gray-900 px-2 ${cellPy} text-right`}
          />
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
                  {startDate} to {endDate}
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
                    {/*
                      ⚠️ The heading names the parts, not just the first of them:
                      the column is not the product's name, it is the whole chain
                      a line is filed under -- see the same column on Product
                      Stock's paper and screen.
                    */}
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

                {/*
                  ⚠️ THE BAND THE PINNED FOOTER SITS IN, TAKEN OUT OF THE ROWS.
                  PrintFooter is position:fixed and repainted at the foot of
                  every sheet, and `bottom: 0` there means the CONTENT area's
                  edge -- not the paper's -- so it lands squarely on the last
                  rows of a full page. A pinned box reserves nothing, so nothing
                  it does can keep the rows off it; the space has to come out of
                  the flow, on every sheet.

                  ⚠️ A <tfoot> IS THE ONLY PART OF A TABLE THAT REPEATS AT THE
                  FOOT OF EACH PRINTED PAGE, which is what makes it the reserve:
                  its height is held back on every sheet, not just the last.
                  Measured in Chrome: with this row the last line on a full page
                  stops well clear of the software line, and without it the rows
                  print through it.

                  ⚠️ 6mm IS THE FOOTER'S OWN HEIGHT WITH ROOM TO SPARE. It is at
                  most 10px of type over a 1px rule and 4px of padding -- a shade
                  under 4mm -- but only because PrintFooter sets `leading-none`;
                  left to inherit the report's line-height it was 6.6mm and would
                  outgrow this reserve. Change one and the other has to follow.
                */}
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ height: "6mm", border: "none" }} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ⚠️ PINNED ONLY WHEN THE REPORT DID NOT CUT ITS OWN PAGES. The Rows
                box starts at 0 on both screens that mount this sheet, which makes
                the whole report one block and leaves the breaks to the browser --
                and a line left in the flow then prints once, under the last row,
                on whichever sheet the table happens to end. Pinned, it is
                repainted at the foot of every sheet instead. Same rule, word for
                word, as Cash Book's foot.

                A numbered run keeps the in-flow line: one block per sheet, so
                `mt-auto` already holds each copy at the foot of its own sheet,
                and it can say which page this is. */}
            <PrintFooter
              fixed={pages.length === 1}
              page={pIdx + 1}
              total={pages.length}
              fontSize={fs}
            />

            {pIdx !== pages.length - 1 && (
              <div className="page-break" style={{ pageBreakAfter: "always" }} />
            )}
          </div>
        ))}
      </div>
    );
  }
);

ItemDetailsPrint.displayName = "ItemDetailsPrint";
export default ItemDetailsPrint;
