import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { FiCheckSquare } from "react-icons/fi";

import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import InputDatePicker from "../../../utils/fields/DatePicker";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import FilterMenuShell from '../../../utils/components/FilterMenuShell';
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import PrintFontInput from '../../../utils/fields/PrintFontInput';

import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { fetchMonthlyStatement } from "./monthlyStatementSlice";
import MonthlyStatementBody from "./MonthlyStatementBody";
import MonthlyStatementPrint from "./MonthlyStatementPrint";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";

const MonthlyStatement = (user: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const monthlyStatement: any = useSelector((state: any) => state.monthlyStatement);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(Number(user?.user?.branch_id) || null);
  }, []);

  // The month the branch's transaction date falls in: its first day to that date.
  useEffect(() => {
    const protectedData = branchDdlData?.protectedData;
    if (!protectedData) return;

    const { data: ddl, transactionDate } = protectedData;
    if (ddl) setDropdownData(ddl);

    if (transactionDate) {
      const [day, month, year] = transactionDate
        .split("/")
        .map((str: string) => Number(str.trim()));

      if (!isNaN(year) && year >= 1900 && year <= 2100) {
        setStartDate(new Date(year, month - 1, 1));
        setEndDate(new Date(year, month - 1, day));
      }
    }
  }, [branchDdlData?.protectedData?.data, branchDdlData?.protectedData?.transactionDate]);

  const handleRun = () => {
    if (!branchId) return alert("Branch select করুন");
    if (!startDate || !endDate) return alert("Start/End Date দিন");

    dispatch(
      fetchMonthlyStatement({
        branch_id: Number(branchId),
        start_date: dayjs(startDate).format("YYYY-MM-DD"),
        end_date: dayjs(endDate).format("YYYY-MM-DD"),
      })
    );

    setFilterOpen(false);
  };

  const data = monthlyStatement?.data ?? null;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Monthly Statement",
  });

  const filterFields = (
    <>
      <div className="min-w-[260px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
        {branchDdlData?.isLoading ? <Loader /> : null}
        <BranchDropdown
          defaultValue={user?.user?.branch_id}
          value={branchId == null ? "" : String(branchId)}
          onChange={(e: any) => setBranchId(Number(e.target.value) || null)}
          branchDdl={dropdownData}
          className="w-full max-w-full font-medium text-sm p-2"
        />
      </div>

      <div className="min-w-[180px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
        <InputDatePicker
          selectedDate={startDate}
          setSelectedDate={setStartDate}
          setCurrentDate={setStartDate}
          className="font-medium text-sm w-full"
        />
      </div>

      <div className="min-w-[180px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
        <InputDatePicker
          selectedDate={endDate}
          setSelectedDate={setEndDate}
          setCurrentDate={setEndDate}
          className="font-medium text-sm w-full"
        />
      </div>
    </>
  );

  const runButton = (
    <ButtonLoading
      onClick={handleRun}
      buttonLoading={monthlyStatement?.isLoading}
      label="Apply"
      icon={<FiCheckSquare />}
      className="px-6"
    />
  );

  return (
    <div>
      <HelmetTitle title={"Monthly Statement"} />

      <div className="px-0 py-3">
        <div className="flex flex-wrap items-end gap-3">
          {useFilterMenuEnabled ? (
            <FilterMenuShell
              enabled
              isOpen={filterOpen}
              onToggle={() => setFilterOpen((prev) => !prev)}
              menuWidthClassName="w-[min(92vw,320px)]"
            >
              {filterFields}
              <div className="flex justify-end gap-2 pt-1">{runButton}</div>
            </FilterMenuShell>
          ) : (
            <>
              {filterFields}
              {runButton}
            </>
          )}

          <div className="ml-auto flex items-end gap-2">
            <PrintFontInput
              id="fontSize"
              name="fontSize"
              label="Font"
              value={fontSize.toString()}
              onChange={(e) => setFontSize(Number(e.target.value))}
              type="text"
              className="w-20! text-sm text-center"
            />
            <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={!data} />
          </div>
        </div>
      </div>

      {monthlyStatement?.isLoading ? <Loader /> : null}

      {data ? (
        <div className="w-full">
          <MonthlyStatementBody data={data} />
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-500">Click Apply to view the statement.</p>
      )}

      {/* HIDDEN PRINT COMPONENT */}
      <div className="hidden">
        <MonthlyStatementPrint
          ref={printRef}
          data={data}
          startDate={startDate ? dayjs(startDate).format("DD/MM/YYYY") : ""}
          endDate={endDate ? dayjs(endDate).format("DD/MM/YYYY") : ""}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default MonthlyStatement;
