import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import InputDatePicker from "../../../utils/fields/DatePicker";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";

import { getDateWiseTotal } from "./dateWiseDataSlice";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";

import Table from "../../../utils/others/Table";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

import InputElement from "../../../utils/fields/InputElement";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { FiCheckSquare, FiFilter, FiRotateCcw } from "react-icons/fi";

import DateWisePrint from "./DateWisePrint";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";

const DateWiseData = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const dateWiseTotal = useSelector((state) => state.dateWiseTotal);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [tableData, setTableData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);

  const [perPage, setPerPage] = useState<number>(12);
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

  const isSummaryRow = (row: any) => {
    const label = String(row?.vr_date || "").trim().toLowerCase();
    return label === "opening" || label === "range total";
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

    let debit = 0;
    let credit = 0;

    const computed = rows.map((row: any, index: number) => {
      if (!isSummaryRow(row)) {
        debit += Number(row.debit) || 0;
        credit += Number(row.credit) || 0;
      }

      if (isSummaryRow(row)) {
        return row;
      }

      return {
        ...row,
        sl_number: row.sl_number ?? index + 1,
        cumulative_debit: debit,
        cumulative_credit: credit,
        balance: debit - credit,
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
        row.debit > 0 ? thousandSeparator(row.debit, 0) : "-",
    },
    {
      key: "credit",
      header: "Credit",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) =>
        row.credit > 0 ? thousandSeparator(row.credit, 0) : "-",
    },
    {
      key: "cumulative_debit",
      header: "Cum. Debit",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) =>
        row.cumulative_debit
          ? thousandSeparator(row.cumulative_debit, 0)
          : "-",
    },
    {
      key: "cumulative_credit",
      header: "Cum. Credit",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) =>
        row.cumulative_credit
          ? thousandSeparator(row.cumulative_credit, 0)
          : "-",
    },
    {
      key: "balance",
      header: "Balance",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => thousandSeparator(row.balance, 0),
    },
  ];

  // -----------------------------------------------------
  // Print Function
  // -----------------------------------------------------
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Datewise Total",
    removeAfterPrint: true,
  });

  return (
    <div>
      <HelmetTitle title={"Datewise Total"} />

      <div className="px-0 py-3">
        <div className="flex flex-wrap items-center gap-3">
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
                    ? "absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,320px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800"
                    : "w-full"
                }
              >
                <div
                  className={
                    useFilterMenuEnabled
                      ? "space-y-3"
                      : "grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto]"
                  }
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                    {branchDdlData.isLoading ? <Loader /> : ""}
                    <BranchDropdown
                      onChange={(e) => setBranchId(e.target.value)}
                      value={branchId == null ? "" : String(branchId)}
                      branchDdl={dropdownData}
                      className="w-full p-2 text-sm h-10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                    <InputDatePicker
                      selectedDate={startDate}
                      setSelectedDate={setStartDate}
                      setCurrentDate={setStartDate}
                      className="w-full h-10 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                    <InputDatePicker
                      selectedDate={endDate}
                      setSelectedDate={setEndDate}
                      setCurrentDate={setEndDate}
                      className="w-full h-10 text-sm"
                    />
                  </div>

                  <div
                    className={`flex gap-2 pt-1 ${
                      useFilterMenuEnabled
                        ? "justify-end"
                        : "justify-start self-end"
                    } ${useFilterMenuEnabled ? "" : "md:col-span-2 xl:col-span-1"}`}
                  >
                    <ButtonLoading
                      onClick={handleRun}
                      buttonLoading={buttonLoading}
                      label="Apply"
                      icon={<FiCheckSquare />}
                      className="h-10 px-6"
                    />
                    <ButtonLoading
                      onClick={handleResetFilters}
                      buttonLoading={false}
                      label="Reset"
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

          <div className="ml-auto flex items-end gap-2">

            <InputElement
              id="perPage"
              name="perPage"
              label="Per Page"
              value={perPage.toString()}
              onChange={(e) => setPerPage(Number(e.target.value))}
              type="text"
              className="!w-20 text-sm h-10 text-center"
            />
            <InputElement
              id="fontSize"
              name="fontSize"
              label="Font Size"
              value={fontSize.toString()}
              onChange={(e) => setFontSize(Number(e.target.value))}
              type="text"
              className="!w-20 text-sm h-10 text-center"
            />
            <PrintButton
              onClick={handlePrint}
              label="Print"
              className="h-10 px-6"
              disabled={!Array.isArray(tableData) || tableData.length === 0}
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-auto">
        {dateWiseTotal.isLoading && <Loader />}
        <Table columns={columns} data={tableData} />
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
