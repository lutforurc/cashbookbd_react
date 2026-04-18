import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useReactToPrint } from "react-to-print";
import { FiCheckSquare, FiFilter, FiRotateCcw } from "react-icons/fi";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import InputDatePicker from "../../../utils/fields/DatePicker";
import InputElement from "../../../utils/fields/InputElement";
import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import routes from "../../../services/appRoutes";
import httpService from "../../../services/httpService";
import { API_REPORT_PRODUCT_PROFIT_LOSS_URL } from "../../../services/apiRoutes";
import Table from "../../../utils/others/Table";
import ProductProfitLossPrint from "./ProductProfitLossPrint";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { VoucherPrintRegistry } from "../../vouchers/VoucherPrintRegistry";
import { useVoucherPrint } from "../../vouchers";

type ProductProfitRow = {
  sl?: number;
  mid?: number | null;
  vr_no?: string | number | null;
  vr_date?: string | null;
  product_id?: number;
  product_name: string;
  sold_qty: number;
  opening_qty?: number;
  opening_amount?: number;
  period_in_qty?: number;
  period_in_amount?: number;
  closing_qty?: number;
  closing_amount?: number;
  unit_purchase_rate: number | null;
  purchase_total: number | null;
  unit_sale_rate: number;
  sale_total: number;
  profit: number | null;
  warning?: string;
};

const formatNumber = (value: number | null | undefined, decimal = 2) => {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal,
  });
};

const formatMoney = (value: number | null | undefined) => {
  return formatNumber(value, 2);
};

const formatVoucherDate = (value: string | null | undefined) => {
  if (!value) return "-";

  const parsed = dayjs(value);
  if (parsed.isValid()) {
    return parsed.format("DD/MM/YYYY");
  }

  return value;
};

const getNetLabel = (amount: number) => {
  if (amount > 0) return "Profit";
  if (amount < 0) return "Loss";
  return "Profit / Loss";
};

