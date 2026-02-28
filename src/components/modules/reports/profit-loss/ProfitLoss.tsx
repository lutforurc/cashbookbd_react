import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";

import {
  ButtonLoading,
  PrintButton,
} from "../../../../pages/UiElements/CustomButtons";
import InputDatePicker from "../../../utils/fields/DatePicker";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import InputElement from "../../../utils/fields/InputElement";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { fetchProfitLoss } from "./profitLossSlice";
import ProfitLossPrint from "./ProfitLossPrint";

type TradingRow = {
  coal3_id?: number | string;
  coal4_id?: number | string;
  name?: string;
  coal4_name?: string;
  debit?: number | string;
  credit?: number | string;
};

type NetRow = {
  name?: string;
  debit?: number | string;
  credit?: number | string;
};

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Blade-এর মতো 0 হলে 0 দেখাবে
const fmtZero = (n: number) => thousandSeparator(n || 0, 0);

// Breakdown লাইনে 0 হলে খালি রাখবে
const fmtEmptyIfZero = (n: number) => (n ? thousandSeparator(n, 0) : "");

const sumByIds = (rows: TradingRow[], coal3_id: number, coal4_id: number) => {
  return rows
    .filter(
      (r) =>
        Number(r.coal3_id) === coal3_id && Number(r.coal4_id) === coal4_id
    )
    .reduce(
      (acc, r) => {
        acc.debit += toNum(r.debit);
        acc.credit += toNum(r.credit);
        return acc;
      },
      { debit: 0, credit: 0 }
    );
};

