import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
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
import Table from "../../../utils/others/Table";
import Pagination from "../../../utils/utils-functions/Pagination";
import DdlMultiline from "../../../utils/utils-functions/DdlMultiline";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { formatDayMonthYear } from "../../../utils/utils-functions/formatDate";

import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { fetchGeneralLedger } from "./generalLedgerSlice";
import GeneralLedgerPrint from "./GeneralLedgerPrint";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";
import httpService from "../../../services/httpService";
import { API_REPORT_GENERAL_LEDGER_ACCOUNTS_URL } from "../../../services/apiRoutes";
import {
  buildVoucherAutoEditStateForRow,
  getVoucherEditTargetForRow,
} from "../../../utils/utils-functions/voucherEditNavigation";

type AccountOption = { value: string; label: string } | null;

const PER_PAGE = 25;

const amount = (value: number) => thousandSeparator(Math.abs(Number(value) || 0));

const balanceText = (value: number, type?: string) => {
  const side = type || (Number(value) >= 0 ? "Dr" : "Cr");
  return `${amount(value)} ${side}`;
};

const fetchAccountOptions = async (inputValue: string): Promise<{ value: string; label: string }[]> => {
  const response = await httpService.get(API_REPORT_GENERAL_LEDGER_ACCOUNTS_URL, {
    params: { search: inputValue },
  });

  const rows = response?.data?.data?.data;

  if (!Array.isArray(rows)) return [];

  return rows.map((row: any) => ({
    value: String(row.id),
    label: row.group_name ? `${row.name} — ${row.group_name}` : row.name,
  }));
};

