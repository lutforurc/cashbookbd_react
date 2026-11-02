import React from "react";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

export type ProductProfitSummaryRow = {
  sl?: number;
  product_id?: number;
  code?: string;
  product_name: string;
  unit?: string;
  sales_qty?: number;
  sales_amount?: number;
  cost_amount?: number;
  profit?: number;
  /** The row that carries what cannot be split by product (discounts, transfers). */
  is_adjustment?: boolean;
};

export type ProductProfitSummaryTotals = {
  totalQty: number;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
};

type Props = {
  rows: ProductProfitSummaryRow[];
  summary: ProductProfitSummaryTotals;
  branchName?: string;
  category?: string;
  brand?: string;
  group?: string;
  startDate?: string;
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }
  return out;
};

const ProductProfitSummaryPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      summary,
      branchName,
      category,
      brand,
      group,
      startDate,
      endDate,
      title = "Product Profit Summary",
      rowsPerPage = 12,
      fontSize,
    },
    ref
  ) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const fs = Number.isFinite(fontSize) ? Number(fontSize) : 10;
    const pages = chunkRows(safeRows, rowsPerPage);
    const filters = [
      branchName ? `Branch: ${branchName}` : "",
      category ? `Category: ${category}` : "",
      brand ? `Brand: ${brand}` : "",
      group ? `Group: ${group}` : "",
    ].filter(Boolean);
    const th = "border border-gray-900 px-2 py-2";
    const td = "border border-gray-900 px-2 py-1";

    const money = (value: number | undefined, row: ProductProfitSummaryRow) =>
      row?.is_adjustment && value === undefined ? "" : thousandSeparator(Number(value || 0));

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pageIndex) => (
          <div key={pageIndex} className="print-page">
            <PadPrinting />

            <div className="mb-4">
              <h1 className="text-center text-2xl font-bold">{title}</h1>
              <div className="mt-1 text-xs">
                <span className="font-semibold">Report Date:</span> {startDate || "-"} -{" "}
                {endDate || "-"}
              </div>
              {filters.length ? <div className="mt-1 text-xs">{filters.join("  |  ")}</div> : null}
            </div>

            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "6%" }} />
                <col style={{ width: "38%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead className="bg-gray-100">
                <tr>
                  <th style={{ fontSize: fs }} className={`${th} text-center`}>SL</th>
                  <th style={{ fontSize: fs }} className={`${th} text-left`}>Code - Product Name</th>
                  <th style={{ fontSize: fs }} className={`${th} text-left`}>Unit</th>
                  <th style={{ fontSize: fs }} className={`${th} text-right`}>Qty</th>
                  <th style={{ fontSize: fs }} className={`${th} text-right`}>Sales Amount</th>
                  <th style={{ fontSize: fs }} className={`${th} text-right`}>Cost Amount</th>
                  <th style={{ fontSize: fs }} className={`${th} text-right`}>Profit Amount</th>
                </tr>
              </thead>

              <tbody>
                {pageRows.length ? (
                  pageRows.map((row, idx) => (
                    <tr key={`${row.product_id ?? "row"}-${idx}`} className="avoid-break">
                      <td style={{ fontSize: fs }} className={`${td} text-center`}>
                        {row?.sl ?? pageIndex * rowsPerPage + idx + 1}
                      </td>
                      <td style={{ fontSize: fs, lineHeight: 1.35 }} className={`${td} ${row?.is_adjustment ? "italic" : ""}`}>
                        {row?.code ? `${row.code} - ` : ""}
                        {row?.product_name || "-"}
                      </td>
                      <td style={{ fontSize: fs }} className={td}>{row?.unit || ""}</td>
                      <td style={{ fontSize: fs }} className={`${td} text-right`}>{money(row?.sales_qty, row)}</td>
                      <td style={{ fontSize: fs }} className={`${td} text-right`}>{money(row?.sales_amount, row)}</td>
                      <td style={{ fontSize: fs }} className={`${td} text-right`}>{money(row?.cost_amount, row)}</td>
                      <td style={{ fontSize: fs }} className={`${td} text-right`}>{money(row?.profit, row)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="border border-gray-900 px-3 py-6 text-center text-gray-500">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>

              {pageIndex === pages.length - 1 ? (
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={3} style={{ fontSize: fs }} className={`${td} text-left`}>Grand Total</td>
                    <td style={{ fontSize: fs }} className={`${td} text-right`}>{thousandSeparator(summary.totalQty)}</td>
                    <td style={{ fontSize: fs }} className={`${td} text-right`}>{thousandSeparator(summary.totalSales)}</td>
                    <td style={{ fontSize: fs }} className={`${td} text-right`}>{thousandSeparator(summary.totalCost)}</td>
                    <td style={{ fontSize: fs }} className={`${td} text-right`}>{thousandSeparator(summary.totalProfit)}</td>
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
  }
);

ProductProfitSummaryPrint.displayName = "ProductProfitSummaryPrint";

export default ProductProfitSummaryPrint;
