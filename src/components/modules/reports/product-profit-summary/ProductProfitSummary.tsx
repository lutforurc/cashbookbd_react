import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { useReactToPrint } from "react-to-print";
import { FiCheckSquare, FiFilter, FiRotateCcw } from "react-icons/fi";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import CategoryDropdown from "../../../utils/utils-functions/CategoryDropdown";
import InputDatePicker from "../../../utils/fields/DatePicker";
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import FieldLoading from "../../../utils/components/FieldLoading";
import { ButtonLoading, PrintButton, Button } from "../../../../pages/UiElements/CustomButtons";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { getCategoryDdl } from "../../category/categorySlice";
import { fetchBrandDdl } from "../../product/brand/brandSlice";
import { getProductGroupDdl } from "../../productgroup/productGroupSlice";
import httpService from "../../../services/httpService";
import { API_REPORT_PRODUCT_PROFIT_SUMMARY_URL } from "../../../services/apiRoutes";
import Table from "../../../utils/others/Table";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";
import ProductProfitSummaryPrint from "./ProductProfitSummaryPrint";
import type { ProductProfitSummaryRow, ProductProfitSummaryTotals } from "./ProductProfitSummaryPrint";

const EMPTY_SUMMARY: ProductProfitSummaryTotals = {
  totalQty: 0,
  totalSales: 0,
  totalCost: 0,
  totalProfit: 0,
};

const getNetLabel = (amount: number) => {
  if (amount > 0) return "Profit";
  if (amount < 0) return "Loss";
  return "Profit / Loss";
};