const GeneralLedger = (user: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const glState: any = useSelector((state: any) => state.generalLedger);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, "use_filter_parameter");

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [accountOption, setAccountOption] = useState<AccountOption>(null);
  const [coa4Id, setCoa4Id] = useState<number | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [fontSize, setFontSize] = useState<number>(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<any>(null);
  const [printAccounts, setPrintAccounts] = useState<any[]>([]);
  const [printTotals, setPrintTotals] = useState<any>(null);
  const [printRequested, setPrintRequested] = useState(false);
  const [preparing, setPreparing] = useState<"print" | "excel" | null>(null);

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

  const data = glState?.data;
  const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
  const totals = data?.totals || {};
  const pagination = data?.pagination;
  const lastPage = Number(pagination?.last_page || 1);
  const totalAccounts = Number(pagination?.total_accounts || 0);

  const branchName = useMemo(() => {
    if (data?.branch?.name) return data.branch.name;

    const selected = dropdownData.find(
      (branch: any) => Number(branch.id) === Number(branchId),
    );

    return selected?.name || "Selected Branch";
  }, [data?.branch?.name, dropdownData, branchId]);

  const periodText = useMemo(() => {
    if (applied) {
      return `${formatDayMonthYear(applied.start_date)} to ${formatDayMonthYear(
        applied.end_date,
      )}`;
    }

    if (data?.period) {
      return `${formatDayMonthYear(data.period.start_date)} to ${formatDayMonthYear(
        data.period.end_date,
      )}`;
    }

    return "-";
  }, [applied, data?.period]);

  const accountsHeadName = useMemo(() => {
    if (data?.accounts_head?.name) return data.accounts_head.name;
    if (coa4Id) return accountOption?.label || "Selected Accounts Head";

    return "All Accounts";
  }, [data?.accounts_head?.name, coa4Id, accountOption]);

  const hasLoaded = Boolean(data);
  const hasReportData = accounts.length > 0;

  const handleBranchChange = (e: any) => {
    const value = Number(e.target.value);
    setBranchId(Number.isFinite(value) ? value : null);
  };

  const handleAccountSelect = (selected: any) => {
    setAccountOption(selected || null);
    setCoa4Id(selected?.value ? Number(selected.value) : null);
  };

  const handleApply = async () => {
    if (!branchId) return alert("Branch select করুন");
    if (!startDate || !endDate) return alert("Start/End Date দিন");

    const params = {
      branch_id: Number(branchId),
      start_date: dayjs(startDate).format("YYYY-MM-DD"),
      end_date: dayjs(endDate).format("YYYY-MM-DD"),
      coa4_id: coa4Id,
    };

    setButtonLoading(true);
    setPrintAccounts([]);
    setPrintTotals(null);

    const action = await dispatch(
      fetchGeneralLedger({ ...params, page: 1, per_page: PER_PAGE }) as any,
    );

    setButtonLoading(false);

    if (action?.meta?.requestStatus !== "fulfilled") {
      alert(action?.payload || "General Ledger load failed");
      return;
    }

    setApplied(params);
    setPage(1);
    setFilterOpen(false);
  };

  const handlePageChange = async (nextPage: number) => {
    if (!applied || nextPage < 1 || nextPage > lastPage || glState?.loading) return;

    setButtonLoading(true);

    const action = await dispatch(
      fetchGeneralLedger({ ...applied, page: nextPage, per_page: PER_PAGE }) as any,
    );

    setButtonLoading(false);

    if (action?.meta?.requestStatus !== "fulfilled") {
      alert(action?.payload || "General Ledger load failed");
      return;
    }

    setPage(nextPage);
  };

  const loadEverything = async () => {
    if (!applied) return null;

    const response = await httpService.get(API_REPORT_GENERAL_LEDGER_URL, {
      params: { ...applied, per_page: 0 },
    });

    if (response.data?.success !== true) {
      throw new Error(response.data?.message || "Failed to load the General Ledger");
    }

    return response.data.data?.data;
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "General Ledger",
  });

  useEffect(() => {
    if (!printRequested) return;

    const timer = setTimeout(() => {
      handlePrint();
      setPrintRequested(false);
    }, 60);

    return () => clearTimeout(timer);
  }, [printRequested]);

  const handlePrintClick = async () => {
    if (!hasLoaded) {
      toast.info("Load the report before printing");
      return;
    }

    setPreparing("print");

    try {
      const all = await loadEverything();

      if (!all || !Array.isArray(all.accounts) || all.accounts.length === 0) {
        toast.info("No General Ledger rows to print");
        return;
      }

      setPrintAccounts(all.accounts);
      setPrintTotals(all.totals);
      setPrintRequested(true);
    } catch (error: any) {
      toast.error(error?.message || "Failed to prepare the General Ledger for printing");
    } finally {
      setPreparing(null);
    }
  };

  const exportExcel = (all: any) => {
    const sheetRows: any[][] = [
      ["General Ledger"],
      ["Branch", branchName],
      ["Period", periodText],
      ["Accounts Head", accountsHeadName],
      ["Basis", "Posted vouchers, excluding year-closing entries"],
      [],
    ];

    all.accounts.forEach((accountItem: any) => {
      sheetRows.push([`${accountItem.name} (Code ${accountItem.code})`]);
      sheetRows.push([
        accountItem.type_name,
        accountItem.group2_name,
        accountItem.group_name,
      ]);
      sheetRows.push(["Date", "Voucher", "Narration", "Debit", "Credit", "Balance", "Dr/Cr"]);
      sheetRows.push([
        "",
        "",
        "Opening Balance",
        accountItem.opening_debit || "",
        accountItem.opening_credit || "",
        Math.abs(Number(accountItem.opening_balance) || 0),
        Number(accountItem.opening_balance) >= 0 ? "Dr" : "Cr",
      ]);

      (accountItem.rows || []).forEach((row: any) => {
        sheetRows.push([
          formatDayMonthYear(row.vr_date),
          row.vr_no,
          row.narration || "",
          row.debit || "",
          row.credit || "",
          Math.abs(Number(row.balance) || 0),
          row.balance_type || "",
        ]);
      });

      sheetRows.push([
        "",
        "",
        "Total",
        accountItem.debit || 0,
        accountItem.credit || 0,
        "",
        "",
      ]);
      sheetRows.push([
        "",
        "",
        "Closing Balance",
        "",
        "",
        Math.abs(Number(accountItem.closing_balance) || 0),
        Number(accountItem.closing_balance) >= 0 ? "Dr" : "Cr",
      ]);
      sheetRows.push([]);
    });

    sheetRows.push([
      "Grand Total",
      "",
      "",
      all.totals?.debit || 0,
      all.totals?.credit || 0,
      "",
      "",
    ]);

    const sheet = XLSX.utils.aoa_to_sheet(sheetRows);
    sheet["!cols"] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 46 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 8 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "General Ledger");
    XLSX.writeFile(
      workbook,
      `general-ledger-${dayjs(all.period?.start_date).format("YYYYMMDD")}-${dayjs(
        all.period?.end_date,
      ).format("YYYYMMDD")}.xlsx`,
    );
  };

  const handleExcelExport = async () => {
    if (!hasLoaded) {
      toast.info("Load the report before exporting");
      return;
    }

    setPreparing("excel");

    try {
      const all = await loadEverything();

      if (!all || !Array.isArray(all.accounts) || all.accounts.length === 0) {
        toast.info("No General Ledger rows to export");
        return;
      }

      exportExcel(all);
    } catch (error: any) {
      toast.error(error?.message || "Failed to export the General Ledger");
    } finally {
      setPreparing(null);
    }
  };

  const openVoucher = (row: any) => {
    const options = { bank: Boolean(row.is_bank_voucher) };
    const target = getVoucherEditTargetForRow(row, options);
    const state = buildVoucherAutoEditStateForRow(row, options);

    if (!target || !state) return;

    navigate(target.route, { state });
  };

  const columns = [
    {
      key: "vr_date",
      header: "Date",
      width: "92px",
      render: (row: any) => (
        <div className="whitespace-nowrap">
          {row.__opening ? "-" : formatDayMonthYear(row.vr_date)}
        </div>
      ),
    },
    {
      key: "vr_no",
      header: "Voucher",
      width: "125px",
      render: (row: any) =>
        row.__opening || !row.vr_no ? (
          <span>-</span>
        ) : (
          <button
            type="button"
            onClick={() => openVoucher(row)}
            className="text-left text-blue-600 underline-offset-2 hover:underline dark:text-blue-300"
            title="Open this voucher"
          >
            {row.vr_no}
          </button>
        ),
    },
    {
      key: "narration",
      header: "Narration",
      render: (row: any) => <div className="whitespace-normal">{row.narration || "-"}</div>,
    },
    {
      key: "debit",
      header: "Debit",
      headerClass: "text-right",
      cellClass: "text-right",
      width: "110px",
      render: (row: any) => (
        <div className="whitespace-nowrap">
          {Number(row.debit) ? amount(row.debit) : "-"}
        </div>
      ),
    },
    {
      key: "credit",
      header: "Credit",
      headerClass: "text-right",
      cellClass: "text-right",
      width: "110px",
      render: (row: any) => (
        <div className="whitespace-nowrap">
          {Number(row.credit) ? amount(row.credit) : "-"}
        </div>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      headerClass: "text-right",
      cellClass: "text-right",
      width: "140px",
      render: (row: any) => (
        <div className="whitespace-nowrap">
          {balanceText(Number(row.balance), row.balance_type)}
        </div>
      ),
    },
  ];

  return (
    <>
      <HelmetTitle title="General Ledger" />
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
                      ? "absolute left-0 top-full z-1000 mt-2 w-[min(92vw,360px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800"
                      : "w-full"
                  }
                >
                  <div
                    className={
                      useFilterMenuEnabled
                        ? "space-y-3"
                        : "grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-5 min-[1881px]:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]"
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
                        Accounts Head
                      </label>
                      <DdlMultiline
                        onSelect={handleAccountSelect}
                        value={accountOption}
                        fetchOptions={fetchAccountOptions}
                        minChars={0}
                        actionOptionLabel="All Accounts"
                        onActionSelect={() => {
                          setAccountOption(null);
                          setCoa4Id(null);
                        }}
                        acType=""
                        placeholder="All Accounts"
                        className=""
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

                    <div className="flex gap-2 pt-1">
                      <ButtonLoading
                        label="Apply"
                        onClick={handleApply}
                        buttonLoading={buttonLoading}
                        className="px-6"
                        icon={<FiCheckSquare />}
                      />
                      <ButtonLoading
                        label="Reset"
                        onClick={() => {
                          setAccountOption(null);
                          setCoa4Id(null);
                          setFilterOpen(false);
                        }}
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
                  id="general-ledger-font-size"
                  label=""
                  value={fontSize}
                  onChange={(e: any) => setFontSize(Number(e.target.value) || 12)}
                  className="w-20! text-center"
                />
                <PrintButton
                  label={preparing === "print" ? "Preparing…" : "Print / PDF"}
                  onClick={handlePrintClick}
                  className="px-6"
                  disabled={!hasLoaded || Boolean(preparing)}
                />
                <ButtonLoading
                  label={preparing === "excel" ? "Preparing…" : "Excel"}
                  onClick={handleExcelExport}
                  buttonLoading={preparing === "excel"}
                  disabled={Boolean(preparing)}
                  className="px-4"
                />
              </div>
            ) : (
              <div className="flex flex-nowrap items-end justify-between gap-3 overflow-x-auto xl:ml-auto">
                <div className="flex flex-nowrap items-end gap-2">
                  <ButtonLoading
                    label="Apply"
                    onClick={handleApply}
                    buttonLoading={buttonLoading}
                    className="px-6"
                    icon={<FiCheckSquare />}
                  />
                  <ButtonLoading
                    label="Reset"
                    onClick={() => {
                      setAccountOption(null);
                      setCoa4Id(null);
                      setFilterOpen(false);
                    }}
                    buttonLoading={false}
                    className="px-4"
                    icon={<FiRotateCcw />}
                  />
                </div>
                <div className="flex flex-nowrap items-end gap-2">
                  <PrintFontInput
                    type="number"
                    id="general-ledger-font-size"
                    label=""
                    value={fontSize}
                    onChange={(e: any) => setFontSize(Number(e.target.value) || 12)}
                    className="w-20! text-center"
                  />
                  <PrintButton
                    label={preparing === "print" ? "Preparing…" : "Print / PDF"}
                    onClick={handlePrintClick}
                    className="px-6"
                    disabled={!hasLoaded || Boolean(preparing)}
                  />
                  <ButtonLoading
                    label={preparing === "excel" ? "Preparing…" : "Excel"}
                    onClick={handleExcelExport}
                    buttonLoading={preparing === "excel"}
                    disabled={Boolean(preparing)}
                    className="px-4"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {glState?.loading && (
          <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-8 shadow-default">
            <Loader />
          </div>
        )}

        {!glState?.loading && glState?.error && (
          <div className="rounded-sm border border-red-300 bg-red-50 px-6 py-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {glState.error}
          </div>
        )}

        {!glState?.loading && !hasLoaded && !glState?.error && (
          <div className="rounded-sm border border-dashed border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-6 py-12 text-center shadow-default">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-[rgb(var(--c-text))]">
              No general ledger loaded yet
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Select a branch, an Accounts Head (or All Accounts) and a date range,
              then click Apply.
            </p>
          </div>
        )}

        {!glState?.loading && hasLoaded && !hasReportData && (
          <div className="rounded-sm border border-dashed border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-6 py-12 text-center shadow-default">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-[rgb(var(--c-text))]">
              No transactions found
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              There are no posted entries for {accountsHeadName} in {branchName} for{" "}
              {periodText}.
            </p>
          </div>
        )}

        {!glState?.loading && hasReportData && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <SummaryCard title="Total Debit" value={Number(totals.debit || 0)} />
              <SummaryCard title="Total Credit" value={Number(totals.credit || 0)} />
              <SummaryCard title="Closing Debit" value={Number(totals.closing_debit || 0)} />
              <SummaryCard title="Closing Credit" value={Number(totals.closing_credit || 0)} />
            </div>

            {accounts.map((account: any) => {
              const openingRow = {
                __opening: true,
                key: `opening-${account.coa4_id}`,
                vr_date: "",
                vr_no: "",
                narration: "Opening Balance",
                debit: Number(account.opening_debit || 0),
                credit: Number(account.opening_credit || 0),
                balance: Number(account.opening_balance || 0),
                balance_type: Number(account.opening_balance) >= 0 ? "Dr" : "Cr",
              };

              const tableRows = [
                openingRow,
                ...(account.rows || []).map((row: any) => ({
                  ...row,
                  key: `${account.coa4_id}-${row.atd_id}`,
                })),
              ];

              return (
                <div
                  key={account.coa4_id}
                  className="overflow-hidden rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default"
                >
                  <div className="border-b border-[rgb(var(--c-border))] px-5 py-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                          {account.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {account.type_name} / {account.group2_name} / {account.group_name}
                          {" · "}
                          Code {account.code}
                        </p>
                      </div>
                      <div className="rounded-sm bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                        Closing: {balanceText(Number(account.closing_balance || 0))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-5" style={{ fontSize: `${fontSize}px` }}>
                    <Table
                      columns={columns}
                      data={tableRows}
                      noDataMessage="No transactions in this period"
                      footerRows={[
                        [
                          { label: "Total", colSpan: 3, className: "text-right" },
                          {
                            label: amount(Number(account.debit || 0)),
                            className: "text-right",
                          },
                          {
                            label: amount(Number(account.credit || 0)),
                            className: "text-right",
                          },
                          {
                            label: balanceText(Number(account.closing_balance || 0)),
                            className: "text-right",
                          },
                        ],
                        [
                          {
                            label: "Closing Balance",
                            colSpan: 5,
                            className: "text-right",
                          },
                          {
                            label: balanceText(Number(account.closing_balance || 0)),
                            className: "text-right",
                          },
                        ],
                      ]}
                    />
                  </div>
                </div>
              );
            })}

            {lastPage > 1 && (
              <div className="flex flex-col gap-2 rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-4 py-3 shadow-default sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {totalAccounts} Accounts Head{totalAccounts === 1 ? "" : "s"} · page{" "}
                  {page} of {lastPage}
                </p>
                <Pagination
                  currentPage={page}
                  totalPages={lastPage}
                  handlePageChange={handlePageChange}
                />
              </div>
            )}

            <div className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              <p>
                Basis: posted vouchers only, with year-closing entries excluded —
                the same posted ledger Trial Balance Details prints. Opening is the
                balance before {formatDayMonthYear(applied?.start_date)}, and the
                closing balance is the two together. Totals cover the full filtered
                set, not only this page.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="hidden">
        <div ref={printRef}>
          <GeneralLedgerPrint
            branchName={branchName}
            startDate={formatDayMonthYear(applied?.start_date)}
            endDate={formatDayMonthYear(applied?.end_date)}
            accountsHeadName={accountsHeadName}
            fontSize={Number(fontSize)}
            accounts={printAccounts.length > 0 ? printAccounts : accounts}
            totals={printTotals || totals}
          />
        </div>
      </div>
    </>
  );
};

const SummaryCard = ({ title, value }: { title: string; value: number }) => (
  <div className="rounded border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-sm dark:border-strokedark dark:bg-boxdark dark:text-[rgb(var(--c-text))]">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
      {title}
    </p>
    <p className="mt-3 text-2xl font-semibold">{amount(value)}</p>
  </div>
);

export default GeneralLedger;
