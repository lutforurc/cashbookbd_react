import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";
import { FiFilter } from "react-icons/fi";

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
import { fetchBalanceSheet } from "./balanceSheetSlice";
import BalanceSheetPrint from "./BalanceSheetPrint";

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
  const formatted = thousandSeparator(Math.abs(amount), 2);
  return amount < 0 ? `(${formatted})` : formatted;
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
  const [perPage, setPerPage] = useState<number>(40);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{
    title: string;
    group: ReportGroup;
  } | null>(null);

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
  const equity: ReportGroup[] = Array.isArray(apiData?.equity) ? apiData.equity : [];

  const totals = useMemo(() => {
    return {
      assets: toNum(apiData?.totals?.assets),
      liabilities: toNum(apiData?.totals?.liabilities),
      equity: toNum(apiData?.totals?.equity),
      liabilitiesAndEquity: toNum(apiData?.totals?.liabilities_and_equity),
      difference: toNum(apiData?.totals?.difference),
      assetsColumns: {
        opening: toNum(apiData?.totals?.assets_columns?.opening),
        movement: toNum(apiData?.totals?.assets_columns?.movement),
        closing: toNum(apiData?.totals?.assets_columns?.closing),
      },
      liabilitiesColumns: {
        opening: toNum(apiData?.totals?.liabilities_columns?.opening),
        movement: toNum(apiData?.totals?.liabilities_columns?.movement),
        closing: toNum(apiData?.totals?.liabilities_columns?.closing),
      },
      equityColumns: {
        opening: toNum(apiData?.totals?.equity_columns?.opening),
        movement: toNum(apiData?.totals?.equity_columns?.movement),
        closing: toNum(apiData?.totals?.equity_columns?.closing),
      },
      differenceColumns: {
        opening: toNum(apiData?.totals?.difference_columns?.opening),
        movement: toNum(apiData?.totals?.difference_columns?.movement),
        closing: toNum(apiData?.totals?.difference_columns?.closing),
      },
    };
  }, [apiData]);

  const hasReportData =
    assets.length > 0 || liabilities.length > 0 || equity.length > 0;

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
    content: () => printRef.current,
    documentTitle: "Balance Sheet",
    removeAfterPrint: true,
  });

  const handleResetFilters = () => {
    setFilterOpen(false);
  };

  return (
    <>
      <HelmetTitle title="Balance Sheet" />
      <div className="mx-auto space-y-6 ">
        <div className="pl-0 pr-1 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded border text-sm transition ${
                  filterOpen
                    ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                    : "border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
                }`}
                title="Open filters"
                aria-label="Open filters"
              >
                <FiFilter size={16} />
              </button>

              {filterOpen && (
                <div className="absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,340px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Select Branch
                      </label>
                      <BranchDropdown
                        branchDdl={dropdownData}
                        onChange={handleBranchChange}
                        defaultValue={branchId ? String(branchId) : ""}
                        value={branchId ? String(branchId) : ""}
                        className="h-10 rounded-sm px-3"
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
                        className="h-10 w-full rounded-sm"
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
                        className="h-10 w-full rounded-sm"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <ButtonLoading
                        label="Apply"
                        onClick={handleActionButtonClick}
                        buttonLoading={buttonLoading}
                        className="h-10 px-6"
                      />
                      <ButtonLoading
                        label="Reset"
                        onClick={handleResetFilters}
                        buttonLoading={false}
                        className="h-10 px-4"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300">
              Use the filter
            </div>

            <div className="ml-auto flex items-end gap-2">
              <InputElement
                type="number"
                id="bs-per-page"
                label=""
                value={perPage}
                onChange={(e: any) => setPerPage(Number(e.target.value) || 1)}
                className="h-10 !w-20 text-center"
              />
              <InputElement
                type="number"
                id="bs-font-size"
                label=""
                value={fontSize}
                onChange={(e: any) => setFontSize(Number(e.target.value) || 12)}
                className="h-10 !w-20 text-center"
              />
              <PrintButton
                label="Print"
                onClick={handlePrint}
                className="h-10 px-6"
                disabled={!hasReportData}
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

            <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">
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
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
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
    <div className="rounded-sm border border-amber-200 bg-white p-4 dark:border-amber-500/20 dark:bg-boxdark">
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
      "border-slate-200 bg-white text-slate-900 dark:border-strokedark dark:bg-boxdark dark:text-white",
    blue:
      "border-slate-200 bg-white text-slate-900 dark:border-strokedark dark:bg-boxdark dark:text-white",
    amber:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
    slate:
      "border-slate-200 bg-white text-slate-900 dark:border-strokedark dark:bg-boxdark dark:text-white",
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
                className="cursor-pointer border-b border-stroke bg-slate-50 transition hover:bg-slate-100 last:border-b-0 dark:border-strokedark dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <span>{row.label}</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {row.itemCount} item{row.itemCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">
                  {thousandSeparator(row.opening, 0)}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">
                  {thousandSeparator(row.movement, 0)}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">
                  {thousandSeparator(row.closing, 0)}
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
                {thousandSeparator(totalColumns.opening, 0)}
              </td>
              <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">
                {thousandSeparator(totalColumns.movement, 0)}
              </td>
              <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">
                {thousandSeparator(totalColumns.closing || totalValue, 0)}
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
      className="fixed inset-0 z-[999] overflow-y-auto bg-slate-950/50 px-4 py-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-start justify-center">
      <div className="my-2 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stroke bg-white px-5 py-4 dark:border-strokedark dark:bg-boxdark">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}: {group.group_name || "Details"}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Clicked summary details are shown here.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="shrink-0 border-b border-stroke bg-slate-50 px-5 py-4 dark:border-strokedark dark:bg-slate-900/40">
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
              <tr className="sticky top-0 z-20 border-b border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark">
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
                    className="border-b border-stroke last:border-b-0 dark:border-strokedark"
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
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
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
  <div className="rounded-sm border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-boxdark">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
      {isCount ? value : formatAmount(value)}
    </p>
  </div>
);

export default BalanceSheet;
