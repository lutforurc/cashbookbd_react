import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { getProductStock } from './productStockSlice';
import SearchInput from '../../../utils/fields/SearchInput';
import { getCategoryDdl } from '../../category/categorySlice';
import CategoryDropdown from '../../../utils/utils-functions/CategoryDropdown';
import FieldLoading from '../../../utils/components/FieldLoading';
import dayjs from 'dayjs';
import StockBookPrint from './StockBookPrint';
import { useReactToPrint } from 'react-to-print';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { FiCheckSquare, FiFilter, FiRotateCcw } from 'react-icons/fi';
import { fetchBrandDdl } from '../../product/brand/brandSlice';
import StockBookPrintNormal from './StockBookPrintNormal';
import { isBranchSettingOn, isUserFeatureEnabled } from '../../../utils/userFeatureSettings';
import { getProductGroupDdl } from '../../productgroup/productGroupSlice';
import httpService from '../../../services/httpService';
import { API_PRINT_TEMPLATE_URL } from '../../../services/apiRoutes';
import { usePrintBranch } from '../../../utils/utils-functions/printBranch';
import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import { normalizeTemplate } from '../../../utils/print-designer/printTemplate';
import type { PrintTemplate } from '../../../utils/print-designer/printTemplate';
import { toProductStockDocumentData } from './productStockDocumentData';

