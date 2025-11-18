import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";

import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import InputDatePicker from "../../../utils/fields/DatePicker";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import CategoryDropdown from "../../../utils/utils-functions/CategoryDropdown";
import Table from "../../../utils/others/Table";
import InputElement from "../../../utils/fields/InputElement";

import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { getCategoryDdl } from "../../category/categorySlice";
import { getCatWiseInOut } from "./catWiseInOutSlice";

import { orderType } from "../../../utils/fields/DataConstant";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

import CatWiseInOutPrint from "./CatWiseInOutPrint";
import { useReactToPrint } from "react-to-print";

const CatWiseInOut = (user: any) => {
  const dispatch = useDispatch();

  const branchDdlData = useSelector((state) => state.branchDdl);
  const categoryData = useSelector((state) => state.category);
  const inOutData = useSelector((state) => state.catWiseInOut);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [categoryList, setCategoryList] = useState<any[]>([]);
  const [ddlCategory, setDdlCategory] = useState<any[]>([]);

  const [branchId, setBranchId] = useState<number | string | null>(null);
  const [categoryId, setCategoryId] = useState<number | string | null>(null);
  const [reportType, setReportType] = useState("");

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [tableData, setTableData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);

  const [perPage, setPerPage] = useState(20);
  const [fontSize, setFontSize] = useState(11);

  const printRef = useRef<HTMLDivElement>(null);

  // Load Dropdowns
  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(getCategoryDdl());
  }, []);

  // Set Branch + Dates
  useEffect(() => {
    if (branchDdlData?.protectedData?.data) {
      setDropdownData(branchDdlData?.protectedData?.data);

      const [day, month, year] =
        branchDdlData?.protectedData?.transactionDate.split("/");

      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(parsedDate);
      setEndDate(parsedDate);

      setBranchId(user.user.branch_id);
    }
  }, [branchDdlData?.protectedData]);

  // Load category list
  // useEffect(() => {
  //   if (categoryData?.data) {
  //     setCategoryList(categoryData.data.category);
  //     setDdlCategory(categoryData?.ddlData?.data?.category || []);
  //   }
  // }, [categoryData]);


    useEffect(() => {
      if (Array.isArray(categoryData?.ddlData?.data?.category)) {
        setDdlCategory(categoryData?.ddlData?.data?.category || []);
        setCategoryId(categoryData.ddlData[0]?.id ?? null);
      }
    }, [categoryData]);

  // Load table data
  useEffect(() => {
    if (!inOutData.isLoading && Array.isArray(inOutData?.data)) {
      setTableData(inOutData?.data);
    }
  }, [inOutData]);

  const handleRun = () => {
    if (!reportType) {
      toast.info("Please select report type.");
      return;
    }

    const startD = dayjs(startDate).format("YYYY-MM-DD");
    const endD = dayjs(endDate).format("YYYY-MM-DD");

    dispatch(
      getCatWiseInOut({
        branchId,
        reportType,
        categoryId,
        startDate: startD,
        endDate: endD,
      })
    );
  };

  // Print handler
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Category Wise In Out",
  });

  // Table columns
  const columns = [
    {
      key: "sl_number",
      header: "Sl",
      headerClass: "text-center",
      cellClass: "text-center",
    },
    {
      key: "product_name",
      header: "Product Name",
    },
    {
      key: "cat_name",
      header: "Category Name",
    },
    {
      key: "unit",
      header: "Unit",
      headerClass: "text-center",
      cellClass: "text-center",
    },
    {
      key: "quantity",
      header: "Quantity",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row) => thousandSeparator(row.quantity, 0),
    },
  ];

    const handleCategoryChange = (selectedOption: any) => {
    if (selectedOption) {
      setCategoryId(selectedOption.value);
    } else {
      setCategoryId(null); // অথবা default value
    }
  };

  const optionsWithAll = [
  { id: '', name: 'All Product' },
  ...(Array.isArray(ddlCategory) ? ddlCategory : []),
];



// Report Type
  const reportTypeWithAll = [
  { id: '', name: 'Select Type' },
  ...(Array.isArray(orderType) ? orderType : []),
];

// orderType

  return (
    <div>
      <HelmetTitle title={"Category Wise In & Out"} />

      {/* FILTER BAR */}
      {/* ---- ROW 1 ---- */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

  {/* Branch */}
  <div className="flex flex-col">
    <label>Select Branch</label>
    <BranchDropdown
      onChange={(e) => setBranchId(e.target.value)}
      branchDdl={dropdownData}
      className="w-full text-sm h-9.5"
    />
  </div>

  {/* Category */}
  <div className="flex flex-col">
    <label>Select Category</label>
    {categoryData.isLoading ? (
      <Loader />
    ) : (
      <CategoryDropdown
        onChange={handleCategoryChange}
        className="w-full text-sm "
        categoryDdl={optionsWithAll}
      />
    )}
  </div>

  {/* Report Type */}
  <div className="flex flex-col">
    <label>Report Type</label>
    <DropdownCommon
      name="reportType"
      onChange={(e) => setReportType(e.target.value)}
      data={reportTypeWithAll}
      className="h-9.5"
    />
  </div>

</div>


{/* ---- ROW 2 ---- */}
<div className="flex flex-wrap gap-4 items-end mb-3">

  {/* Start Date */}
  <div className="flex flex-col min-w-[160px] flex-1">
    <label>Start Date</label>
    <InputDatePicker
      selectedDate={startDate}
      setSelectedDate={setStartDate}
      setCurrentDate={setStartDate}
      className="w-full h-8 text-sm"
    />
  </div>

  {/* End Date */}
  <div className="flex flex-col min-w-[160px] flex-1">
    <label>End Date</label>
    <InputDatePicker
      selectedDate={endDate}
      setSelectedDate={setEndDate}
      setCurrentDate={setEndDate}
      className="w-full h-8 text-sm"
    />
  </div>

  {/* Rows */}
  <div className="flex flex-col min-w-[100px]">
    <label>Rows</label>
    <InputElement
      id="perPage"
      label={""}
      name="perPage"
      value={perPage.toString()}
      onChange={(e) => setPerPage(Number(e.target.value))}
      className="h-8 text-sm"
    />
  </div>

  {/* Font */}
  <div className="flex flex-col min-w-[100px]">
    <label>Font</label>
    <InputElement
      id="fontSize"
      name="fontSize"
      label={""}
      value={fontSize.toString()}
      onChange={(e) => setFontSize(Number(e.target.value))}
      className="h-8 text-sm"
    />
  </div>

  {/* Buttons */}
  <div className="flex gap-2 ml-auto">
    <ButtonLoading
      onClick={handleRun}
      buttonLoading={buttonLoading}
      label="Run"
      className="h-9 px-4"
    />
    <PrintButton
      onClick={handlePrint}
      className="h-9 px-4"
    />
  </div>

</div>

      {/* TABLE */}
      <div className="overflow-y-auto">
        {inOutData.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} />
      </div>

      {/* PRINT COMPONENT */}
      <div style={{ opacity: 0, position: "absolute", pointerEvents: "none" }}>
        <CatWiseInOutPrint
          ref={printRef}
          rows={tableData}
          branchName={dropdownData?.find((b) => b.id == branchId)?.name}
          categoryName={categoryList?.find((c) => c.id == categoryId)?.name}
          reportType={orderType.find((x) => x.value == reportType)?.label}
          startDate={startDate ? dayjs(startDate).format("DD/MM/YYYY") : ""}
          endDate={endDate ? dayjs(endDate).format("DD/MM/YYYY") : ""}
          rowsPerPage={perPage}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default CatWiseInOut;
