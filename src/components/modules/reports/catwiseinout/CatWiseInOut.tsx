import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";

import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import FilterMenuShell from "../../../utils/components/FilterMenuShell";
import InputDatePicker from "../../../utils/fields/DatePicker";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import CategoryDropdown from "../../../utils/utils-functions/CategoryDropdown";
import Table from "../../../utils/others/Table";
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';

import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { getCategoryDdl } from "../../category/categorySlice";
import { getCatWiseInOut } from "./catWiseInOutSlice";
import { CAT_WISE_IN_OUT_DATA_LIST_RESET } from "../../../constant/constant/constant";

import { orderType } from "../../../utils/fields/DataConstant";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { FiCheckSquare, FiRotateCcw } from "react-icons/fi";

import CatWiseInOutPrint from "./CatWiseInOutPrint";
import { useReactToPrint } from "react-to-print";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";

const CatWiseInOut = (user: any) => {
  const dispatch = useDispatch();

  const branchDdlData = useSelector((state) => state.branchDdl);
  const categoryData = useSelector((state) => state.category);
  const inOutData = useSelector((state) => state.catWiseInOut);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

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

  const [perPage, setPerPage] = useState(0);
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
    setFontSize(11);
    setBranchId(user.user.branch_id);
    setFilterOpen(false);
    setTableData([]);
    dispatch({ type: CAT_WISE_IN_OUT_DATA_LIST_RESET });
  };

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
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
            { thousandSeparator(row.quantity) } { row.unit || "-"}
          </>
        )
      }
    },
    
  ];

  const grandTotal = useMemo(
    () =>
      (tableData || []).reduce(
        (sum: number, row: any) => sum + (Number(row?.quantity) || 0),
        0
      ),
    [tableData]
  );

  // Only label the total with a unit when every row actually shares it.
  const totalUnit = useMemo(() => {
    const units = Array.from(
      new Set((tableData || []).map((row: any) => row?.unit).filter(Boolean))
    );
    return units.length === 1 ? String(units[0]) : "";
  }, [tableData]);

  const footerRows = useMemo(() => {
    if (!tableData?.length) return undefined;

    return [
      [
        { label: "Grand Total", colSpan: 3, className: "text-right" },
        {
          label: `${thousandSeparator(grandTotal)} ${totalUnit}`.trim(),
          className: "text-center",
        },
      ],
    ];
  }, [tableData, grandTotal, totalUnit]);

  const handleCategoryChange = (selectedOption: any) => {
    if (selectedOption) {
      setCategoryId(selectedOption.value);
    } else {
      setCategoryId(null); // Ã Â¦â€¦Ã Â¦Â¥Ã Â¦Â¬Ã Â¦Â¾ default value
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
  const selectedCategoryName = useMemo(() => {
    const found = optionsWithAll.find((item: any) => String(item.id) === String(categoryId ?? ''));
    return found?.name || '';
  }, [categoryId, optionsWithAll]);
  const selectedReportTypeName = useMemo(() => {
    const found = reportTypeWithAll.find((item: any) => String(item.id) === String(reportType ?? ''));
    return found?.name || '';
  }, [reportType, reportTypeWithAll]);

  // orderType

  // The five filter fields, drawn inline or inside the filter menu.
  const filterFields = (
    <>
      <div className="min-w-[260px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch</label>
        <BranchDropdown
          onChange={(e) => setBranchId(e.target.value)}
          value={branchId == null ? "" : String(branchId)}
          branchDdl={dropdownData}
          className="w-full font-medium text-sm p-2"
        />
      </div>

      <div className="min-w-[220px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
        {categoryData.isLoading ? (
          <Loader />
        ) : (
          <CategoryDropdown
            onChange={handleCategoryChange}
            className="font-medium text-sm w-full"
            categoryDdl={optionsWithAll}
            value={categoryId}
          />
        )}
      </div>

      <div className="min-w-[180px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Report Type</label>
        <DropdownCommon
          name="reportType"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          data={reportTypeWithAll}
          className=""
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
      <HelmetTitle title={"Category Wise In & Out"} />

      <div className=" px-0 py-3 ">
        {/* One wrapping row (owner, 2026-09-23): the five fields stretch to
            fill it and Cash Book's one toolbar follows them. The grid this
            replaced drew End Date twice for different screen widths, and the
            copy for 768-1535px sat in a row padded 24px taller than the box,
            which is the empty band that showed above End Date. The filter
            menu is the shared FilterMenuShell now, not a copy of it. */}
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
                  buttonLoading={buttonLoading}
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
              {selectedCategoryName ? (
                <div className="flex h-10 min-w-[220px] max-w-[320px] items-center rounded border border-[rgb(var(--c-border))] bg-white px-3 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <span className="truncate" title={selectedCategoryName}>{selectedCategoryName}</span>
                </div>
              ) : null}
              {reportType ? (
                <div className="flex h-10 min-w-[220px] max-w-[320px] items-center rounded border border-[rgb(var(--c-border))] bg-white px-3 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <span className="truncate" title={selectedReportTypeName}>{selectedReportTypeName}</span>
                </div>
              ) : null}
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
              />
            </div>
          ) : (
            <div className="grid min-w-max grid-cols-[auto_auto_minmax(88px,0.45fr)_minmax(88px,0.45fr)_auto] items-end gap-2 overflow-x-auto max-md:ml-0 max-md:w-full xl:ml-auto">
              <ButtonLoading
                onClick={handleRun}
                buttonLoading={buttonLoading}
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
              />
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-y-auto">
        {inOutData.isLoading && <Loader />}
        <Table
          columns={columns}
          data={tableData || []}
          footerRows={footerRows as any}
        />
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

