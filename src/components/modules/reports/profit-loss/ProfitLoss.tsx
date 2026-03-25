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

import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { fetchProfitLoss } from "./profitLossSlice";
import { fetchClosingStockItems } from "./profitLossSlice";
import ProfitLossPrint from "./ProfitLossPrint";
import ItemDetailsPrint from "./ItemDetailsPrint";
import ProfitLossReport from "./ProfitLossReport";

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

  // ✅ অতিরিক্ত: ItemDetailsPrint এর জন্য আলাদা ref + loading + data
  const itemPrintRef = useRef<HTMLDivElement>(null);
  const [itemPrintLoading, setItemPrintLoading] = useState(false);
  const closingStockData = profitLossState?.closingStockData;

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

  const hasReportData = useMemo(() => {
    const trading = apiData?.trading;
    const netprofit = apiData?.netprofit;

    return (
      (Array.isArray(trading) && trading.length > 0) ||
      (Array.isArray(netprofit) && netprofit.length > 0)
    );
  }, [apiData]);

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

    const expenseRows = netprofit.filter((r) => toNum(r.debit) > 0 && toNum(r.credit) <= 0);
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

  // ✅ অতিরিক্ত: ItemDetailsPrint এর জন্য print handler
  const handleItemPrint = useReactToPrint({
    content: () => itemPrintRef.current,
    documentTitle: "Stock Details with rate",
    removeAfterPrint: true,
  });

  // ✅ অতিরিক্ত: নতুন বাটন ক্লিক -> fetchClosingStockItems -> তারপর print
  const handleItemPrintButtonClick = async () => {
    if (!branchId) return alert("Branch select করুন");
    if (!startDate || !endDate) return alert("Start/End Date দিন");

    const startD = dayjs(startDate).format("YYYY-MM-DD");
    const endD = dayjs(endDate).format("YYYY-MM-DD");

    setItemPrintLoading(true);

    const action = await dispatch(
      fetchClosingStockItems({
        companyId: Number(user?.user?.company_id || user?.user?.companyId || 1),
        branchId: Number(branchId),
        userId: Number(user?.user?.id || user?.user?.userId || 1),
        start_date: startD,
        end_date: endD,
      }) as any
    );

    setItemPrintLoading(false);

    if (action?.meta?.requestStatus !== "fulfilled") {
      return alert(action?.payload || "Closing stock load failed");
    }

    // store update/render complete হওয়ার জন্য
    setTimeout(() => handleItemPrint(), 0);
  };

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
              // buttonLoading={buttonLoading}
              label="Run"
              icon=""
              className="mt-6 pt-[0.45rem] pb-[0.45rem] h-9"
            />

            <PrintButton
              onClick={handlePrint}
              label=""
              className="ml-2 mt-6 pt-[0.45rem] pb-[0.45rem] h-9"
            />

            <PrintButton
              onClick={handleItemPrintButtonClick}
              label=""
              className="ml-2 mt-6 pt-[0.45rem] pb-[0.45rem] h-9"
            />
          </div>
        </div>
      </div>
      {/* ===== Report ===== */}
      {hasReportData ? (
        <ProfitLossReport
          loading={profitLossState?.loading}
          report={report}
          loader={<Loader />}
        />
      ) : (
        <div className="rounded border border-dashed border-gray-300 bg-white p-6 ml-2 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {profitLossState?.loading
            ? "Profit/Loss report loading..."
            : "Press Run to view the report. Once the data is loaded, the Profit/Loss Report will be displayed here."}
        </div>
      )}

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

        {/* ItemDetailsPrint hidden */}
        <ItemDetailsPrint
          ref={itemPrintRef}
          report={closingStockData}
          title="Closing Stock Item Details"
          startDate={startDate ? dayjs(startDate).format("DD/MM/YYYY") : ""}
          endDate={endDate ? dayjs(endDate).format("DD/MM/YYYY") : ""}
          fontSize={Number(fontSize)}
          rowsPerPage={Number(perPage)}
        />
      </div>

    </div>
  );
};

export default ProfitLoss;