// ======================
// ✅ Category-wise helper
// ======================
const isGroupRow = (row: any) => row?.__type === 'GROUP';
const isGrandTotalRow = (row: any) => row?.__type === 'GRAND_TOTAL';

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildCategoryWiseRows = (rows: any[]) => {
  if (!Array.isArray(rows)) return [];

  // sort safe: category then product
  const sorted = [...rows].sort((a, b) => {
    const c1 = String(a.cat_name || '').localeCompare(String(b.cat_name || ''));
    if (c1 !== 0) return c1;
    return String(a.product_name || '').localeCompare(String(b.product_name || ''));
  });

  const map = new Map<string, any[]>();
  for (const r of sorted) {
    const key = r.cat_name || 'Uncategorized';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const finalRows: any[] = [];
  let serial = 1;
  const grandTotal = {
    opening: 0,
    stock_in: 0,
    stock_out: 0,
    balance: 0,
  };

  for (const [cat, items] of map.entries()) {
    // category header row
    finalRows.push({
      __type: 'GROUP',
      cat_name: cat,
    });

    // items under category
    for (const it of items) {
      grandTotal.opening += toNumber(it.opening);
      grandTotal.stock_in += toNumber(it.stock_in);
      grandTotal.stock_out += toNumber(it.stock_out);
      grandTotal.balance += toNumber(it.balance);
      finalRows.push({
        ...it,
        sl_number: serial++,
      });
    }
  }

  if (sorted.length > 0) {
    finalRows.push({
      __type: 'GRAND_TOTAL',
      product_name: 'Grand Total',
      opening: grandTotal.opening,
      stock_in: grandTotal.stock_in,
      stock_out: grandTotal.stock_out,
      balance: grandTotal.balance,
    });
  }

  return finalRows;
};

/**
 * The Product Stock toolbar is one wrapping flex row, so a control is never
 * squeezed into a track narrower than it -- it takes the next line instead. The
 * basis decides how many share a line: a whole one per line on a phone, two
 * once the screen can hold them, three on a tablet, and a steady ~190px once
 * the sidebar is back. Every cell grows, so a line that ends short is filled by
 * its last control rather than left with a hole.
 *
 * ⚠️ Written out, not composed at runtime: Tailwind reads this file as text,
 * and a class built from pieces would never be emitted.
 */
const FILTER_CELL =
  'min-w-0 grow basis-full min-[360px]:basis-[calc(50%-0.375rem)] min-[360px]:max-w-[280px] sm:basis-[calc(33.333%-0.5rem)] lg:basis-[190px]';

/** Branch leads the row, so it is allowed a little more room than the rest. */
const BRANCH_CELL = 'min-w-0 grow basis-full sm:basis-[240px] lg:max-w-[340px] lg:basis-[260px]';

/** The search box takes the spare room on its line (grow-[2]) and fills it. */
const SEARCH_CELL = 'min-w-0 grow-[2] basis-full sm:basis-[220px] lg:max-w-[560px]';

/** Rows and Font stay as narrow as their boxes: they are settings, not filters. */
const COMPACT_CELL = 'shrink-0';

/**
 * Apply, Reset and Print travel as one item, so a line too short for them moves
 * the whole group down instead of stranding a single button on its own.
 */
const ACTION_CELL =
  'flex shrink-0 grow basis-full flex-wrap items-end gap-2 sm:ml-auto sm:basis-auto sm:grow-0';

const ProductStockNormal = ({ user }: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const categoryData = useSelector((state: any) => state.category);
  const stock = useSelector((state: any) => state.stock);
  const brand = useSelector((state: any) => state.brand);
  const settings = useSelector((state: any) => state.settings);
  const authUser = user?.user ?? user;
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [ddlCategory, setDdlCategory] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [search, setSearchValue] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const [branchId, setBranchId] = useState<number | string | null>(null);
  const [categoryId, setCategoryId] = useState<number | string | null>(null);
  // Same Group box as Stock Details / ProductStock, from the same branch switch.
  const needProductGroup = isBranchSettingOn(settings, "need_product_group");
  const productGroupData = useSelector((state: any) => state.productGroup);
  const [groupId, setGroupId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [defaultTransactionDate, setDefaultTransactionDate] = useState<Date | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(12);
  const [brandId, setBrandId] = useState<number | string | null>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(getCategoryDdl());
    dispatch(fetchBrandDdl());
  }, []);

  useEffect(() => {
    if (Array.isArray(categoryData?.ddlData?.data?.category)) {
      setDdlCategory(categoryData?.ddlData?.data?.category || []);
      setCategoryId(categoryData.ddlData[0]?.id ?? null);
    }
  }, [categoryData]);

  useEffect(() => {
    if (needProductGroup) dispatch(getProductGroupDdl() as any);
  }, [dispatch, needProductGroup]);

  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setPerPage(value);
    } else {
      setPerPage(10);
    }
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setFontSize(value);
    } else {
      setFontSize(10);
    }
  };

  // The sheet this screen printed before there was a designer to print it from,
  // and still the one it prints unless the branch has saved a layout -- see
  // handlePrint below.
  const printBespoke = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Product Stock',
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
    documentTitle: 'Product Stock',
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
   * ⚠️ THIS SCREEN SAVES AND PRINTS THE SAME `product_stock` PAPER as
   * ProductStock.tsx. The two are the two groupings of one report -- by brand and
   * category, or by category alone -- and a tenant who designed one of them means
   * both. The grouping itself is the bespoke papers' doing and has no equivalent
   * in a designed table, which is flat by design.
   */
  const handlePrint = async () => {
    if (!Array.isArray(tableData) || tableData.length === 0) {
      printBespoke();
      return;
    }

    let layout: any = null;

    try {
      const response = await httpService.get(`${API_PRINT_TEMPLATE_URL}/product_stock`, {
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

    const template = normalizeTemplate(layout, 'product_stock');

    setStockDoc({
      template: { ...template, rowsPerPage: Number(perPage), fontSize: Number(fontSize) },
      data: toProductStockDocumentData({
        // Sentinels and all: the adapter turns the group headings into heading
        // rows and drops the Grand Total, which the table foots itself.
        rows: tableData,
        startDate,
        endDate,
        brandName: brandId ? selectedBrandName : '',
        categoryName: categoryId ? selectedCategoryName : '',
        branch: printBranch,
        branchName: dropdownData.find(
          (entry: any) => String(entry?.id) === String(branchId),
        )?.name,
      }),
    });
  };

  // ✅ stock data -> convert to category-wise rows
  useEffect(() => {
    if (!stock.isLoading && Array.isArray(stock?.data)) {
      const grouped = buildCategoryWiseRows(stock.data);
      setTableData(grouped);
    } else if (!stock.isLoading) {
      setTableData([]);
    }
  }, [stock]);

  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const handleCategoryChange = (selectedOption: any) => {
    if (selectedOption) {
      setCategoryId(selectedOption.value);
    } else {
      setCategoryId(null);
    }
  };

  const handleStartDate = (e: any) => {
    setStartDate(e);
  };

  const handleEndDate = (e: any) => {
    setEndDate(e);
  };

  const handleActionButtonClick = () => {
    /**
     * ⚠️ A cleared date box is not "no filter", it is a broken one: dayjs(null)
     * formats to the literal string "Invalid Date", which the report sends as
     * `startdate` and MySQL answers with nothing at all. Fall back to the
     * branch's own transaction date -- the value the box starts with -- so a
     * Search always means something.
     */
    const from = startDate || defaultTransactionDate;
    const to = endDate || defaultTransactionDate;
    if (!from || !to) return;

    setButtonLoading(true);
    setFilterOpen(false);
    const startD = dayjs(from).format('YYYY-MM-DD');
    const endD = dayjs(to).format('YYYY-MM-DD');

    dispatch(
      getProductStock({
        branchId,
        brandId,
        categoryId,
        groupId: needProductGroup ? groupId || null : null,
        search,
        startDate: startD,
        endDate: endD,
      }),
    ) as any;

    setTimeout(() => setButtonLoading(false), 500);
  };

  /**
   * Enter inside the search box submits it, exactly as the Search button does.
   * Guarded to a text input so Enter on some other control in the group cannot
   * fire a second load on top of the first.
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return;
    e.preventDefault();
    handleActionButtonClick();
  };

  const handleResetFilters = () => {
    setSearchValue('');
    setPerPage(20);
    setBrandId(null);
    setCategoryId(null);
    setGroupId('');
    setStartDate(defaultTransactionDate);
    setEndDate(defaultTransactionDate);
    if (authUser?.branch_id) {
      setBranchId(authUser.branch_id);
    }
    setFilterOpen(false);
  };

  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData?.protectedData?.data);
      setDdlCategory(categoryData?.data);

      const [day, month, year] =
        branchDdlData?.protectedData?.transactionDate.split('/');
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

      setDefaultTransactionDate(parsedDate);
      setStartDate(parsedDate);
      setEndDate(parsedDate);
      if (authUser?.branch_id) {
        setBranchId(authUser.branch_id);
      }
    }
  }, [branchDdlData?.protectedData, authUser?.branch_id]);

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) =>
        isGroupRow(row) || isGrandTotalRow(row) ? '' : row.sl_number,
    },
    {
      key: 'product_name',
      header: 'Product Name',
      render: (row: any) => {
        if (isGrandTotalRow(row)) {
          return <div className="font-bold py-1">Grand Total</div>;
        }
        if (isGroupRow(row)) {
          return (
            <div className="font-semibold py-1">
              {row.cat_name}
            </div>
          );
        }

        return (
          <>
            <div>
              {row.brand_name && <span className="">{row.brand_name} </span>}
              {/* The code in front of the name, and only the name where there
                  is no code -- a lone dash reads as a product with no name. */}
              {row.code ? `${row.code} - ` : ''}
              {row.product_name}
            </div>
          </>
        );
      },
    },
    {
      key: 'opening',
      header: 'Opening',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        if (isGroupRow(row)) return '';
        if (isGrandTotalRow(row)) {
          return (
            <p className="font-bold">
              {thousandSeparator(Math.floor(row.opening || 0))}
            </p>
          );
        }
        return Math.floor(row.opening) ? (
          <p
            className={
              Math.floor(Number(row.opening) || 0) < 0
                ? 'font-semibold text-orange-700 dark:text-orange-300'
                : undefined
            }
          >
            {thousandSeparator(Math.floor(row.opening))}
            <span className="text-sm "> ({row.unit})</span>
          </p>
        ) : (
          '-'
        );
      },
    },
    {
      key: 'stock_in',
      header: 'Stock In',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        if (isGroupRow(row)) return '';
        if (isGrandTotalRow(row)) {
          return (
            <span className="text-sm font-bold">
              {thousandSeparator(Math.floor(row.stock_in || 0))}
            </span>
          );
        }
        return row.stock_in ? (
          <span className="text-sm ">
            {thousandSeparator(Math.floor(row.stock_in))} ({row.unit})
          </span>
        ) : (
          '-'
        );
      },
    },
    {
      key: 'stock_out',
      header: 'Stock Out',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        if (isGroupRow(row)) return '';
        if (isGrandTotalRow(row)) {
          return (
            <span className="text-sm font-bold">
              {thousandSeparator(Math.floor(row.stock_out || 0))}
            </span>
          );
        }
        return row.stock_out ? (
          <span className="text-sm ">
            {thousandSeparator(Math.floor(row.stock_out))} ({row.unit})
          </span>
        ) : (
          '-'
        );
      },
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        if (isGroupRow(row)) return '';
        if (isGrandTotalRow(row)) {
          return (
            <span className="text-sm font-bold">
              {thousandSeparator(Math.floor(row.balance || 0))}
            </span>
          );
        }
        return Math.floor(row.balance) ? (
          <span
            className={`text-sm ${
              Math.floor(Number(row.balance) || 0) < 0
                ? 'font-semibold text-orange-700 dark:text-orange-300'
                : ''
            }`}
          >
            {thousandSeparator(Math.floor(row.balance))} ({row.unit})
          </span>
        ) : (
          '-'
        );
      },
    },
  ];

  const optionsWithAll = [
    { id: '', name: 'All Categories' },
    ...(Array.isArray(ddlCategory) ? ddlCategory : []),
  ];

  const groupOptions = [
    { id: '', name: 'All Groups' },
    ...(Array.isArray(productGroupData?.ddlData?.data) ? productGroupData.ddlData.data : []),
  ];

  const handleBrandChange = (selectedOption: any) => {
    const selectedId = selectedOption?.value ?? '';
    setBrandId(selectedId);
  };

  const brandOptions = [
    { id: '', name: 'All Brand' },
    ...(brand?.brandDdl?.data || []),
  ];
  const selectedBrandName = useMemo(() => {
    const found = brandOptions.find((item: any) => String(item.id) === String(brandId ?? ''));
    return found?.name || '';
  }, [brandId, brandOptions]);
  const selectedCategoryName = useMemo(() => {
    const found = optionsWithAll.find((item: any) => String(item.id) === String(categoryId ?? ''));
    return found?.name || '';
  }, [categoryId, optionsWithAll]);

  return (
    <div className="">
      <HelmetTitle title={'Product Stock'} />

      <div className="px-0 py-3 ">
        <div className="flex flex-wrap items-end gap-3">
          <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'w-full'}>
            {useFilterMenuEnabled && (
              <Button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className={`inline-flex w-10 items-center justify-center rounded border text-sm transition ${
 filterOpen
 ?'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300':'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700'}`}
                title="Open filters"
                aria-label="Open filters"
              >
                <FiFilter size={16} />
              </Button>
            )}

            {(useFilterMenuEnabled ? filterOpen : true) && (
              <div
                className={
                  useFilterMenuEnabled
                    ? 'absolute left-0 top-full z-1000 mt-2 w-[min(92vw,320px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800'
                    : 'w-full'
                }
              >
                {/* One wrapping flex row for every control, in reading order:
                    Branch, Brand, Group, Category, Search, the two dates, then
                    Rows, Font and the Apply/Reset/Print group. Nothing is
                    forced onto a fixed column count, so no control is squeezed
                    and no track is left empty -- see the cell classes above. */}
                <div
                  className={
                    useFilterMenuEnabled ? 'space-y-3' : 'flex flex-wrap items-end gap-3'
                  }
                >
                  {useFilterMenuEnabled && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Show Rows</label>
                      <PrintRowsInput
 id="perPage"
 name="perPage"
 label=""
 value={perPage.toString()}
 onChange={handlePerPageChange}
 type="text"
 className="text-sm w-20!"
                      />
                    </div>
                  )}

                  <div className={BRANCH_CELL}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch</label>
                    {branchDdlData.isLoading == true ? <Loader /> : ''}
                    <BranchDropdown
 onChange={handleBranchChange}
 value={branchId == null ? '' : String(branchId)}
 className="w-full font-medium text-sm pl-1.5 pt-2 pb-2 "
 branchDdl={dropdownData}
                    />
                  </div>

                  {/* ⚠️ THE THREE GATES READ `loaded`, NOT `isLoading`. A
                      slice's isLoading starts false, so the render before its
                      thunk's pending action lands is indistinguishable from a
                      finished fetch -- the box drew empty for that frame and
                      only then started spinning. `loaded` is set the moment the
                      call comes back, success or failure, so the spinner covers
                      the whole wait and nothing after it. Same reading as
                      areaSlice's, and as Stock Details'. */}
                  <div className={FILTER_CELL}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Brand</label>
                    {brand.loaded ? (
                      <CategoryDropdown
                        onChange={handleBrandChange}
                        className="w-full font-medium text-sm"
                        categoryDdl={brandOptions}
                        value={brandId}
                      />
                    ) : (
                      <FieldLoading />
                    )}
                  </div>

                  {/* Same Group box, same place, as Stock Details: between Brand
                      and Category, before the search box. */}
                  {needProductGroup ? (
                    <div className={FILTER_CELL}>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Group</label>
                      {productGroupData.loaded ? (
                        <CategoryDropdown
                          onChange={(opt: any) => setGroupId(String(opt?.value ?? ''))}
                          className="w-full font-medium text-sm"
                          categoryDdl={groupOptions}
                          value={groupId}
                          placeholder="All Groups"
                        />
                      ) : (
                        <FieldLoading />
                      )}
                    </div>
                  ) : null}

                  <div className={FILTER_CELL}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
                    {categoryData.loaded ? (
                      <CategoryDropdown
                        onChange={handleCategoryChange}
                        className="w-full font-medium text-sm"
                        categoryDdl={optionsWithAll}
                        value={categoryId}
                      />
                    ) : (
                      <FieldLoading />
                    )}
                  </div>

                  {/* The box, immediately left of Start Date.
                      ⚠️ No button beside it: this screen has always sent the
                      box with the filters, so Apply already runs the search and
                      a second button only invited a click that did the same
                      thing twice. Enter in the box still submits. */}
                  <div className={SEARCH_CELL} onKeyDown={handleSearchKeyDown}>
                    <SearchInput
                      id="productStockNormalSearch"
                      label="Search"
                      placeholder="Search product name or code..."
                      search={search}
                      setSearchValue={setSearchValue}
                      className="text-nowrap w-full"
                    />
                  </div>

                  <div className={FILTER_CELL}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                    <InputDatePicker
 setCurrentDate={handleStartDate}
 className="w-full font-medium text-sm "
 selectedDate={startDate}
 setSelectedDate={setStartDate}
                    />
                  </div>

                  <div className={FILTER_CELL}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                    <InputDatePicker
 setCurrentDate={handleEndDate}
 className="w-full font-medium text-sm "
 selectedDate={endDate}
 setSelectedDate={setEndDate}
                    />
                  </div>

                  {!useFilterMenuEnabled && (
                    <div className={COMPACT_CELL}>
                      <PrintRowsInput
                        id="perPage"
                        name="perPage"
                        label="Rows"
                        value={perPage.toString()}
                        onChange={handlePerPageChange}
                        type="text"
                        className="font-medium text-sm w-16! sm:w-20!"
                      />
                    </div>
                  )}

                  {!useFilterMenuEnabled && (
                    <div className={COMPACT_CELL}>
                      <PrintFontInput
                        id="fontSize"
                        name="fontSize"
                        label="Font"
                        value={fontSize.toString()}
                        onChange={handleFontSizeChange}
                        type="text"
                        className="font-medium text-sm w-16! sm:w-20!"
                      />
                    </div>
                  )}

                  <div
                    className={
                      useFilterMenuEnabled ? 'flex justify-end gap-2 pt-1' : ACTION_CELL
                    }
                  >
                    <ButtonLoading
                      onClick={handleActionButtonClick}
                      buttonLoading={false}
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
                    {!useFilterMenuEnabled && (
                      <PrintButton onClick={handlePrint} label="Print" className="px-4 sm:px-6" />
                    )}
                  </div>

                  {/* ⚠️ Rows/Font/Print are drawn above, in the row's own order
                      (Rows, Font, then the Apply/Reset/Print group), so there is
                      nothing left to place here. Same as ProductStock. */}
                </div>
              </div>
            )}
          </div>

          {useFilterMenuEnabled && (
            <div className="hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300">
              Use the filter
            </div>
          )}

          {/* The filter-menu feature hides everything behind the funnel button,
              so Rows/Font/Print stay out here, where they are always reachable. */}
          {useFilterMenuEnabled && (
            <div className="ml-auto flex shrink-0 flex-nowrap items-end gap-2">
              <PrintRowsInput
                id="perPage"
                name="perPage"
                label="Rows"
                value={perPage.toString()}
                onChange={handlePerPageChange}
                type="text"
                className="font-medium text-sm w-16! sm:w-20!"
              />
              <PrintFontInput
                id="fontSize"
                name="fontSize"
                label="Font"
                value={fontSize.toString()}
                onChange={handleFontSizeChange}
                type="text"
                className="font-medium text-sm w-16! sm:w-20!"
              />
              <PrintButton onClick={handlePrint} label="Print" className="px-4 sm:px-6" />
            </div>
          )}
        </div>
      </div>

      <div className="overflow-y-auto">
        {stock.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} />

        {/* === Hidden Print Component === */}
        <div className="hidden">
          <StockBookPrintNormal
            ref={printRef}
            rows={(tableData || []).filter((r: any) => !isGroupRow(r))} // ✅ group row print এ যাবে না
            startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : undefined}
            endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
            title="Product Stock"
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
          />

          {/* Mounted only while a designed sheet is being printed. Left standing
              it would draw a whole document on every render of a screen that
              re-renders on every keystroke. */}
          {stockDoc ? (
            <DocumentPrint
              ref={stockPrintRef}
              template={stockDoc.template}
              data={stockDoc.data}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProductStockNormal;
