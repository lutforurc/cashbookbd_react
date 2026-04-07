import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import InputDatePicker from "../../../utils/fields/DatePicker";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import routes from "../../../services/appRoutes";
import httpService from "../../../services/httpService";
import { API_REPORT_PRODUCT_PROFIT_LOSS_URL } from "../../../services/apiRoutes";
type ProductProfitRow = {
  sl?: number;
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
    const branch = dropdownData.find((item: any) => Number(item.id) === Number(branchId));
    return branch?.name ?? "";
  }, [branchId, dropdownData]);

  const handleRunReport = async () => {
    if (!branchId) {
      alert("Branch select করুন");
      return;
    }

    if (!startDate || !endDate) {
      alert("Start/End Date দিন");
      return;
    }

    setButtonLoading(true);
    setError(null);

    try {
      const startDateValue = dayjs(startDate).format("YYYY-MM-DD");
      const endDateValue = dayjs(endDate).format("YYYY-MM-DD");

      const response = await httpService.post(API_REPORT_PRODUCT_PROFIT_LOSS_URL, {
        branch_id: Number(branchId),
        startDate: startDateValue,
        endDate: endDateValue,
      });

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
        err?.response?.data?.message || err?.message || "Product profit loss load failed"
      );
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <>
      <HelmetTitle title="Product Profit Loss" />

      <div className="mx-auto w-full max-w-[1700px] text-gray-900 dark:text-white">
        <div className="mb-5 rounded-sm border border-stroke bg-white px-5 py-4 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Product Profit Loss</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Profit Loss রিপোর্টের নিচে product-wise purchase, sales এবং profit দেখানোর জন্য এই page প্রস্তুত করা হয়েছে।
              </p>
            </div>

            <Link
              to={routes.profit_loss}
              className="inline-flex items-center justify-center rounded-sm border border-stroke px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:border-strokedark dark:hover:bg-meta-4"
            >
              Back To Profit Loss
            </Link>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm">Select Branch</label>
              <BranchDropdown
                branchDdl={dropdownData}
                onChange={handleBranchChange}
                value={branchId ? String(branchId) : undefined}
                className="h-11"
              />
            </div>

            <div>
              <InputDatePicker
                label="Start Date"
                selectedDate={startDate}
                setSelectedDate={setStartDate}
                setCurrentDate={setStartDate}
                className="h-11 w-full"
              />
            </div>

            <div>
              <InputDatePicker
                label="End Date"
                selectedDate={endDate}
                setSelectedDate={setEndDate}
                setCurrentDate={setEndDate}
                className="h-11 w-full"
              />
            </div>

            <div className="flex items-end">
              <ButtonLoading
                label="Run"
                onClick={handleRunReport}
                buttonLoading={buttonLoading}
                className="h-11 w-full rounded-sm"
              />
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Product-wise Profit Table</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {lastRunMeta
                    ? `${lastRunMeta.branchName || "Selected Branch"} | ${lastRunMeta.startDate} - ${lastRunMeta.endDate}`
                    : "Run button চাপলে এই selected range-এর report এখানে দেখাবে।"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium dark:bg-meta-4">
                  Qty: {formatNumber(summary.totalQty, 0)}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium dark:bg-meta-4">
                  Purchase: {formatMoney(summary.totalPurchase)}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium dark:bg-meta-4">
                  Sales: {formatMoney(summary.totalSales)}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium dark:bg-meta-4">
                  Profit: {formatMoney(summary.totalProfit)}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium dark:bg-meta-4">
                  Warning: {formatNumber(summary.warningCount, 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-stroke bg-gray-2 text-left dark:border-strokedark dark:bg-meta-4">
                  <th className="px-4 py-3 text-sm font-semibold">SL</th>
                  <th className="px-4 py-3 text-sm font-semibold">Product Name</th>
                  <th className="px-4 py-3 text-sm font-semibold">Sold Qty</th>
                  <th className="px-4 py-3 text-sm font-semibold">Unit Purchase</th>
                  <th className="px-4 py-3 text-sm font-semibold">Purchase Total</th>
                  <th className="px-4 py-3 text-sm font-semibold">Unit Sale</th>
                  <th className="px-4 py-3 text-sm font-semibold">Sale Total</th>
                  <th className="px-4 py-3 text-sm font-semibold">Profit / Loss</th>
                  <th className="px-4 py-3 text-sm font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.length > 0 ? (
                  <>
                    {reportRows.map((row, index) => (
                      <tr
                        key={`${row.product_name}-${index}`}
                        className="border-b border-stroke dark:border-strokedark"
                      >
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium">{row.product_name}</td>
                        <td className="px-4 py-3 text-sm">{formatNumber(row.sold_qty, 0)}</td>
                        <td className="px-4 py-3 text-sm">{formatMoney(row.unit_purchase_rate)}</td>
                        <td className="px-4 py-3 text-sm">{formatMoney(row.purchase_total)}</td>
                        <td className="px-4 py-3 text-sm">{formatMoney(row.unit_sale_rate)}</td>
                        <td className="px-4 py-3 text-sm">{formatMoney(row.sale_total)}</td>
                        <td className="px-4 py-3 text-sm">{formatMoney(row.profit)}</td>
                        <td className="px-4 py-3 text-sm">
                          {row.warning ? (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                              {row.warning}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-stroke bg-gray-2 font-semibold dark:border-strokedark dark:bg-meta-4">
                      <td className="px-4 py-3 text-sm" colSpan={2}>
                        Summary
                      </td>
                      <td className="px-4 py-3 text-sm">{formatNumber(summary.totalQty, 0)}</td>
                      <td className="px-4 py-3 text-sm">-</td>
                      <td className="px-4 py-3 text-sm">{formatMoney(summary.totalPurchase)}</td>
                      <td className="px-4 py-3 text-sm">-</td>
                      <td className="px-4 py-3 text-sm">{formatMoney(summary.totalSales)}</td>
                      <td className="px-4 py-3 text-sm">
                        {getNetLabel(summary.totalProfit)}: {formatMoney(Math.abs(summary.totalProfit))}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {summary.warningCount > 0 ? `${formatNumber(summary.warningCount, 0)} warning` : "-"}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={9} className="px-5 py-14 text-center">
                      <div className="mx-auto max-w-xl">
                        <h3 className="text-lg font-semibold">No report data yet</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Date range এবং branch select করে `Run` দিন। নতুন Laravel API থেকে product-wise purchase cost, sale amount এবং profit/loss এখানে দেখা যাবে।
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductProfitLoss;
