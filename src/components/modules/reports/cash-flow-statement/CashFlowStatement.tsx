import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";
import { FiCheckSquare, FiFilter, FiRotateCcw } from "react-icons/fi";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

import {
  Button,
  ButtonLoading,
  PrintButton,
} from "../../../../pages/UiElements/CustomButtons";
import InputDatePicker from "../../../utils/fields/DatePicker";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import PrintFontInput from "../../../utils/fields/PrintFontInput";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { fetchCashFlowStatement } from "./cashFlowStatementSlice";
import { cashFlowRows } from "./cashFlowStatementRows";
import CashFlowStatementPrint from "./CashFlowStatementPrint";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";

const amountText = (value: number | null) => {
  if (value === null) return "";
  const text = thousandSeparator(Math.abs(Number(value) || 0));
  return Number(value) < 0 ? `(${text})` : text;
};

const CashFlowStatement = (user: any) => {
  const dispatch = useDispatch();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const cashFlowState: any = useSelector((state: any) => state.cashFlowStatement);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, "use_filter_parameter");

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [fontSize, setFontSize] = useState<number>(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedPeriod, setAppliedPeriod] = useState<{ start: string; end: string } | null>(null);

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

        if (!year || year < 1900 || year > 2100) return;

        setStartDate(new Date(year, 0, 1));
        setEndDate(new Date(year, month - 1, day));
      } catch (error) {
        console.warn("Failed to parse transactionDate:", trxDate, error);
      }
    }
  }, [
    branchDdlData?.protectedData?.data,
    branchDdlData?.protectedData?.transactionDate,
  ]);

  const data = cashFlowState?.data;

  const rows = useMemo(() => cashFlowRows(data), [data]);

  const hasReportData = Boolean(data) && rows.length > 0;

  const branchName = useMemo(() => {
    if (data?.branch?.name) return data.branch.name;

    const selected = dropdownData.find(
      (branch: any) => Number(branch.id) === Number(branchId),
    );

    return selected?.name || "Selected Branch";
  }, [data?.branch?.name, dropdownData, branchId]);

  const periodText = useMemo(() => {
    if (appliedPeriod) {
      return `${dayjs(appliedPeriod.start).format("DD/MM/YYYY")} to ${dayjs(
        appliedPeriod.end,
      ).format("DD/MM/YYYY")}`;
    }

    if (data?.period) {
      return `${dayjs(data.period.start_date).format("DD/MM/YYYY")} to ${dayjs(
        data.period.end_date,
      ).format("DD/MM/YYYY")}`;
    }

    return "-";
  }, [appliedPeriod, data?.period]);

  const handleBranchChange = (e: any) => {
    const value = Number(e.target.value);
    setBranchId(Number.isFinite(value) ? value : null);
  };

  const handleActionButtonClick = async () => {
    if (!branchId) return alert("Branch select করুন");
    if (!startDate || !endDate) return alert("Start/End Date দিন");

    const start = dayjs(startDate).format("YYYY-MM-DD");
    const end = dayjs(endDate).format("YYYY-MM-DD");

    setButtonLoading(true);

    const action = await dispatch(
      fetchCashFlowStatement({
        branch_id: Number(branchId),
        start_date: start,
        end_date: end,
      }) as any,
    );

    setButtonLoading(false);

    if (action?.meta?.requestStatus !== "fulfilled") {
      alert(action?.payload || "Cash Flow Statement load failed");
      return;
    }

    setAppliedPeriod({ start, end });
    setFilterOpen(false);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Cash Flow Statement",
  });

  const handleExcelExport = () => {
    if (!data) {
      toast.info("Load the report before exporting");
      return;
    }

    const headerRows: any[][] = [
      ["Cash Flow Statement (Indirect Method)"],
      ["Branch", branchName],
      ["Period", periodText],
      ["Basis", "Posted vouchers, excluding year-closing entries"],
      [],
      ["Particulars", "Amount (BDT)"],
    ];

    const bodyRows = rows.map((row) => [row.label, row.amount === null ? "" : row.amount]);
    const sheet = XLSX.utils.aoa_to_sheet([...headerRows, ...bodyRows]);
    sheet["!cols"] = [{ wch: 62 }, { wch: 18 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Cash Flow Statement");
    XLSX.writeFile(
      workbook,
      `cash-flow-statement-${dayjs(data.period?.start_date).format("YYYYMMDD")}-${dayjs(
        data.period?.end_date,
      ).format("YYYYMMDD")}.xlsx`,
    );
  };

  const reconciliation = data?.reconciliation;
  const reconciles = reconciliation?.reconciles !== false;
  const netIncreaseValue = Number(reconciliation?.net_increase || 0);
  const netIncreaseTitle =
    netIncreaseValue < 0
      ? "Net Decrease"
      : netIncreaseValue > 0
        ? "Net Increase"
        : "Net Increase / (Decrease)";

  return (
    <>
      <HelmetTitle title="Cash Flow Statement" />
      <div className="mx-auto space-y-2">
        <div className="pl-0 pr-1 py-3">
          <div
            className={`gap-3 ${
              useFilterMenuEnabled
                ? "flex flex-wrap items-center gap-3"
                : "flex flex-wrap items-end"
            }`}
          >
            <div
              className={
                useFilterMenuEnabled
                  ? "relative shrink-0"
                  : "min-w-[320px] flex-1 md:max-xl:w-full md:max-xl:min-w-0 md:max-xl:flex-none xl:max-[1880px]:w-full xl:max-[1880px]:min-w-0 xl:max-[1880px]:flex-none"
              }
            >
              {useFilterMenuEnabled && (
                <Button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  className={`inline-flex w-10 items-center justify-center rounded border text-sm transition ${
                    filterOpen
                      ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                      : "border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
                  }`}
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
                      ? "absolute left-0 top-full z-1000 mt-2 w-[min(92vw,340px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800"
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
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Select Branch
                      </label>
                      <BranchDropdown
                        branchDdl={dropdownData}
                        onChange={handleBranchChange}
                        defaultValue={branchId ? String(branchId) : ""}
                        value={branchId ? String(branchId) : ""}
                        className="px-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Start Date
                      </label>
                      <InputDatePicker
                        selectedDate={startDate}
                        setSelectedDate={setStartDate}
                        setCurrentDate={setStartDate}
                        className="w-full "
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        End Date
                      </label>
                      <InputDatePicker
                        selectedDate={endDate}
                        setSelectedDate={setEndDate}
                        setCurrentDate={setEndDate}
                        className="w-full "
                      />
                    </div>

                    <div
                      className={`flex gap-2 pt-1 ${
                        useFilterMenuEnabled ? "justify-end" : "hidden"
                      }`}
                    >
                      <ButtonLoading
                        label="Apply"
                        onClick={handleActionButtonClick}
                        buttonLoading={buttonLoading}
                        className="px-6"
                        icon={<FiCheckSquare />}
                      />
                      <ButtonLoading
                        label="Reset"
                        onClick={() => setFilterOpen(false)}
                        buttonLoading={false}
                        className="px-4"
                        icon={<FiRotateCcw />}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {useFilterMenuEnabled ? (
              <div className="ml-auto flex items-end gap-2">
                <PrintFontInput
                  type="number"
                  id="cash-flow-font-size"
                  label=""
                  value={fontSize}
                  onChange={(e: any) => setFontSize(Number(e.target.value) || 12)}
                  className="w-20! text-center"
                />
                <PrintButton
                  label="Print / PDF"
                  onClick={handlePrint}
                  className="px-6"
                  disabled={!hasReportData}
                />
                <ButtonLoading
                  label="Excel"
                  onClick={handleExcelExport}
                  buttonLoading={false}
                  className="px-4"
                />
              </div>
            ) : (
              <div className="flex flex-nowrap items-end justify-between gap-3 overflow-x-auto xl:ml-auto">
                <div className="flex flex-nowrap items-end gap-2">
                  <ButtonLoading
                    label="Apply"
                    onClick={handleActionButtonClick}
                    buttonLoading={buttonLoading}
                    className="px-6"
                    icon={<FiCheckSquare />}
                  />

                  <ButtonLoading
                    label="Reset"
                    onClick={() => setFilterOpen(false)}
                    buttonLoading={false}
                    className="px-4"
                    icon={<FiRotateCcw />}
                  />
                </div>
                <div className="flex flex-nowrap items-end gap-2">
                  <PrintFontInput
                    type="number"
                    id="cash-flow-font-size"
                    label=""
                    value={fontSize}
                    onChange={(e: any) => setFontSize(Number(e.target.value) || 12)}
                    className="w-20! text-center"
                  />
                  <PrintButton
                    label="Print / PDF"
                    onClick={handlePrint}
                    className="px-6"
                    disabled={!hasReportData}
                  />
                  <ButtonLoading
                    label="Excel"
                    onClick={handleExcelExport}
                    buttonLoading={false}
                    className="px-4"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {cashFlowState?.loading && (
          <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-8 shadow-default">
            <Loader />
          </div>
        )}

        {!cashFlowState?.loading && cashFlowState?.error && (
          <div className="rounded-sm border border-red-300 bg-red-50 px-6 py-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {cashFlowState.error}
          </div>
        )}

        {!cashFlowState?.loading && !hasReportData && !cashFlowState?.error && (
          <div className="rounded-sm border border-dashed border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-6 py-12 text-center shadow-default">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-[rgb(var(--c-text))]">
              No cash flow statement loaded yet
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Select a branch and date range, then click Apply.
            </p>
          </div>
        )}

        {!cashFlowState?.loading && hasReportData && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <SummaryCard
                title="Operating"
                value={Number(data?.operating?.total || 0)}
                tone="emerald"
              />
              <SummaryCard
                title="Investing"
                value={Number(data?.investing?.total || 0)}
                tone="blue"
              />
              <SummaryCard
                title="Financing"
                value={Number(data?.financing?.total || 0)}
                tone="slate"
              />
              <SummaryCard
                title={netIncreaseTitle}
                value={netIncreaseValue}
                tone={reconciles ? "slate" : "amber"}
              />
            </div>

            <div className="overflow-hidden rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
              <div className="border-b border-[rgb(var(--c-border))] px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                      Cash Flow Statement
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {branchName}, {periodText}
                    </p>
                  </div>
                  <div className="rounded-sm bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    Indirect method
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5" style={{ fontSize: `${fontSize}px` }}>
                <table className="w-full border-collapse">
                  <colgroup>
                    <col />
                    <col style={{ width: "180px" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800">
                      <th className="border border-[rgb(var(--c-border))] px-3 py-2 text-left font-semibold">
                        Particulars
                      </th>
                      <th className="border border-[rgb(var(--c-border))] px-3 py-2 text-right font-semibold">
                        Amount (BDT)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.key}
                        className={
                          row.kind === "section"
                            ? "bg-slate-50 font-semibold dark:bg-slate-800/60"
                            : row.kind === "subtotal" || row.kind === "total"
                              ? "font-semibold"
                              : row.kind === "note"
                                ? "text-slate-500 dark:text-slate-400"
                                : ""
                        }
                      >
                        <td
                          className={`border border-[rgb(var(--c-border))] px-3 py-2 ${
                            row.kind === "line" ? "pl-8" : ""
                          }`}
                        >
                          {row.label}
                        </td>
                        <td className="border border-[rgb(var(--c-border))] px-3 py-2 text-right">
                          {amountText(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  <p>
                    Net profit is the Profit &amp; Loss Account's own result for the
                    same branch and period. Inventory is adjusted separately by
                    opening stock less closing stock on that account's valuation,
                    because the closing stock is a valuation and not a ledger
                    balance. Cash and cash equivalents are the accounts in this
                    branch's Cash, Bank and Mobile Banking groups; transfers
                    between them are internal and are not counted as cash flow.
                  </p>
                  <p className="mt-1">
                    Basis: posted vouchers only, with year-closing entries excluded
                    — the same posted ledger Trial Balance Details prints. Investing
                    and financing show only movements from vouchers that touched a
                    cash or cash-equivalent account; a non-cash entry (opening
                    balances, capital satisfied by assets, goods paid for outside
                    the till) is excluded from those sections and its P&amp;L effect
                    is added back above. A posted line whose chart parent cannot be
                    resolved is shown under "Other movements not classified" rather
                    than assigned to operating activities.
                  </p>
                  <p className="mt-1">
                    Non-cash adjustments:{" "}
                    {data?.basis?.depreciation_supported
                      ? "depreciation on the expense heads nominated by the Asset module, plus non-cash purchases, sales and other P&L items whose vouchers did not touch cash."
                      : "non-cash purchases, sales and other P&L items whose vouchers did not touch cash; no Asset category has nominated a depreciation expense head."}
                  </p>
                  {!reconciles && (
                    <p className="mt-1 text-amber-700 dark:text-amber-300">
                      The ledger does not balance for this period, so the statement
                      cannot reconcile exactly. The difference against the ledger
                      cash balances is shown above; it is the same difference Trial
                      Balance Details carries for this branch and period.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="hidden">
        <div ref={printRef}>
          <CashFlowStatementPrint
            branchName={branchName}
            startDate={
              data?.period?.start_date
                ? dayjs(data.period.start_date).format("DD/MM/YYYY")
                : "-"
            }
            endDate={
              data?.period?.end_date
                ? dayjs(data.period.end_date).format("DD/MM/YYYY")
                : "-"
            }
            rows={rows}
            fontSize={Number(fontSize)}
            depreciationSupported={Boolean(data?.basis?.depreciation_supported)}
          />
        </div>
      </div>
    </>
  );
};

const SummaryCard = ({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "emerald" | "blue" | "amber" | "slate";
}) => {
  const toneMap: Record<string, string> = {
    emerald:
      "border-slate-200 bg-white text-slate-900 dark:border-strokedark dark:bg-boxdark dark:text-[rgb(var(--c-text))]",
    blue:
      "border-slate-200 bg-white text-slate-900 dark:border-strokedark dark:bg-boxdark dark:text-[rgb(var(--c-text))]",
    amber:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
    slate:
      "border-slate-200 bg-white text-slate-900 dark:border-strokedark dark:bg-boxdark dark:text-[rgb(var(--c-text))]",
  };

  return (
    <div className={`rounded border px-4 py-4 shadow-sm ${toneMap[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
        {title}
      </p>
      <p className="mt-3 text-2xl font-semibold">{amountText(value)}</p>
    </div>
  );
};

export default CashFlowStatement;
