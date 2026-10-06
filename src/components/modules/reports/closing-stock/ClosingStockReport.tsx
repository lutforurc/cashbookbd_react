import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import { FiCheckSquare, FiRotateCcw } from "react-icons/fi";

import Loader from "../../../../common/Loader";
import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import InputDatePicker from "../../../utils/fields/DatePicker";
import SearchInput from "../../../utils/fields/SearchInput";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import CategoryDropdown from "../../../utils/utils-functions/CategoryDropdown";
import FieldLoading from "../../../utils/components/FieldLoading";
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { getCategoryDdl } from "../../category/categorySlice";
import { fetchBrandDdl } from "../../product/brand/brandSlice";
import { getProductGroupDdl } from "../../productgroup/productGroupSlice";
import { API_REPORT_CLOSING_STOCK_URL } from "../../../services/apiRoutes";
import httpService from "../../../services/httpService";
import ItemDetailsPrint from "../profit-loss/ItemDetailsPrint";
import { isBranchSettingOn } from "../../../utils/userFeatureSettings";
import { API_PRINT_TEMPLATE_URL } from "../../../services/apiRoutes";
import { usePrintBranch } from "../../../utils/utils-functions/printBranch";
import DocumentPrint from "../../../utils/print-designer/DocumentPrint";
import type { DocumentData } from "../../../utils/print-designer/DocumentPrint";
import { normalizeTemplate } from "../../../utils/print-designer/printTemplate";
import type { PrintTemplate } from "../../../utils/print-designer/printTemplate";
import { toStockDetailsDocumentData } from "./stockDetailsDocumentData";

type StockRow = Record<string, any>;

type StockGroup = {
  /**
   * The band printed over the rows -- "Air Conditioner", or "GREE" on a branch
   * that asked for brands. Named `band` rather than `category` because it holds
   * whichever of the two the branch chose, and a field called category holding
   * a brand name is how the next reader is misled.
   */
  band: string;
  categories: { category: string; rows: StockRow[] }[];
  total: number;
};

/**
 * Every cell is boxed, as the printed stocktake is.
 *
 * A row of six figures with nothing between the columns is read by holding a
 * finger against the screen; the ruling is what lets the eye come back down a
 * column of rates and land in the right place. Named once so the band, the
 * lines and the group total cannot end up ruled differently.
 */
const CELL = "border border-[rgb(var(--c-border))]";

const toNum = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmt = (value: any) => thousandSeparator(Math.round(toNum(value)));

// Keep brand and category names separate, including when one is missing.
const firstName = (...values: any[]) =>
  values.map((value) => String(value ?? "").trim()).find(Boolean);

const rowCategory = (row: StockRow) =>
  firstName(row?.category, row?.category_name, row?.cat_name) || "Uncategorized";

const rowBrand = (row: StockRow) =>
  firstName(row?.brand, row?.brand_name, row?.__brandKey) || "Others";

