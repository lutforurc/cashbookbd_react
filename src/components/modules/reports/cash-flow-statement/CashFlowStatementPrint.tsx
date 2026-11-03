import React from "react";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import type { CashFlowRow } from "./cashFlowStatementRows";

type CashFlowStatementPrintProps = {
  branchName: string;
  startDate: string;
  endDate: string;
  rows: CashFlowRow[];
  fontSize?: number;
  depreciationSupported?: boolean;
};

const amount = (value: number | null) => {
  if (value === null) return "";
  const text = thousandSeparator(Math.abs(Number(value) || 0));
  return Number(value) < 0 ? `(${text})` : text;
};

const rowClass = (kind: CashFlowRow["kind"]) => {
  if (kind === "section") return "font-semibold";
  if (kind === "subtotal" || kind === "total") return "font-semibold";
  if (kind === "note") return "text-black";
  return "";
};

const CashFlowStatementPrint = React.forwardRef<
  HTMLDivElement,
  CashFlowStatementPrintProps
>(({ branchName, startDate, endDate, rows, fontSize, depreciationSupported }, ref) => {
  const fs = Number.isFinite(fontSize) ? Number(fontSize) : 12;

  return (
    <div ref={ref} className="cash-flow-print p-8 text-sm text-black print-root">
      <PrintStyles />
      <style>{`
        /*
         * ⚠️ EVERY TEXT ELEMENT ON THIS PRINTED SHEET IS SOLID BLACK.
         *
         * This is scoped to the Cash Flow print document only. It deliberately
         * sits outside @media print so the same rules apply while the print
         * iframe is built and in the printed output. PrintStyles still colours
         * h1/h2/h3 and thead th from the branch's print accent; the !important
         * here is what overrides that and every muted/gray utility class,
         * including the shared pad and footer.
         */
        .cash-flow-print,
        .cash-flow-print * {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          background-color: transparent !important;
        }

        .cash-flow-print :where(
          p, span, div, h1, h2, h3, h4, h5, h6,
          th, td, tr, thead, tbody, tfoot, table,
          small, strong, b, em, i, li, label, a,
          header, footer, section, article, svg
        ) {
          opacity: 1 !important;
        }

        .cash-flow-print svg text {
          fill: #000000 !important;
          color: #000000 !important;
        }

        @media print {
          .print-root { padding: 0 !important; }
          .print-page {
            padding: 8mm !important;
            min-height: var(--print-page-height);
            display: flex;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="print-page">
        <PadPrinting />

        <div className="mb-4" style={{ fontSize: `${fs}px` }}>
          <h1 className="mt-3 text-center font-bold" style={{ fontSize: `${fs + 10}px` }}>
            Cash Flow Statement
          </h1>
          <p className="mt-1 text-center text-xs text-black">
            Indirect method
          </p>

          <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
            <div className="text-left">
              <span className="font-semibold">Branch:</span> {branchName || "-"}
            </div>
            <div className="text-right">
              <span className="font-semibold">Period:</span> {startDate} - {endDate}
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden">
          <table className="w-full border-collapse leading-tight">
            <colgroup>
              <col />
              <col style={{ width: "150px" }} />
            </colgroup>
            <thead>
              <tr>
                <th
                  style={{ fontSize: fs }}
                  className="border border-gray-900 px-2 py-1 text-left"
                >
                  Particulars
                </th>
                <th
                  style={{ fontSize: fs }}
                  className="border border-gray-900 px-2 py-1 text-right"
                >
                  Amount (BDT)
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.key} className={rowClass(row.kind)}>
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 py-0.5 ${
                        row.kind === "line" ? "pl-6" : ""
                      }`}
                    >
                      {row.label}
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-0.5 text-right"
                    >
                      {amount(row.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    className="border border-gray-900 px-3 py-6 text-center text-black"
                  >
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-[11px] leading-snug text-black">
          <p>
            Net profit is the Profit &amp; Loss Account's own result for the same
            branch and period. Inventory is adjusted separately by opening stock
            less closing stock on that account's valuation, because the closing
            stock is a valuation and not a ledger balance.
          </p>
          <p className="mt-1">
            Basis: posted vouchers only, with year-closing entries excluded -- the
            same posted ledger Trial Balance Details prints. Cash and cash
            equivalents are the accounts the branch's Cash, Bank and Mobile
            Banking groups hold; transfers between them are internal and are not
            counted as cash flow. Investing and financing show only movements from
            vouchers that touched a cash or cash-equivalent account; a non-cash
            entry is excluded from those sections and its P&amp;L effect is added
            back above. A posted line whose chart parent cannot be resolved is
            shown under "Other movements not classified" rather than assigned to
            operating activities.
          </p>
          <p className="mt-1">
            Non-cash adjustments:{" "}
            {depreciationSupported
              ? "depreciation on the expense heads nominated by the Asset module, plus non-cash purchases, sales and other P&L items whose vouchers did not touch cash."
              : "non-cash purchases, sales and other P&L items whose vouchers did not touch cash; no Asset category has nominated a depreciation expense head."}
          </p>
        </div>

        <PrintFooter page={1} total={1} fontSize={fs} />
      </div>
    </div>
  );
});

CashFlowStatementPrint.displayName = "CashFlowStatementPrint";

export default CashFlowStatementPrint;
