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
import { fetchBalanceSheet } from "./balanceSheetSlice";
import { fetchProfitLoss } from "../profit-loss/profitLossSlice";
import BalanceSheetPrint from "./BalanceSheetPrint";

type ReportGroup = {
  group_name?: string;
  total?: number | string;
  items?: Array<{
    name?: string;
    balance?: number | string;
  }>;
};

type TradingRow = {
  coal3_id?: number | string;
  coal4_id?: number | string;
  debit?: number | string;
  credit?: number | string;
};

const toNum = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const findClosingStockAmount = (data: any) => {
  const candidates = [
    data?.closing_stock,
    data?.closingStock,
    data?.closing_stock_amount,
    data?.closingStockAmount,
    data?.stock_value,
    data?.stockValue,
    data?.totals?.closing_stock,
    data?.totals?.closingStock,
  ];

  for (const candidate of candidates) {
    const amount = toNum(candidate);
    if (amount !== 0) return amount;
  }

  return 0;
};

const getProfitLossApiData = (raw: any) => {
  if (raw?.data?.data?.trading) return raw.data.data;
  if (raw?.data?.trading) return raw.data;
  if (raw?.trading) return raw;
  if (raw?.summary?.closing_stock || raw?.summary?.opening_stock) return raw;
  return null;
};

const sumClosingStockByCoal4Id = (rows: TradingRow[], coal4Id: number) => {
  return rows
    .filter((row) => Number(row.coal4_id) === coal4Id)
    .reduce(
      (acc, row) => {
        acc.debit += toNum(row.debit);
        acc.credit += toNum(row.credit);
        return acc;
      },
      { debit: 0, credit: 0 },
    );
};

const getClosingStockAmountFromProfitLoss = (data: any) => {
  const normalizedData = getProfitLossApiData(data);
  if (!normalizedData) return 0;

  const tradingRows: TradingRow[] = normalizedData?.trading || [];
  const fifoClosingStock = sumClosingStockByCoal4Id(tradingRows, 21).credit;
  if (fifoClosingStock) return fifoClosingStock;

  return (
    findClosingStockAmount(normalizedData) ||
    findClosingStockAmount(normalizedData?.summary)
  );
};

const formatAmount = (amount: number) => {
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return amount < 0 ? `(${formatted})` : formatted;
};

const SUMMARY_ONLY_GROUP_PATTERNS = [
  "account receivable",
  "accounts receivable",
  "account payable",
  "accounts payable",
  "receivable",
  "payable",
];

const shouldShowSummaryOnly = (groupName?: string) => {
  const normalizedName = String(groupName || "").trim().toLowerCase();
  return SUMMARY_ONLY_GROUP_PATTERNS.some((pattern) =>
    normalizedName.includes(pattern),
  );
};

