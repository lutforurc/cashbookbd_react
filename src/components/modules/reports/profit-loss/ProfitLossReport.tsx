import type { ReactNode } from "react";

import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

type NetRow = {
  name?: string;
  debit?: number | string;
  credit?: number | string;
};

type ProfitLossReportData = {
  trading: {
    opening: number;
    closing: number;
    purchaseDebit: number;
    purchaseReturnCredit: number;
    purchaseDiscountCredit: number;
    netPurchase: number;
    salesCredit: number;
    salesDiscountDebit: number;
    salesReturnDebit: number;
    netSalesCredit: number;
    grossProfit: number;
    grossLoss: number;
    totalDebit: number;
    totalCredit: number;
  };
  net: {
    grossProfit: number;
    grossLoss: number;
    expenses: NetRow[];
    incomes: NetRow[];
    totalExpense: number;
    totalIncome: number;
    netProfit: number;
    netLoss: number;
    totalDebit: number;
    totalCredit: number;
  };
};

type ProfitLossReportProps = {
  loading?: boolean;
  report: ProfitLossReportData;
  loader: ReactNode;
  onNetExpenseClick?: (row: NetRow) => void;
};

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtZero = (n: number) => thousandSeparator(n || 0, 0);
const fmtEmptyIfZero = (n: number) => (n ? thousandSeparator(n, 0) : "");

