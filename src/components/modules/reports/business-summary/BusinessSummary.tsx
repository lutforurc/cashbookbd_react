import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { useReactToPrint } from "react-to-print";
import { FiCheckSquare, FiFilter } from "react-icons/fi";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import InputDatePicker from "../../../utils/fields/DatePicker";
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import { ButtonLoading, PrintButton, Button } from "../../../../pages/UiElements/CustomButtons";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import httpService from "../../../services/httpService";
import { API_REPORT_BUSINESS_SUMMARY_URL } from "../../../services/apiRoutes";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";
import BusinessSummaryGrid from "./BusinessSummaryGrid";
import BusinessSummaryPrint, { sheetPlan } from "./BusinessSummaryPrint";
import BusinessSummaryDetailModal from "./BusinessSummaryDetailModal";
import type { BusinessSummaryData, BusinessGroupRow } from "./BusinessSummaryGrid";

const BusinessSummary = (user: any) => {
  const dispatch = useDispatch();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  // The report is for a calendar year; the picker is a date and its year is what counts.
  const [yearDate, setYearDate] = useState<Date | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BusinessSummaryData | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(8);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailGroup, setDetailGroup] = useState<BusinessGroupRow | null>(null);
  const [lastRun, setLastRun] = useState<{ branchName: string; year: number } | null>(null);

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
      const [day, month, year] = trxDate
        .split("/")
        .map((str: string) => Number(str.trim()));

      if (Number.isFinite(year) && year >= 1900 && year <= 2100) {
        setYearDate(new Date(year, (month || 1) - 1, day || 1));
      }
    }
  }, [
    branchDdlData?.protectedData?.data,
    branchDdlData?.protectedData?.transactionDate,
  ]);

  const selectedBranchName = useMemo(() => {
    const branch = dropdownData.find(
      (item: any) => Number(item.id) === Number(branchId)
    );
    return branch?.name ?? "";
  }, [branchId, dropdownData]);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    setBranchId(Number.isFinite(value) ? value : null);
  };

  const handleRunReport = async () => {
    if (!branchId) {
      alert("Please select branch");
      return;
    }

    if (!yearDate) {
      alert("Please select year");
      return;
    }

    const year = dayjs(yearDate).year();

    setButtonLoading(true);
    setError(null);

    try {
      const response = await httpService.post(API_REPORT_BUSINESS_SUMMARY_URL, {
        branch_id: Number(branchId),
        year,
      });

      const payload = response?.data;

      if (!payload?.success) {
        throw new Error(payload?.message || "Business summary load failed");
      }

      setData(payload?.data?.data ?? payload?.data ?? null);
      setLastRun({ branchName: selectedBranchName, year });
      setFilterOpen(false);
    } catch (err: any) {
      setData(null);
      setError(err?.response?.data?.message || err?.message || "Business summary load failed");
    } finally {
      setButtonLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Business Summary",
  });

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setRowsPerPage(Number.isNaN(value) ? 12 : value);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFontSize(Number.isNaN(value) ? 8 : value);
  };

  // The print keeps the chosen type size; months that do not fit a sheet's width at that size go on further sheets.
  const plan = sheetPlan(data, fontSize);
  const monthsSplit = !!data && plan.sheets > 1;

  const labelClass = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200";
  const hasData = !!data && (
    data.sections.assets.length + data.sections.liabilities.length + data.sections.equity.length > 0
  );

  const fields = (
    <>
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
        <label className={labelClass}>Year</label>
        <InputDatePicker
          selectedDate={yearDate}
          setSelectedDate={setYearDate}
          setCurrentDate={setYearDate}
          year
          placeholder="Select year"
          className="w-full"
        />
      </div>
    </>
  );

  const applyButton = (
    <ButtonLoading
      label="Apply"
      onClick={handleRunReport}
      buttonLoading={buttonLoading}
      className="px-6"
      icon={<FiCheckSquare />}
    />
  );

  const printButton = (
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
      <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={!hasData} />
    </>
  );

  return (
    <>
      <HelmetTitle title="Business Summary" />

      <div className="space-y-3">
        <div className="pl-0 pr-1 py-3">
          {useFilterMenuEnabled ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative shrink-0">
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

                {filterOpen && (
                  <div className="absolute left-0 top-full z-1000 mt-2 w-[min(92vw,340px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
                    <div className="space-y-3">
                      {fields}
                      <div className="flex justify-end pt-1">{applyButton}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300">
                Use the filter
              </div>
              <div className="ml-auto flex items-end gap-2">{printButton}</div>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid min-w-[320px] flex-1 grid-cols-1 items-end gap-3 md:grid-cols-2 xl:max-w-2xl">
                {fields}
              </div>
              <div className="flex items-end gap-2">
                {applyButton}
                {printButton}
              </div>
            </div>
          )}

          {monthsSplit ? (
            <div className="mt-3 rounded border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              At font size {fontSize}, {plan.perSheet} months fit one sheet, so the print runs {plan.sheets} sets of sheets. Lower the font size to fit more months on each.
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 border border-red-500/60 bg-red-950/40 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto pb-2">
          {hasData ? (
            <BusinessSummaryGrid data={data} fontSize={12} onGroupClick={setDetailGroup} />
          ) : (
            <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-300">
              No report data found. Select the branch and year, then click Apply.
            </div>
          )}
        </div>

        {detailGroup && data && lastRun ? (
          <BusinessSummaryDetailModal
            branchId={Number(branchId)}
            year={lastRun.year}
            months={data.months}
            group={detailGroup}
            onClose={() => setDetailGroup(null)}
          />
        ) : null}

        <div className="hidden">
          <BusinessSummaryPrint
            ref={printRef}
            data={data}
            branchName={lastRun?.branchName}
            year={lastRun?.year}
            rowsPerPage={Number(rowsPerPage)}
            fontSize={Number(fontSize)}
          />
        </div>
      </div>
    </>
  );
};

export default BusinessSummary;
