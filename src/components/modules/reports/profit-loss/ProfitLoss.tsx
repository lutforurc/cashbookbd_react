import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";
import { FiCheckSquare, FiFilter, FiRotateCcw } from "react-icons/fi";

import {
  ButtonLoading,
  PrintButton,
} from "../../../../pages/UiElements/CustomButtons";
import InputDatePicker from "../../../utils/fields/DatePicker";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { fetchProfitLoss } from "./profitLossSlice";
import { fetchClosingStockItems } from "./profitLossSlice";
import ProfitLossPrint from "./ProfitLossPrint";
import ItemDetailsPrint from "./ItemDetailsPrint";
import ProfitLossReport from "./ProfitLossReport";
import ReportNotes from "../../../utils/utils-functions/ReportNotes";
import { buildProfitLossNotes } from "./profitLossNotes";
import { API_REPORT_PROFIT_LOSS_EXPENSE_SUMMARY_URL } from "../../../services/apiRoutes";
import httpService from "../../../services/httpService";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";
import { Button } from '../../../../pages/UiElements/CustomButtons';

type TradingRow = {
  coal3_id?: number | string;
  coal4_id?: number | string;
  name?: string;
  coal4_name?: string;
  debit?: number | string;
  credit?: number | string;
};

type NetRow = {
  coal3_id?: number | string;
  /** Present only on the head-level rows (`netprofit_heads`), not the group rows. */
  coal4_id?: number | string;
  coal4_name?: string;
  name?: string;
  debit?: number | string;
  credit?: number | string;
};

type ExpenseSummaryRow = {
  key: string;
  coa4Id: number;
  name: string;
  movementDebit: number;
  movementCredit: number;
  netExpense: number;
};

type SelectedExpenseDetail = {
  coal3Id: number | null;
  name: string;
  debit: number;
  credit: number;
  netEffect: number;
  /**
   * Which half of the net account the head was clicked on.
   *
   * ⚠️ THE SAME ENDPOINT ANSWERS FOR BOTH. The server's summary takes a
   * level-3 id and lists the heads under it with debit, credit and their
   * difference -- nothing in it is expense-shaped, only its name. Income rows
   * open this same modal, so the side travels with the click and decides no
   * more than which way the difference is read and what the headings say.
   */
  side: "expense" | "income";
};

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const sumByIds = (rows: TradingRow[], coal4_id: number) => {
  return rows
    .filter((r) => Number(r.coal4_id) === coal4_id)
    .reduce(
      (acc, r) => {
        acc.debit += toNum(r.debit);
        acc.credit += toNum(r.credit);
        return acc;
      },
      { debit: 0, credit: 0 }
    );
};

/**
 * A trading head's balance, read net.
 *
 * ⚠️ NOT ON ONE SIDE. Summing only the head's natural side -- Sales Discount
 * debits, Purchase Discount credits -- drops every reversal, and a reversal is
 * ordinary: a sales return credits 23 with the discount the customer forfeits,
 * a purchase return debits 40 with the one the firm loses. `natural` is which
 * side GROWS the head, read from the chart (23 is Income > Direct Income and
 * debit-nature; 40 is Income > Indirect Income and credit-nature).
 *
 * ⚠️ THIS MIRRORS `ReportsController::extractNetProfitLossAmount()` and the two
 * have to agree. The server's copy feeds the Balance Sheet's equity line; if
 * only one side is netted the sheet reports the gap as Difference.
 *
 * A book that never reverses a head gets exactly what the one-sided sum gave.
 *
 * ⚠️ THE HEAD IS FOUND BY ITS ID ALONE, NOT BY ITS ID INSIDE A GROUP. This
 * used to ask for group 7 AND head 19 for a sales return, and that reads the
 * chart's filing as part of the head's identity. Where the two disagree the
 * figure goes to nil without a word: on krishibitandatabase head 19 (Sales
 * Return, 1,26,967.53) is filed under group 9, Purchase -- so this screen
 * showed Net Sales 28,21,697.54 and a 3,34,371.54 profit while the Balance
 * Sheet, which reads the same heads by id, showed 2,07,404.01. The
 * difference was the return, and the guard on its row hid the empty line that
 * would have said so.
 *
 * The server has always matched on the head alone. This now does too.
 */