const ProfitLossReport = ({
  loading = false,
  report,
  loader,
  onNetExpenseClick,
}: ProfitLossReportProps) => {
  return (
    <div className="overflow-x-auto dark:bg-gray-800 dark:text-gray-300 p-3 rounded">
      {loading ? loader : null}

      <div className="text-center font-semibold mb-2 dark:text-white text-black p-2">
        PROFIT OR LOSS A/C (TRADING A/C)
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b dark:border-gray-700 border-gray-200">
            <th className="text-left text-black dark:text-white p-2">Particulars</th>
            <th className="text-right text-black dark:text-white p-2 w-30"></th>
            <th className="text-right text-black dark:text-white p-2 w-[160px]">Debit (Tk.)</th>
            <th className="text-right text-black dark:text-white p-2 w-[160px]">Credit (Tk.)</th>
          </tr>
        </thead>

        <tbody>
          <tr className="border-b dark:border-gray-700 border-gray-200">
            <td className="text-black dark:text-white p-2">Opening Stock</td>
            <td className="text-black dark:text-white p-2 text-right"></td>
            <td className="text-black dark:text-white p-2 text-right">{fmtZero(report.trading.opening)}</td>
            <td className="text-black dark:text-white p-2 text-right">{fmtZero(0)}</td>
          </tr>

          <tr className="border-b dark:border-gray-700 border-gray-200">
            <td className="text-black dark:text-white p-2">Closing Stock</td>
            <td className="text-black dark:text-white p-2 text-right"></td>
            <td className="text-black dark:text-white p-2 text-right">{fmtZero(0)}</td>
            <td className="text-black dark:text-white p-2 text-right">{fmtZero(report.trading.closing)}</td>
          </tr>

          {report.trading.purchaseDiscountCredit || report.trading.purchaseReturnCredit ? (
            <tr className="border-b dark:border-gray-700 border-gray-200">
              <td className="text-black dark:text-white p-2 pl-6">Purchase</td>
              <td className="text-black dark:text-white p-2 text-right">
                {fmtEmptyIfZero(report.trading.purchaseDebit)}
              </td>
              <td className="text-black dark:text-white p-2 text-right"></td>
              <td className="text-black dark:text-white p-2 text-right"></td>
            </tr>
          ) : null}

          {report.trading.purchaseReturnCredit > 0 ? (
            <tr className="border-b dark:border-gray-700 border-gray-200">
              <td className="text-black dark:text-white p-2 pl-6">(-) Purchase Return</td>
              <td className="text-black dark:text-white p-2 text-right">
                {fmtEmptyIfZero(report.trading.purchaseReturnCredit)}
              </td>
              <td className="text-black dark:text-white p-2 text-right"></td>
              <td className="text-black dark:text-white p-2 text-right"></td>
            </tr>
          ) : null}

          {report.trading.purchaseDiscountCredit > 0 ? (
            <tr className="border-b dark:border-gray-700 border-gray-200">
              <td className="text-black dark:text-white p-2 pl-6">(-) Purchase Discount</td>
              <td className="text-black dark:text-white p-2 text-right">
                {fmtEmptyIfZero(report.trading.purchaseDiscountCredit)}
              </td>
              <td className="text-black dark:text-white p-2 text-right"></td>
              <td className="text-black dark:text-white p-2 text-right"></td>
            </tr>
          ) : null}

          <tr className="border-b dark:border-gray-700 border-gray-200 font-semibold">
            <td className="text-black dark:text-white p-2">Net Purchase</td>
            <td
              className={`text-black dark:text-white p-2 text-right ${
                report.trading.purchaseDiscountCredit || report.trading.purchaseReturnCredit
                  ? "border-t dark:border-gray-100 border-gray-600"
                  : ""
              }`}
            ></td>
            <td className="text-black dark:text-white p-2 text-right">{fmtZero(report.trading.netPurchase)}</td>
            <td className="text-black dark:text-white p-2 text-right">{fmtZero(0)}</td>
          </tr>

          {report.trading.salesDiscountDebit || report.trading.salesReturnDebit ? (
            <tr className="border-b dark:border-gray-700 border-gray-200">
              <td className="text-black dark:text-white p-2 pl-6">Sales</td>
              <td className="text-black dark:text-white p-2 text-right">
                {fmtEmptyIfZero(report.trading.salesCredit)}
              </td>
              <td className="text-black dark:text-white p-2 text-right"></td>
              <td className="text-black dark:text-white p-2 text-right"></td>
            </tr>
          ) : null}

          {report.trading.salesDiscountDebit > 0 ? (
            <tr className="border-b dark:border-gray-700 border-gray-200">
              <td className="text-black dark:text-white p-2 pl-6">(-) Sales Discount</td>
              <td className="text-black dark:text-white p-2 text-right w-30">
                {fmtEmptyIfZero(report.trading.salesDiscountDebit)}
              </td>
              <td className="text-black dark:text-white p-2 text-right"></td>
              <td className="text-black dark:text-white p-2 text-right"></td>
            </tr>
          ) : null}

          {report.trading.salesReturnDebit > 0 ? (
            <tr className="border-b dark:border-gray-700 border-gray-200">
              <td className="text-black dark:text-white p-2 pl-6">(-) Sales Return</td>
              <td className="text-black dark:text-white p-2 text-right w-30">
                {fmtEmptyIfZero(report.trading.salesReturnDebit)}
              </td>
              <td className="text-black dark:text-white p-2 text-right"></td>
              <td className="text-black dark:text-white p-2 text-right"></td>
            </tr>
          ) : null}

          <tr className="border-b dark:border-gray-700 border-gray-200 font-semibold">
            <td className="text-black dark:text-white p-2">Net Sales</td>
            <td
              className={`text-black dark:text-white p-2 text-right ${
                report.trading.salesDiscountDebit || report.trading.salesReturnDebit
                  ? "border-t dark:border-gray-100 border-gray-600"
                  : ""
              }`}
            ></td>
            <td className="text-black dark:text-white p-2 text-right">{fmtZero(0)}</td>
            <td className="text-black dark:text-white p-2 text-right">{fmtZero(report.trading.netSalesCredit)}</td>
          </tr>

          <tr className="border-b dark:border-gray-700 border-gray-200 font-semibold">
            <td className="text-black dark:text-white p-2">
              {report.trading.grossProfit > 0 ? "Gross Profit" : "Gross Loss"}
            </td>
            <td className="text-black dark:text-white p-2 text-right"></td>
            <td className="text-black dark:text-white p-2 text-right">
              {fmtZero(report.trading.grossProfit > 0 ? report.trading.grossProfit : 0)}
            </td>
            <td className="text-black dark:text-white p-2 text-right">
              {fmtZero(report.trading.grossLoss > 0 ? report.trading.grossLoss : 0)}
            </td>
          </tr>

          <tr className="font-semibold border-t-2 dark:border-gray-300 border-gray-600">
            <td className="text-black dark:text-white p-2">Total</td>
            <td className="text-black dark:text-white p-2 text-right"></td>
            <td className="text-black dark:text-white p-2 text-right">{fmtZero(report.trading.totalDebit)}</td>
            <td className="text-black dark:text-white p-2 text-right">{fmtZero(report.trading.totalCredit)}</td>
          </tr>
        </tbody>
      </table>

      <div className="text-center font-semibold mt-6 mb-2 text-black dark:text-white">
        NET PROFIT OR LOSS A/C
      </div>

      <table className="w-full text-sm text-black dark:text-white">
        <thead>
          <tr className="border-b dark:border-gray-700 border-gray-200">
            <th className="text-left p-2">Particulars</th>
            <th className="text-right p-2"></th>
            <th className="text-right p-2 w-[160px]">Debit (Tk.)</th>
            <th className="text-right p-2 w-[160px]">Credit (Tk.)</th>
          </tr>
        </thead>

        <tbody>
          <tr className="border-b dark:border-gray-700 border-gray-200 font-semibold">
            <td className="p-2">{report.net.grossProfit > 0 ? "Gross Profit B/F" : "Gross Loss B/F"}</td>
            <td></td>
            <td className="p-2 text-right">{fmtZero(report.net.grossLoss > 0 ? report.net.grossLoss : 0)}</td>
            <td className="p-2 text-right">{fmtZero(report.net.grossProfit > 0 ? report.net.grossProfit : 0)}</td>
          </tr>

          {report.net.expenses.map((r, idx) => (
            <tr key={`exp-${idx}`} className="border-b dark:border-gray-700 border-gray-200">
              <td className="p-2 pl-6">
                {onNetExpenseClick ? (
                  <button
                    type="button"
                    onClick={() => onNetExpenseClick(r)}
                    className="text-left text-sky-700 underline decoration-dotted underline-offset-4 transition hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200"
                  >
                    (-) {r.name}
                  </button>
                ) : (
                  <> (-) {r.name}</>
                )}
              </td>
              <td className="p-2 text-right">{fmtZero(toNum(r.debit))}</td>
              <td></td>
              <td className="p-2 text-right"></td>
            </tr>
          ))}

          <tr className="border-b dark:border-gray-700 border-gray-200 font-semibold">
            <td className="p-2">Total Expense</td>
            <td
              className={`text-black dark:text-white p-2 text-right w-30 ${
                report.net.expenses.length > 0 ? "border-t dark:border-gray-100 border-gray-600" : ""
              }`}
            ></td>
            <td className="p-2 text-right">{fmtZero(report.net.totalExpense)}</td>
            <td className="p-2 text-right"></td>
          </tr>

          {report.net.incomes.length > 0 ? (
            <>
              {report.net.incomes.map((r, idx) => (
                <tr key={`inc-${idx}`} className="border-b dark:border-gray-700 border-gray-200">
                  <td className="p-2 pl-6">{r.name}</td>
                  <td className="p-2 text-right">
                    {(() => {
                      const net = toNum(r.credit) - toNum(r.debit);
                      return net > 0 ? fmtZero(net) : fmtZero(0);
                    })()}
                  </td>
                  <td className="p-2 text-right"></td>
                  <td className="p-2 text-right"></td>
                </tr>
              ))}

              <tr className="border-b dark:border-gray-700 border-gray-200 font-semibold">
                <td className="p-2">Total Income</td>
                <td className="p-2 text-right border-t"></td>
                <td className="p-2 text-right"></td>
                <td className="p-2 text-right">{fmtZero(report.net.totalIncome)}</td>
              </tr>
            </>
          ) : null}

          <tr className="border-b dark:border-gray-700 border-gray-200 font-semibold">
            <td className="p-2">{report.net.netProfit > 0 ? "Net Profit" : "Net Loss"}</td>
            <td className="p-2 text-right"></td>
            <td className="p-2 text-right">{fmtZero(report.net.netProfit > 0 ? report.net.netProfit : 0)}</td>
            <td className="p-2 text-right">{fmtZero(report.net.netLoss > 0 ? report.net.netLoss : 0)}</td>
          </tr>

          <tr className="font-semibold border-t-2 dark:border-gray-300 border-gray-600">
            <td className="p-2">Total</td>
            <td className="p-2 text-right"></td>
            <td className="p-2 text-right">{fmtZero(report.net.totalDebit)}</td>
            <td className="p-2 text-right">{fmtZero(report.net.totalCredit)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ProfitLossReport;
