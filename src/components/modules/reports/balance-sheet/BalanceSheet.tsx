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
import FilterMenuShell from "../../../utils/components/FilterMenuShell";

import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { fetchBalanceSheet } from "./balanceSheetSlice";
import BalanceSheetPrint from "./BalanceSheetPrint";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";
import { formatDate } from "../../../utils/utils-functions/formatDate";
import { Button } from '../../../../pages/UiElements/CustomButtons';


type ReportItem = {
  coa4_id?: number | null;
  name?: string;
  opening?: number | string;
  movement?: number | string;
  closing?: number | string;
  balance?: number | string;
};

type ReportGroup = {
  group_name?: string;
  opening?: number | string;
  movement?: number | string;
  closing?: number | string;
  total?: number | string;
  items?: ReportItem[];
};

type ColumnTotals = {
  opening: number;
  movement: number;
  closing: number;
};

const toNum = (value: any) => {
  const parsed = Number(typeof value === "string" ? value.replace(/,/g, "") : value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (amount: number) => {
  const formatted = thousandSeparator(Math.abs(amount));
  return amount < 0 ? `(${formatted})` : formatted;
};

const sumReportColumns = (groups: ReportGroup[]): ColumnTotals => ({
  opening: groups.reduce((sum, group) => sum + toNum(group.opening), 0),
  movement: groups.reduce((sum, group) => sum + toNum(group.movement), 0),
  closing: groups.reduce((sum, group) => sum + toNum(group.closing || group.total), 0),
});

const BalanceSheet = (user: any) => {
  const dispatch = useDispatch();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const balanceSheetState: any = useSelector((state: any) => state.balanceSheet);
  const settings: any = useSelector((state: any) => state.settings);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{
    title: string;
    group: ReportGroup;
  } | null>(null);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

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

  const apiData = useMemo(() => {
    const raw = balanceSheetState?.data;

    if (raw?.data?.data?.assets) return raw.data.data;
    if (raw?.data?.assets) return raw.data;
    if (raw?.assets) return raw;

    return null;
  }, [balanceSheetState?.data]);

  const assets: ReportGroup[] = Array.isArray(apiData?.assets) ? apiData.assets : [];
  const liabilities: ReportGroup[] = Array.isArray(apiData?.liabilities)
    ? apiData.liabilities
    : [];
  const rawEquity: ReportGroup[] = Array.isArray(apiData?.equity) ? apiData.equity : [];

  const equity: ReportGroup[] = useMemo(() => {
    const openingDifference = toNum(apiData?.totals?.difference_columns?.opening);

    if (Math.abs(openingDifference) < 0.01) {
      return rawEquity;
    }

    let netProfitAdjusted = false;
    const adjusted = rawEquity.map((group) => {
      const groupName = String(group.group_name || "").toLowerCase();
      const isNetProfitGroup = groupName === "net profit" || groupName === "net loss";

      if (!isNetProfitGroup || Math.abs(toNum(group.opening)) >= 0.01) {
        return group;
      }

      netProfitAdjusted = true;
      const nextOpening = toNum(group.opening) + openingDifference;
      const nextClosing = toNum(group.closing || group.total) + openingDifference;

      return {
        ...group,
        opening: nextOpening,
        closing: nextClosing,
        total: nextClosing,
        items: (group.items || []).map((item, index) => {
          if (index > 0) return item;

          return {
            ...item,
            opening: toNum(item.opening) + openingDifference,
            closing: toNum(item.closing || item.balance) + openingDifference,
            balance: toNum(item.balance || item.closing) + openingDifference,
          };
        }),
      };
    });

    if (netProfitAdjusted) {
      return adjusted;
    }

    return [
      ...adjusted,
      {
        group_name: openingDifference >= 0 ? "Net Profit" : "Net Loss",
        opening: openingDifference,
        movement: 0,
        closing: openingDifference,
        total: openingDifference,
        items: [
          {
            coa4_id: null,
            name: openingDifference >= 0 ? "Net Profit" : "Net Loss",
            opening: openingDifference,
            movement: 0,
            closing: openingDifference,
            balance: openingDifference,
          },
        ],
      },
    ];
  }, [apiData?.totals?.difference_columns?.opening, rawEquity]);

  const totals = useMemo(() => {
    const assetsColumns = sumReportColumns(assets);
    const liabilitiesColumns = sumReportColumns(liabilities);
    const equityColumns = sumReportColumns(equity);
    const liabilitiesAndEquityColumns = {
      opening: liabilitiesColumns.opening + equityColumns.opening,
      movement: liabilitiesColumns.movement + equityColumns.movement,
      closing: liabilitiesColumns.closing + equityColumns.closing,
    };
    const differenceColumns = {
      opening: assetsColumns.opening - liabilitiesAndEquityColumns.opening,
      movement: assetsColumns.movement - liabilitiesAndEquityColumns.movement,
      closing: assetsColumns.closing - liabilitiesAndEquityColumns.closing,
    };

    return {
      assets: assetsColumns.closing,
      liabilities: liabilitiesColumns.closing,
      equity: equityColumns.closing,
      liabilitiesAndEquity: liabilitiesAndEquityColumns.closing,
      difference: differenceColumns.closing,
      assetsColumns,
      liabilitiesColumns,
      equityColumns,
      differenceColumns,
    };
  }, [assets, equity, liabilities]);

  const hasReportData =
    assets.length > 0 || liabilities.length > 0 || equity.length > 0;
  const hasBalanceSheetResponse = Boolean(apiData);

  const netProfitDebug = useMemo(() => {
    const filters = apiData?.debug?.filters || {};
    const profitLoss = apiData?.debug?.profit_loss || {};
    const openingProfitLoss = apiData?.debug?.opening_profit_loss || {};
    const netProfit = apiData?.debug?.net_profit || {};
    const stock = apiData?.debug?.stock || {};

    return {
      filters: {
        branchId: toNum(filters.branch_id || apiData?.branch_id || branchId),
        startDate:
          filters.start_date ||
          apiData?.report_date?.start_date ||
          (startDate ? dayjs(startDate).format("YYYY-MM-DD") : ""),
        endDate:
          filters.end_date ||
          apiData?.report_date?.end_date ||
          (endDate ? dayjs(endDate).format("YYYY-MM-DD") : ""),
      },
      hasApiDebug: Boolean(apiData?.debug),
      netProfit: {
        opening: toNum(netProfit.opening),
        movement: toNum(netProfit.movement),
        closing: toNum(netProfit.closing),
      },
      openingProfitLoss: {
        periodStart: openingProfitLoss.period_start || "",
        periodEnd: openingProfitLoss.period_end || "",
        netProfitLoss: toNum(openingProfitLoss.net_profit_loss),
      },
      stock: {
        opening: toNum(stock.opening),
        movement: toNum(stock.movement),
        closing: toNum(stock.closing),
      },
      profitLoss: {
        openingStock: toNum(profitLoss.opening_stock),
        closingStock: toNum(profitLoss.closing_stock),
        netPurchase: toNum(profitLoss.net_purchase),
        netSales: toNum(profitLoss.net_sales),
        grossProfitLoss: toNum(profitLoss.gross_profit_loss),
        otherIncome: toNum(profitLoss.other_income),
        expense: toNum(profitLoss.expense),
        netProfitLoss: toNum(profitLoss.net_profit_loss),
        formula: profitLoss.formula || "",
      },
    };
  }, [apiData, branchId, endDate, startDate]);

  const showDifferenceDebug = useMemo(() => {
    return (
      Math.abs(totals.difference) > 0.009 ||
      Math.abs(totals.differenceColumns.opening) > 0.009 ||
      Math.abs(totals.differenceColumns.movement) > 0.009 ||
      Math.abs(totals.differenceColumns.closing) > 0.009
    );
  }, [totals]);

  const branchName = useMemo(() => {
    const selected = dropdownData.find(
      (branch: any) => Number(branch.id) === Number(branchId),
    );
    return selected?.name || "Selected Branch";
  }, [dropdownData, branchId]);

  const appliedBranchName = useMemo(() => {
    const selected = dropdownData.find(
      (branch: any) => Number(branch.id) === Number(netProfitDebug.filters.branchId),
    );
    return selected?.name || branchName;
  }, [branchName, dropdownData, netProfitDebug.filters.branchId]);

  const reportDates = useMemo(() => {
    return {
      start:
        apiData?.report_date?.start_date ||
        (startDate ? dayjs(startDate).format("YYYY-MM-DD") : ""),
      end:
        apiData?.report_date?.end_date ||
        (endDate ? dayjs(endDate).format("YYYY-MM-DD") : ""),
      asOn:
        apiData?.report_date?.as_on_date ||
        (endDate ? dayjs(endDate).format("YYYY-MM-DD") : ""),
    };
  }, [apiData, startDate, endDate]);

  const handleBranchChange = (e: any) => {
    const value = Number(e.target.value);
    setBranchId(Number.isFinite(value) ? value : null);
  };

  const handleActionButtonClick = async () => {
    if (!branchId) return alert("Branch select à¦•à¦°à§à¦¨");
    if (!startDate || !endDate) return alert("Start/End Date à¦¦à¦¿à¦¨");

    setButtonLoading(true);

    const balanceSheetAction = await dispatch(
      fetchBalanceSheet({
        branchId: Number(branchId),
        startDate: dayjs(startDate).format("YYYY-MM-DD"),
        endDate: dayjs(endDate).format("YYYY-MM-DD"),
      }) as any,
    );

    setButtonLoading(false);

    if (balanceSheetAction?.meta?.requestStatus !== "fulfilled") {
      alert(balanceSheetAction?.payload || "Balance sheet load failed");
      return;
    }

    setFilterOpen(false);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Balance Sheet",
  });

  const handleResetFilters = () => {
    setFilterOpen(false);
  };

  return (
    <>
      <HelmetTitle title="Balance Sheet" />
      <div className="mx-auto space-y-2 ">
        <div className="pl-0 pr-1 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <FilterMenuShell
              enabled={useFilterMenuEnabled}
              isOpen={filterOpen}
              onToggle={() => setFilterOpen((prev) => !prev)}
              menuWidthClassName="w-[min(92vw,340px)]"
              inlineClassName="grid grid-cols-1 items-end gap-3 md:grid-cols-3 xl:grid-cols-4 min-[1881px]:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]"
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

              <div className={`flex gap-2 pt-1 ${useFilterMenuEnabled ? "justify-end md:col-span-2 xl:col-span-4" : "hidden"}`}>
                <ButtonLoading
                  label="Apply"
                  onClick={handleActionButtonClick}
                  buttonLoading={buttonLoading}
                  className="px-6"
                  icon={<FiCheckSquare />}
                />
                <ButtonLoading
                  label="Reset"
                  onClick={handleResetFilters}
                  buttonLoading={false}
                  className="px-4"
                  icon={<FiRotateCcw />}
                />
              </div>
            </FilterMenuShell>

            <div className={`${useFilterMenuEnabled ? "hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300" : "hidden"}`}>
              Use the filter
            </div>

            {useFilterMenuEnabled ? (
              <div className="ml-auto flex items-end gap-2">
                <PrintRowsInput
                  type="number"
                  id="bs-per-page"
                  label=""
                  value={perPage}
                  onChange={(e: any) => setPerPage(Number(e.target.value) || 0)}
                  className="w-20! text-center"
                />
                <PrintFontInput
                  type="number"
                  id="bs-font-size"
                  label=""
                  value={fontSize}
                  onChange={(e: any) => setFontSize(Number(e.target.value) || 12)}
                  className="w-20! text-center"
                />
                <PrintButton
                  label="Print"
                  onClick={handlePrint}
                  className="px-6"
                  disabled={!hasReportData}
                />
              </div>
            ) : (
              <div className="flex w-full flex-nowrap items-end justify-between gap-3 overflow-x-auto xl:ml-auto xl:w-auto">
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
                    onClick={handleResetFilters}
                    buttonLoading={false}
                    className="px-4"
                    icon={<FiRotateCcw />}
                  />

                </div>
                <div className="flex flex-nowrap items-end justify-start gap-2">
                  <PrintRowsInput
                    type="number"
                    id="bs-per-page"
                    label=""
                    value={perPage}
                    onChange={(e: any) => setPerPage(Number(e.target.value) || 0)}
                    className="w-20! text-center"
                  />
                  <PrintFontInput
                    type="number"
                    id="bs-font-size"
                    label=""
                    value={fontSize}
                    onChange={(e: any) => setFontSize(Number(e.target.value) || 12)}
                    className="w-20! text-center"
                  />
                  <PrintButton
                    label="Print"
                    onClick={handlePrint}
                    className="px-6"
                    disabled={!hasReportData}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {balanceSheetState?.loading && (
          <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-8 shadow-default">
            <Loader />
          </div>
        )}

        {!balanceSheetState?.loading && !hasReportData && (
          <div className="rounded-sm border border-dashed border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-6 py-12 text-center shadow-default">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-[rgb(var(--c-text))]">
              No balance sheet loaded yet
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Select a branch, date range, then click Load Report.
            </p>
          </div>
        )}

        {!balanceSheetState?.loading && hasBalanceSheetResponse && !hasReportData && (
          <NetProfitDebugPanel
            branchName={appliedBranchName}
            values={netProfitDebug}
          />
        )}

        {!balanceSheetState?.loading && hasReportData && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard title="Total Assets" value={totals.assets} tone="emerald" />
              <SummaryCard
                title="Liabilities + Equity"
                value={totals.liabilitiesAndEquity}
                tone="blue"
              />
              <SummaryCard
                title="Difference"
                value={totals.difference}
                tone={Math.abs(totals.difference) > 0.009 ? "amber" : "slate"}
              />
            </div>

            <NetProfitDebugPanel
              branchName={appliedBranchName}
              values={netProfitDebug}
            />

            {showDifferenceDebug && (
              <div className="rounded-sm border border-amber-200 bg-amber-50 shadow-default dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="border-b border-amber-200 px-5 py-4 dark:border-amber-500/20">
                  <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                    Difference Debug
                  </h3>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                    This section shows whether the mismatch is in opening, movement, or closing columns.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 px-5 py-5 lg:grid-cols-4">
                  <DebugCard title="Assets" values={totals.assetsColumns} />
                  <DebugCard title="Liabilities" values={totals.liabilitiesColumns} />
                  <DebugCard title="Equity" values={totals.equityColumns} />
                  <DebugCard title="Difference" values={totals.differenceColumns} highlight />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SectionCard
                title="Assets"
                accent="from-emerald-500 to-teal-600"
                groups={assets}
                totalLabel="Total Assets"
                totalValue={totals.assets}
                totalColumns={totals.assetsColumns}
                perPage={perPage}
                fontSize={fontSize}
                onGroupClick={(group) => setSelectedGroup({ title: "Assets", group })}
              />
              <div className="space-y-6">
                <SectionCard
                  title="Liabilities"
                  accent="from-sky-500 to-blue-600"
                  groups={liabilities}
                  totalLabel="Total Liabilities"
                  totalValue={totals.liabilities}
                  totalColumns={totals.liabilitiesColumns}
                  perPage={perPage}
                  fontSize={fontSize}
                  onGroupClick={(group) =>
                    setSelectedGroup({ title: "Liabilities", group })
                  }
                />
                <SectionCard
                  title="Equity"
                  accent="from-violet-500 to-indigo-600"
                  groups={equity}
                  totalLabel="Total Equity"
                  totalValue={totals.equity}
                  totalColumns={totals.equityColumns}
                  perPage={perPage}
                  fontSize={fontSize}
                  onGroupClick={(group) => setSelectedGroup({ title: "Equity", group })}
                />
              </div>
            </div>

            <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-5 shadow-default">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                    Final Position
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    As on {reportDates.asOn ? dayjs(reportDates.asOn).format("DD/MM/YYYY") : "-"} for {branchName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Liabilities + Equity
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-[rgb(var(--c-text))]">
                    {formatAmount(totals.liabilitiesAndEquity)}
                  </p>
                </div>
              </div>

              {Math.abs(totals.difference) > 0.009 && (
                <div className="mt-4 rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-600/40 dark:bg-amber-500/10 dark:text-amber-200">
                  Difference detected: {formatAmount(totals.difference)}. Please review opening, movement, or group mapping.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="hidden">
        <div ref={printRef}>
          <BalanceSheetPrint
            branchName={branchName}
            startDate={reportDates.start ? dayjs(reportDates.start).format("DD/MM/YYYY") : "-"}
            endDate={reportDates.end ? dayjs(reportDates.end).format("DD/MM/YYYY") : "-"}
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
            assets={assets.map(normalizeGroup)}
            liabilities={liabilities.map(normalizeGroup)}
            equity={equity.map(normalizeGroup)}
            totals={totals}
          />
        </div>
      </div>

      <GroupDetailsModal
        open={Boolean(selectedGroup)}
        title={selectedGroup?.title || ""}
        group={selectedGroup?.group || null}
        onClose={() => setSelectedGroup(null)}
      />
    </>
  );
};

const normalizeGroup = (group: ReportGroup) => ({
  group_name: group.group_name || "",
  total: toNum(group.closing || group.total),
  items: (group.items || []).map((item) => ({
    name: item.name || "",
    balance: toNum(item.closing || item.balance),
  })),
});

const DebugCard = ({
  title,
  values,
  highlight = false,
}: {
  title: string;
  values: ColumnTotals;
  highlight?: boolean;
}) => {
  const toneClass = highlight ? "text-amber-700 dark:text-amber-200" : "";

  return (
    <div className="rounded-sm border border-amber-200 bg-[rgb(var(--c-surface))] p-4 dark:border-amber-500/20">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
        <div className="flex items-center justify-between gap-3">
          <span>Opening</span>
          <span className={`font-semibold ${toneClass}`}>{formatAmount(values.opening)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Movement</span>
          <span className={`font-semibold ${toneClass}`}>{formatAmount(values.movement)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Closing</span>
          <span className={`font-semibold ${toneClass}`}>{formatAmount(values.closing)}</span>
        </div>
      </div>
    </div>
  );
};

const NetProfitDebugPanel = ({
  branchName,
  values,
}: {
  branchName: string;
  values: {
    filters: {
      branchId: number;
      startDate: string;
      endDate: string;
    };
    hasApiDebug: boolean;
    netProfit: {
      opening: number;
      movement: number;
      closing: number;
    };
    openingProfitLoss: {
      periodStart: string;
      periodEnd: string;
      netProfitLoss: number;
    };
    stock: {
      opening: number;
      movement: number;
      closing: number;
    };
    profitLoss: {
      openingStock: number;
      closingStock: number;
      netPurchase: number;
      netSales: number;
      grossProfitLoss: number;
      otherIncome: number;
      expense: number;
      netProfitLoss: number;
      formula: string;
    };
  };
}) => {
  const rows = [
    ["Opening Stock", values.profitLoss.openingStock],
    ["Closing Stock", values.profitLoss.closingStock],
    ["Net Purchase", values.profitLoss.netPurchase],
    ["Net Sales", values.profitLoss.netSales],
    ["Gross Profit/Loss", values.profitLoss.grossProfitLoss],
    ["Other Income", values.profitLoss.otherIncome],
    ["Expense", values.profitLoss.expense],
    ["Net Profit/Loss", values.profitLoss.netProfitLoss],
  ];

  return (
    <div className="rounded-sm border border-sky-200 bg-sky-50 shadow-default dark:border-sky-500/20 dark:bg-sky-500/10">
      <div className="border-b border-sky-200 px-5 py-4 dark:border-sky-500/20">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-sky-900 dark:text-sky-100">
              Net Profit Debug
            </h3>
            <p className="mt-1 text-sm text-sky-800 dark:text-sky-200">
              {branchName} | { formatDate(values.filters.startDate) || "-"} to {formatDate(values.filters.endDate) || "-"}
            </p>
          </div>
          <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
            {values.hasApiDebug
              ? `Formula: ${values.profitLoss.formula || "Profit Loss formula"}`
              : "API debug not found. Re-apply after updating backend ReportsController."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 py-5 xl:grid-cols-3">
        <div className="rounded-sm border border-sky-200 bg-[rgb(var(--c-surface))] p-4 dark:border-sky-500/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Balance Sheet Stock
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <DebugLine label="Opening" value={values.stock.opening} />
            <DebugLine label="Movement" value={values.stock.movement} />
            <DebugLine label="Closing" value={values.stock.closing} />
          </div>
        </div>

        <div className="rounded-sm border border-sky-200 bg-[rgb(var(--c-surface))] p-4 dark:border-sky-500/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Net Profit Posting
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Opening period: {values.openingProfitLoss.periodStart || "-"} to {values.openingProfitLoss.periodEnd || "-"}
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <DebugLine label="Opening" value={values.netProfit.opening} />
            <DebugLine label="Movement" value={values.netProfit.movement} />
            <DebugLine label="Closing" value={values.netProfit.closing} />
          </div>
        </div>

        <div className="rounded-sm border border-sky-200 bg-[rgb(var(--c-surface))] p-4 dark:border-sky-500/20 xl:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Profit Loss Components
          </p>
          <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-sm text-slate-700 sm:grid-cols-2 dark:text-slate-200">
            {rows.map(([label, value]) => (
              <DebugLine key={label} label={String(label)} value={Number(value)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const DebugLine = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center justify-between gap-3">
    <span>{label}</span>
    <span className="font-semibold">{formatAmount(value)}</span>
  </div>
);

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
      <p className="mt-3 text-2xl font-semibold">{formatAmount(value)}</p>
    </div>
  );
};

const SectionCard = ({
  title,
  accent,
  groups,
  totalLabel,
  totalValue,
  totalColumns,
  perPage,
  fontSize,
  onGroupClick,
}: {
  title: string;
  accent: string;
  groups: ReportGroup[];
  totalLabel: string;
  totalValue: number;
  totalColumns: ColumnTotals;
  perPage: number;
  fontSize: number;
  onGroupClick: (group: ReportGroup) => void;
}) => {
  const rows = useMemo(() => {
    return groups.map((group, index) => ({
      key: `${group.group_name || "group"}-${index}-group`,
      rawGroup: group,
      label: group.group_name || "",
      opening: toNum(group.opening),
      movement: toNum(group.movement),
      closing: toNum(group.closing || group.total),
      itemCount: (group.items || []).length,
    }));
  }, [groups]);

  const visibleRows = rows.slice(0, Math.max(perPage, rows.length));

  return (
    <div className="overflow-hidden rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
      <div className={`bg-linear-to-r ${accent} px-5 py-4 text-white`}>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-[rgb(var(--c-border))]">
              <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200">
                Particulars
              </th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                Opening
              </th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                Movement
              </th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                Closing
              </th>
            </tr>
          </thead>
          <tbody style={{ fontSize: `${fontSize}px` }}>
            {visibleRows.map((row) => (
              <tr
                key={row.key}
                onClick={() => onGroupClick(row.rawGroup)}
                className="cursor-pointer border-b border-[rgb(var(--c-border))] bg-slate-50 transition hover:bg-slate-100 last:border-b-0 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <span>{row.label}</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {row.itemCount} item{row.itemCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(row.opening)}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(row.movement)}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(row.closing)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[rgb(var(--c-border))]">
              <td className="px-5 py-4 font-bold text-slate-900 dark:text-[rgb(var(--c-text))]">
                {totalLabel}
              </td>
              <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-[rgb(var(--c-text))]">
                {thousandSeparator(totalColumns.opening)}
              </td>
              <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-[rgb(var(--c-text))]">
                {thousandSeparator(totalColumns.movement)}
              </td>
              <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-[rgb(var(--c-text))]">
                {thousandSeparator(totalColumns.closing || totalValue)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const GroupDetailsModal = ({
  open,
  title,
  group,
  onClose,
}: {
  open: boolean;
  title: string;
  group: ReportGroup | null;
  onClose: () => void;
}) => {
  if (!open || !group) return null;

  const items = group.items || [];

  return (
    <div
      className="fixed inset-0 z-999 overflow-y-auto bg-slate-950/50 px-4 py-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-start justify-center">
      <div className="my-2 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
              {title}: {group.group_name || "Details"}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Clicked summary details are shown here.
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[rgb(var(--c-border))] px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </Button>
        </div>

        <div className="shrink-0 border-b border-[rgb(var(--c-border))] bg-slate-50 px-5 py-4 dark:bg-slate-900/40">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <ModalStat label="Opening" value={toNum(group.opening)} />
            <ModalStat label="Movement" value={toNum(group.movement)} />
            <ModalStat label="Closing" value={toNum(group.closing || group.total)} />
            <ModalStat label="Items" value={items.length} isCount />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <table className="min-w-full">
            <thead>
              <tr className="sticky top-0 z-20 border-b border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-sm">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Particular
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Opening
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Movement
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Closing
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr
                    key={`${item.coa4_id || index}-${item.name || "item"}`}
                    className="border-b border-[rgb(var(--c-border))] last:border-b-0"
                  >
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-100">
                      {item.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200">
                      {formatAmount(toNum(item.opening))}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200">
                      {formatAmount(toNum(item.movement))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-[rgb(var(--c-text))]">
                      {formatAmount(toNum(item.closing || item.balance))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No detailed items found for this summary.
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
  isCount = false,
}: {
  label: string;
  value: number;
  isCount?: boolean;
}) => (
  <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <p className="mt-2 text-lg font-bold text-slate-900 dark:text-[rgb(var(--c-text))]">
      {isCount ? value : formatAmount(value)}
    </p>
  </div>
);

export default BalanceSheet;
