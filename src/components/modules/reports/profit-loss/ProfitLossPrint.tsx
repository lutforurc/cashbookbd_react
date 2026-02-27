import React, { forwardRef } from "react";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";

const fmtZero = (n: number) => thousandSeparator(n || 0, 0);
const fmtEmptyIfZero = (n: number) => (n ? thousandSeparator(n, 0) : "");

type Props = {
  report: any;
  title?: string;
  startDate?: string;
  endDate?: string;
  rowsPerPage?: number; // keep for compatibility (not needed here)
  fontSize?: number;    // px
};

const ProfitLossPrint = forwardRef<HTMLDivElement, Props>(
  (
    {
      report,
      title = "Profit Loss",
      startDate = "-",
      endDate = "-",
      fontSize,
    },
    ref
  ) => {
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 11;

    // Profit/Loss সাধারণত ১ পেজেই থাকে, তবু CashBookPrint এর মতো wrapper রাখলাম
    const pages = [1];

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((_, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />

            {/* Per-page header (CashBookPrint style) */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-center">{title}</h1>
              <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                <div>
                  <span className="font-semibold">Report Date:</span>{" "}
                  {startDate} — {endDate}
                </div>
              </div>
            </div>

            {/* ===== TRADING ===== */}
            <div className="mb-2 text-center font-semibold">
              PROFIT OR LOSS A/C (TRADING A/C)
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th
                      style={{ fontSize: fs }}
                      className="border-l-0 border-t border-b border-gray-900 border-r-0 px-2 py-1 text-left"
                    >
                      Particulars
                    </th>

                    {/* Amount column (no left/right border) */}
                    <th
                      style={{ fontSize: fs }}
                      className="border-t border-b border-gray-900 border-l-0 border-r-0 px-2 py-1 w-[100px] text-right"
                    >
                      {/* blank title */}
                    </th>
                    <th
                      style={{ fontSize: fs }}
                      className="border border-gray-900  px-2 py-1 w-[100px] text-right"
                    >
                      Debit (Tk.)
                    </th>

                    <th
                      style={{ fontSize: fs }}
                      className="border border-r-0 border-gray-900 px-2 py-1 w-[100px] text-right"
                    >
                      Credit (Tk.)
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr className="avoid-break">
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0  border-gray-900 px-2 py-1">
                      Opening Stock
                    </td>
                    <td
                      style={{ fontSize: fs }}
                      className="border-t border-b border-gray-900 border-l-0 border-r-0 px-2 py-1 text-right"
                    ></td>

                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {fmtZero(report?.trading?.opening)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right">
                      {fmtZero(0)}
                    </td>
                  </tr>
                  <tr className="avoid-break">
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1">
                      Closing Stock
                    </td>
                    <td style={{ fontSize: fs }} className="border border-l-0 border-gray-900 px-2 py-1 text-right"></td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {fmtZero(0)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right">
                      {fmtZero(report?.trading?.closing)}
                    </td>
                  </tr>
                  {/* Purchase Breakdown */}
                  <tr className="avoid-break">
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1 pl-6">
                      Purchase
                    </td>
                    <td style={{ fontSize: fs }} className="border border-l-0 border-gray-900 px-2 py-1 text-right">
                      {fmtEmptyIfZero(report?.trading?.purchaseDebit)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right"></td>
                    <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right"></td>
                  </tr>

                  {Number(report?.trading?.purchaseDiscountCredit || 0) > 0 ? (
                    <tr className="avoid-break">
                      <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1 pl-6">
                        (-) Purchase Discount
                      </td>
                      {/* underline like blade inside amount column */}
                      <td
                        style={{ fontSize: fs }}
                        className="border border-l-0 border-gray-900 px-2 py-1 text-right"
                      >
                        <span style={{ display: "inline-block", paddingBottom: "2px" }}>
                          {fmtEmptyIfZero(report?.trading?.purchaseDiscountCredit)}
                        </span>
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right"></td>
                      <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right"></td>
                    </tr>
                  ) : null}

                  <tr className="avoid-break font-bold">
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1">
                      Net Purchase
                    </td>
                    <td style={{ fontSize: fs }} className="border border-l-0 border-gray-900 px-2 py-1 text-right"></td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {fmtZero(report?.trading?.netPurchase)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right">
                      {fmtZero(0)}
                    </td>
                  </tr>

                  {/* Sales Breakdown */}
                  <tr className="avoid-break">
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1 pl-6">
                      Sales
                    </td>
                    <td style={{ fontSize: fs }} className="border border-l-0 border-gray-900 px-2 py-1 text-right">
                      {fmtEmptyIfZero(report?.trading?.salesCredit)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right"></td>
                    <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right"></td>
                  </tr>

                  {Number(report?.trading?.salesDiscountDebit || 0) > 0 ? (
                    <tr className="avoid-break">
                      <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1 pl-6">
                        (-) Sales Discount
                      </td>
                      <td
                        style={{ fontSize: fs }}
                        className="border border-l-0 border-gray-900 px-2 py-1 text-right"
                      >
                        <span style={{ display: "inline-block", paddingBottom: "2px" }}>
                          {fmtEmptyIfZero(report?.trading?.salesDiscountDebit)}
                        </span>
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right"></td>
                      <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right"></td>
                    </tr>
                  ) : null}

                  <tr className="avoid-break font-bold">
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1">
                      Net Sales
                    </td>
                    <td style={{ fontSize: fs }} className="border border-l-0 border-gray-900 px-2 py-1 text-right"></td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {fmtZero(0)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right">
                      {fmtZero(report?.trading?.netSalesCredit)}
                    </td>
                  </tr>

                  <tr className="avoid-break font-bold">
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1">
                      {Number(report?.trading?.grossProfit || 0) > 0 ? "Gross Profit" : "Gross Loss"}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-l-0 border-gray-900 px-2 py-1 text-right"></td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {fmtZero(Number(report?.trading?.grossProfit || 0) > 0 ? report?.trading?.grossProfit : 0)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right">
                      {fmtZero(Number(report?.trading?.grossLoss || 0) > 0 ? report?.trading?.grossLoss : 0)}
                    </td>
                  </tr>

                  <tr className="avoid-break font-bold">
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1">
                      Total
                    </td>
                    <td style={{ fontSize: fs }} className="border border-l-0 border-gray-900 px-2 py-1 text-right"></td>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {fmtZero(report?.trading?.totalDebit)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right">
                      {fmtZero(report?.trading?.totalCredit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ===== NET PROFIT/LOSS ===== */}
            <div className="mt-3 mb-2 text-center font-semibold">
              NET PROFIT OR LOSS A/C
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th
                      style={{ fontSize: fs }}
                      className="border border-l-0 border-gray-900 px-2 py-1 text-left border-r-0"
                    >
                      Particulars
                    </th>
                    <th className="border border-l-0 border-gray-900 px-2 py-1 w-[100px]"></th>
                    <th
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-1 w-[100px] text-right"
                    >
                      Debit (Tk.)
                    </th>
                    <th
                      style={{ fontSize: fs }}
                      className="border border-r-0 border-gray-900 px-2 py-1 w-[100px] text-right"
                    >
                      Credit (Tk.)
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr className="avoid-break font-bold">
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1">
                      {Number(report?.net?.grossProfit || 0) > 0 ? "Gross Profit B/F" : "Gross Loss B/F"}
                    </td>
                    <th className="border border-l-0 border-gray-900 px-2 py-1"></th>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {fmtZero(Number(report?.net?.grossLoss || 0) > 0 ? report?.net?.grossLoss : 0)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1 text-right">
                      {fmtZero(Number(report?.net?.grossProfit || 0) > 0 ? report?.net?.grossProfit : 0)}
                    </td>
                  </tr>

                  {Array.isArray(report?.net?.expenses) &&
                    report.net.expenses.map((r: any, idx: number) => (
                      <tr key={`exp-${idx}`} className="avoid-break">
                        <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1 pl-6">
                          (-) {r?.name}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-l-0 border-gray-900 px-2 py-1 text-right">{fmtZero(Number(r?.debit || 0))}</td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right"></td>
                        <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right"></td>
                      </tr>
                    ))}

                  <tr className="avoid-break font-bold">
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1">
                      Total Expense
                    </td>
                    <th className="border border-l-0 border-gray-900 px-2 py-1"></th>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {fmtZero(report?.net?.totalExpense)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right"></td>
                  </tr>

                  {Array.isArray(report?.net?.incomes) && report.net.incomes.length > 0 ? (
                    <>
                      {report.net.incomes.map((r: any, idx: number) => (
                        <tr key={`inc-${idx}`} className="avoid-break">
                          <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1 pl-6">
                            {r?.name}
                          </td>
                          <th style={{ fontSize: fs }} className="border border-l-0 border-gray-900 px-2 py-1"></th>
                          <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right"></td>
                          <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right">
                            {fmtZero(Number(r?.credit || 0))}
                          </td>
                        </tr>
                      ))}

                      <tr className="avoid-break font-bold">
                        <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1">
                          Total Income
                        </td>
                        <th className="border border-l-0 border-gray-900 px-2 py-1"></th>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right"></td>
                        <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right">
                          {fmtZero(report?.net?.totalIncome)}
                        </td>
                      </tr>
                    </>
                  ) : null}

                  <tr className="avoid-break font-bold">
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1">
                      {Number(report?.net?.netProfit || 0) > 0 ? "Net Profit" : "Net Loss"}
                    </td>
                    <th className="border border-l-0 border-gray-900 px-2 py-1"></th>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {fmtZero(Number(report?.net?.netProfit || 0) > 0 ? report?.net?.netProfit : 0)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right">
                      {fmtZero(Number(report?.net?.netLoss || 0) > 0 ? report?.net?.netLoss : 0)}
                    </td>
                  </tr>
                  <tr className="avoid-break font-bold">
                    <td style={{ fontSize: fs }} className="border border-l-0 border-r-0 border-gray-900 px-2 py-1">
                      Total
                    </td>
                    <th className="border border-l-0 border-gray-900 px-2 py-1"></th>
                    <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                      {fmtZero(report?.net?.totalDebit)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-r-0 border-gray-900 px-2 py-1 text-right">
                      {fmtZero(report?.net?.totalCredit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Page footer (CashBookPrint style) */}
            <div style={{ fontSize: fs }} className="mt-auto text-right text-xs">
              Page {pIdx + 1} of {pages.length}
            </div>

            {pIdx !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}

        {/* Note */}
        <div className="mt-2 text-xs text-gray-900">
          * This document is system generated.
        </div>
      </div>
    );
  }
);

ProfitLossPrint.displayName = "ProfitLossPrint";
export default ProfitLossPrint;