const ProductProfitSummary = (user: any) => {
  const dispatch = useDispatch();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const categoryData: any = useSelector((state: any) => state.category);
  const brandData: any = useSelector((state: any) => state.brand);
  const productGroupData: any = useSelector((state: any) => state.productGroup);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [brandId, setBrandId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportRows, setReportRows] = useState<ProductProfitSummaryRow[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);
  const [summary, setSummary] = useState<ProductProfitSummaryTotals>(EMPTY_SUMMARY);
  const [lastRun, setLastRun] = useState<{
    branchName: string;
    startDate: string;
    endDate: string;
    category: string;
    brand: string;
    group: string;
  } | null>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    dispatch(getCategoryDdl() as any);
    dispatch(fetchBrandDdl() as any);
    dispatch(getProductGroupDdl() as any);
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

        const startOfYear = new Date(year, 0, 1);
        setStartDate(startOfYear);
        setEndDate(new Date(year, month - 1, day));
      } catch {
        // Ignore invalid seed date and let the user choose manually.
      }
    }
  }, [
    branchDdlData?.protectedData?.data,
    branchDdlData?.protectedData?.transactionDate,
  ]);

  const brandOptions = [{ id: "", name: "All Brand" }, ...(brandData?.brandDdl?.data || [])];
  const groupOptions = [
    { id: "", name: "All Groups" },
    ...(Array.isArray(productGroupData?.ddlData?.data) ? productGroupData.ddlData.data : []),
  ];
  const categoryOptions = [
    { id: "", name: "All Categories" },
    ...(Array.isArray(categoryData?.ddlData?.data?.category) ? categoryData.ddlData.data.category : []),
  ];

  const nameOf = (options: any[], id: string) =>
    id ? String(options.find((o: any) => String(o.id) === String(id))?.name ?? "") : "";

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

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    setBranchId(Number.isFinite(value) ? value : null);
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

    setButtonLoading(true);
    setError(null);

    try {
      const response = await httpService.post(API_REPORT_PRODUCT_PROFIT_SUMMARY_URL, {
        branch_id: Number(branchId),
        startDate: dayjs(startDate).format("YYYY-MM-DD"),
        endDate: dayjs(endDate).format("YYYY-MM-DD"),
        category_id: categoryId || null,
        brand_id: brandId || null,
        group_id: groupId || null,
      });

      const payload = response?.data;

      if (!payload?.success) {
        throw new Error(payload?.message || "Product profit summary load failed");
      }

      const reportData = payload?.data?.data ?? payload?.data ?? {};
      const apiItems: ProductProfitSummaryRow[] = Array.isArray(reportData?.items)
        ? reportData.items
        : [];
      const apiSummary = reportData?.summary ?? {};
      const adjustment = Number(apiSummary?.adjustment || 0);

      // The gap between the product rows and the account's Gross Profit
      // (discounts, branch transfers, rounding) is shown as a row of its own,
      // so the grand total below it is the Profit & Loss Account's figure.
      const rows: ProductProfitSummaryRow[] = [...apiItems];
      if (adjustment !== 0) {
        rows.push({
          sl: rows.length + 1,
          product_name: "Discount & other adjustments",
          is_adjustment: true,
          profit: adjustment,
        });
      }

      setReportRows(rows);
      setSummary({
        totalQty: Number(apiSummary?.total_qty || 0),
        totalSales: Number(apiSummary?.total_sales || 0),
        totalCost: Number(apiSummary?.total_cost || 0),
        totalProfit: Number(apiSummary?.total_profit || 0),
      });
      setLastRun({
        branchName: selectedBranchName,
        startDate: dayjs(startDate).format("DD/MM/YYYY"),
        endDate: dayjs(endDate).format("DD/MM/YYYY"),
        category: nameOf(categoryOptions, categoryId),
        brand: nameOf(brandOptions, brandId),
        group: nameOf(groupOptions, groupId),
      });
      setFilterOpen(false);
    } catch (err: any) {
      setReportRows([]);
      setSummary(EMPTY_SUMMARY);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Product profit summary load failed"
      );
    } finally {
      setButtonLoading(false);
    }
  };

  const handleResetFilters = () => {
    setCategoryId("");
    setBrandId("");
    setGroupId("");
    setFilterOpen(false);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Product Profit Summary",
  });

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setRowsPerPage(Number.isNaN(value) ? 12 : value);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFontSize(Number.isNaN(value) ? 12 : value);
  };

  const amountCell = (value: number | null | undefined, row: ProductProfitSummaryRow) =>
    row?.is_adjustment && value === undefined ? "" : thousandSeparator(Number(value || 0));

  const columns = [
    {
      key: "sl",
      header: "SL",
      headerClass: "text-center",
      cellClass: "text-center",
      render: (row: ProductProfitSummaryRow) => <div>{row?.sl ?? "-"}</div>,
    },
    {
      key: "product_name",
      header: "Code - Product Name",
      render: (row: ProductProfitSummaryRow) => (
        <div className={row?.is_adjustment ? "italic" : "font-medium"}>
          {row?.code ? `${row.code} - ` : ""}
          {row?.product_name || "-"}
        </div>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      render: (row: ProductProfitSummaryRow) => <div>{row?.unit || ""}</div>,
    },
    {
      key: "sales_qty",
      header: "Qty",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: ProductProfitSummaryRow) => <div>{amountCell(row?.sales_qty, row)}</div>,
    },
    {
      key: "sales_amount",
      header: "Sales Amount",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: ProductProfitSummaryRow) => <div>{amountCell(row?.sales_amount, row)}</div>,
    },
    {
      key: "cost_amount",
      header: "Cost Amount",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: ProductProfitSummaryRow) => <div>{amountCell(row?.cost_amount, row)}</div>,
    },
    {
      key: "profit",
      header: "Profit Amount",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: ProductProfitSummaryRow) => <div>{amountCell(row?.profit, row)}</div>,
    },
  ];

  const footerRows = tableData.length
    ? [
        [
          { label: "Grand Total", colSpan: 3, className: "text-left" },
          { label: thousandSeparator(summary.totalQty), className: "text-right" },
          { label: thousandSeparator(summary.totalSales), className: "text-right" },
          { label: thousandSeparator(summary.totalCost), className: "text-right" },
          { label: thousandSeparator(summary.totalProfit), className: "text-right" },
        ],
      ]
    : undefined;

  const labelClass = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200";

  const actionButtons = (
    <>
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
    </>
  );

  const printControls = (
    <>
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
    </>
  );

  return (
    <>
      <HelmetTitle title="Product Profit Summary" />

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
                      : "border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"}`}
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
                      <label className={labelClass}>Select Branch</label>
                      <BranchDropdown
                        branchDdl={dropdownData}
                        onChange={handleBranchChange}
                        value={branchId ? String(branchId) : undefined}
                        className="w-full pl-2"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Category</label>
                      {categoryData?.loaded ? (
                        <CategoryDropdown
                          onChange={(opt: any) => setCategoryId(String(opt?.value ?? ""))}
                          className="w-full text-sm"
                          categoryDdl={categoryOptions}
                          value={categoryId}
                          placeholder="All Categories"
                        />
                      ) : (
                        <FieldLoading />
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Brand</label>
                      {brandData?.loaded ? (
                        <CategoryDropdown
                          onChange={(opt: any) => setBrandId(String(opt?.value ?? ""))}
                          className="w-full text-sm"
                          categoryDdl={brandOptions}
                          value={brandId}
                          placeholder="All Brand"
                        />
                      ) : (
                        <FieldLoading />
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Group</label>
                      {productGroupData?.loaded ? (
                        <CategoryDropdown
                          onChange={(opt: any) => setGroupId(String(opt?.value ?? ""))}
                          className="w-full text-sm"
                          categoryDdl={groupOptions}
                          value={groupId}
                          placeholder="All Groups"
                        />
                      ) : (
                        <FieldLoading />
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Start Date</label>
                      <InputDatePicker
                        selectedDate={startDate}
                        setSelectedDate={setStartDate}
                        setCurrentDate={setStartDate}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>End Date</label>
                      <InputDatePicker
                        selectedDate={endDate}
                        setSelectedDate={setEndDate}
                        setCurrentDate={setEndDate}
                        className="w-full"
                      />
                    </div>

                    <div className={`flex gap-2 pt-1 ${useFilterMenuEnabled ? "justify-end" : "hidden"}`}>
                      {actionButtons}
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
              <div className="ml-auto flex items-end gap-2">{printControls}</div>
            ) : (
              <div className="flex flex-nowrap items-end justify-between gap-3 overflow-x-auto xl:ml-auto">
                <div className="flex flex-nowrap items-end gap-2">{actionButtons}</div>
                <div className="flex flex-nowrap items-end gap-2">{printControls}</div>
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
          <div className="grid grid-cols-2 gap-3 border-b border-[rgb(var(--c-border))] pb-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Qty.</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                {thousandSeparator(summary.totalQty)}
              </p>
            </div>

            <div className="rounded border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Sales</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                {thousandSeparator(summary.totalSales)}
              </p>
            </div>

            <div className="rounded border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Cost</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                {thousandSeparator(summary.totalCost)}
              </p>
            </div>

            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-3 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                {getNetLabel(summary.totalProfit)}
              </p>
              <p className="mt-2 text-lg font-semibold text-amber-900 dark:text-amber-100">
                {thousandSeparator(Math.abs(summary.totalProfit))}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Table
              columns={columns}
              data={tableData || []}
              footerRows={footerRows}
              noDataMessage="No report data found. Select the filters and date range, then click Apply."
            />
          </div>
        </div>

        <div className="hidden">
          <ProductProfitSummaryPrint
            ref={printRef}
            rows={tableData || []}
            summary={summary}
            branchName={lastRun?.branchName}
            category={lastRun?.category}
            brand={lastRun?.brand}
            group={lastRun?.group}
            startDate={lastRun?.startDate ?? (startDate ? dayjs(startDate).format("DD/MM/YYYY") : undefined)}
            endDate={lastRun?.endDate ?? (endDate ? dayjs(endDate).format("DD/MM/YYYY") : undefined)}
            title="Product Profit Summary"
            rowsPerPage={Number(rowsPerPage)}
            fontSize={Number(fontSize)}
          />
        </div>
      </div>
    </>
  );
};

export default ProductProfitSummary;
