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
import { FiFilter } from "react-icons/fi";

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
  const [filterOpen, setFilterOpen] = useState(false);

  const [perPage, setPerPage] = useState(20);
  const [fontSize, setFontSize] = useState(11);
  const [defaultTransactionDate, setDefaultTransactionDate] = useState<Date | null>(null);

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
      setDefaultTransactionDate(parsedDate);
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

    setFilterOpen(false);

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

  const handleResetFilters = () => {
    setCategoryId(null);
    setReportType("");
    setPerPage(20);
    setStartDate(defaultTransactionDate);
    setEndDate(defaultTransactionDate);
    setBranchId(user.user.branch_id);
    setFilterOpen(false);
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
      render: (row) => {
        return (
          <>
            <div>{row.cat_name }</div>
            <div>{row.product_name }</div> 
          </>
        )
      }
    },
    {
      key: "cat_name",
      header: "Brand Name / Manufacturer",
      render: (row) => {
        return (
          <>
            <div>{row.manufacturer_name }</div> 
          </>
        )
      }
    },
    {
      key: "quantity",
      header: "Quantity",
      headerClass: "text-center",
      cellClass: "text-center",
      render: (row) => {
        return (
          <>
            { thousandSeparator(row.quantity, 0) } { row.unit || "-"}
          </>
        )
      }
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

      <div className="mb-4 rounded-sm border border-slate-200 bg-slate-100 px-4 py-3 dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative shrink-0">
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

            {filterOpen && (
              <div className="absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,320px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch</label>
                    <BranchDropdown
                      onChange={(e) => setBranchId(e.target.value)}
                      value={branchId == null ? "" : String(branchId)}
                      branchDdl={dropdownData}
                      className="w-full text-sm h-10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
                    {categoryData.isLoading ? (
                      <Loader />
                    ) : (
                      <CategoryDropdown
                        onChange={handleCategoryChange}
                        className="w-full text-sm"
                        categoryDdl={optionsWithAll}
                        value={categoryId}
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Report Type</label>
                    <DropdownCommon
                      name="reportType"
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      data={reportTypeWithAll}
                      className="h-10"
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

                  <div className="flex justify-end gap-2 pt-1">
                    <ButtonLoading
                      onClick={handleRun}
                      buttonLoading={buttonLoading}
                      label="Apply"
                      icon=""
                      className="h-10 px-6"
                    />
                    <ButtonLoading
                      onClick={handleResetFilters}
                      buttonLoading={false}
                      label="Reset"
                      icon=""
                      className="h-10 px-4"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300">
            Use the filter
          </div>

          <div className="ml-auto flex items-end gap-2">
            <InputElement
              id="perPage"
              label={"Rows"}
              name="perPage"
              value={perPage.toString()}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="h-10 w-20 text-sm"
            />
            <InputElement
              id="fontSize"
              name="fontSize"
              label={"Font"}
              value={fontSize.toString()}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="h-10 w-20 text-sm"
            />
            <PrintButton
              onClick={handlePrint}
              className="h-10 px-4"
            />
          </div>
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
