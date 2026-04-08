import React from "react";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

export type ProductProfitPrintRow = {
  sl?: number;
  product_name?: string;
  sold_qty?: number;
  unit_purchase_rate?: number | null;
  purchase_total?: number | null;
  unit_sale_rate?: number | null;
  sale_total?: number | null;
  profit?: number | null;
  warning?: string;
};

type Props = {
  rows: ProductProfitPrintRow[];
  startDate?: string;
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const formatNumber = (value: number | null | undefined, decimal = 2) => {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal,
  });
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }
  return out;
};

const ProductProfitLossPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      startDate,
      endDate,
      title = "Product Wise Profit Loss",
      rowsPerPage = 12,
      fontSize,
    },
    ref
  ) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const fs = Number.isFinite(fontSize) ? Number(fontSize) : 10;
    const pages = chunkRows(safeRows, rowsPerPage);
    const summary = safeRows.reduce(
      (acc, row) => {
        acc.totalQty += Number(row?.sold_qty || 0);
        acc.totalPurchase += Number(row?.purchase_total || 0);
        acc.totalSales += Number(row?.sale_total || 0);
        acc.totalProfit += Number(row?.profit || 0);
        acc.warningCount += row?.warning ? 1 : 0;
        return acc;
      },
      {
        totalQty: 0,
        totalPurchase: 0,
        totalSales: 0,
        totalProfit: 0,
        warningCount: 0,
      }
    );
    const profitLabel =
      summary.totalProfit > 0
        ? "+"
        : summary.totalProfit < 0
          ? "-"
          : "";

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
            </div>

            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-center">
                    SL
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-left">
                    Product Name
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                    Sold Qty
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                    Unit Purchase
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                    Purchase Total
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                    Unit Sale
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                    Sale Total
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right">
                    Profit / Loss
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-left">
                    Remarks
                  </th>
                </tr>
              </thead>

              <tbody>
                {pageRows.length ? (
                  pageRows.map((row, idx) => (
                    <tr key={`${row.product_name || "row"}-${idx}`} className="avoid-break">
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                        {row?.sl ?? pageIndex * rowsPerPage + idx + 1}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                        {row?.product_name || "-"}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator( Number(row?.sold_qty), 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator( Number(row?.unit_purchase_rate), 2)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator( Number(row?.purchase_total), 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator( Number(row?.unit_sale_rate), 2)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator( Number(row?.sale_total), 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator( Number(row?.profit), 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                        {row?.warning || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="border border-gray-900 px-3 py-6 text-center text-gray-500">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>

              {pageIndex === pages.length - 1 ? (
                <tfoot>
                  <tr>
                    <td
                      colSpan={2}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 font-bold"
                    >
                      Summary
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      {thousandSeparator(summary.totalQty, 0)}
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      -
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      {thousandSeparator(summary.totalPurchase, 0)}
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      -
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      {thousandSeparator(summary.totalSales, 0)}
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-right font-bold"
                    >
                      {profitLabel} {thousandSeparator(Math.abs(summary.totalProfit), 0)}
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 font-bold"
                    >
                      {summary.warningCount > 0
                        ? `${summary.warningCount} warning`
                        : "-"}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>

            <div style={{ fontSize: fs }} className="mt-3 text-right text-xs">
              Page {pageIndex + 1} of {pages.length}
            </div>

            {pageIndex !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  }
);

ProductProfitLossPrint.displayName = "ProductProfitLossPrint";

export default ProductProfitLossPrint;