const rowProduct = (row: StockRow) => String(row?.product_name ?? row?.name ?? "-");
const rowCode = (row: StockRow) => String(row?.code ?? "").trim();
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
  const settings = useSelector((state: any) => state.settings);
  const groupByBrand = isBranchSettingOn(settings, "stock_report_type");
  // The Group filter appears only where the branch files products under
  // groups at all -- the same switch that puts the box on the product form.
  const needProductGroup = isBranchSettingOn(settings, "need_product_group");
  const authUser = user?.user ?? user;

  const categoryData = useSelector((state: any) => state.category);
  const brandData = useSelector((state: any) => state.brand);
  const productGroupData = useSelector((state: any) => state.productGroup);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | string | null>(null);
  const [brandId, setBrandId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [defaultTransactionDate, setDefaultTransactionDate] = useState<Date | null>(null);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [perPage, setPerPage] = useState(0);
  const [fontSize, setFontSize] = useState(12);

  /**
   * ⚠️ TWO boxes, not one. `search` is what is being typed and `appliedSearch`
   * is what the report is drawn through -- the same pair Product Stock keeps,
   * and for the same reason: a row list that re-filters on every keystroke
   * moves under the eye while somebody is still naming what they want.
   */
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const printRef = useRef<HTMLDivElement>(null);

  // Bumped on every Apply. A slower earlier request that lands after a newer
  // one must not overwrite the newer rows or clear its spinner.
  const loadSeq = useRef(0);

  /**
   * ⚠️ One request at a time. `apiClosingStockItems()` REBUILDS the branch's
   * closing-stock table before it answers, so a second Apply fired while the
   * first is still running is not a cheap duplicate -- it is a second full
   * stocktake, and the two answers can land out of order.
   *
   * A ref and not `loading`: two presses inside one React batch both read the
   * state as it was before the re-render, so the state alone lets the pair
   * through -- exactly the case the guard is here for.
   */
  const busy = useRef(false);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(getCategoryDdl() as any);
    dispatch(fetchBrandDdl() as any);
  }, [dispatch]);

  useEffect(() => {
    if (needProductGroup) dispatch(getProductGroupDdl() as any);
  }, [dispatch, needProductGroup]);

  // "All …" first, so the list opens on it and nothing is filtered until asked.
  const brandOptions = [{ id: "", name: "All Brand" }, ...(brandData?.brandDdl?.data || [])];
  const categoryOptions = [
    { id: "", name: "All Categories" },
    ...(Array.isArray(categoryData?.ddlData?.data?.category) ? categoryData.ddlData.data.category : []),
  ];
  const groupOptions = [
    { id: "", name: "All Groups" },
    ...(Array.isArray(productGroupData?.ddlData?.data) ? productGroupData.ddlData.data : []),
  ];

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

  /**
   * The rows the report is drawn and printed through.
   *
   * ⚠️ FILTERED HERE, in the browser, over everything the load returned --
   * not asked of the server. `apiClosingStockItems()` REBUILDS the branch's
   * closing-stock table before it answers, so a search that went back to the
   * server would re-run that whole calculation to hide a few rows; and this
   * screen draws every row it has, so what is in memory already is the
   * complete filtered set rather than one page of it.
   *
   * ⚠️ CODE *and* NAME. The paper on this screen prints "CODE - NAME", so a
   * code read off a bill has to find its row; matching the name alone left
   * DSWG-323A answering with nothing. Product Stock's server search was widened
   * the same way (`ReportsController::productStockData`), so the two screens
   * still agree on what the one Search box means.
   */
  const visibleRows = useMemo(() => {
    const needle = appliedSearch.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter(
      (row) =>
        rowProduct(row).toLowerCase().includes(needle) ||
        rowCode(row).toLowerCase().includes(needle),
    );
  }, [rows, appliedSearch]);

  const groups = useMemo<StockGroup[]>(() => {
    const bandOf = groupByBrand ? rowBrand : rowCategory;
    const map = new Map<string, StockRow[]>();

    visibleRows.forEach((row) => {
      const band = bandOf(row);
      if (!map.has(band)) map.set(band, []);
      map.get(band)!.push(row);
    });

    return Array.from(map.entries()).map(([band, list]) => {
      const categories = new Map<string, StockRow[]>();
      list.forEach((row) => {
        const category = groupByBrand
          ? rowCategory(row)
          : band;
        if (!categories.has(category)) categories.set(category, []);
        categories.get(category)!.push(row);
      });

      return {
        band,
        categories: Array.from(categories, ([category, rows]) => ({ category, rows })),
        total: list.reduce((sum, row) => sum + rowTotal(row), 0),
      };
    });
  }, [visibleRows, groupByBrand]);

  const grandTotal = useMemo(() => groups.reduce((sum, group) => sum + group.total, 0), [groups]);

  /**
   * The Code column exists only where the stock on the report carries codes.
   *
   * ⚠️ It is the LOADED ROWS that decide, not a branch setting: half a company's
   * products have no code, and a column of empty boxes down the report -- under
   * a heading promising a code -- is worse than no column. The spans below all
   * count off this one number, so the bands and the totals cannot end up a
   * column wider than the lines between them.
   */
  const showCode = useMemo(() => rows.some((row) => rowCode(row) !== ""), [rows]);
  const columnCount = showCode ? 7 : 6;

  const handleLoad = async () => {
    // A second Apply while the first is still out is dropped, not queued.
    if (busy.current) return;

    if (!branchId) {
      toast.error("Branch select korun");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Start/End date din");
      return;
    }

    const startD = dayjs(startDate).format("YYYY-MM-DD");
    const endD = dayjs(endDate).format("YYYY-MM-DD");

    /**
     * ⚠️ Apply hands over whatever is in the Search box too.
     *
     * The whole reason this screen kept two states was so the report would not
     * re-filter on every keystroke -- Apply is the deliberate submit, so it has
     * to take the box with it. Left as it was, typing a code and pressing Apply
     * (which is how anybody loads a date range) reloaded the whole stocktake and
     * filtered nothing: a search that answered with every unrelated product on
     * the branch. Product Stock has always read the box on both its buttons;
     * this is the same rule, not a new one.
     */
    setAppliedSearch(search);

    // This request's ticket. Only the newest ticket is allowed to write.
    const seq = ++loadSeq.current;
    busy.current = true;

    setLoading(true);

    try {
      const response = await httpService.post(API_REPORT_CLOSING_STOCK_URL, {
        branch_id: branchId,
        startdate: startD,
        enddate: endD,
        start_date: startD,
        end_date: endD,
        brand_id: brandId || null,
        category_id: categoryId || null,
        group_id: needProductGroup ? groupId || null : null,
      });

      if (seq !== loadSeq.current) return;

      const nextRows = normalizeRows(response.data);
      setRows(nextRows);
      if (!nextRows.length) toast.error(response.data?.message || "No stock items found");
    } catch (err: any) {
      if (seq !== loadSeq.current) return;

      /**
       * ⚠️ The rows on screen STAY. Emptying them here is what the reader
       * actually sees when a request fails: the stocktake they were reading
       * collapses to "No data found" and the reason for it is a sentence in the
       * corner. A failed refresh is a failed refresh -- the last good answer is
       * still the last good answer, and the old numbers are one Apply away from
       * being replaced.
       */
      toast.error(err?.response?.data?.message || err?.message || "Closing stock load failed");
    } finally {
      // A stale request must not clear the spinner the newest one is showing,
      // nor hand the lock to a request that is not the one holding it.
      if (seq === loadSeq.current) {
        setLoading(false);
        busy.current = false;
      }
    }
  };

  const handleReset = () => {
    // ⚠️ Not just the rows: a request still out would land on a cleared screen
    // and put its own rows back. The ticket moves on so its answer is dropped.
    loadSeq.current += 1;
    busy.current = false;
    setLoading(false);

    setRows([]);
    setStartDate(defaultTransactionDate);
    setEndDate(defaultTransactionDate);
    setPerPage(12);
    setFontSize(12);
    setBrandId("");
    setCategoryId("");
    setGroupId("");
    setSearch("");
    setAppliedSearch("");
    if (authUser?.branch_id) setBranchId(authUser.branch_id);
  };

  /**
   * The box's Enter key comes through here.
   *
   * ⚠️ With nothing loaded there is nothing to filter, so the press has to
   * LOAD. Left as a pure filter it answered a screen nobody had Run yet with
   * the same "No data found" that was already standing there -- the box read as
   * dead on the one state every reader meets first. Loaded, it stays what it
   * was: a filter over rows already in hand, with no request behind it.
   *
   * `handleLoad` applies the box itself, so the two paths cannot disagree about
   * what the needle is.
   */
  const submitSearch = () => {
    if (!rows.length) {
      handleLoad();
      return;
    }
    setAppliedSearch(search);
  };

  /**
   * Enter in the search box submits it.
   *
   * ⚠️ Guarded on the target being the box itself. The handler sits on the
   * group so it catches the key from the input it wraps, but a Search button
   * inside that group fires its own click on Enter -- unguarded, one press
   * would submit twice.
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" || !(e.target instanceof HTMLInputElement)) return;
    e.preventDefault();
    submitSearch();
  };

  // The sheet this screen printed before there was a designer to print it from,
  // and still the one it prints unless the branch has saved a layout -- see
  // handlePrint below.
  const printBespoke = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Closing Stock Details",
  });

  const printBranch = usePrintBranch();

  // The report about to be printed through a saved layout, held with its data
  // and cleared afterwards so a second print cannot go out carrying the first
  // one's rows.
  const [stockDoc, setStockDoc] = useState<{
    template: PrintTemplate;
    data: DocumentData;
  } | null>(null);

  const stockPrintRef = useRef<HTMLDivElement>(null);
  const printStockDoc = useReactToPrint({
    contentRef: stockPrintRef,
    documentTitle: "Closing Stock Details",
    onAfterPrint: () => setStockDoc(null),
  });

  /**
   * Prints once the designed sheet is actually on the page.
   *
   * react-to-print copies what is in the DOM at the moment it is called, so
   * calling it in the same breath as setStockDoc would copy the previous paper
   * -- or nothing at all on the first one. An effect runs after React has
   * committed, and the short wait after that is for the letterhead image.
   */
  useEffect(() => {
    if (!stockDoc) return undefined;
    const timer = setTimeout(() => printStockDoc(), 250);
    return () => clearTimeout(timer);
  }, [stockDoc]);

  /**
   * Print: the branch's own layout where it has saved one, and the sheet this
   * screen has always printed where it has not.
   *
   * ⚠️ THE LAYOUT IS FETCHED AT THE CLICK, not when the screen loaded -- somebody
   * who has just changed a column in the designer and come straight back should
   * not have to reload first. And EVERY FAILURE FALLS THROUGH TO THE OLD PAPER:
   * no layout saved, a server a patch behind, a dropped connection. The report
   * is what somebody came here for; the arrangement is on top of it.
   *
   * The filter names are passed only where a filter is actually set: all three
   * dropdowns open on an "All …" entry, and a heading reading "All Brand" says
   * nothing the absence of a heading does not.
   */
  const handlePrint = async () => {
    if (!visibleRows.length) {
      printBespoke();
      return;
    }

    let layout: any = null;

    try {
      const response = await httpService.get(`${API_PRINT_TEMPLATE_URL}/stock_details`, {
        params: { branch_id: branchId ?? settings?.data?.branch?.id },
      });
      layout = response?.data?.data?.data?.layout ?? null;
    } catch {
      layout = null;
    }

    if (!layout) {
      printBespoke();
      return;
    }

    const template = normalizeTemplate(layout, "stock_details");
    const nameOf = (options: any[], id: string) =>
      id ? options.find((item: any) => String(item?.id) === String(id))?.name ?? "" : "";

    setStockDoc({
      template: { ...template, rowsPerPage: perPage, fontSize },
      data: toStockDetailsDocumentData({
        // The rows on screen, so the paper carries what the search narrowed to
        // rather than a full list nobody is looking at any more.
        rows: visibleRows,
        startDate,
        endDate,
        brandName: nameOf(brandOptions, brandId),
        categoryName: nameOf(categoryOptions, categoryId),
        groupName: nameOf(groupOptions, groupId),
        branch: printBranch,
        branchName: dropdownData.find(
          (entry: any) => String(entry?.id) === String(branchId),
        )?.name,
      }),
    });
  };

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

          {/* ⚠️ THE THREE GATES READ `loaded`, NOT `isLoading`. A slice's
              isLoading starts false, so the render before its thunk's pending
              action lands is indistinguishable from a finished fetch -- the box
              drew empty for that frame and only then started spinning. `loaded`
              is set the moment the call comes back, success or failure, so the
              spinner covers the whole wait and nothing after it. Same reading as
              areaSlice's, and as Product Stock's. */}
          <div className="min-w-50">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Brand</label>
            {brandData.loaded ? (
              <CategoryDropdown
                onChange={(opt: any) => setBrandId(String(opt?.value ?? ""))}
                className="w-full text-sm"
                categoryDdl={brandOptions}
                value={brandId}
                placeholder="All Brand"
              />
            ) : (
              <FieldLoading />
            )}
          </div>

          {/* Group sits between Brand and Category: the order the branch files
              products in, and the order Product Stock draws them. Hidden where
              the branch does not file products under groups at all. */}
          {needProductGroup ? (
            <div className="min-w-50">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Group</label>
              {productGroupData.loaded ? (
                <CategoryDropdown
                  onChange={(opt: any) => setGroupId(String(opt?.value ?? ""))}
                  className="w-full text-sm"
                  categoryDdl={groupOptions}
                  value={groupId}
                  placeholder="All Groups"
                />
              ) : (
                <FieldLoading />
              )}
            </div>
          ) : null}

          <div className="min-w-50">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
            {categoryData.loaded ? (
              <CategoryDropdown
                onChange={(opt: any) => setCategoryId(String(opt?.value ?? ""))}
                className="w-full text-sm"
                categoryDdl={categoryOptions}
                value={categoryId}
                placeholder="All Categories"
              />
            ) : (
              <FieldLoading />
            )}
          </div>

          {/* The box, immediately left of Start Date.
              ⚠️ No button beside it: the report is already loaded here, so a
              button only repeated what the box's own Enter key does -- and the
              hand that went looking for one pressed Apply next to it instead
              and got the whole stocktake back. The needle is the name *or* the
              code, which is what the row prints ("CODE - NAME") and therefore
              what a reader has in hand when they come looking. */}
          {/* ⚠️ `flex-1 min-w-50`, not `min-w-max`: this row is a wrapping flex
              row, so the box grows into whatever room is left on its line --
              all of it when it wraps, which is the mobile case. `min-w-max`
              held the wrapper at the box's own width, so the space the removed
              button used to occupy stayed empty. */}
          <div className="flex min-w-50 flex-1 items-end gap-2" onKeyDown={handleSearchKeyDown}>
            <SearchInput
              id="stockDetailsSearch"
              label="Search"
              placeholder="Search product name or code..."
              search={search}
              setSearchValue={setSearch}
              className="w-full min-w-50 font-medium text-sm"
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

          {/* ⚠️ `xl:ml-auto` was removed on purpose. An auto margin swallows the
              row's free space *before* flex-grow gets a look at it, so the
              `flex-1` search box could never grow while it was here -- the
              buttons stayed pinned right and the box stayed narrow. The search
              box now does the pushing. */}
          <div className="grid min-w-max grid-cols-[auto_auto_minmax(88px,0.45fr)_minmax(88px,0.45fr)_auto] items-end gap-2 overflow-x-auto">
            <ButtonLoading
              onClick={handleLoad}
              buttonLoading={loading}
              disabled={loading}
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
            <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={!visibleRows.length} />
          </div>
        </div>
      </div>

      {/* ⚠️ There is no banner here any more, and that is the point.
          This block used to hold the load error, which put a box between the
          toolbar and the table: every Apply cleared it and every failure or
          empty answer put it back, so the table jumped down and up on either
          side of a request nobody had finished watching. The message goes to
          the app's own toaster now (`toast.error` above), which is drawn over
          the page instead of in it -- the table's first row no longer moves for
          a sentence about the request that was just made. */}

      {/* The table keeps its place for the whole request: the spinner below is
          drawn over this box, not in front of it. */}
      <div className="relative overflow-x-auto">
        {loading ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center py-2">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent" />
          </div>
        ) : null}
        <table className="min-w-full table-fixed border-collapse text-left text-sm text-gray-700 dark:text-gray-300">
          <thead className="bg-[rgb(var(--c-table-head))] text-xs uppercase text-gray-800 dark:text-gray-300">
            <tr>
              <th className={`w-[80px] px-3 py-3 text-center font-semibold ${CELL}`}>Sl. No</th>
              {showCode ? (
                <th className={`w-[110px] px-3 py-3 font-semibold ${CELL}`}>Code</th>
              ) : null}
              <th className={`px-3 py-3 font-semibold ${CELL}`}>Product Details</th>
              <th className={`w-[90px] px-3 py-3 text-center font-semibold ${CELL}`}>Unit</th>
              <th className={`w-[120px] px-3 py-3 text-right font-semibold ${CELL}`}>Stock Qty</th>
              <th className={`w-[130px] px-3 py-3 text-right font-semibold ${CELL}`}>Rate (Tk.)</th>
              <th className={`w-[150px] px-3 py-3 text-right font-semibold ${CELL}`}>Total (Tk.)</th>
            </tr>
          </thead>
          {/* Replace the old flat-list DOM, including rows left by duplicate keys. */}
          <tbody
            key={groupByBrand ? "brand-category-items" : "category-items"}
            className="divide-y divide-gray-200 bg-[rgb(var(--c-table-body))] dark:divide-gray-700"
          >
            {groups.length ? (
              groups.map((group) => (
                <Fragment key={group.band}>
                  {/* The band is not uppercased: "Air Conditioner" is the name
                      as it was filed, and shouting it back adds nothing a
                      heavier weight and a grey ground do not already say. */}
                  <tr key={`${group.band}-header`} className={`bg-slate-100 font-semibold text-slate-900 dark:bg-slate-900/60 dark:text-slate-100 ${CELL}`}>
                    <td colSpan={columnCount} className="px-3 py-2">{group.band}</td>
                  </tr>
                  {group.categories.map((categoryGroup) => (
                    <Fragment key={categoryGroup.category}>
                      {groupByBrand ? (
                        <tr className="bg-slate-50 font-medium text-slate-800 dark:bg-slate-900/40 dark:text-slate-100">
                          <td colSpan={columnCount} className={`px-6 py-2 ${CELL}`}>{categoryGroup.category}</td>
                        </tr>
                      ) : null}
                      {categoryGroup.rows.map((row, index) => (
                        <tr
                          key={`${group.band}-${categoryGroup.category}-${index}`}
                          className={`transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700 ${index > 0 && row?.prodct_detls_id === categoryGroup.rows[index - 1]?.prodct_detls_id
                              ? "bg-cyan-50 dark:bg-cyan-950/20"
                              : ""
                            }`}
                        >
                          <td className={`px-3 py-2 text-center ${CELL}`}>{index + 1}</td>
                          {showCode ? (
                            <td className={`truncate px-3 py-2 ${CELL}`}>{rowCode(row)}</td>
                          ) : null}
                          <td className={`truncate px-3 py-2 ${CELL}`}>{rowProduct(row)}</td>
                          <td className={`px-3 py-2 text-center ${CELL}`}>{rowUnit(row)}</td>
                          <td className={`px-3 py-2 text-right ${CELL}`}>{fmt(rowQty(row))}</td>
                          <td className={`px-3 py-2 text-right ${CELL}`}>{fmt(rowRate(row))}</td>
                          <td className={`px-3 py-2 text-right ${CELL}`}>{fmt(rowTotal(row))}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  <tr key={`${group.band}-total`} className="bg-slate-50 font-semibold text-slate-800 dark:bg-slate-900/40 dark:text-slate-100">
                    <td colSpan={columnCount - 1} className={`px-3 py-3 text-right ${CELL}`}>{group.band} Total Tk.</td>
                    <td className={`px-3 py-3 text-right ${CELL}`}>{fmt(group.total)}</td>
                  </tr>
                </Fragment>
              ))
            ) : (
              <tr>
                {/* ⚠️ Two different nothings, said differently. A report that
                    was never Run and a search that matched none of the rows are
                    the same empty table, and the reader's next move is opposite
                    in each: press Apply, or change the word in the box. */}
                <td colSpan={columnCount} className="py-4 text-center text-gray-500 dark:text-gray-400">
                  {rows.length && appliedSearch.trim()
                    ? `No product matches "${appliedSearch.trim()}"`
                    : "No data found"}
                </td>
              </tr>
            )}
          </tbody>
          {groups.length ? (
            <tfoot className="bg-slate-50 text-sm font-semibold text-slate-800 dark:bg-slate-900/40 dark:text-slate-100">
              <tr>
                <td colSpan={columnCount - 1} className={`px-3 py-3 text-right ${CELL}`}>Grand Total</td>
                <td className={`px-3 py-3 text-right ${CELL}`}>{fmt(grandTotal)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div className="hidden">
        <ItemDetailsPrint
          ref={printRef}
          report={visibleRows}
          title="Closing Stock Details"
          startDate={startDate ? dayjs(startDate).format("DD/MM/YYYY") : ""}
          endDate={endDate ? dayjs(endDate).format("DD/MM/YYYY") : ""}
          fontSize={fontSize}
          rowsPerPage={perPage}
        />

        {/* Mounted only while a designed sheet is being printed. Left standing
            it would draw a whole document on every render. */}
        {stockDoc ? (
          <DocumentPrint
            ref={stockPrintRef}
            template={stockDoc.template}
            data={stockDoc.data}
          />
        ) : null}
      </div>
    </div>
  );
};

export default ClosingStockReport;