const BalanceSheet = (user: any) => {
  const dispatch = useDispatch();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const balanceSheetState: any = useSelector((state: any) => state.balanceSheet);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [closingStockAmount, setClosingStockAmount] = useState(0);
  const [perPage, setPerPage] = useState<number>(14);
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
          return;
        }

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

  const { assets, injectedClosingStockAmount } = useMemo(() => {
    const baseAssets = Array.isArray(apiData?.assets) ? [...apiData.assets] : [];
    const hasClosingStock = baseAssets.some((group) =>
      String(group?.group_name || "").trim().toLowerCase().includes("closing stock"),
    );

    if (hasClosingStock) {
      return { assets: baseAssets, injectedClosingStockAmount: 0 };
    }

    const derivedClosingStockAmount =
      findClosingStockAmount(apiData) || closingStockAmount;
    if (!derivedClosingStockAmount) {
      return { assets: baseAssets, injectedClosingStockAmount: 0 };
    }

    return {
      assets: [
        ...baseAssets,
        {
          group_name: "Closing Stock",
          total: derivedClosingStockAmount,
          items: [],
        },
      ],
      injectedClosingStockAmount: derivedClosingStockAmount,
    };
  }, [apiData, closingStockAmount]);
  const liabilities: ReportGroup[] = apiData?.liabilities || [];
  const equity: ReportGroup[] = apiData?.equity || [];

  const totals = useMemo(() => {
    const baseAssetsTotal = toNum(apiData?.totals?.assets);
    const effectiveAssetsTotal = baseAssetsTotal + injectedClosingStockAmount;
    const liabilitiesAndEquity = toNum(apiData?.totals?.liabilities_and_equity);

    return {
      assets: effectiveAssetsTotal,
      liabilities: toNum(apiData?.totals?.liabilities),
      equity: toNum(apiData?.totals?.equity),
      liabilitiesAndEquity,
      difference: liabilitiesAndEquity - effectiveAssetsTotal,
    };
  }, [apiData, injectedClosingStockAmount]);

  const hasReportData = assets.length > 0 || liabilities.length > 0 || equity.length > 0;

  const branchName = useMemo(() => {
    const selected = dropdownData.find((branch: any) => Number(branch.id) === Number(branchId));
    return selected?.name || "Selected Branch";
  }, [dropdownData, branchId]);

  const handleBranchChange = (e: any) => {
    const value = Number(e.target.value);
    setBranchId(Number.isFinite(value) ? value : null);
  };

  const handleActionButtonClick = async () => {
    if (!branchId) return alert("Branch select করুন");
    if (!startDate || !endDate) return alert("Start/End Date দিন");

    setButtonLoading(true);
    const formattedStartDate = dayjs(startDate).format("YYYY-MM-DD");
    const formattedEndDate = dayjs(endDate).format("YYYY-MM-DD");

    const profitLossAction = await dispatch(
      fetchProfitLoss({
        branch_id: Number(branchId),
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      } as any) as any,
    );

    if (profitLossAction?.meta?.requestStatus === "fulfilled") {
      const closingAmount = getClosingStockAmountFromProfitLoss(
        profitLossAction.payload,
      );
      setClosingStockAmount(closingAmount);
    } else {
      setClosingStockAmount(0);
    }

    const balanceSheetAction = await dispatch(
      fetchBalanceSheet({
        branchId: Number(branchId),
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      }) as any,
    );

    setButtonLoading(false);

    if (balanceSheetAction?.meta?.requestStatus !== "fulfilled") {
      alert(balanceSheetAction?.payload || "Balance sheet load failed");
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Balance Sheet",
    removeAfterPrint: true,
  });

  return (
    <>
      <HelmetTitle title="Balance Sheet" />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 md:px-6 2xl:px-8">
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Balance Sheet
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Bangladesh accounting presentation with assets on the left and liabilities plus equity on the right.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ButtonLoading
                  label="Load Report"
                  onClick={handleActionButtonClick}
                  buttonLoading={buttonLoading}
                  className="h-10 rounded-sm px-5"
                />
                <PrintButton
                  label="Print"
                  onClick={handlePrint}
                  className="h-10 rounded-sm px-5"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-200">
                Branch
              </label>
              <BranchDropdown
                branchDdl={dropdownData}
                onChange={handleBranchChange}
                defaultValue={branchId ? String(branchId) : ""}
                className="h-10 rounded-sm px-3"
              />
            </div>
            <div>
              <InputDatePicker
                label="Start Date"
                selectedDate={startDate}
                setSelectedDate={setStartDate}
                setCurrentDate={setStartDate}
                className="h-10 w-full rounded-sm"
              />
            </div>
            <div>
              <InputDatePicker
                label="End Date"
                selectedDate={endDate}
                setSelectedDate={setEndDate}
                setCurrentDate={setEndDate}
                className="h-10 w-full rounded-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputElement
                type="number"
                id="bs-per-page"
                label="Rows/Page"
                value={perPage}
                onChange={(e: any) => setPerPage(Number(e.target.value) || 1)}
                className="h-10"
              />
              <InputElement
                type="number"
                id="bs-font-size"
                label="Font Size"
                value={fontSize}
                onChange={(e: any) => setFontSize(Number(e.target.value) || 12)}
                className="h-10"
              />
            </div>
          </div>
        </div>

        {balanceSheetState?.loading && (
          <div className="rounded-sm border border-stroke bg-white p-8 shadow-default dark:border-strokedark dark:bg-boxdark">
            <Loader />
          </div>
        )}

        {!balanceSheetState?.loading && !hasReportData && (
          <div className="rounded-sm border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-default dark:border-slate-700 dark:bg-boxdark">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              No balance sheet loaded yet
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Select a branch, date range, then click Load Report.
            </p>
          </div>
        )}

        {!balanceSheetState?.loading && hasReportData && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard title="Total Assets" value={totals.assets} tone="emerald" />
              <SummaryCard title="Liabilities + Equity" value={totals.liabilitiesAndEquity} tone="blue" />
              <SummaryCard title="Difference" value={totals.difference} tone={Math.abs(totals.difference) > 0.009 ? "amber" : "slate"} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SectionCard
                title="Assets"
                accent="from-emerald-500 to-teal-600"
                groups={assets}
                totalLabel="Total Assets"
                totalValue={totals.assets}
                perPage={perPage}
                fontSize={fontSize}
              />
              <div className="space-y-6">
                <SectionCard
                  title="Liabilities"
                  accent="from-sky-500 to-blue-600"
                  groups={liabilities}
                  totalLabel="Total Liabilities"
                  totalValue={totals.liabilities}
                  perPage={perPage}
                  fontSize={fontSize}
                />
                <SectionCard
                  title="Equity"
                  accent="from-violet-500 to-indigo-600"
                  groups={equity}
                  totalLabel="Total Equity"
                  totalValue={totals.equity}
                  perPage={perPage}
                  fontSize={fontSize}
                />
              </div>
            </div>

            <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                    Final Position
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    As on {endDate ? dayjs(endDate).format("DD/MM/YYYY") : "-"} for {branchName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Liabilities + Equity
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatAmount(totals.liabilitiesAndEquity)}
                  </p>
                </div>
              </div>

              {Math.abs(totals.difference) > 0.009 && (
                <div className="mt-4 rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-600/40 dark:bg-amber-500/10 dark:text-amber-200">
                  Difference detected: {formatAmount(totals.difference)}. Please review ledger mapping or period transactions.
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
            startDate={startDate ? dayjs(startDate).format("DD/MM/YYYY") : "-"}
            endDate={endDate ? dayjs(endDate).format("DD/MM/YYYY") : "-"}
            assets={assets.map(normalizeGroup)}
            liabilities={liabilities.map(normalizeGroup)}
            equity={equity.map(normalizeGroup)}
            totals={totals}
          />
        </div>
      </div>
    </>
  );
};

const normalizeGroup = (group: ReportGroup) => ({
  group_name: group.group_name || "",
  total: toNum(group.total),
  items: (group.items || []).map((item) => ({
    name: item.name || "",
    balance: toNum(item.balance),
  })),
});

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
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
    blue: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100",
    amber: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100",
    slate: "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-100",
  };

  return (
    <div className={`rounded-sm border p-5 shadow-default ${toneMap[tone]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-2xl font-bold">{formatAmount(value)}</p>
    </div>
  );
};

const SectionCard = ({
  title,
  accent,
  groups,
  totalLabel,
  totalValue,
  perPage,
  fontSize,
}: {
  title: string;
  accent: string;
  groups: ReportGroup[];
  totalLabel: string;
  totalValue: number;
  perPage: number;
  fontSize: number;
}) => {
  const rows = useMemo(() => {
    return groups.flatMap((group) => [
      {
        key: `${group.group_name}-group`,
        type: "group",
        label: group.group_name || "",
        amount: toNum(group.total),
      },
      ...((shouldShowSummaryOnly(group.group_name) ? [] : group.items || []).map((item, itemIndex) => ({
        key: `${group.group_name}-${item.name}-${itemIndex}`,
        type: "item",
        label: item.name || "",
        amount: toNum(item.balance),
      }))),
    ]);
  }, [groups]);

  const visibleRows = rows.slice(0, Math.max(perPage, rows.length));

  return (
    <div className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className={`bg-gradient-to-r ${accent} px-5 py-4 text-white`}>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-stroke dark:border-strokedark">
              <th className="px-5 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200">
                Particulars
              </th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                Amount
              </th>
            </tr>
          </thead>
          <tbody style={{ fontSize: `${fontSize}px` }}>
            {visibleRows.map((row) => (
              <tr
                key={row.key}
                className={`border-b border-stroke last:border-b-0 dark:border-strokedark ${
                  row.type === "group"
                    ? "bg-slate-50 dark:bg-slate-800/50"
                    : ""
                }`}
              >
                <td
                  className={`px-5 py-3 text-slate-800 dark:text-slate-100 ${
                    row.type === "group"
                      ? "font-semibold"
                      : "pl-9 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {row.label}
                </td>
                <td
                  className={`px-5 py-3 text-right ${
                    row.type === "group"
                      ? "font-semibold text-slate-900 dark:text-white"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {formatAmount(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 dark:border-slate-600">
              <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                {totalLabel}
              </td>
              <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">
                {formatAmount(totalValue)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default BalanceSheet;
