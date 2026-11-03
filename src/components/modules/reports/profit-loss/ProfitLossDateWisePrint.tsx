import React from "react";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

type RowType = {
  sl_no?: number;
  vr_date?: string;
  date_display?: string;
  purchase?: number | string;
  sales?: number | string;
  profit?: number | string;
  loss?: number | string;
};

type TotalsType = {
  purchase?: number;
  sales?: number;
  profit?: number;
  loss?: number;
};

type Props = {
  rows: RowType[];
  adjustment?: TotalsType | null;
  totals?: TotalsType;
  startDate?: string;
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  // A size of nothing means ONE page, not a step of nothing -- see DateWisePrint.
  if (size <= 0) return [data];

  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const toNumber = (value: number | string | undefined) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** A profit plain, a loss in brackets -- the accounting convention. */
const fmtProfitLoss = (profit: number, loss: number) => {
  if (profit > 0) return thousandSeparator(profit);
  if (loss > 0) return `(${thousandSeparator(loss)})`;
  return "-";
};

const ProfitLossDateWisePrint = React.forwardRef<HTMLDivElement, Props>(
  (
    { rows, adjustment, totals, startDate, endDate, title = "Profit & Loss (Date Wise)", rowsPerPage = 25, fontSize = 10 },
    ref
  ) => {
    const pages = chunkRows(rows, rowsPerPage);
    const fs = fontSize;

    return (
      <div ref={ref} className="p-8 text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => {
          const lastPage = pIdx === pages.length - 1;

          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />

              {/* Header */}
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold">{title}</h1>
                <div className="text-xs">
                  <strong>From:</strong> {startDate || "-"}
                  <strong className="ml-4">To:</strong> {endDate || "-"}
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse table-fixed">
                <thead className="bg-gray-100">
                  <tr>
                    <th style={{ fontSize: fs }} className="border px-2 py-2">Sl</th>
                    <th style={{ fontSize: fs }} className="border px-2 py-2">Date</th>
                    <th style={{ fontSize: fs }} className="border px-2 py-2 text-right">Total Purchase</th>
                    <th style={{ fontSize: fs }} className="border px-2 py-2 text-right">Total Sales</th>
                    <th style={{ fontSize: fs }} className="border px-2 py-2 text-right">Profit or Loss</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.map((row, idx) => (
                    <tr key={idx} className="align-middle">
                      <td style={{ fontSize: fs }} className="border px-2 py-1 text-center align-middle">
                        {row.sl_no}
                      </td>
                      <td style={{ fontSize: fs }} className="border px-2 py-1 text-center align-middle">
                        {row.date_display || row.vr_date || "-"}
                      </td>
                      <td style={{ fontSize: fs }} className="border px-2 py-1 text-right align-middle">
                        {toNumber(row.purchase) ? thousandSeparator(toNumber(row.purchase)) : "-"}
                      </td>
                      <td style={{ fontSize: fs }} className="border px-2 py-1 text-right align-middle">
                        {toNumber(row.sales) ? thousandSeparator(toNumber(row.sales)) : "-"}
                      </td>
                      <td style={{ fontSize: fs }} className="border px-2 py-1 text-right align-middle">
                        {fmtProfitLoss(toNumber(row.profit), toNumber(row.loss))}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* The whole period's figure, once, on the sheet that ends it. */}
                {lastPage && totals ? (
                  <tfoot>
                    {adjustment ? (
                      <tr>
                        <td style={{ fontSize: fs }} className="border px-2 py-2 text-right" colSpan={2}>
                          Adjustment (to P&amp;L Gross Profit)
                        </td>
                        <td style={{ fontSize: fs }} className="border px-2 py-2 text-right">
                          {toNumber(adjustment.purchase) ? thousandSeparator(toNumber(adjustment.purchase)) : "-"}
                        </td>
                        <td style={{ fontSize: fs }} className="border px-2 py-2 text-right">
                          {toNumber(adjustment.sales) ? thousandSeparator(toNumber(adjustment.sales)) : "-"}
                        </td>
                        <td style={{ fontSize: fs }} className="border px-2 py-2 text-right">
                          {fmtProfitLoss(toNumber(adjustment.profit), toNumber(adjustment.loss))}
                        </td>
                      </tr>
                    ) : null}
                    <tr className="font-bold">
                      <td style={{ fontSize: fs }} className="border px-2 py-2 text-right" colSpan={2}>
                        Total
                      </td>
                      <td style={{ fontSize: fs }} className="border px-2 py-2 text-right">
                        {thousandSeparator(totals.purchase || 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border px-2 py-2 text-right">
                        {thousandSeparator(totals.sales || 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border px-2 py-2 text-right">
                        {fmtProfitLoss(totals.profit || 0, totals.loss || 0)}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>

              {/* Footer */}
              <PrintFooter page={pIdx + 1} total={pages.length} />

              {pIdx < pages.length - 1 && <div className="page-break" />}
            </div>
          );
        })}
      </div>
    );
  }
);

ProfitLossDateWisePrint.displayName = "ProfitLossDateWisePrint";
export default ProfitLossDateWisePrint;
