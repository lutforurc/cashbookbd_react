import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { FiCheckSquare, FiEdit, FiFilter, FiPrinter, FiRotateCcw } from "react-icons/fi";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import InputDatePicker from "../../../utils/fields/DatePicker";
import InputElement from "../../../utils/fields/InputElement";
import PrintFontInput from "../../../utils/fields/PrintFontInput";
import PrintRowsInput from "../../../utils/fields/PrintRowsInput";
import { Button, ButtonLoading, IconButton, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import httpService from "../../../services/httpService";
import { API_REPORT_INVOICE_WISE_PROFIT_URL } from "../../../services/apiRoutes";
import Table from "../../../utils/others/Table";
import Pagination from "../../../utils/utils-functions/Pagination";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { formatDayMonthYear } from "../../../utils/utils-functions/formatDate";
import { canEditVoucherRow } from "../../../utils/utils-functions/voucherEditPermission";
import {
  buildVoucherAutoEditStateForRow,
  getVoucherEditTargetForRow,
} from "../../../utils/utils-functions/voucherEditNavigation";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";
import { VoucherPrintRegistry } from "../../vouchers/VoucherPrintRegistry";
import { useVoucherPrint } from "../../vouchers";
import InvoiceWiseProfitPrint from "./InvoiceWiseProfitPrint";

type InvoiceWiseProfitRow = {
  sl?: number;
  mid?: number | null;
  vr_no?: string | null;
  vr_date?: string | null;
  customer_name?: string | null;
  invoice_amount?: number | null;
  received_amount?: number | null;
  discount?: number | null;
  profit?: number | null;
};

type InvoiceWiseProfitSummary = {
  invoice_amount: number;
  received_amount: number;
  discount: number;
  profit: number;
};

type ReportScope = {
  branchId: number;
  branchName: string;
  search: string;
  startDate: string;
  endDate: string;
  startDateLabel: string;
  endDateLabel: string;
};

const PAGE_SIZE = 10;

const EMPTY_SUMMARY: InvoiceWiseProfitSummary = {
  invoice_amount: 0,
  received_amount: 0,
  discount: 0,
  profit: 0,
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const InvoiceWiseProfit = (user: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, "use_filter_parameter");
  const userPermissions = settings?.data?.permissions || [];

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportRows, setReportRows] = useState<InvoiceWiseProfitRow[]>([]);
  const [summary, setSummary] = useState<InvoiceWiseProfitSummary>(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: PAGE_SIZE,
    total: 0,
  });
  // What the rows on screen were actually fetched with. Paging and the print
  // sheet name these rather than the boxes above, so a half-typed search
  // cannot reach paper or pull a page from another statement.
  const [appliedFilters, setAppliedFilters] = useState<ReportScope | null>(null);
  const [printRequested, setPrintRequested] = useState(false);
  const [printRows, setPrintRows] = useState<InvoiceWiseProfitRow[] | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);

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

        if (!Number.isFinite(year) || year < 1900 || year > 2100) {
          return;
        }

        // The month so far, the same opening range the other profit reports use.
        setStartDate(new Date(year, month - 1, 1));
        setEndDate(new Date(year, month - 1, day));
      } catch {
        // Ignore an unusable seed date; the user can pick the range.
      }
    }
  }, [
    branchDdlData?.protectedData?.data,
    branchDdlData?.protectedData?.transactionDate,
  ]);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    setBranchId(Number.isFinite(value) ? value : null);
  };

  const selectedBranchName = useMemo(() => {
    const branch = dropdownData.find(
      (item: any) => Number(item.id) === Number(branchId)
    );
    return branch?.name ?? "";
  }, [branchId, dropdownData]);

  const decimalPlaces = useMemo(() => {
    const raw = Number(settings?.data?.branch?.decimal_places ?? 0);
    return Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 0), 20) : 0;
  }, [settings?.data?.branch?.decimal_places]);

  /**
   * An amount for the Received Amt column, where an invoice that took nothing
   * is written "0.00" rather than the dash the shared formatter gives every
   * other zero -- the column answers "how much of this bill was paid", and a
   * dash reads as "not applicable" instead of "nothing".
   */
  const formatReceivedAmount = (value: unknown) => {
    const amount = toNumber(value);

    if (amount !== 0) return thousandSeparator(amount);

    // An unpaid bill is written 0.00 even where the branch drops decimals from
    // its amounts, which is what "nothing came in" is expected to look like.
    const digits = Math.max(decimalPlaces, 2);

    return (0).toLocaleString("en-IN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  };

  /**
   * One page of the report, as the server built it: it filters, sorts (newest
   * invoice first, then the newer id) and foots the whole result before it
   * cuts. `per_page = 0` asks for every row, which is what the print sheet
   * needs.
   */
  const requestReport = async ({
    scope,
    page,
    perPage,
  }: {
    scope: ReportScope;
    page: number;
    perPage: number;
  }) => {
    const response = await httpService.post(API_REPORT_INVOICE_WISE_PROFIT_URL, {
      branch_id: Number(scope.branchId),
      startDate: scope.startDate,
      endDate: scope.endDate,
      search: scope.search,
      page,
      per_page: perPage,
    });

    const payload = response?.data;

    if (!payload?.success) {
      throw new Error(payload?.message || "Invoice wise profit load failed");
    }

    const reportData = payload?.data?.data ?? payload?.data ?? {};
    const apiItems = Array.isArray(reportData?.items) ? reportData.items : [];
    const apiSummary = reportData?.summary ?? {};
    const apiPagination = reportData?.pagination ?? {};

    return {
      rows: apiItems.map((item: InvoiceWiseProfitRow) => ({
        ...item,
        invoice_amount: toNumber(item?.invoice_amount),
        received_amount: toNumber(item?.received_amount),
        discount: toNumber(item?.discount),
        profit: toNumber(item?.profit),
      })),
      summary: {
        invoice_amount: toNumber(apiSummary?.invoice_amount),
        received_amount: toNumber(apiSummary?.received_amount),
        discount: toNumber(apiSummary?.discount),
        profit: toNumber(apiSummary?.profit),
      },
      pagination: {
        currentPage: Number(apiPagination?.current_page) || 1,
        lastPage: Number(apiPagination?.last_page) || 1,
        perPage: Number(apiPagination?.per_page) || perPage,
        total: Number(apiPagination?.total) || 0,
      },
    };
  };

  const handleRunReport = async () => {
    if (!branchId) {
      alert("Please select branch");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select start and end date");
      return;
    }

    if (dayjs(endDate).startOf("day").isBefore(dayjs(startDate).startOf("day"))) {
      alert("End Date, Start Date-এর আগে হতে পারবে না");
      return;
    }

    const scope: ReportScope = {
      branchId: Number(branchId),
      branchName: selectedBranchName,
      search: search.trim(),
      startDate: dayjs(startDate).format("YYYY-MM-DD"),
      endDate: dayjs(endDate).format("YYYY-MM-DD"),
      startDateLabel: dayjs(startDate).format("DD/MM/YYYY"),
      endDateLabel: dayjs(endDate).format("DD/MM/YYYY"),
    };

    setButtonLoading(true);
    setError(null);

    try {
      const result = await requestReport({ scope, page: 1, perPage: PAGE_SIZE });

      setAppliedFilters(scope);
      setReportRows(result.rows);
      setSummary(result.summary);
      setPagination(result.pagination);
      setFilterOpen(false);
    } catch (err: any) {
      setReportRows([]);
      setSummary(EMPTY_SUMMARY);
      setPagination({ currentPage: 1, lastPage: 1, perPage: PAGE_SIZE, total: 0 });
      setAppliedFilters(null);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Invoice wise profit load failed"
      );
    } finally {
      setButtonLoading(false);
    }
  };

  const handlePageChange = async (nextPage: number) => {
    if (!appliedFilters || tableLoading) return;
    if (nextPage === pagination.currentPage) return;
    if (nextPage < 1 || nextPage > pagination.lastPage) return;

    setTableLoading(true);
    setError(null);

    try {
      const result = await requestReport({
        scope: appliedFilters,
        page: nextPage,
        perPage: pagination.perPage || PAGE_SIZE,
      });

      setReportRows(result.rows);
      setSummary(result.summary);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Invoice wise profit load failed"
      );
    } finally {
      setTableLoading(false);
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleRunReport();
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setReportRows([]);
    setSummary(EMPTY_SUMMARY);
    setPagination({ currentPage: 1, lastPage: 1, perPage: PAGE_SIZE, total: 0 });
    setAppliedFilters(null);
    setError(null);
    setFilterOpen(false);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setRowsPerPage(Number.isNaN(value) ? 12 : value);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFontSize(Number.isNaN(value) ? 12 : value);
  };

  const printRef = useRef<HTMLDivElement>(null);
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);

  const printDocument = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Invoice Wise Profit",
    onAfterPrint: () => {
      setPrintRequested(false);
      setPrintRows(null);
    },
  });

  const handlePrint = () => {
    if (!appliedFilters || tableLoading || printRequested) return;

    setPrintRows(null);
    setPrintRequested(true);
  };

  // The sheet carries the whole filtered set, so the rows for the paper are
  // fetched for the print alone -- the screen only holds the page it shows.
  useEffect(() => {
    if (!printRequested || !appliedFilters) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await requestReport({
          scope: appliedFilters,
          page: 1,
          perPage: 0,
        });

        if (!cancelled) setPrintRows(result.rows);
      } catch (err: any) {
        if (!cancelled) {
          setPrintRequested(false);
          setError(
            err?.response?.data?.message || err?.message || "Print failed"
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [printRequested]);

  // react-to-print copies the DOM when it is called, so the sheet is printed
  // only once the whole set is actually mounted.
  useEffect(() => {
    if (!printRequested || !printRows) return;

    const timer = setTimeout(() => printDocument(), 150);
    return () => clearTimeout(timer);
  }, [printRows, printRequested]);

  /**
   * Opens the invoice on the screen that owns it.
   *
   * The number's prefix decides: a 3- sale is edited on Sales, a 10- credit sale
   * on the same screen, and the router state carries the number the screen
   * searches for when it mounts.
   */
  const openInvoice = (row: InvoiceWiseProfitRow) => {
    const target = getVoucherEditTargetForRow(row);
    const state = buildVoucherAutoEditStateForRow(row);

    if (!target || !state) return;

    navigate(target.route, { state });
  };

  const columns = [
    {
      key: "sl",
      header: "#",
      headerClass: "text-center",
      cellClass: "text-center",
      width: "60px",
      render: (row: InvoiceWiseProfitRow) => <div>{row?.sl ?? ""}</div>,
    },
    {
      key: "vr_no",
      header: "Inv. No.",
      width: "100px",
      render: (row: InvoiceWiseProfitRow) => (
        <div className="font-medium">{row?.vr_no || "-"}</div>
      ),
    },
    {
      key: "vr_date",
      header: "Date",
      width: "100px",
      render: (row: InvoiceWiseProfitRow) => (
        <div className="whitespace-nowrap">{formatDayMonthYear(row?.vr_date)}</div>
      ),
    },
    {
      key: "customer_name",
      header: "Customer",
      // width: "",
      render: (row: InvoiceWiseProfitRow) => (
        <div className="whitespace-normal">{row?.customer_name || "-"}</div>
      ),
    },
    {
      key: "invoice_amount",
      header: "Inv. Amount",
      headerClass: "text-right",
      cellClass: "text-right",
      width: "130px",
      render: (row: InvoiceWiseProfitRow) => (
        <div className="whitespace-nowrap">
          {thousandSeparator(toNumber(row?.invoice_amount))}
        </div>
      ),
    },
    {
      key: "received_amount",
      header: "Received Amt",
      headerClass: "text-right",
      cellClass: "text-right",
      width: "130px",
      render: (row: InvoiceWiseProfitRow) => (
        <div className="whitespace-nowrap">
          {formatReceivedAmount(row?.received_amount)}
        </div>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      headerClass: "text-right",
      cellClass: "text-right",
      width: "130px",
      render: (row: InvoiceWiseProfitRow) => (
        <div className="whitespace-nowrap">
          {thousandSeparator(toNumber(row?.discount))}
        </div>
      ),
    },
    {
      key: "profit",
      header: "Profit",
      headerClass: "text-right",
      cellClass: "text-right",
      width: "100px",
      render: (row: InvoiceWiseProfitRow) => {
        const profit = toNumber(row?.profit);

        return (
          <div
            className={`whitespace-nowrap ${
              profit < 0 ? "text-red-600 dark:text-red-400" : ""
            }`}
          >
            {thousandSeparator(profit)}
          </div>
        );
      },
    },
    {
      key: "action",
      header: "Action",
      headerClass: "text-center",
      cellClass: "text-center",
      width: "90px",
      render: (row: InvoiceWiseProfitRow) => {
        if (!row?.vr_no) return <div>-</div>;

        return (
          <div className="flex items-center justify-center gap-2">
            {canEditVoucherRow(userPermissions, row) ? (
              <IconButton
                icon={<FiEdit />}
                title="Edit invoice"
                tone="primary"
                onClick={() => openInvoice(row)}
              />
            ) : null}

            <IconButton
              icon={<FiPrinter />}
              title="Print invoice"
              tone="primary"
              onClick={() =>
                handleVoucherPrint({ vr_no: row.vr_no, mtm_id: row.mid })
              }
            />
          </div>
        );
      },
    },
  ];

  // The foot is the server's summary, which covers every row the filters keep,
  // not just the page on screen.
  const footerRows = pagination.total
    ? [
        [
          {
            label: "Total",
            colSpan: 4,
            className: "text-left font-semibold",
          },
          {
            label: thousandSeparator(summary.invoice_amount),
            className: "text-right font-semibold",
          },
          {
            label: formatReceivedAmount(summary.received_amount),
            className: "text-right font-semibold",
          },
          {
            label: thousandSeparator(summary.discount),
            className: "text-right font-semibold",
          },
          {
            label: thousandSeparator(summary.profit),
            className: "text-right font-semibold",
          },
          { label: "", className: "" },
        ],
      ]
    : undefined;

  return (
    <>
      <HelmetTitle title="Invoice Wise Profit" />

      <div className="space-y-3">
        <div className="pl-0 pr-1 py-3">
          <div className={`gap-3 ${useFilterMenuEnabled ? "flex flex-wrap items-center gap-3" : "flex flex-wrap items-end"}`}>
            <div className={useFilterMenuEnabled ? "relative shrink-0" : "min-w-[320px] flex-1 md:max-xl:w-full md:max-xl:min-w-0 md:max-xl:flex-none xl:max-[1880px]:w-full xl:max-[1880px]:min-w-0 xl:max-[1880px]:flex-none"}>
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
                        : "grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-4 min-[1881px]:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]"
                    }
                  >
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Select Branch
                      </label>
                      <BranchDropdown
                        branchDdl={dropdownData}
                        onChange={handleBranchChange}
                        value={branchId ? String(branchId) : undefined}
                        className="w-full pl-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Search Invoice
                      </label>
                      <InputElement
                        id="searchInvoice"
                        name="searchInvoice"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Invoice No."
                        className="w-full"
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
                        className="w-full"
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
                        className="w-full"
                      />
                    </div>

                    <div
                      className={`flex gap-2 pt-1 ${
                        useFilterMenuEnabled ? "justify-end" : "hidden"
                      }`}
                    >
                      <ButtonLoading
                        label="Apply"
                        onClick={handleRunReport}
                        buttonLoading={buttonLoading}
                        className="px-6"
                        icon={<FiCheckSquare />}
                      />
                      <ButtonLoading
                        label="Reset"
                        onClick={handleResetFilters}
                        buttonLoading={false}
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
              <div className="ml-auto flex items-end gap-2">
                <PrintRowsInput
                  id="rowsPerPage"
                  name="rowsPerPage"
                  label=""
                  value={rowsPerPage.toString()}
                  onChange={handleRowsPerPageChange}
                  type="text"
                  className="w-20! text-center"
                />

                <PrintFontInput
                  id="fontSize"
                  name="fontSize"
                  label=""
                  value={fontSize.toString()}
                  onChange={handleFontSizeChange}
                  type="text"
                  className="w-20! text-center"
                />

                <PrintButton
                  onClick={handlePrint}
                  label="Print"
                  className="px-6"
                  disabled={!appliedFilters || tableLoading || printRequested}
                />
              </div>
            ) : (
              <div className="flex flex-nowrap items-end justify-between gap-3 overflow-x-auto xl:ml-auto">
                <div className="flex flex-nowrap items-end gap-2">
                  <ButtonLoading
                    label="Apply"
                    onClick={handleRunReport}
                    buttonLoading={buttonLoading}
                    icon={<FiCheckSquare />}
                    className="px-6"
                  />
                  <ButtonLoading
                    label="Reset"
                    onClick={handleResetFilters}
                    buttonLoading={false}
                    icon={<FiRotateCcw />}
                    className="px-4"
                  />
                </div>

                <div className="flex flex-nowrap items-end gap-2">
                  <PrintRowsInput
                    id="rowsPerPage"
                    name="rowsPerPage"
                    label=""
                    value={rowsPerPage.toString()}
                    onChange={handleRowsPerPageChange}
                    type="text"
                    className="w-20! text-center"
                  />

                  <PrintFontInput
                    id="fontSize"
                    name="fontSize"
                    label=""
                    value={fontSize.toString()}
                    onChange={handleFontSizeChange}
                    type="text"
                    className="w-20! text-center"
                  />

                  <PrintButton
                    onClick={handlePrint}
                    label="Print"
                    className="px-6"
                    disabled={!appliedFilters || tableLoading || printRequested}
                  />
                </div>
              </div>
            )}
          </div>

          {error ? (
            <div className="mt-4 border border-red-500/60 bg-red-950/40 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
        </div>

        <div className="pt-2">
          {tableLoading ? <Loader /> : null}

          <Table
            columns={columns}
            data={reportRows}
            footerRows={footerRows}
            noDataMessage="No report data found. Select branch and date range, then click Apply."
          />

          {pagination.total > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-300">
                {tableLoading
                  ? "Loading…"
                  : `Page ${pagination.currentPage} of ${pagination.lastPage} · ${pagination.total} invoices`}
              </span>

              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.lastPage}
                handlePageChange={handlePageChange}
              />
            </div>
          ) : null}
        </div>

        <div className="hidden">
          <InvoiceWiseProfitPrint
            ref={printRef}
            rows={printRows ?? []}
            branchName={appliedFilters?.branchName}
            search={appliedFilters?.search}
            startDate={appliedFilters?.startDateLabel}
            endDate={appliedFilters?.endDateLabel}
            rowsPerPage={Number(rowsPerPage)}
            fontSize={Number(fontSize)}
          />
          <VoucherPrintRegistry
            ref={voucherRegistryRef}
            rowsPerPage={Number(rowsPerPage)}
            fontSize={Number(fontSize)}
          />
        </div>
      </div>
    </>
  );
};

export default InvoiceWiseProfit;
