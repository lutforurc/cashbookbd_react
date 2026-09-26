import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import InputDatePicker from "../../../utils/fields/DatePicker";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import FilterMenuShell from '../../../utils/components/FilterMenuShell';
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";

import { getDateWiseTotal } from "./dateWiseDataSlice";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";

import Table from "../../../utils/others/Table";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { FiCheckSquare, FiRotateCcw } from "react-icons/fi";

import DateWisePrint from "./DateWisePrint";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";

const DateWiseData = (user: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const dateWiseTotal = useSelector((state: any) => state.dateWiseTotal);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | string | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [tableData, setTableData] = useState<any[]>([]);
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------
  // Load Branch List & Default Branch
  // -----------------------------------------------------
  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user.user.branch_id);
  }, []);

  // -----------------------------------------------------
  // Set Default Start/End Date From backend
  // -----------------------------------------------------
  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData.protectedData.data);

      const [day, month, year] =
        branchDdlData.protectedData.transactionDate.split("/");

      const sDate = new Date(Number(year), Number(month) - 1, 1);
      const eDate = new Date(Number(year), Number(month) - 1, Number(day));

      setStartDate(sDate);
      setEndDate(eDate);
    }
  }, [branchDdlData?.protectedData?.data]);

  // -----------------------------------------------------
  // Run Button → Load Table Data
  // -----------------------------------------------------
  const handleRun = () => {
    if (!branchId || !startDate || !endDate) return;

    const startD = dayjs(startDate).format("YYYY-MM-DD");
    const endD = dayjs(endDate).format("YYYY-MM-DD");

    dispatch(getDateWiseTotal({ branchId, startDate: startD, endDate: endD }));
    setFilterOpen(false);
  };

  const handleResetFilters = () => {
    setFilterOpen(false);
  };

  // -----------------------------------------------------
  // SAFE row extractor (map error free)
  // -----------------------------------------------------
  const extractRows = (payload: any) => {
    if (!payload) return [];

    if (Array.isArray(payload)) return payload;

    if (Array.isArray(payload.data)) return payload.data;

    if (Array.isArray(payload.data?.data)) return payload.data.data;

    return [];
  };

  const toNumber = (value: any) => {
    const numberValue = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const isOpeningRow = (row: any) => {
    const label = String(row?.vr_date || "").trim().toLowerCase();
    return label === "opening";
  };

  const isRangeTotalRow = (row: any) => {
    const label = String(row?.vr_date || "").trim().toLowerCase();
    return label === "range total";
  };

  const isSummaryRow = (row: any) => {
    return isOpeningRow(row) || isRangeTotalRow(row);
  };

  const getOpeningBalance = (row: any) => {
    const balance = toNumber(row?.balance);
    if (balance) return balance;

    return toNumber(row?.debit) - toNumber(row?.credit);
  };

  // -----------------------------------------------------
  // Prepare Cumulative Table Data
  // -----------------------------------------------------
  useEffect(() => {
    const rows = extractRows(dateWiseTotal);

    if (rows.length === 0) {
      setTableData([]);
      return;
    }

    const openingRow = rows.find((row: any) => isOpeningRow(row));
    const openingDebit = openingRow ? toNumber(openingRow.debit) : 0;
    const openingCredit = openingRow ? toNumber(openingRow.credit) : 0;
    const openingBalance = openingRow ? getOpeningBalance(openingRow) : 0;
    let debit = openingDebit;
    let credit = openingCredit;
    let runningBalance = openingBalance;

    const computed = rows.map((row: any, index: number) => {
      if (isOpeningRow(row)) {
        runningBalance = getOpeningBalance(row);
        debit = toNumber(row.debit);
        credit = toNumber(row.credit);
        return {
          ...row,
          cumulative_debit: debit,
          cumulative_credit: credit,
          balance: runningBalance,
        };
      }

      if (isRangeTotalRow(row)) {
        return {
          ...row,
          cumulative_debit: debit,
          cumulative_credit: credit,
          balance: runningBalance,
        };
      }

      if (isSummaryRow(row)) {
        return row;
      }

      debit += toNumber(row.debit);
      credit += toNumber(row.credit);
      runningBalance = debit - credit;

      return {
        ...row,
        sl_number: row.sl_number ?? index + 1,
        cumulative_debit: debit,
        cumulative_credit: credit,
        balance: runningBalance,
      };
    });

    setTableData(computed);
  }, [dateWiseTotal]);

  // -----------------------------------------------------
  // Table Columns
  // -----------------------------------------------------
  const columns = [
    {
      key: "sl_number",
      header: "Sl No",
      headerClass: "text-center",
      cellClass: "text-center",
    },
    {
      key: "vr_date",
      header: "Vr Date",
      headerClass: "text-center",
      cellClass: "text-center",
    },
    {
      key: "debit",
      header: "Debit",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) =>
        row.debit > 0 ? thousandSeparator(row.debit) : "-",
    },
    {
      key: "credit",
      header: "Credit",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) =>
        row.credit > 0 ? thousandSeparator(row.credit) : "-",
    },
    {
      key: "cumulative_debit",
      header: "Cum. Debit",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) =>
        row.cumulative_debit
          ? thousandSeparator(row.cumulative_debit)
          : "-",
    },
    {
      key: "cumulative_credit",
      header: "Cum. Credit",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) =>
        row.cumulative_credit
          ? thousandSeparator(row.cumulative_credit)
          : "-",
    },
    {
      key: "balance",
      header: "Balance",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => thousandSeparator(row.balance),
    },
  ];

  // -----------------------------------------------------
  // Print Function
  // -----------------------------------------------------
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Datewise Total",
  });

  // The three filter fields, drawn inline or inside the filter menu.
  const filterFields = (
    <>
      <div className="min-w-[260px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
        {branchDdlData.isLoading ? <Loader /> : ""}
        <BranchDropdown
          onChange={(e) => setBranchId(e.target.value)}
          value={branchId == null ? "" : String(branchId)}
          branchDdl={dropdownData}
          className="w-full font-medium text-sm p-2"
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

  return (
    <div>
      <HelmetTitle title={"Datewise Total"} />

      <div className="px-0 py-3">
        {/* One wrapping row (owner, 2026-09-23): the fields stretch to fill
            it and one toolbar follows them, Cash Book's -- Apply and Reset
            were a group of their own at the left with Rows, Font and Print
            at the right, a line split in two. The filter menu is the shared
            FilterMenuShell now, not a copy of it. */}
        <div className="flex flex-wrap items-end gap-3">
          {useFilterMenuEnabled ? (
            <FilterMenuShell
              enabled
              isOpen={filterOpen}
              onToggle={() => setFilterOpen((prev) => !prev)}
              menuWidthClassName="w-[min(92vw,320px)]"
            >
              {filterFields}
              <div className="flex justify-end gap-2 pt-1">
                <ButtonLoading
                  onClick={handleRun}
                  buttonLoading={dateWiseTotal.isLoading}
                  label="Apply"
                  icon={<FiCheckSquare />}
                  className="px-6"
                />
                <ButtonLoading
                  onClick={handleResetFilters}
                  buttonLoading={false}
                  label="Reset"
                  icon={<FiRotateCcw />}
                  className="px-4"
                />
              </div>
            </FilterMenuShell>
          ) : (
            filterFields
          )}

          {useFilterMenuEnabled ? (
            <div className="ml-auto flex items-end gap-2">
              <PrintRowsInput
                id="perPage"
                name="perPage"
                label="Rows"
                value={perPage.toString()}
                onChange={(e) => setPerPage(Number(e.target.value))}
                type="text"
                className="w-20! text-sm text-center"
              />
              <PrintFontInput
                id="fontSize"
                name="fontSize"
                label="Font"
                value={fontSize.toString()}
                onChange={(e) => setFontSize(Number(e.target.value))}
                type="text"
                className="w-20! text-sm text-center"
              />
              <PrintButton
                onClick={handlePrint}
                label="Print"
                className="px-6"
                disabled={!Array.isArray(tableData) || tableData.length === 0}
              />
            </div>
          ) : (
            <div className="grid min-w-max grid-cols-[auto_auto_minmax(88px,0.45fr)_minmax(88px,0.45fr)_auto] items-end gap-2 overflow-x-auto max-md:ml-0 max-md:w-full xl:ml-auto">
              <ButtonLoading
                onClick={handleRun}
                buttonLoading={dateWiseTotal.isLoading}
                label="Apply"
                icon={<FiCheckSquare />}
                className="px-6"
              />
              <ButtonLoading
                onClick={handleResetFilters}
                buttonLoading={false}
                label="Reset"
                icon={<FiRotateCcw />}
                className="px-4"
              />
              <PrintRowsInput
                id="perPage"
                name="perPage"
                label="Rows"
                value={perPage.toString()}
                onChange={(e) => setPerPage(Number(e.target.value))}
                type="text"
                className="w-20! text-sm text-center"
              />
              <PrintFontInput
                id="fontSize"
                name="fontSize"
                label="Font"
                value={fontSize.toString()}
                onChange={(e) => setFontSize(Number(e.target.value))}
                type="text"
                className="w-20! text-sm text-center"
              />
              <PrintButton
                onClick={handlePrint}
                label="Print"
                className="px-6"
                disabled={!Array.isArray(tableData) || tableData.length === 0}
              />
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-auto">
        {dateWiseTotal.isLoading && <Loader />}
        <Table
          columns={columns}
          data={tableData}
          rowClassName={(row: any) => (isRangeTotalRow(row) ? "font-bold text-slate-900 dark:text-[rgb(var(--c-text))]" : "")}
        />
      </div>

      {/* HIDDEN PRINT COMPONENT */}
      <div className="hidden">
        <DateWisePrint
          ref={printRef}
          rows={tableData}
          startDate={startDate ? dayjs(startDate).format("DD/MM/YYYY") : ""}
          endDate={endDate ? dayjs(endDate).format("DD/MM/YYYY") : ""}
          rowsPerPage={perPage}
          fontSize={fontSize}
          title="Datewise Total"
        />
      </div>
    </div>
  );
};

export default DateWiseData;