const ProductProfitLoss = (user: any) => {
  const dispatch = useDispatch();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled =
    String(settings?.data?.branch?.use_filter_parameter ?? "") === "1";

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportRows, setReportRows] = useState<ProductProfitRow[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);
  const [summary, setSummary] = useState({
    totalQty: 0,
    totalPurchase: 0,
    totalSales: 0,
    totalProfit: 0,
    warningCount: 0,
  });
  const [lastRunMeta, setLastRunMeta] = useState<{
    branchName: string;
    startDate: string;
    endDate: string;
  } | null>(null);

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

        const currentDate = new Date(year, month - 1, day);
        setStartDate(currentDate);
        setEndDate(currentDate);
      } catch {
        // Ignore invalid seed date and let the user choose manually.
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

    setButtonLoading(true);
    setError(null);

    try {
      const startDateValue = dayjs(startDate).format("YYYY-MM-DD");
      const endDateValue = dayjs(endDate).format("YYYY-MM-DD");

      const response = await httpService.post(
        API_REPORT_PRODUCT_PROFIT_LOSS_URL,
        {
          branch_id: Number(branchId),
          startDate: startDateValue,
          endDate: endDateValue,
        }
      );

      const payload = response?.data;

      if (!payload?.success) {
        throw new Error(payload?.message || "Product profit loss load failed");
      }

      const reportData = payload?.data?.data ?? payload?.data ?? {};
      const apiItems = Array.isArray(reportData?.items) ? reportData.items : [];
      const apiSummary = reportData?.summary ?? {};

      setReportRows(apiItems);
      setSummary({
        totalQty: Number(apiSummary?.total_qty || 0),
        totalPurchase: Number(apiSummary?.total_purchase || 0),
        totalSales: Number(apiSummary?.total_sales || 0),
        totalProfit: Number(apiSummary?.total_profit || 0),
        warningCount: Number(apiSummary?.warning_count || 0),
      });

      setLastRunMeta({
        branchName: selectedBranchName,
        startDate: dayjs(startDate).format("DD/MM/YYYY"),
        endDate: dayjs(endDate).format("DD/MM/YYYY"),
      });
      setFilterOpen(false);
    } catch (err: any) {
      setReportRows([]);
      setSummary({
        totalQty: 0,
        totalPurchase: 0,
        totalSales: 0,
        totalProfit: 0,
        warningCount: 0,
      });
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Product profit loss load failed"
      );
    } finally {
      setButtonLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilterOpen(false);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Product Profit Loss",
    removeAfterPrint: true,
  });

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setRowsPerPage(Number.isNaN(value) ? 12 : value);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFontSize(Number.isNaN(value) ? 12 : value);
  };

  const columns = [
    {
      key: "sl",
      header: "SL",
      headerClass: "text-center",
      cellClass: "text-center",
      render: (row: ProductProfitRow) => <div>{row?.sl ?? "-"}</div>,
    },
    {
      key: "product_name",
      header: "Product Name",
      render: (row: ProductProfitRow) => (
        <div className="font-medium">{row?.product_name || "-"}</div>
      ),
    },
    {
      key: "vr_no",
      header: "VR No",
      render: (row: ProductProfitRow) => (
        <div
          className={row?.vr_no ? "cursor-pointer hover:underline" : undefined}
          onClick={() => {
            if (!row?.vr_no || !row?.mid) return;

            handleVoucherPrint({
              ...row,
              mtm_id: row.mid,
            });
          }}
        >
          {row?.vr_no || "-"}
        </div>
      ),
    },
    {
      key: "vr_date",
      header: "VR Date",
      render: (row: ProductProfitRow) => (
        <div>{formatVoucherDate(row?.vr_date)}</div>
      ),
    },
    {
      key: "sold_qty",
      header: "Sold Qty",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: ProductProfitRow) => (
        <div>{thousandSeparator(row?.sold_qty, 0)}</div>
      ),
    },
    {
      key: "unit_purchase_rate",
      header: "Unit Purchase",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: ProductProfitRow) => (
        <div>{thousandSeparator( Number(row?.unit_purchase_rate), 2)}</div>
      ),
    },
    {
      key: "purchase_total",
      header: "Purchase Total",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: ProductProfitRow) => (
        <div>{thousandSeparator( Number(row?.purchase_total), 0)}</div>
      ),
    },
    {
      key: "unit_sale_rate",
      header: "Unit Sale",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: ProductProfitRow) => (
        <div>{thousandSeparator( Number(row?.unit_sale_rate), 2)}</div>
      ),
    },
    {
      key: "sale_total",
      header: "Sale Total",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: ProductProfitRow) => (
        <div>{thousandSeparator( Number(row?.sale_total), 0)}</div>
      ),
    },
    {
      key: "profit",
      header: "Profit / Loss",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: ProductProfitRow) => (
        <div>{thousandSeparator( Number(row?.profit), 0)}</div>
      ),
    },
    {
      key: "warning",
      header: "Remarks",
      render: (row: ProductProfitRow) =>
        row?.warning ? (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
            {row.warning}
          </span>
        ) : (
          <div>-</div>
        ),
    },
  ];

  const footerRows = tableData.length
    ? [
        [
          {
            label: "Summary",
            colSpan: 4,
            className: "text-left",
          },
          {
            label: thousandSeparator(summary.totalQty, 0),
            className: "text-right",
          },
          {
            label: "-",
            className: "text-right",
          },
          {
            label: thousandSeparator(summary.totalPurchase, 0),
            className: "text-right",
          },
          {
            label: "-",
            className: "text-right",
          },
          {
            label: thousandSeparator(summary.totalSales, 0),
            className: "text-right",
          },
          {
            label: `${getNetLabel(summary.totalProfit)}: ${thousandSeparator(
              Math.abs(summary.totalProfit),
              0
            )}`,
            className: "text-right",
          },
          {
            label:
              summary.warningCount > 0
                ? `${thousandSeparator(summary.warningCount, 0)} warning`
                : "-",
          },
        ],
      ]
    : undefined;

  return (
    <>
      <HelmetTitle title="Product Profit Loss" />

      <div className="space-y-3">
        <div className="pl-0 pr-1 py-3">
          <div className={`gap-3 ${useFilterMenuEnabled ? "flex flex-wrap items-center gap-3" : "flex flex-col xl:flex-row xl:items-end"}`}>
            <div className={useFilterMenuEnabled ? "relative shrink-0" : "min-w-[320px] flex-1"}>
              {useFilterMenuEnabled && (
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
              )}

              {(useFilterMenuEnabled ? filterOpen : true) && (
                <div
                  className={
                    useFilterMenuEnabled
                      ? "absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,340px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800"
                      : "w-full"
                  }
                >
                  <div
                  className={
                    useFilterMenuEnabled
                      ? "space-y-3"
                      : "grid grid-cols-3 items-end gap-3"
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
                        className="h-10 w-full pl-2"
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
                        className="h-10 w-full"
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
                        className="h-10 w-full"
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
                        label="Apply"
                        onClick={handleRunReport}
                        buttonLoading={buttonLoading}
                        className="h-10 px-6"
                        icon={<FiCheckSquare />}
                      />
                      <ButtonLoading
                        label="Reset"
                        onClick={handleResetFilters}
                        buttonLoading={false}
                        icon={<FiRotateCcw />}
                        className="h-10 px-4"
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
                <InputElement
                  id="rowsPerPage"
                  name="rowsPerPage"
                  label=""
                  value={rowsPerPage.toString()}
                  onChange={handleRowsPerPageChange}
                  type="text"
                  className="h-10 !w-20 text-center"
                />

                <InputElement
                  id="fontSize"
                  name="fontSize"
                  label=""
                  value={fontSize.toString()}
                  onChange={handleFontSizeChange}
                  type="text"
                  className="h-10 !w-20 text-center"
                />

                <PrintButton
                  onClick={handlePrint}
                  label="Print"
                  className="h-10 px-6"
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
                    className="h-10 px-6"
                  />
                  <ButtonLoading
                    label="Reset"
                    onClick={handleResetFilters}
                    buttonLoading={false} 
                    icon={<FiRotateCcw />}
                    className="h-10 px-4"
                  />
                </div>

                <div className="flex flex-nowrap items-end gap-2">
                  <InputElement
                    id="rowsPerPage"
                    name="rowsPerPage"
                    label=""
                    value={rowsPerPage.toString()}
                    onChange={handleRowsPerPageChange}
                    type="text"
                    className="h-10 !w-20 text-center"
                  />

                  <InputElement
                    id="fontSize"
                    name="fontSize"
                    label=""
                    value={fontSize.toString()}
                    onChange={handleFontSizeChange}
                    type="text"
                    className="h-10 !w-20 text-center"
                  />

                  <PrintButton
                    onClick={handlePrint}
                    label="Print"
                    className="h-10 px-6"
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

        <div className="mt-2">
          <div className="grid grid-cols-2 gap-3 border-b border-slate-200 pb-3 sm:grid-cols-3 xl:grid-cols-5 dark:border-strokedark">
            <div className="rounded border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-strokedark dark:bg-boxdark">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Qty.
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {thousandSeparator(summary.totalQty, 0)}
              </p>
            </div>

            <div className="rounded border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-strokedark dark:bg-boxdark">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Purchase
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {thousandSeparator(summary.totalPurchase, 0)}
              </p>
            </div>

            <div className="rounded border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-strokedark dark:bg-boxdark">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Sales
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {thousandSeparator(summary.totalSales, 0)}
              </p>
            </div>

            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-3 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                {getNetLabel(summary.totalProfit)}
              </p>
              <p className="mt-2 text-lg font-semibold text-amber-900 dark:text-amber-100">
                {thousandSeparator(Math.abs(summary.totalProfit), 0)}
              </p>
            </div>

            <div className="rounded border border-amber-300 bg-white px-3 py-3 shadow-sm dark:border-amber-500/40 dark:bg-boxdark">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                Warning
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {thousandSeparator(summary.warningCount, 0)}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Table
              columns={columns}
              data={tableData || []}
              footerRows={footerRows}
              noDataMessage="No report data found. Select branch and date range, then click Run."
            />
          </div>
        </div>

        <div className="hidden">
          <ProductProfitLossPrint
            ref={printRef}
            rows={tableData || []}
            startDate={startDate ? dayjs(startDate).format("DD/MM/YYYY") : undefined}
            endDate={endDate ? dayjs(endDate).format("DD/MM/YYYY") : undefined}
            title="Product Wise Profit Loss"
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

export default ProductProfitLoss;
