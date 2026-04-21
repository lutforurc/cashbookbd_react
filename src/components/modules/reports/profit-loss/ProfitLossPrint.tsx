import React, { forwardRef } from "react";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";

const fmtZero = (n: number) => thousandSeparator(n || 0);
const fmtEmptyIfZero = (n: number) => (n ? thousandSeparator(n) : "");

type Props = {
  report: any;
  title?: string;
  startDate?: string;
  endDate?: string;
  rowsPerPage?: number; // keep for compatibility (not needed here)
  fontSize?: number; // px
};

const ProfitLossPrint = forwardRef<HTMLDivElement, Props>(
  (
    { report, title = "Profit Loss", startDate = "-", endDate = "-", fontSize },
    ref
  ) => {
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 11;

    // âœ… fs à¦…à¦¨à§à¦¯à¦¾à§Ÿà§€ padding-y (9-11 => 0.5px, 12-15 => 0.7px, 16+ => 1)
    const cellPy = fs <= 11 ? "py-[0.5px]" : fs <= 15 ? "py-[.9px]" : "py-1";


    const pages = [1];

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((_, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />

            {/* Per-page header (CashBookPrint style) */}
            <div className="mb-2">
              <h1 style={{ fontSize: (fs + 3) }} className="font-bold text-center uppercase">{title}</h1>
              <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                <div>
                  <span className="font-semibold">Report Date:</span>{" "}
                  {startDate} â€” {endDate}
                </div>
              </div>
            </div>

            {/* ===== TRADING ===== */}
            <div style={{ fontSize: (fs + 1) }} className="mb-2 text-center font-semibold">
              PROFIT OR LOSS A/C (TRADING A/C)
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th
                      style={{ fontSize: fs }}
                      className={`border-l-0 border-t border-b border-gray-900 border-r-0 px-2 ${cellPy} text-left`}
                    >
                      Particulars
                    </th>

                    {/* Amount column (no left/right border) */}
                    <th
                      style={{ fontSize: fs }}
                      className={`border-t border-b border-gray-900 border-l-0 border-r-0 px-2 ${cellPy} w-[100px] text-right`}
                    >
                      {/* blank title */}
                    </th>

                    <th
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} w-[100px] text-right`}
                    >
                      Debit (Tk.)
                    </th>

                    <th
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} w-[100px] text-right`}
                    >
                      Credit (Tk.)
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr className="avoid-break">
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy}`}
                    >
                      Opening Stock
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border-t border-b border-gray-900 border-l-0 border-r-0 px-2 ${cellPy} text-right`}
                    ></td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(report?.trading?.opening)}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(0)}
                    </td>
                  </tr>

                  <tr className="avoid-break">
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy}`}
                    >
                      Closing Stock
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
                    ></td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(0)}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(report?.trading?.closing)}
                    </td>
                  </tr>

                  {/* Purchase Breakdown */}
                  <tr className="avoid-break">
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} pl-6`}
                    >
                      Purchase
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtEmptyIfZero(report?.trading?.purchaseDebit)}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-right`}
                    ></td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    ></td>
                  </tr>

                  {Number(report?.trading?.purchaseDiscountCredit || 0) > 0 ? (
                    <tr className="avoid-break">
                      <td
                        style={{ fontSize: fs }}
                        className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} pl-6`}
                      >
                        (-) Purchase Discount
                      </td>

                      <td
                        style={{ fontSize: fs }}
                        className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
                      >
                        {fmtEmptyIfZero(report?.trading?.purchaseDiscountCredit)}
                      </td>

                      <td
                        style={{ fontSize: fs }}
                        className={`border border-gray-900 px-2 ${cellPy} text-right`}
                      ></td>

                      <td
                        style={{ fontSize: fs }}
                        className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                      ></td>
                    </tr>
                  ) : null}

                  <tr className="avoid-break font-bold">
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy}`}
                    >
                      Net Purchase
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
                    ></td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(report?.trading?.netPurchase)}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(0)}
                    </td>
                  </tr>

                  {/* Sales Breakdown */}
                  <tr className="avoid-break">
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} pl-6`}
                    >
                      Sales
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtEmptyIfZero(report?.trading?.salesCredit)}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-right`}
                    ></td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    ></td>
                  </tr>

                  {Number(report?.trading?.salesDiscountDebit || 0) > 0 ? (
                    <tr className="avoid-break">
                      <td
                        style={{ fontSize: fs }}
                        className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} pl-6`}
                      >
                        (-) Sales Discount
                      </td>

                      <td
                        style={{ fontSize: fs }}
                        className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
                      >
                        {fmtEmptyIfZero(report?.trading?.salesDiscountDebit)}
                      </td>

                      <td
                        style={{ fontSize: fs }}
                        className={`border border-gray-900 px-2 ${cellPy} text-right`}
                      ></td>

                      <td
                        style={{ fontSize: fs }}
                        className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                      ></td>
                    </tr>
                  ) : null}

                  <tr className="avoid-break font-bold">
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy}`}
                    >
                      Net Sales
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
                    ></td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(0)}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(report?.trading?.netSalesCredit)}
                    </td>
                  </tr>

                  <tr className="avoid-break font-bold">
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy}`}
                    >
                      {Number(report?.trading?.grossProfit || 0) > 0
                        ? "Gross Profit"
                        : "Gross Loss"}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
                    ></td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(
                        Number(report?.trading?.grossProfit || 0) > 0
                          ? report?.trading?.grossProfit
                          : 0
                      )}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(
                        Number(report?.trading?.grossLoss || 0) > 0
                          ? report?.trading?.grossLoss
                          : 0
                      )}
                    </td>
                  </tr>

                  <tr className="avoid-break font-bold">
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy}`}
                    >
                      Total
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
                    ></td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(report?.trading?.totalDebit)}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(report?.trading?.totalCredit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ===== NET PROFIT/LOSS ===== */}
            <div style={{ fontSize: fs + 1 }} className="mt-3 mb-2 text-center font-semibold">
              NET PROFIT OR LOSS A/C
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-left border-r-0`}
                    >
                      Particulars
                    </th>

                    <th
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy} w-[100px]`}
                    ></th>

                    <th
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} w-[100px] text-right`}
                    >
                      Debit (Tk.)
                    </th>

                    <th
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} w-[100px] text-right`}
                    >
                      Credit (Tk.)
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr className="avoid-break font-bold">
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy}`}
                    >
                      {Number(report?.net?.grossProfit || 0) > 0
                        ? "Gross Profit B/F"
                        : "Gross Loss B/F"}
                    </td>

                    <th
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy}`}
                    ></th>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(
                        Number(report?.net?.grossLoss || 0) > 0
                          ? report?.net?.grossLoss
                          : 0
                      )}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(
                        Number(report?.net?.grossProfit || 0) > 0
                          ? report?.net?.grossProfit
                          : 0
                      )}
                    </td>
                  </tr>

                  {Array.isArray(report?.net?.expenses) &&
                    report.net.expenses.map((r: any, idx: number) => (
                      <tr key={`exp-${idx}`} className="avoid-break">
                        <td
                          style={{ fontSize: fs }}
                          className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} pl-6`}
                        >
                          (-) {r?.name}
                        </td>

                        <td
                          style={{ fontSize: fs }}
                          className={`border border-l-0 border-gray-900 px-2 ${cellPy} text-right`}
                        >
                          {fmtZero(Number(r?.debit || 0))}
                        </td>

                        <td
                          style={{ fontSize: fs }}
                          className={`border border-gray-900 px-2 ${cellPy} text-right`}
                        ></td>

                        <td
                          style={{ fontSize: fs }}
                          className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                        ></td>
                      </tr>
                    ))}

                  <tr className="avoid-break font-bold">
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy}`}
                    >
                      Total Expense
                    </td>

                    <th
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy}`}
                    ></th>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(report?.net?.totalExpense)}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    ></td>
                  </tr>

                  {Array.isArray(report?.net?.incomes) &&
                  report.net.incomes.length > 0 ? (
                    <>
                      {report.net.incomes.map((r: any, idx: number) => (
                        <tr key={`inc-${idx}`} className="avoid-break">
                          <td
                            style={{ fontSize: fs }}
                            className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy} pl-6`}
                          >
                            (+) {r?.name}
                          </td>

                          <th
                            style={{ fontSize: fs }}
                            className={`border border-l-0 border-gray-900 px-2 ${cellPy}`}
                          ></th>

                          <td
                            style={{ fontSize: fs }}
                            className={`border border-gray-900 px-2 ${cellPy} text-right`}
                          ></td>

                          <td
                            style={{ fontSize: fs }}
                            className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                          >
                            {fmtZero(Number(r?.credit || 0))}
                          </td>
                        </tr>
                      ))}

                      <tr className="avoid-break font-bold">
                        <td
                          style={{ fontSize: fs }}
                          className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy}`}
                        >
                          Total Income
                        </td>

                        <th
                          style={{ fontSize: fs }}
                          className={`border border-l-0 border-gray-900 px-2 ${cellPy}`}
                        ></th>

                        <td
                          style={{ fontSize: fs }}
                          className={`border border-gray-900 px-2 ${cellPy} text-right`}
                        ></td>

                        <td
                          style={{ fontSize: fs }}
                          className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                        >
                          {fmtZero(report?.net?.totalIncome)}
                        </td>
                      </tr>
                    </>
                  ) : null}

                  <tr className="avoid-break font-bold">
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy}`}
                    >
                      {Number(report?.net?.netProfit || 0) > 0
                        ? "Net Profit"
                        : "Net Loss"}
                    </td>

                    <th
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy}`}
                    ></th>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(
                        Number(report?.net?.netProfit || 0) > 0
                          ? report?.net?.netProfit
                          : 0
                      )}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(
                        Number(report?.net?.netLoss || 0) > 0
                          ? report?.net?.netLoss
                          : 0
                      )}
                    </td>
                  </tr>

                  <tr className="avoid-break font-bold">
                    <td
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-r-0 border-gray-900 px-2 ${cellPy}`}
                    >
                      Total
                    </td>

                    <th
                      style={{ fontSize: fs }}
                      className={`border border-l-0 border-gray-900 px-2 ${cellPy}`}
                    ></th>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-gray-900 px-2 ${cellPy} text-right`}
                    >
                      {fmtZero(report?.net?.totalDebit)}
                    </td>

                    <td
                      style={{ fontSize: fs }}
                      className={`border border-r-0 border-gray-900 px-2 ${cellPy} text-right`}
                    >
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