const ProfitLoss = (user: any) => {
  const dispatch = useDispatch();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const profitLossState: any = useSelector((state: any) => state.profitLoss);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [buttonLoading, setButtonLoading] = useState(false);
  const [perPage, setPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    setBranchId(Number(user?.user?.branch_id) || null);
  }, []);

  useEffect(() => {
    const protectedData = branchDdlData?.protectedData;
    if (!protectedData) return;

    const { data: ddl, transactionDate: trxDate } = protectedData;

    if (ddl) {
      setDropdownData(ddl);
    }

    if (trxDate) {
      try {
        const [day, month, year] = trxDate
          .split("/")
          .map((str: string) => Number(str.trim()));

        if (isNaN(year) || year < 1900 || year > 2100) {
          console.warn("Invalid year in transactionDate:", trxDate);
          return;
        }

        const startOfYear = new Date(year, 0, 1);
        setStartDate(startOfYear);

        const endDateValue = new Date(year, month - 1, day);
        setEndDate(endDateValue);
      } catch (error) {
        console.warn("Failed to parse transactionDate:", trxDate, error);
      }
    }
  }, [
    branchDdlData?.protectedData?.data,
    branchDdlData?.protectedData?.transactionDate,
  ]);

  const handleBranchChange = (e: any) => {
    const v = Number(e.target.value);
    setBranchId(Number.isFinite(v) ? v : null);
  };

  const handleActionButtonClick = async () => {
    if (!branchId) return alert("Branch select করুন");
    if (!startDate || !endDate) return alert("Start/End Date দিন");

    const startD = dayjs(startDate).format("YYYY-MM-DD");
    const endD = dayjs(endDate).format("YYYY-MM-DD");

    setButtonLoading(true);

    const action = await dispatch(
      fetchProfitLoss({
        branch_id: Number(branchId),
        startDate: startD,
        endDate: endD,
      }) as any
    );

    setButtonLoading(false);

    if (action?.meta?.requestStatus !== "fulfilled") {
      alert(action?.payload || "Profit & loss load failed");
    }
  };

  // nested data normalize (আপনার sample অনুযায়ী)
  const apiData = useMemo(() => {
    const raw = profitLossState?.data;

    if (raw?.data?.data?.trading) return raw.data.data;
    if (raw?.data?.trading) return raw.data;
    if (raw?.trading) return raw;

    return null;
  }, [profitLossState?.data]);





  const report = useMemo(() => {
    const trading: TradingRow[] = apiData?.trading || [];
    const netprofit: NetRow[] = apiData?.netprofit || [];

    // Opening Stock: coal3_id=29 coal4_id=18 => debit
    const opening = sumByIds(trading, 29, 18).debit;

    // Closing Stock: coal3_id=29 coal4_id=21 => credit
    const closing = sumByIds(trading, 29, 21).credit;

    // Purchase: coal3_id=9 coal4_id=35 => debit
    const purchaseDebit = sumByIds(trading, 9, 35).debit;

    // ✅ Purchase Return: coal3_id=9 coal4_id=16 => credit (এটাই বাদ যাবে)
    const purchaseReturnCredit = sumByIds(trading, 9, 16).credit;

    // Purchase Discount: coal3_id=8 coal4_id=40 => credit
    const purchaseDiscountCredit = sumByIds(trading, 8, 40).credit;

    // ✅ Net Purchase = Purchase - Purchase Return - Purchase Discount
    const netPurchase = Math.max(
      0,
      purchaseDebit - purchaseReturnCredit - purchaseDiscountCredit
    );

    // Sales: coal3_id=7 coal4_id=15 => credit
    const salesCredit = sumByIds(trading, 7, 15).credit;

    // Sales Discount: coal3_id=7 coal4_id=23 => debit
    const salesDiscountDebit = sumByIds(trading, 7, 23).debit;

    // ✅ Sales Return: coal3_id=7 coal4_id=19 => debit (এটাই বাদ যাবে)
    const salesReturnDebit = sumByIds(trading, 7, 19).debit;

    // ✅ Net Sales = Sales - Sales Discount - Sales Return
    const netSalesCredit = Math.max(
      0,
      salesCredit - salesDiscountDebit - salesReturnDebit
    );

    // Trading base
    const debitBase = opening + netPurchase;
    const creditBase = closing + netSalesCredit;

    // Blade balancing
    const grossProfit = creditBase > debitBase ? creditBase - debitBase : 0;
    const grossLoss = debitBase > creditBase ? debitBase - creditBase : 0;

    const tradingTotalDebit = grossProfit > 0 ? debitBase + grossProfit : debitBase;
    const tradingTotalCredit = grossLoss > 0 ? creditBase + grossLoss : creditBase;

    const expenseRows = netprofit.filter((r) => toNum(r.debit) > 0 && toNum(r.credit) <= 0    );
    const incomeRows = netprofit.filter((r) => toNum(r.credit) > 0);

    const totalExpense = expenseRows.reduce((s, r) => s + toNum(r.debit), 0);

    const totalIncome = incomeRows.reduce((s, r) => {
      const net = toNum(r.credit) - toNum(r.debit);
      return s + (net > 0 ? net : 0);
    }, 0);

    const debitPLBase = grossLoss + totalExpense;
    const creditPLBase = grossProfit + totalIncome;

    const netProfit = creditPLBase > debitPLBase ? creditPLBase - debitPLBase : 0;
    const netLoss = debitPLBase > creditPLBase ? debitPLBase - creditPLBase : 0;

    const netTotalDebit = netProfit > 0 ? debitPLBase + netProfit : debitPLBase;
    const netTotalCredit = netLoss > 0 ? creditPLBase + netLoss : creditPLBase;

    return {
      trading: {
        opening,
        closing,

        purchaseDebit,
        purchaseReturnCredit,
        purchaseDiscountCredit,
        netPurchase,

        salesCredit,
        salesDiscountDebit,
        salesReturnDebit,
        netSalesCredit,

        grossProfit,
        grossLoss,
        totalDebit: tradingTotalDebit,
        totalCredit: tradingTotalCredit,
      },
      net: {
        grossProfit,
        grossLoss,
        expenses: expenseRows,
        incomes: incomeRows,
        totalExpense,
        totalIncome,
        netProfit,
        netLoss,
        totalDebit: netTotalDebit,
        totalCredit: netTotalCredit,
      },
    };
  }, [apiData]);
 


  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Profit Loss",
    removeAfterPrint: true,
  });

  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPerPage(Number.isFinite(value) ? value : 12);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFontSize(Number.isFinite(value) ? value : 12);
  };




  return (
    <div>
      <HelmetTitle title={"Profit Loss"} />

      {/* ===== Filters ===== */}
      <div className="flex justify-between mb-1">
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 w-full gap-2 text-black dark:text-white p-2">
          <div>
            <label>Select Branch</label>
            <div className="w-full">
              {branchDdlData?.isLoading ? <Loader /> : null}
              <BranchDropdown
                defaultValue={user?.user?.branch_id}
                onChange={handleBranchChange}
                className="w-60 font-medium text-sm p-1.5"
                branchDdl={dropdownData}
              />
            </div>
          </div>

          <div className="w-full">
            <label>Start Date</label>
            <InputDatePicker
              setCurrentDate={(d: any) => setStartDate(d)}
              className="font-medium text-sm w-full h-9"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
            />
          </div>

          <div className="w-full">
            <label>End Date</label>
            <InputDatePicker
              setCurrentDate={(d: any) => setEndDate(d)}
              className="font-medium text-sm w-full h-9"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>

          <div className="flex w-full">
            <div className="mr-2">
              <InputElement
                id="perPage"
                name="perPage"
                label="Rows"
                value={perPage.toString()}
                onChange={handlePerPageChange}
                type="text"
                className="font-medium text-sm h-9 w-12"
              />
            </div>

            <div className="mr-2">
              <InputElement
                id="fontSize"
                name="fontSize"
                label="Font"
                value={fontSize.toString()}
                onChange={handleFontSizeChange}
                type="text"
                className="font-medium text-sm h-9 w-12"
              />
            </div>

            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="Run"
              icon=""
              className="mt-6 pt-[0.45rem] pb-[0.45rem] h-9"
            />

            <PrintButton
              onClick={handlePrint}
              label=""
              className="ml-2 mt-6 pt-[0.45rem] pb-[0.45rem] h-9"
            />
          </div>
        </div>
      </div>

      {/* ===== Report ===== */}
      <div className="overflow-x-auto dark:bg-gray-800 dark:text-gray-300 p-3 rounded">
        {profitLossState?.loading ? <Loader /> : null}

        {/* TRADING */}
        <div className="text-center font-semibold mb-2 dark:text-white text-black p-2">
          PROFIT OR LOSS A/C (TRADING A/C)
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700 border-gray-200">
              <th className="text-left text-black dark:text-white p-2">Particulars</th>
              <th className="text-right text-black dark:text-white p-2 w-[220px]"></th>
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

            {/* Purchase Breakdown */}
            <tr className="border-b dark:border-gray-700 border-gray-200">
              <td className="text-black dark:text-white p-2 pl-6">Purchase</td>
              <td className="text-black dark:text-white p-2 text-right">
                {fmtEmptyIfZero(report.trading.purchaseDebit)}
              </td>
              <td className="text-black dark:text-white p-2 text-right"></td>
              <td className="text-black dark:text-white p-2 text-right"></td>
            </tr>

            {report.trading.purchaseReturnCredit > 0 ? (
              <tr className="border-b dark:border-gray-700 border-gray-200">
                <td className="text-black dark:text-white p-2 pl-6">(-) Purchase Return</td>
                <td className="text-black dark:text-white p-2 text-right ">
                  {fmtEmptyIfZero(report.trading.purchaseReturnCredit)}
                </td>
                <td className="text-black dark:text-white p-2 text-right"></td>
                <td className="text-black dark:text-white p-2 text-right"></td>
              </tr>
            ) : null}

            {report.trading.purchaseDiscountCredit > 0 ? (
              <tr className="border-b dark:border-gray-700 border-gray-200">
                <td className="text-black dark:text-white p-2 pl-6">(-) Purchase Discount</td>
                <td className="text-black dark:text-white p-2 text-right ">
                  {fmtEmptyIfZero(report.trading.purchaseDiscountCredit)}
                </td>
                <td className="text-black dark:text-white p-2 text-right"></td>
                <td className="text-black dark:text-white p-2 text-right"></td>
              </tr>
            ) : null}

            <tr className="border-b dark:border-gray-700 border-gray-200 font-semibold">
              <td className="text-black dark:text-white p-2">Net Purchase</td>
              <td className="text-black dark:text-white p-2 text-right border-t dark:border-gray-100 border-gray-600"></td>
              <td className="text-black dark:text-white p-2 text-right">{fmtZero(report.trading.netPurchase)}</td>
              <td className="text-black dark:text-white p-2 text-right">{fmtZero(0)}</td>
            </tr>

            {/* Sales Breakdown */}
            <tr className="border-b dark:border-gray-700 border-gray-200">
              <td className="text-black dark:text-white p-2 pl-6">Sales</td>
              <td className="text-black dark:text-white p-2 text-right">
                {fmtEmptyIfZero(report.trading.salesCredit)}
              </td>
              <td className="text-black dark:text-white p-2 text-right"></td>
              <td className="text-black dark:text-white p-2 text-right"></td>
            </tr>

            {report.trading.salesDiscountDebit > 0 ? (
              <tr className="border-b dark:border-gray-700 border-gray-200">
                <td className="text-black dark:text-white p-2 pl-6">(-) Sales Discount</td>
                <td className="text-black dark:text-white p-2 text-right ">
                  {fmtEmptyIfZero(report.trading.salesDiscountDebit)}
                </td>
                <td className="text-black dark:text-white p-2 text-right"></td>
                <td className="text-black dark:text-white p-2 text-right"></td>
              </tr>
            ) : null}

            {report.trading.salesReturnDebit > 0 ? (
              <tr className="border-b dark:border-gray-700 border-gray-200">
                <td className="text-black dark:text-white p-2 pl-6">(-) Sales Return</td>
                <td className="text-black dark:text-white p-2 text-right ">
                  {fmtEmptyIfZero(report.trading.salesReturnDebit)}
                </td>
                <td className="text-black dark:text-white p-2 text-right"></td>
                <td className="text-black dark:text-white p-2 text-right"></td>
              </tr>
            ) : null}

            <tr className="border-b dark:border-gray-700 border-gray-200 font-semibold">
              <td className="text-black dark:text-white p-2">Net Sales</td>
              <td className="text-black dark:text-white p-2 text-right border-t dark:border-gray-100 border-gray-600"></td>
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

            {report.net.expenses.map((r: any, idx: number) => (
              <tr key={`exp-${idx}`} className="border-b dark:border-gray-700 border-gray-200">
                <td className="p-2 pl-6">(-) {r.name}</td>
                <td className="p-2 text-right">{fmtZero(toNum(r.debit))}</td>
                <td></td>
                <td className="p-2 text-right"></td>
              </tr>
            ))}

            <tr className="border-b dark:border-gray-700 border-gray-200 font-semibold">
              <td className="p-2">Total Expense</td>
              <td className="p-2 text-right border-t"></td>
              <td className="p-2 text-right">{fmtZero(report.net.totalExpense)}</td>
              <td className="p-2 text-right"></td>
            </tr>

            {report.net.incomes?.length > 0 ? (
              <>
                {report.net.incomes.map((r: any, idx: number) => (
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

        {/* ===== Hidden Print ===== */}
        <div className="hidden">
          <ProfitLossPrint
            ref={printRef}
            report={report}
            title="Profit Loss"
            startDate={startDate ? dayjs(startDate).format("DD/MM/YYYY") : ""}
            endDate={endDate ? dayjs(endDate).format("DD/MM/YYYY") : ""}
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfitLoss;