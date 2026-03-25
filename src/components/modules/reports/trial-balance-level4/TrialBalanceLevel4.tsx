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
import Table from "../../../utils/others/Table";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { fetchTrialBalanceLevel4 } from "./trialBalanceLevel4Slice";
import TrialBalanceLevel4Print from "./TrialBalanceLevel4Print";

type TrialBalanceRow = {
  key: string;
  code: string;
  name: string;
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  closingDebit: number;
  closingCredit: number;
};

const toNum = (value: any) => {
  const numericValue = Number(
    typeof value === "string" ? value.replace(/,/g, "") : value,
  );
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const pickFirst = (obj: any, keys: string[]) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
};

const findArrayCollection = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;

  const directKeys = [
    "rows",
    "data",
    "list",
    "items",
    "trial_balance",
    "trialBalance",
    "accounts",
    "result",
  ];

  for (const key of directKeys) {
    if (Array.isArray(raw?.[key])) {
      return raw[key];
    }
  }

  if (raw?.data) {
    return findArrayCollection(raw.data);
  }

  return [];
};

const normalizeRows = (items: any[]): TrialBalanceRow[] => {
  return items
    .map((item: any, index: number) => ({
      key: `${pickFirst(item, ["coa4_id", "id", "code", "head_code"]) || index}`,
      code: String(
        pickFirst(item, [
          "coa4_id",
          "id",
          "code",
          "head_code",
          "account_code",
          "coa_code",
        ]) || "",
      ),
      name: String(
        pickFirst(item, [
          "coal4_name",
          "NAME",
          "name",
          "head_name",
          "account_name",
          "title",
          "particulars",
        ]) || "Unnamed Head",
      ),
      openingDebit: toNum(
        pickFirst(item, ["opening_debit_bal", "opening_debit", "opening_dr"]),
      ),
      openingCredit: toNum(
        pickFirst(item, ["opening_credit_bal", "opening_credit", "opening_cr"]),
      ),
      movementDebit: toNum(
        pickFirst(item, ["movement_debit_bal", "movement_debit", "movement_dr"]),
      ),
      movementCredit: toNum(
        pickFirst(item, ["movement_credit_bal", "movement_credit", "movement_cr"]),
      ),
      closingDebit: toNum(
        pickFirst(item, ["debit_bal", "closing_debit_bal", "debit"]),
      ),
      closingCredit: toNum(
        pickFirst(item, ["credit_bal", "closing_credit_bal", "credit"]),
      ),
    }))
    .filter((row) => row.closingDebit !== 0 || row.closingCredit !== 0);
};

const formatAmount = (amount: number) => {
  const formatted = thousandSeparator(Math.abs(amount), 2);
  return amount < 0 ? `(${formatted})` : formatted;
};

const TrialBalanceLevel4 = (user: any) => {
  const dispatch = useDispatch();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const trialBalanceState: any = useSelector(
    (state: any) => state.trialBalanceLevel4,
  );

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
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

  const rawReportData = useMemo(() => {
    const raw = trialBalanceState?.data;

    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (raw?.data?.data) return raw.data.data;
    if (raw?.data) return raw.data;
    return raw;
  }, [trialBalanceState?.data]);

  const rows = useMemo(() => {
    return normalizeRows(findArrayCollection(rawReportData));
  }, [rawReportData]);

  const tableData = useMemo(() => {
    return rows.map((row, index) => ({
      sl_number: index + 1,
      ...row,
    }));
  }, [rows]);

  const totals = useMemo(() => {
    const totalsSource = rawReportData?.totals || rawReportData?.summary || {};

    return {
      openingDebit:
        toNum(pickFirst(totalsSource, ["opening_debit_bal", "opening_debit"])) ||
        rows.reduce((sum, row) => sum + row.openingDebit, 0),
      openingCredit:
        toNum(pickFirst(totalsSource, ["opening_credit_bal", "opening_credit"])) ||
        rows.reduce((sum, row) => sum + row.openingCredit, 0),
      movementDebit:
        toNum(pickFirst(totalsSource, ["movement_debit_bal", "movement_debit"])) ||
        rows.reduce((sum, row) => sum + row.movementDebit, 0),
      movementCredit:
        toNum(
          pickFirst(totalsSource, ["movement_credit_bal", "movement_credit"]),
        ) || rows.reduce((sum, row) => sum + row.movementCredit, 0),
      closingDebit:
        toNum(pickFirst(totalsSource, ["debit_bal", "closing_debit_bal"])) ||
        rows.reduce((sum, row) => sum + row.closingDebit, 0),
      closingCredit:
        toNum(pickFirst(totalsSource, ["credit_bal", "closing_credit_bal"])) ||
        rows.reduce((sum, row) => sum + row.closingCredit, 0),
    };
  }, [rawReportData, rows]);

  const hasReportData = rows.length > 0;

  const branchName = useMemo(() => {
    const selected = dropdownData.find(
      (branch: any) => Number(branch.id) === Number(branchId),
    );
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

    const action = await dispatch(
      fetchTrialBalanceLevel4({
        branch_id: Number(branchId),
        start_date: dayjs(startDate).format("YYYY-MM-DD"),
        end_date: dayjs(endDate).format("YYYY-MM-DD"),
      }) as any,
    );

    setButtonLoading(false);

    if (action?.meta?.requestStatus !== "fulfilled") {
      alert(action?.payload || "Trial balance level 4 load failed");
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Trial Balance Level 4",
    removeAfterPrint: true,
  });

  const columns = [
    {
      key: "sl_number",
      header: "Sl. No",
      headerClass: "text-center",
      cellClass: "text-center w-20",
      render: (row: any) => <div>{row.sl_number}</div>,
    },
    {
      key: "name",
      header: "COA L4 Name",
      cellClass: "w-80",
      render: (row: any) => <div className="whitespace-normal">{row.name}</div>,
    },
    {
      key: "openingDebit",
      header: "Dr",
      headerClass: "text-right",
      cellClass: "text-right w-32",
      render: (row: any) => <div>{thousandSeparator(row.openingDebit,0)}</div>,
    },
    {
      key: "openingCredit",
      header: "Cr",
      headerClass: "text-right",
      cellClass: "text-right w-32",
      render: (row: any) => <div>{thousandSeparator(row.openingCredit,0)}</div>,
    },
    {
      key: "movementDebit",
      header: "Dr",
      headerClass: "text-right",
      cellClass: "text-right w-32",
      render: (row: any) => <div>{thousandSeparator(row.movementDebit,0)}</div>,
    },
    {
      key: "movementCredit",
      header: "Cr",
      headerClass: "text-right",
      cellClass: "text-right w-32",
      render: (row: any) => <div>{thousandSeparator(row.movementCredit,0)}</div>,
    },
    {
      key: "closingDebit",
      header: "Dr",
      headerClass: "text-right",
      cellClass: "text-right w-32",
      render: (row: any) => <div>{thousandSeparator(row.closingDebit,0)}</div>,
    },
    {
      key: "closingCredit",
      header: "Cr",
      headerClass: "text-right",
      cellClass: "text-right w-32",
      render: (row: any) => <div>{thousandSeparator(row.closingCredit,0)}</div>,
    },
  ];

  const headerRows = [
    [
      { label: "Sl. No", rowSpan: 2, className: "text-center" },
      { label: "COA L4 Name", rowSpan: 2 },
      { label: "Opening", colSpan: 2, className: "text-center" },
      { label: "Movement", colSpan: 2, className: "text-center" },
      { label: "Closing", colSpan: 2, className: "text-center" },
    ],
    [
      { label: "Dr", className: "text-center" },
      { label: "Cr", className: "text-center" },
      { label: "Dr", className: "text-center" },
      { label: "Cr", className: "text-center" },
      { label: "Dr", className: "text-center" },
      { label: "Cr", className: "text-center" },
    ],
  ];

  const footerRows = [
    [
      { label: "Grand Total", colSpan: 2, className: "text-right" },
      { label: thousandSeparator(totals.openingDebit, 0), className: "text-right" },
      { label: thousandSeparator(totals.openingCredit, 0), className: "text-right" },
      { label: thousandSeparator(totals.movementDebit, 0), className: "text-right" },
      { label: thousandSeparator(totals.movementCredit, 0), className: "text-right" },
      { label: thousandSeparator(totals.closingDebit, 0), className: "text-right" },
      { label: thousandSeparator(totals.closingCredit, 0), className: "text-right" },
    ],
  ];

  return (
    <>
      <HelmetTitle title="Trial Balance Level 4" />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 md:px-6 2xl:px-8">
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Trial Balance Level 4
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Opening, movement, and closing debit-credit balances by COA level 4.
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
            <div>
              <InputElement
                type="number"
                id="tbl4-font-size"
                label="Font Size"
                value={fontSize}
                onChange={(e: any) => setFontSize(Number(e.target.value) || 12)}
                className="h-10"
              />
            </div>
          </div>
        </div>

        {trialBalanceState?.loading && (
          <div className="rounded-sm border border-stroke bg-white p-8 shadow-default dark:border-strokedark dark:bg-boxdark">
            <Loader />
          </div>
        )}

        {!trialBalanceState?.loading && !hasReportData && (
          <div className="rounded-sm border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-default dark:border-slate-700 dark:bg-boxdark">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              No trial balance loaded yet
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Select a branch and date range, then click Load Report.
            </p>
          </div>
        )}

        {!trialBalanceState?.loading && hasReportData && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard title="Closing Debit" value={totals.closingDebit} tone="emerald" />
              <SummaryCard title="Closing Credit" value={totals.closingCredit} tone="blue" />
              <SummaryCard
                title="Difference"
                value={totals.closingDebit - totals.closingCredit}
                tone={
                  Math.abs(totals.closingDebit - totals.closingCredit) > 0.009
                    ? "amber"
                    : "slate"
                }
              />
            </div>

            <div className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Trial Balance Rows
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {branchName} • {startDate ? dayjs(startDate).format("DD/MM/YYYY") : "-"} to{" "}
                      {endDate ? dayjs(endDate).format("DD/MM/YYYY") : "-"}
                    </p>
                  </div>
                  <div className="rounded-sm bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    Rows: {rows.length}
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5" style={{ fontSize: `${fontSize}px` }}>
                <Table
                  columns={columns}
                  data={tableData || []}
                  headerRows={headerRows}
                  footerRows={footerRows}
                  noDataMessage="No trial balance data found"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="hidden">
        <div ref={printRef}>
          <TrialBalanceLevel4Print
            branchName={branchName}
            startDate={startDate ? dayjs(startDate).format("DD/MM/YYYY") : "-"}
            endDate={endDate ? dayjs(endDate).format("DD/MM/YYYY") : "-"}
            rows={rows}
            fontSize={Number(fontSize)}
            totals={totals}
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
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
    blue: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100",
    amber:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100",
    slate:
      "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-100",
  };

  return (
    <div className={`rounded-sm border p-5 shadow-default ${toneMap[tone]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-2xl font-bold">{ thousandSeparator (value, 0)}</p>
    </div>
  );
};

export default TrialBalanceLevel4;
