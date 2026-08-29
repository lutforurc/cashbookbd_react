import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";
import { FiCheckSquare, FiRotateCcw } from "react-icons/fi";

import Loader from "../../../../common/Loader";
import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import InputDatePicker from "../../../utils/fields/DatePicker";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { API_REPORT_CLOSING_STOCK_URL } from "../../../services/apiRoutes";
import httpService from "../../../services/httpService";
import ItemDetailsPrint from "../profit-loss/ItemDetailsPrint";

type StockRow = Record<string, any>;

type StockGroup = {
  brand: string;
  rows: StockRow[];
  total: number;
};

const toNum = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmt = (value: any) => thousandSeparator(Math.round(toNum(value)));

const rowBrand = (row: StockRow, fallback = "") => {
  const brand = String(row?.brand ?? row?.brand_name ?? row?.__brandKey ?? fallback ?? "").trim();
  return brand || "Others";
};

const rowProduct = (row: StockRow) => String(row?.product_name ?? row?.name ?? "-");
const rowUnit = (row: StockRow) => String(row?.unit ?? row?.unit_name ?? "Nos");
const rowQty = (row: StockRow) => row?.stock ?? row?.qty ?? row?.product_in ?? 0;
const rowRate = (row: StockRow) => row?.rate ?? row?.avg_rate ?? 0;
const rowTotal = (row: StockRow) => {
  const direct = row?.total_stock ?? row?.total ?? row?.amount;
  if (direct !== undefined && direct !== null && direct !== "") return toNum(direct);
  return toNum(rowQty(row)) * toNum(rowRate(row));
};

const normalizeRows = (payload: any): StockRow[] => {
  const flattenMap = (data: any): StockRow[] => {
    if (!data || typeof data !== "object" || Array.isArray(data)) return [];

    const rows: StockRow[] = [];
    Object.entries(data).forEach(([brand, value]) => {
      if (!Array.isArray(value)) return;
      value.forEach((row) => rows.push({ ...(row || {}), __brandKey: brand }));
    });
    return rows;
  };

  const candidates = [
    payload,
    payload?.data,
    payload?.data?.data,
    payload?.data?.data?.data,
    payload?.items,
    payload?.rows,
  ];

  for (const data of candidates) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.data)) return data.data;

    const mapped = flattenMap(data);
    if (mapped.length) return mapped;
  }

  return [];
};

