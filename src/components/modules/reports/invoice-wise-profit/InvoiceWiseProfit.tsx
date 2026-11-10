import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { FiCheckSquare, FiEdit, FiFilter, FiPrinter, FiRotateCcw } from "react-icons/fi";

import HelmetTitle from "../../../utils/others/HelmetTitle";
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
  invoice_amount?: number | null;
  profit?: number | null;
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
  const [error, setError] = useState<string | null>(null);
  const [reportRows, setReportRows] = useState<InvoiceWiseProfitRow[]>([]);
  // What the rows on screen were actually fetched with. The print sheet names
  // these rather than the boxes above, so a half-typed search cannot reach paper.
  const [appliedFilters, setAppliedFilters] = useState<{
    branchName: string;
    search: string;
    startDate: string;
    endDate: string;
  } | null>(null);
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

  const tableData = useMemo(
    () =>
      reportRows.map((row, index) => ({
        ...row,
        sl: row?.sl ?? index + 1,
      })),
    [reportRows]
  );

  // Footed from the rows the report is showing, so the totals and the print
  // sheet can never disagree with the list above them.
  const totals = useMemo(
    () =>
      tableData.reduce(
        (sum, row) => ({
          invoiceAmount: sum.invoiceAmount + toNumber(row.invoice_amount),
          profit: sum.profit + toNumber(row.profit),
        }),
        { invoiceAmount: 0, profit: 0 }
      ),
    [tableData]
  );

  const printRef = useRef<HTMLDivElement>(null);
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);

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

    setButtonLoading(true);
    setError(null);

    try {
      const response = await httpService.post(API_REPORT_INVOICE_WISE_PROFIT_URL, {
        branch_id: Number(branchId),
        startDate: dayjs(startDate).format("YYYY-MM-DD"),
        endDate: dayjs(endDate).format("YYYY-MM-DD"),
        search: search.trim(),
      });

      const payload = response?.data;

      if (!payload?.success) {
        throw new Error(payload?.message || "Invoice wise profit load failed");
      }

      const reportData = payload?.data?.data ?? payload?.data ?? {};
      const apiItems = Array.isArray(reportData?.items) ? reportData.items : [];

      setReportRows(
        apiItems.map((item: InvoiceWiseProfitRow) => ({
          ...item,
          invoice_amount: toNumber(item?.invoice_amount),
          profit: toNumber(item?.profit),
        }))
      );
      setAppliedFilters({
        branchName: selectedBranchName,
        search: search.trim(),
        startDate: dayjs(startDate).format("DD/MM/YYYY"),
        endDate: dayjs(endDate).format("DD/MM/YYYY"),
      });
      setFilterOpen(false);
    } catch (err: any) {
      setReportRows([]);
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

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleRunReport();
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setReportRows([]);
    setAppliedFilters(null);
    setError(null);
    setFilterOpen(false);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Invoice Wise Profit",
  });

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setRowsPerPage(Number.isNaN(value) ? 12 : value);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFontSize(Number.isNaN(value) ? 12 : value);
  };

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
      header: "Sl. No.",
      headerClass: "text-center",
      cellClass: "text-center",
      width: "70px",
      render: (row: InvoiceWiseProfitRow) => <div>{row?.sl ?? "-"}</div>,
    },
    {
      key: "vr_no",
      header: "Inv. No.",
      width: "170px",
      render: (row: InvoiceWiseProfitRow) => (
        <div className="font-medium">{row?.vr_no || "-"}</div>
      ),
    },
    {
      key: "vr_date",
      header: "Date",
      width: "110px",
      render: (row: InvoiceWiseProfitRow) => (
        <div className="whitespace-nowrap">{formatDayMonthYear(row?.vr_date)}</div>
      ),
    },
    {
      key: "invoice_amount",
      header: "Inv. Amount",
      headerClass: "text-right",
      cellClass: "text-right",
      width: "150px",
      render: (row: InvoiceWiseProfitRow) => (
        <div className="whitespace-nowrap">
          {thousandSeparator(toNumber(row?.invoice_amount))}
        </div>
      ),
    },
    {
      key: "profit",
      header: "Profit",
      headerClass: "text-right",
      cellClass: "text-right",
      width: "140px",
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

  const footerRows = tableData.length
    ? [
        [
          {
            label: "Total",
            colSpan: 3,
            className: "text-left font-semibold",
          },
          {
            label: thousandSeparator(totals.invoiceAmount),
            className: "text-right font-semibold",
          },
          {
            label: thousandSeparator(totals.profit),
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
                  disabled={tableData.length === 0}
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
                    disabled={tableData.length === 0}
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
          <Table
            columns={columns}
            data={tableData || []}
            footerRows={footerRows}
            noDataMessage="No report data found. Select branch and date range, then click Apply."
          />
        </div>

        <div className="hidden">
          <InvoiceWiseProfitPrint
            ref={printRef}
            rows={tableData || []}
            branchName={appliedFilters?.branchName}
            search={appliedFilters?.search}
            startDate={appliedFilters?.startDate}
            endDate={appliedFilters?.endDate}
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
