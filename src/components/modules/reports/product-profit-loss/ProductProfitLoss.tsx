import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useReactToPrint } from "react-to-print";

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

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportRows, setReportRows] = useState<ProductProfitRow[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);
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

      <div className="space-y-3 text-white">
        
        <div>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-1 flex-wrap items-end gap-3">
              <div className="min-w-[180px] flex-1">
                <label className="mb-1 block text-sm text-slate-200">Select Branch</label>
                <BranchDropdown
                  branchDdl={dropdownData}
                  onChange={handleBranchChange}
                  value={branchId ? String(branchId) : undefined}
                  className="h-10 border border-slate-600 bg-slate-800 text-white"
                />
              </div>

              <div className="min-w-[180px] flex-1">
                <InputDatePicker
                  label="Start Date"
                  selectedDate={startDate}
                  setSelectedDate={setStartDate}
                  setCurrentDate={setStartDate}
                  className="h-10 w-full border border-slate-600 bg-slate-800 text-white"
                />
              </div>

              <div className="min-w-[180px] flex-1">
                <InputDatePicker
                  label="End Date"
                  selectedDate={endDate}
                  setSelectedDate={setEndDate}
                  setCurrentDate={setEndDate}
                  className="h-10 w-full border border-slate-600 bg-slate-800 text-white"
                />
              </div>
            </div>

            <div className="w-full xl:w-auto">
              <div className="flex flex-wrap items-end gap-2 xl:flex-nowrap">
                <div className="min-w-[62px] max-w-[62px] flex-1">
                  <InputElement
                    id="rowsPerPage"
                    name="rowsPerPage"
                    label="Rows"
                    value={rowsPerPage.toString()}
                    onChange={handleRowsPerPageChange}
                    type="text"
                    className="h-9 w-full border border-slate-600 bg-slate-800 text-white"
                  />
                </div>

                <div className="min-w-[62px] max-w-[62px] flex-1">
                  <InputElement
                    id="fontSize"
                    name="fontSize"
                    label="Font"
                    value={fontSize.toString()}
                    onChange={handleFontSizeChange}
                    type="text"
                    className="h-9 w-full border border-slate-600 bg-slate-800 text-white"
                  />
                </div>

                <div className="min-w-[76px] max-w-[76px] flex-1">
                  <ButtonLoading
                    label="Run"
                    onClick={handleRunReport}
                    buttonLoading={buttonLoading}
                    className="h-9 w-full border border-slate-600 bg-slate-800 px-3 text-white"
                  />
                </div>

                <div className="min-w-[58px] max-w-[58px] flex-1">
                  <PrintButton
                    onClick={handlePrint}
                    label=""
                    className="h-9 w-full border border-slate-600 bg-slate-800 px-0 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 border border-red-500/60 bg-red-950/40 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-2">
          <div className="border-b border-slate-700 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="border border-slate-600 bg-slate-800 px-3 py-1 font-medium text-white">
                  Qty: {thousandSeparator(summary.totalQty, 0)}
                </span>
                <span className="border border-slate-600 bg-slate-800 px-3 py-1 font-medium text-white">
                  Purchase: {thousandSeparator(summary.totalPurchase, 0)}
                </span>
                <span className="border border-slate-600 bg-slate-800 px-3 py-1 font-medium text-white">
                  Sales: {thousandSeparator(summary.totalSales, 0)}
                </span>
                <span className="border border-slate-600 bg-slate-800 px-3 py-1 font-medium text-white">
                  Profit: {thousandSeparator(Math.abs(summary.totalProfit), 0)}
                </span>
                <span className="border border-slate-600 bg-slate-800 px-3 py-1 font-medium text-white">
                  Warning: {thousandSeparator(summary.warningCount, 0)}
                </span>
              </div>
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
