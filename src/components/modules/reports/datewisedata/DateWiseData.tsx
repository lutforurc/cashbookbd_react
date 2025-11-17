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

import DateWisePrint from "./DateWisePrint";

const DateWiseData = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const dateWiseTotal = useSelector((state) => state.dateWiseTotal);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [tableData, setTableData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);

  const [perPage, setPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);

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
      debit += Number(row.debit);
      credit += Number(row.credit);

      return {
        ...row,
        sl_number: index + 1,
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
    documentTitle: "Date Wise Total",
    removeAfterPrint: true,
  });

  return (
    <div>
      <HelmetTitle title={"Date Wise Total"} />

      {/* FILTER SECTION */}
      {/* FULL RESPONSIVE SINGLE ROW BAR */}
<div className="
  w-full 
  flex flex-wrap md:flex-nowrap 
  items-end gap-2 mb-3
">

  {/* Branch */}
  <div className="flex-1 min-w-[140px]">
    <label>Select Branch</label>
    <BranchDropdown
      onChange={(e) => setBranchId(e.target.value)}
      branchDdl={dropdownData}
      className="w-full p-1.5 text-sm"
    />
  </div>

  {/* Start Date */}
  <div className="flex-1 min-w-[120px]">
    <label>Start Date</label>
    <InputDatePicker
      selectedDate={startDate}
      setSelectedDate={setStartDate}
      setCurrentDate={setStartDate}
      className="w-full h-8 text-sm"
    />
  </div>

  {/* End Date */}
  <div className="flex-1 min-w-[120px]">
    <label>End Date</label>
    <InputDatePicker
      selectedDate={endDate}
      setSelectedDate={setEndDate}
      setCurrentDate={setEndDate}
      className="w-full h-8 text-sm"
    />
  </div>

  {/* ROWS (small) */}
  <div className="min-w-[70px]">
    <InputElement
      id="perPage"
      label="Rows"
      value={perPage.toString()}
      onChange={(e) => setPerPage(Number(e.target.value))}
      className="w-full h-8 text-sm"
    />
  </div>

  {/* FONT (small) */}
  <div className="min-w-[70px]">
    <InputElement
      id="fontSize"
      label="Font"
      value={fontSize.toString()}
      onChange={(e) => setFontSize(Number(e.target.value))}
      className="w-full h-8 text-sm"
    />
  </div>

  {/* RUN */}
  <div className="min-w-[90px]">
    <ButtonLoading
      onClick={handleRun}
      buttonLoading={buttonLoading}
      label="Run"
      className="w-full h-8 whitespace-nowrap"
    />
  </div>

  {/* PRINT */}
  <div className="min-w-[90px]">
    <PrintButton
      onClick={handlePrint}
      className="w-full h-8 whitespace-nowrap"
    />
  </div>

</div>


      {/* ROWS + FONT + RUN + PRINT */}


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
          title="Date Wise Total"
        />
      </div>
    </div>
  );
};

export default DateWiseData;