const sumNatural = (
  rows: TradingRow[],
  coal4_id: number,
  natural: "debit" | "credit"
) => {
  const { debit, credit } = sumByIds(rows, coal4_id);

  return natural === "debit" ? debit - credit : credit - debit;
};

const ProfitLoss = (user: any) => {
  const dispatch = useDispatch();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const profitLossState: any = useSelector((state: any) => state.profitLoss);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [buttonLoading, setButtonLoading] = useState(false);
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedExpenseDetail, setSelectedExpenseDetail] =
    useState<SelectedExpenseDetail | null>(null);
  const [expenseSummaryRows, setExpenseSummaryRows] = useState<ExpenseSummaryRow[]>([]);
  const [expenseSummaryLoading, setExpenseSummaryLoading] = useState(false);
  const [expenseSummaryError, setExpenseSummaryError] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Separate print ref and loading state for closing stock item details.
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

    setFilterOpen(false);
  };

  // Normalize nested API response shapes.
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

    // Each head is read net -- see sumNatural. The names keep saying which head
    // they are, not which side they sit on, because a net value can carry
    // either sign.
    //
    // Opening Stock: coal4_id=18
    const opening = sumNatural(trading, 18, "debit");

    // Closing Stock: coal4_id=21
    const closing = sumNatural(trading, 21, "credit");

    // Purchase: coal4_id=35
    const purchaseDebit = sumNatural(trading, 35, "debit");

    // Purchase Return: coal4_id=16
    const purchaseReturnCredit = sumNatural(trading, 16, "credit");

    // Purchase Discount: coal4_id=40
    const purchaseDiscountCredit = sumNatural(trading, 40, "credit");

    // Net Purchase = Purchase - Purchase Return - Purchase Discount
    const netPurchase = Math.max(
      0,
      purchaseDebit - purchaseReturnCredit - purchaseDiscountCredit
    );

    // Sales: coal4_id=15
    const salesCredit = sumNatural(trading, 15, "credit");

    // Sales Discount: coal4_id=23
    const salesDiscountDebit = sumNatural(trading, 23, "debit");

    // Sales Return: coal4_id=19
    const salesReturnDebit = sumNatural(trading, 19, "debit");

    // Net Sales = Sales - Sales Discount - Sales Return
    const netSalesCredit = Math.max(
      0,
      salesCredit - salesDiscountDebit - salesReturnDebit
    );

    // Goods moved between branches. A transfer is neither a sale nor a
    // purchase, but it takes stock with it -- so without these two lines the
    // branch that sent the goods shows a loss the size of the consignment, and
    // the branch that received them shows a matching profit. Valued at cost by
    // the API, from the same stock ledger closing stock is read from.
    const goodsIssued = toNum(apiData?.branch_transfer?.issued);
    const goodsReceived = toNum(apiData?.branch_transfer?.received);

    // Trading base
    const debitBase = opening + netPurchase + goodsReceived;
    const creditBase = closing + netSalesCredit + goodsIssued;

    // Blade balancing
    const grossProfit = creditBase > debitBase ? creditBase - debitBase : 0;
    const grossLoss = debitBase > creditBase ? debitBase - creditBase : 0;

    const tradingTotalDebit = grossProfit > 0 ? debitBase + grossProfit : debitBase;
    const tradingTotalCredit = grossLoss > 0 ? creditBase + grossLoss : creditBase;

    const expenseRows = netprofit.filter((r) => toNum(r.debit) > 0);
    const incomeRows = netprofit.filter((r) => toNum(r.credit) > 0);

    const totalExpense = expenseRows.reduce((s, r) => s + toNum(r.debit), 0);

    const totalIncome = incomeRows.reduce((s, r) => s + toNum(r.credit), 0);

    /**
     * The accounts inside each income group.
     *
     * ⚠️ THE GROUP ROW IS ONE LINE, AND THE INCOME OF A YEAR CAN HIDE IN IT.
     * Every income head but the sales figures on krishibitandatabase is filed
     * under a single level-3 called "Direct Income", so the account showed
     * 2,60,000 with no way to see that a commission and an interest made it
     * up. The API sends the same rows one level down; they are matched back by
     * group id, and because the server builds both from one scope a group's
     * children add back to the group's own line.
     */
    const headRows: NetRow[] = apiData?.netprofit_heads || [];

    /**
     * ⚠️ THE HEAD ROWS ARRIVE AS `coal4_name`, NOT `name`, and both readers of
     * this list -- the indented rows on the screen and the income note -- ask
     * for `name`. Renamed here, once, so neither has to know which of the two
     * spellings the server chose; left as it was, the account name came out
     * blank on the page and literally "undefined" in the note.
     *
     * ⚠️ AND ONE CHART NAME IS MISSPELT. The head is "Company Comission
     * (Income)" in the chart. The chart is the client's own data and is not
     * touched -- only the spelling the report prints, corrected here, once,
     * for the screen, the printed sheet and the note alike.
     */
    const incomesWithChildren = incomeRows.map((r) => ({
      ...r,
      children: headRows
        .filter((h) => toNum(h.coal3_id) === toNum(r.coal3_id))
        .map((h) => ({
          ...h,
          name: (h.coal4_name ?? h.name)?.replace(/Comission/g, "Commission"),
        })),
    }));

    /**
     * Cost of goods sold: what the period began holding, plus what it bought,
     * less what it still holds.
     *
     * ⚠️ A READING OF FIGURES ALREADY ON THE STATEMENT, NOT A NEW ONE. The
     * trading account's debit side IS opening stock plus net purchase, so this
     * block is not added to any total -- it explains the gross profit beside
     * it. Written out because the account shows the two stock figures and the
     * purchase at opposite ends of the page and never states their
     * consequence.
     *
     * Acquisition costs carried into stock are nil because nothing carries
     * them: heads 197 Purchase Transportation and 199 Unloading book as period
     * expense, the vouchers that used them move no stock, and the layer that
     * prices the closing stock holds a purchase price with no room for
     * freight. A cost directly attributable to bringing goods in may belong in
     * inventory cost instead -- that is a question of what the cost was for,
     * and moving it would mean taking it out of the expense it sits in rather
     * than counting it twice. No such reclassification is made here. See note 3.
     */
    const directAcquisitionCosts = 0;
    const cogs = opening + netPurchase + directAcquisitionCosts - closing;

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

        goodsIssued,
        goodsReceived,

        grossProfit,
        grossLoss,
        totalDebit: tradingTotalDebit,
        totalCredit: tradingTotalCredit,
      },
      cogs: {
        opening,
        netPurchase,
        directAcquisitionCosts,
        closing,
        total: cogs,
      },
      net: {
        grossProfit,
        grossLoss,
        expenses: expenseRows,
        incomes: incomesWithChildren,
        totalExpense,
        totalIncome,
        netProfit,
        netLoss,
        totalDebit: netTotalDebit,
        totalCredit: netTotalCredit,
      },
    };
  }, [apiData]);

  // Built from the report the statement is drawn from, so a note can never
  // name a figure the page does not show. See profitLossNotes.
  const profitLossNotes = useMemo(
    () =>
      buildProfitLossNotes(report, {
        startDate: startDate ? dayjs(startDate).format("DD/MM/YYYY") : undefined,
        endDate: endDate ? dayjs(endDate).format("DD/MM/YYYY") : undefined,
      }),
    [report, startDate, endDate]
  );

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Profit & Loss Account",
  });

  // Print handler for closing stock item details.
  const handleItemPrint = useReactToPrint({
    contentRef: itemPrintRef,
    documentTitle: "Stock Details with rate",
  });

  // Load closing stock item details before printing.
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

    // Wait for the store update/render before printing.
    setTimeout(() => handleItemPrint(), 0);
  };

  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPerPage(Number.isFinite(value) ? value : 0); // cleared box = All
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFontSize(Number.isFinite(value) ? value : 12);
  };

  const handleResetFilters = () => {
    setFilterOpen(false);
  };

  const handleExpenseRowClick = async (
    row: NetRow,
    side: "expense" | "income" = "expense"
  ) => {
    const coal3Id = Number(row.coal3_id);

    // Expenses grow on the debit side, income on the credit one, so the
    // "net" figure is the same subtraction read from the other end.
    const netEffect =
      side === "income"
        ? toNum(row.credit) - toNum(row.debit)
        : toNum(row.debit) - toNum(row.credit);

    setSelectedExpenseDetail({
      coal3Id: Number.isFinite(coal3Id) ? coal3Id : null,
      name: row.name || "Head Details",
      debit: toNum(row.debit),
      credit: toNum(row.credit),
      netEffect,
      side,
    });

    setExpenseSummaryRows([]);
    setExpenseSummaryError(null);

    if (!Number.isFinite(coal3Id) || coal3Id <= 0) {
      setExpenseSummaryError("COA Level 3 id not found for this head.");
      return;
    }

    if (!branchId || !startDate || !endDate) {
      setExpenseSummaryError(
        "Branch and date range are required to load the summary."
      );
      return;
    }

    setExpenseSummaryLoading(true);

    try {
      const startDateValue = dayjs(startDate).format("YYYY-MM-DD");
      const endDateValue = dayjs(endDate).format("YYYY-MM-DD");
      const response = await httpService.post(
        API_REPORT_PROFIT_LOSS_EXPENSE_SUMMARY_URL,
        {
          coal3_id: coal3Id,
          branch_id: Number(branchId),
          start_date: startDateValue,
          end_date: endDateValue,
        }
      );

      const responsePayload = response?.data?.data?.data ?? response?.data?.data ?? {};
      const apiItems = Array.isArray(responsePayload?.items)
        ? responsePayload.items
        : [];

      const detailRows = apiItems
        .map((item: any, index: number) => ({
          key: `${toNum(item?.coa4_id) || index}`,
          coa4Id: toNum(item?.coa4_id),
          name: String(item?.name || "Unnamed Head"),
          movementDebit: toNum(item?.debit),
          movementCredit: toNum(item?.credit),
          netExpense: toNum(item?.net_expense),
        }))
        .filter((item) => item.movementDebit !== 0 || item.movementCredit !== 0);

      setExpenseSummaryRows(detailRows);

      if (detailRows.length === 0) {
        setExpenseSummaryError("No summary found for this COA Level 3 in the selected period.");
      }
    } catch (error: any) {
      setExpenseSummaryError(
        error?.response?.data?.message ||
          error?.message ||
          "Summary load failed"
      );
    } finally {
      setExpenseSummaryLoading(false);
    }
  };

  return (
    <div>
      <HelmetTitle title={"Profit & Loss Account"} />

      <div className="pl-0 pr-1 py-3 ">
        <div className={`gap-3 ${useFilterMenuEnabled ? "flex flex-wrap items-center gap-3" : "flex flex-wrap items-end"}`}>
          <div className={useFilterMenuEnabled ? "relative shrink-0" : "min-w-[320px] flex-1 md:max-xl:w-full md:max-xl:min-w-0 md:max-xl:flex-none xl:max-[1880px]:w-full xl:max-[1880px]:min-w-0 xl:max-[1880px]:flex-none"}>
            {useFilterMenuEnabled && (
              <Button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className={`inline-flex w-10 items-center justify-center rounded border text-sm transition ${
 filterOpen
 ?"border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300":"border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"}`}
                title="Open filters"
                aria-label="Open filters"
              >
                <FiFilter size={16} />
              </Button>
            )}

            {(useFilterMenuEnabled ? filterOpen : true) && (
              <div
                className={
                  useFilterMenuEnabled
                    ? "absolute left-0 top-full z-1000 mt-2 w-[min(92vw,320px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800"
                    : "w-full"
                }
              >
                <div
                  className={
                    useFilterMenuEnabled
                      ? "space-y-3"
                      : "grid grid-cols-1 items-end gap-3 md:grid-cols-3 xl:grid-cols-4 min-[1881px]:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]"
                  }
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                    {branchDdlData?.isLoading ? <Loader /> : null}
                    <BranchDropdown
 defaultValue={user?.user?.branch_id}
 value={branchId == null ? "" : String(branchId)}
 onChange={handleBranchChange}
 className="w-full max-w-full font-medium text-sm p-2 "
 branchDdl={dropdownData}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                    <InputDatePicker
                      setCurrentDate={(d: any) => setStartDate(d)}
                      className="font-medium text-sm w-full"
                      selectedDate={startDate}
                      setSelectedDate={setStartDate}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                    <InputDatePicker
                      setCurrentDate={(d: any) => setEndDate(d)}
                      className="font-medium text-sm w-full"
                      selectedDate={endDate}
                      setSelectedDate={setEndDate}
                    />
                  </div>

                  <div
                    className={`flex gap-2 pt-1 ${
                      useFilterMenuEnabled
                        ? "justify-end"
                        : "hidden"
                    } ${useFilterMenuEnabled ? "" : "md:col-span-2 xl:col-span-1"}`}
                  >
                    <ButtonLoading
                      onClick={handleActionButtonClick}
                      buttonLoading={buttonLoading}
                      label="Apply"
                      icon={<FiCheckSquare />}
                      className="px-6"
                    />
                    <ButtonLoading
                      onClick={handleResetFilters}
                      buttonLoading={false}
                      label="Reset"
                      icon={<FiRotateCcw />}
                      className="px-4"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            className={`${
              useFilterMenuEnabled
                ? "hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300"
                : "hidden"
            }`}
          >
            Use the filter
          </div>

          {useFilterMenuEnabled ? (
            <div className="ml-auto flex flex-wrap items-end gap-2">
              <PrintRowsInput
 id="perPage"
 name="perPage"
 label=""
 value={perPage.toString()}
 onChange={handlePerPageChange}
 type="text"
 className="font-medium text-sm w-20! text-center"
              />

              <PrintFontInput
 id="fontSize"
 name="fontSize"
 label=""
 value={fontSize.toString()}
 onChange={handleFontSizeChange}
 type="text"
 className="font-medium text-sm w-20! text-center"
              />

              <PrintButton
                onClick={handlePrint}
                label="Print"
                className="px-6"
                disabled={!hasReportData}
              />

              <PrintButton
                onClick={handleItemPrintButtonClick}
                label="Item Print"
                className="px-6"
                disabled={!hasReportData || itemPrintLoading}
              />
            </div>
          ) : (
            <div className="flex flex-nowrap items-end justify-between gap-3 overflow-x-auto xl:ml-auto">
              <div className="flex flex-nowrap items-end gap-2">
                <ButtonLoading
                  onClick={handleActionButtonClick}
                  buttonLoading={buttonLoading}
                  label="Apply"
                  icon={<FiCheckSquare />}
                  className="px-6"
                />
                <ButtonLoading
                  onClick={handleResetFilters}
                  buttonLoading={false}
                  label="Reset"
                  icon={<FiRotateCcw />}
                  className="px-4"
                />
              </div>

              <div className="flex flex-nowrap items-end gap-2">
                <PrintRowsInput
 id="perPage"
 name="perPage"
 label=""
 value={perPage.toString()}
 onChange={handlePerPageChange}
 type="text"
 className="font-medium text-sm w-20! text-center"
                />

                <PrintFontInput
 id="fontSize"
 name="fontSize"
 label=""
 value={fontSize.toString()}
 onChange={handleFontSizeChange}
 type="text"
 className="font-medium text-sm w-20! text-center"
                />

                <PrintButton
                  onClick={handlePrint}
                  label="Print"
                  className="px-6"
                  disabled={!hasReportData}
                />

                <PrintButton
                  onClick={handleItemPrintButtonClick}
                  label="Item"
                  className="px-6"
                  disabled={!hasReportData || itemPrintLoading}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ===== Report ===== */}
      {hasReportData ? (
        <>
          <ProfitLossReport
            loading={profitLossState?.loading}
            report={report}
            loader={<Loader />}
            onNetExpenseClick={handleExpenseRowClick}
          />

          {/* The notes sit under the account, on screen and on paper, and the
              account's own rows point at their numbers. */}
          <ReportNotes
            title="Notes to the Profit & Loss Account"
            notes={profitLossNotes}
          />
        </>
      ) : (
        <div className="rounded border border-dashed border-[rgb(var(--c-border))] bg-white p-6 text-center text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-300">
          {profitLossState?.loading
            ? "Profit/Loss report loading..."
            : "Click Apply to view the report. Once the data is loaded, the Profit/Loss Report will be displayed here."}
        </div>
      )}

      {/* ===== Hidden Print ===== */}
      <div className="hidden">
        <ProfitLossPrint
          ref={printRef}
          report={report}
          title="Profit & Loss Account"
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

      <ExpenseDetailsModal
        open={Boolean(selectedExpenseDetail)}
        detail={selectedExpenseDetail}
        rows={expenseSummaryRows}
        loading={expenseSummaryLoading}
        error={expenseSummaryError}
        onClose={() => {
          setSelectedExpenseDetail(null);
          setExpenseSummaryRows([]);
          setExpenseSummaryLoading(false);
          setExpenseSummaryError(null);
        }}
      />

    </div>
  );
};

export default ProfitLoss;

const ExpenseDetailsModal = ({
  open,
  detail,
  rows,
  loading,
  error,
  onClose,
}: {
  open: boolean;
  detail: SelectedExpenseDetail | null;
  rows: ExpenseSummaryRow[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) => {
  if (!open || !detail) return null;

  const isIncome = detail.side === "income";
  const netLabel = isIncome ? "Net Income" : "Net Expense";
  // The server's `net_expense` is debit less credit for every head it lists,
  // expenses and income alike. Income grows on the credit side, so its
  // difference is read the other way round.
  const netOf = (row: ExpenseSummaryRow) =>
    isIncome ? row.movementCredit - row.movementDebit : row.netExpense;

  const totalMovementDebit = rows.reduce((sum, row) => sum + row.movementDebit, 0);
  const totalMovementCredit = rows.reduce((sum, row) => sum + row.movementCredit, 0);
  const totalNet = rows.reduce((sum, row) => sum + netOf(row), 0);

  return (
    <div
      className="fixed inset-0 z-999 overflow-y-auto bg-slate-950/50 px-4 py-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-start justify-center mt-25">
        <div
          className="my-2 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                {detail.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                {isIncome
                  ? "NET PROFIT OR LOSS A/C income summary"
                  : "NET PROFIT OR LOSS A/C expense summary"}
              </p>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[rgb(var(--c-border))] px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Close
            </Button>
          </div>

          <div className="shrink-0 border-b border-[rgb(var(--c-border))] bg-slate-50 px-5 py-4 dark:bg-slate-900/40">
            <div className="grid gap-3 sm:grid-cols-3">
            <ModalStat label="Debit" value={detail.debit} />
            <ModalStat label="Credit" value={detail.credit} />
            <ModalStat label={netLabel} value={detail.netEffect} />
          </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="sticky top-0 z-20 border-b border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-sm dark:text-slate-300">
                  <th className="px-3 py-3 text-left font-semibold">Particular</th>
                  <th className="px-3 py-3 text-right font-semibold">Debit</th>
                  <th className="px-3 py-3 text-right font-semibold">Credit</th>
                  <th className="px-3 py-3 text-right font-semibold">{netLabel}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-slate-500 dark:text-slate-300"
                    >
                      Loading expense summary...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-red-500 dark:text-red-300"
                    >
                      {error}
                    </td>
                  </tr>
                ) : rows.length > 0 ? (
                  <>
                    {rows.map((row) => (
                      <tr
                        key={row.key}
                        className="border-b border-[rgb(var(--c-border))]/70 text-slate-800 dark:text-slate-100"
                      >
                        <td className="px-3 py-3">{row.name}</td>
                        <td className="px-3 py-3 text-right">
                          {row.movementDebit ? thousandSeparator(row.movementDebit) : "-"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {row.movementCredit ? thousandSeparator(row.movementCredit) : "-"}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                          {thousandSeparator(netOf(row))}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-[rgb(var(--c-border))] font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                      <td className="px-3 py-3">Total</td>
                      <td className="px-3 py-3 text-right">
                        {thousandSeparator(totalMovementDebit)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {thousandSeparator(totalMovementCredit)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {thousandSeparator(totalNet)}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-slate-500 dark:text-slate-300"
                    >
                      No summary found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModalStat = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => {
  return (
    <div className="rounded-xl border border-[rgb(var(--c-border))] bg-slate-50 px-4 py-3 dark:bg-slate-900/40">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
        {thousandSeparator(value)}
      </p>
    </div>
  );
};



