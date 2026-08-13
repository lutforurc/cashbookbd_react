import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";
import { FiCheckSquare, FiRotateCcw } from "react-icons/fi";

import Loader from "../../../../common/Loader";
import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import InputDatePicker from "../../../utils/fields/DatePicker";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import DdlMultiline from "../../../utils/utils-functions/DdlMultiline";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import httpService from "../../../services/httpService";

type StockRow = {
  warehouse: string;
  stock_qty: number;
  remarks?: string;
};

const toNum = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmt = (value: any) => thousandSeparator(Math.round(toNum(value)));

const GodownStockReport = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const authUser = user?.user ?? user;
  const printRef = useRef<HTMLDivElement>(null);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | string | null>(null);
  const [godownId, setGodownId] = useState<number | string | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [defaultTransactionDate, setDefaultTransactionDate] = useState<Date | null>(null);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    if (branchDdlData?.protectedData?.data && branchDdlData?.protectedData?.transactionDate) {
      setDropdownData(branchDdlData.protectedData.data);

      const [day, month, year] = branchDdlData.protectedData.transactionDate.split("/");
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

      setDefaultTransactionDate(parsedDate);
      setEndDate(parsedDate);
      if (authUser?.branch_id) setBranchId(authUser.branch_id);
    }
  }, [branchDdlData?.protectedData, authUser?.branch_id]);

  const warehouseOptions = (() => {
    if (!branchId || !dropdownData.length) return [];
    const branch = dropdownData.find(b => b.id?.toString() === branchId?.toString());
    return branch?.godowns?.map((g: any) => ({
      value: g.id?.toString(),
      label: g.name,
    })) || [];
  })();

  const selectedBranchName = (() => {
    return dropdownData.find(b => b.id?.toString() === branchId?.toString())?.name || '';
  })();

  const handleLoad = async () => {
    if (!branchId) {
      setError("Branch select korun");
      return;
    }
    if (!godownId) {
      setError("Warehouse select korun");
      return;
    }
    if (!endDate) {
      setError("End date din");
      return;
    }

    const endD = dayjs(endDate).format("DD/MM/YYYY");

    setLoading(true);
    setError(null);

    try {
      const response = await httpService.get("/reports/godown-stock/data", {
        params: {
          branch_id: branchId,
          godown_id: godownId,
          enddate: endD,
        },
      });

      if (response.data?.success) {
        const data = response.data?.data || [];
        setRows(Array.isArray(data) ? data : []);
        if (!data || data.length === 0) {
          setError(response.data?.message || "No stock data found");
        }
      } else {
        setRows([]);
        setError(response.data?.message || "Failed to load godown stock");
      }
    } catch (err: any) {
      setRows([]);
      setError(err?.response?.data?.message || err?.message || "Godown stock load failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRows([]);
    setError(null);
    setEndDate(defaultTransactionDate);
    setGodownId(null);
    setSelectedWarehouse(null);
    if (authUser?.branch_id) setBranchId(authUser.branch_id);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Godown Stock Report - ${dayjs(endDate).format("DD-MM-YYYY")}`,
    removeAfterPrint: true,
  });

  const grandTotal = rows.reduce((sum, row) => sum + toNum(row.stock_qty), 0);

  return (
    <div className="">
      <HelmetTitle title="Godown Stock Report" />

      <div className="py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
            {branchDdlData.isLoading ? <Loader /> : null}
            <BranchDropdown
              onChange={(e: any) => {
                setBranchId(e.target.value);
                setGodownId(null);
                setSelectedWarehouse(null);
                setRows([]);
              }}
              value={branchId == null ? "" : String(branchId)}
              className="w-full font-medium text-sm p-2 h-10 min-w-[260px]"
              branchDdl={dropdownData}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Warehouse</label>
            <DdlMultiline
              id="godown_id"
              placeholder="Select Warehouse"
              value={selectedWarehouse}
              onSelect={(option: any) => {
                setGodownId(option?.value || null);
                setSelectedWarehouse(option);
              }}
              defaultOptions={true}
              fetchOptions={async () => warehouseOptions}
              className="w-full font-medium text-sm p-2 h-10 min-w-[260px]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
            <InputDatePicker
              setCurrentDate={setEndDate}
              className="font-medium text-sm w-full h-10 min-w-[220px]"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>

          <div className="flex items-center gap-2">
            <ButtonLoading
              onClick={handleLoad}
              buttonLoading={loading}
              label="Apply"
              icon={<FiCheckSquare />}
              className="h-10 px-6"
            />
            <ButtonLoading
              onClick={handleReset}
              buttonLoading={false}
              label="Reset"
              icon={<FiRotateCcw />}
              className="h-10 px-4"
            />
            <PrintButton onClick={handlePrint} label="Print" className="h-10 px-6" disabled={!rows.length} />
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
          <thead className="bg-gray-300 text-xs uppercase text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th className="w-[80px] px-3 py-3 text-center font-semibold">Sl. No</th>
              <th className="px-3 py-3 font-semibold">Warehouse</th>
              <th className="w-[150px] px-3 py-3 text-right font-semibold">Stock (Qty)</th>
              <th className="px-3 py-3 font-semibold">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={index}
                  className={`transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700 ${
                    toNum(row.stock_qty) < 0
                      ? "bg-red-100 dark:bg-red-900/30"
                      : ""
                  }`}
                >
                  <td className="px-3 py-2 text-center">{index + 1}</td>
                  <td className="px-3 py-2">{row.warehouse}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${toNum(row.stock_qty) < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {toNum(row.stock_qty) < 0 ? '-' : ''}{fmt(Math.abs(toNum(row.stock_qty)))}
                  </td>
                  <td className="px-3 py-2">{row.remarks || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500 dark:text-gray-400">No data found</td>
              </tr>
            )}
          </tbody>
          {rows.length ? (
            <tfoot className="bg-slate-50 text-sm font-semibold text-slate-800 dark:bg-slate-900/40 dark:text-slate-100">
              <tr>
                <td colSpan={2} className="px-3 py-3 text-right">Grand Total</td>
                <td className={`px-3 py-3 text-right ${grandTotal < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {grandTotal < 0 ? '-' : ''}{fmt(Math.abs(grandTotal))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div ref={printRef} className="hidden p-6 bg-white">
        {selectedBranchName && (
          <h2 className="text-lg font-bold mb-4">Branch: {selectedBranchName}</h2>
        )}
        {selectedWarehouse?.label && (
          <h3 className="text-base font-semibold mb-4">Warehouse: {selectedWarehouse.label}</h3>
        )}
        {endDate && (
          <p className="mb-4 text-sm text-gray-600">End Date: {dayjs(endDate).format("DD/MM/YYYY")}</p>
        )}

        <table className="min-w-full table-fixed border-collapse text-left text-sm text-gray-700 border border-gray-400">
          <thead className="bg-gray-300 text-xs uppercase text-gray-800">
            <tr>
              <th className="w-[80px] px-3 py-2 text-center font-semibold border border-gray-400">Sl. No</th>
              <th className="px-3 py-2 font-semibold border border-gray-400">Warehouse</th>
              <th className="w-[150px] px-3 py-2 text-right font-semibold border border-gray-400">Stock (Qty)</th>
              <th className="px-3 py-2 font-semibold border border-gray-400">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="px-3 py-2 text-center border border-gray-400">{index + 1}</td>
                <td className="px-3 py-2 border border-gray-400">{row.warehouse}</td>
                <td className="px-3 py-2 text-right font-semibold border border-gray-400">
                  {toNum(row.stock_qty) < 0 ? '-' : ''}{fmt(Math.abs(toNum(row.stock_qty)))}
                </td>
                <td className="px-3 py-2 border border-gray-400">{row.remarks || '-'}</td>
              </tr>
            ))}
          </tbody>
          {rows.length ? (
            <tfoot>
              <tr>
                <td colSpan={2} className="px-3 py-2 text-right font-semibold border border-gray-400">Grand Total</td>
                <td className="px-3 py-2 text-right font-semibold border border-gray-400">
                  {grandTotal < 0 ? '-' : ''}{fmt(Math.abs(grandTotal))}
                </td>
                <td className="border border-gray-400"></td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
};

export default GodownStockReport;