const ClosingStockReport = ({ user }: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const authUser = user?.user ?? user;

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [defaultTransactionDate, setDefaultTransactionDate] = useState<Date | null>(null);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perPage, setPerPage] = useState(0);
  const [fontSize, setFontSize] = useState(12);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    if (branchDdlData?.protectedData?.data && branchDdlData?.protectedData?.transactionDate) {
      setDropdownData(branchDdlData.protectedData.data);

      const [day, month, year] = branchDdlData.protectedData.transactionDate.split("/");
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

      setDefaultTransactionDate(parsedDate);
      setStartDate(parsedDate);
      setEndDate(parsedDate);
      if (authUser?.branch_id) setBranchId(authUser.branch_id);
    }
  }, [branchDdlData?.protectedData, authUser?.branch_id]);

  const groups = useMemo<StockGroup[]>(() => {
    const map = new Map<string, StockRow[]>();
    rows.forEach((row) => {
      const brand = rowBrand(row);
      if (!map.has(brand)) map.set(brand, []);
      map.get(brand)!.push(row);
    });

    return Array.from(map.entries()).map(([brand, list]) => ({
      brand,
      rows: list,
      total: list.reduce((sum, row) => sum + rowTotal(row), 0),
    }));
  }, [rows]);

  const grandTotal = useMemo(() => groups.reduce((sum, group) => sum + group.total, 0), [groups]);

  const handleLoad = async () => {
    if (!branchId) {
      setError("Branch select korun");
      return;
    }
    if (!startDate || !endDate) {
      setError("Start/End date din");
      return;
    }

    const startD = dayjs(startDate).format("YYYY-MM-DD");
    const endD = dayjs(endDate).format("YYYY-MM-DD");

    setLoading(true);
    setError(null);

    try {
      const response = await httpService.post(API_REPORT_CLOSING_STOCK_URL, {
        branch_id: branchId,
        startdate: startD,
        enddate: endD,
        start_date: startD,
        end_date: endD,
      });

      const nextRows = normalizeRows(response.data);
      setRows(nextRows);
      if (!nextRows.length) {
        setError(response.data?.message || "No stock items found");
      }
    } catch (err: any) {
      setRows([]);
      setError(err?.response?.data?.message || err?.message || "Closing stock load failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRows([]);
    setError(null);
    setStartDate(defaultTransactionDate);
    setEndDate(defaultTransactionDate);
    setPerPage(12);
    setFontSize(12);
    if (authUser?.branch_id) setBranchId(authUser.branch_id);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Closing Stock Details",
  });

  return (
    <div className="">
      <HelmetTitle title="Stock Details" />

      <div className="py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
            {branchDdlData.isLoading ? <Loader /> : null}
            <BranchDropdown
              onChange={(e: any) => setBranchId(e.target.value)}
              value={branchId == null ? "" : String(branchId)}
              className="w-full font-medium text-sm p-2 h-10 min-w-[260px]"
              branchDdl={dropdownData}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
            <InputDatePicker
 setCurrentDate={setStartDate}
 className="font-medium text-sm w-full min-w-[220px]"
 selectedDate={startDate}
 setSelectedDate={setStartDate}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
            <InputDatePicker
 setCurrentDate={setEndDate}
 className="font-medium text-sm w-full min-w-[220px]"
 selectedDate={endDate}
 setSelectedDate={setEndDate}
            />
          </div>

          <div className="grid min-w-max grid-cols-[auto_auto_minmax(88px,0.45fr)_minmax(88px,0.45fr)_auto] items-end gap-2 overflow-x-auto xl:ml-auto">
            <ButtonLoading
              onClick={handleLoad}
              buttonLoading={loading}
              label="Apply"
              icon={<FiCheckSquare />}
              className="px-6"
            />
            <ButtonLoading
              onClick={handleReset}
              buttonLoading={false}
              label="Reset"
              icon={<FiRotateCcw />}
              className="px-4"
            />
            <PrintRowsInput
              id="stockDetailsRows"
              name="stockDetailsRows"
              label=""
              value={perPage.toString()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPerPage(Number(e.target.value) || 0)}
              type="text"
              className="font-medium text-sm w-full! text-center"
            />
            <PrintFontInput
              id="stockDetailsFont"
              name="stockDetailsFont"
              label=""
              value={fontSize.toString()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFontSize(Number(e.target.value) || 12)}
              type="text"
              className="font-medium text-sm w-full! text-center"
            />
            <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={!rows.length} />
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        {loading ? <Loader /> : null}
        <table className="min-w-full table-fixed border-collapse text-left text-sm text-gray-700 dark:text-gray-300">
          <thead className="bg-[rgb(var(--c-table-head))] text-xs uppercase text-gray-800 dark:text-gray-300">
            <tr>
              <th className="w-[80px] px-3 py-3 text-center font-semibold">Sl. No</th>
              <th className="px-3 py-3 text-center font-semibold">Product Details</th>
              <th className="w-[90px] px-3 py-3 text-center font-semibold">Unit</th>
              <th className="w-[120px] px-3 py-3 text-right font-semibold">Stock Qty</th>
              <th className="w-[130px] px-3 py-3 text-right font-semibold">Rate (Tk.)</th>
              <th className="w-[150px] px-3 py-3 text-right font-semibold">Total (Tk.)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-[rgb(var(--c-table-body))] dark:divide-gray-700">
            {groups.length ? (
              groups.map((group) => (
                <Fragment key={group.brand}>
                  <tr key={`${group.brand}-header`} className="bg-slate-100 font-semibold uppercase text-slate-900 dark:bg-slate-900/60 dark:text-slate-100">
                    <td colSpan={6} className="px-3 py-2">{group.brand}</td>
                  </tr>
                  {group.rows.map((row, index) => (
                    <tr
                      key={`${group.brand}-${row?.id ?? row?.prodct_detls_id ?? index}`}
                      className={`transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700 ${
                        index > 0 && row?.prodct_detls_id === group.rows[index - 1]?.prodct_detls_id
                          ? "bg-cyan-50 dark:bg-cyan-950/20"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-center">{index + 1}</td>
                      <td className="truncate px-3 py-2">{rowProduct(row)}</td>
                      <td className="px-3 py-2 text-center">{rowUnit(row)}</td>
                      <td className="px-3 py-2 text-right">{fmt(rowQty(row))}</td>
                      <td className="px-3 py-2 text-right">{fmt(rowRate(row))}</td>
                      <td className="px-3 py-2 text-right">{fmt(rowTotal(row))}</td>
                    </tr>
                  ))}
                  <tr key={`${group.brand}-total`} className="bg-slate-50 font-semibold text-slate-800 dark:bg-slate-900/40 dark:text-slate-100">
                    <td colSpan={5} className="px-3 py-3 text-right">{group.brand} Total Tk.</td>
                    <td className="px-3 py-3 text-right">{fmt(group.total)}</td>
                  </tr>
                </Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-500 dark:text-gray-400">No data found</td>
              </tr>
            )}
          </tbody>
          {groups.length ? (
            <tfoot className="bg-slate-50 text-sm font-semibold text-slate-800 dark:bg-slate-900/40 dark:text-slate-100">
              <tr>
                <td colSpan={5} className="px-3 py-3 text-right">Grand Total</td>
                <td className="px-3 py-3 text-right">{fmt(grandTotal)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div className="hidden">
        <ItemDetailsPrint
          ref={printRef}
          report={rows}
          title="Closing Stock Details"
          startDate={startDate ? dayjs(startDate).format("DD/MM/YYYY") : ""}
          endDate={endDate ? dayjs(endDate).format("DD/MM/YYYY") : ""}
          fontSize={fontSize}
          rowsPerPage={perPage}
        />
      </div>
    </div>
  );
};

export default ClosingStockReport;
