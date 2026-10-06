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
import { FiArrowRight, FiCheckSquare, FiFilter, FiRotateCcw } from 'react-icons/fi';
import { fetchBrandDdl } from '../../product/brand/brandSlice';
import { isBranchSettingOn, isUserFeatureEnabled } from '../../../utils/userFeatureSettings';
import { getProductGroupDdl } from '../../productgroup/productGroupSlice';
import httpService from '../../../services/httpService';
import { API_PRINT_TEMPLATE_URL } from '../../../services/apiRoutes';
import { usePrintBranch } from '../../../utils/utils-functions/printBranch';
import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import {
  normalizeTemplate,
} from '../../../utils/print-designer/printTemplate';
import type { PrintTemplate } from '../../../utils/print-designer/printTemplate';
import { toProductStockDocumentData } from './productStockDocumentData';

// ======================
// Brand -> Category wise helper
// ======================
const isBrandRow = (row: any) => row?.__type === 'BRAND';
const isCatRow = (row: any) => row?.__type === 'CAT';
const isGroupRow = (row: any) => isBrandRow(row) || isCatRow(row);
const isGrandTotalRow = (row: any) => row?.__type === 'GRAND_TOTAL';

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildBrandCategoryRows = (rows: any[]) => {
  if (!Array.isArray(rows)) return [];

  const sorted = [...rows].sort((a, b) => {
    const b1 = String(a.brand_name || '').localeCompare(String(b.brand_name || ''));
    if (b1 !== 0) return b1;

    const c1 = String(a.cat_name || '').localeCompare(String(b.cat_name || ''));
    if (c1 !== 0) return c1;

    return String(a.product_name || '').localeCompare(String(b.product_name || ''));
  });

  const brandMap = new Map<string, any[]>();
  for (const r of sorted) {
    const brandKey = (r.brand_name || 'Unknown Brand').trim() || 'Unknown Brand';
    if (!brandMap.has(brandKey)) brandMap.set(brandKey, []);
    brandMap.get(brandKey)!.push(r);
  }

  const finalRows: any[] = [];
  const grandTotal = {
    opening: 0,
    stock_in: 0,
    stock_out: 0,
    balance: 0,
  };

  for (const [brand, brandItems] of brandMap.entries()) {
    finalRows.push({
      __type: 'BRAND',
      brand_name: brand,
    });

    const catMap = new Map<string, any[]>();
    for (const it of brandItems) {
      const catKey = (it.cat_name || 'Uncategorized').trim() || 'Uncategorized';
      if (!catMap.has(catKey)) catMap.set(catKey, []);
      catMap.get(catKey)!.push(it);
    }

    for (const [cat, items] of catMap.entries()) {
      finalRows.push({
        __type: 'CAT',
        brand_name: brand,
        cat_name: cat,
      });

      let serial = 1;
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

const ProductStock = ({ user }: any) => {
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

  const [branchId, setBranchId] = useState<number | string | ''>(authUser?.branch_id || '');
  const [categoryId, setCategoryId] = useState<number | string | null>(null);
  // Stock Details' Group box, verbatim: same switch, same dropdown, same
  // "All Groups" first entry.
  const needProductGroup = isBranchSettingOn(settings, "need_product_group");
  const productGroupData = useSelector((state: any) => state.productGroup);
  const [groupId, setGroupId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [defaultTransactionDate, setDefaultTransactionDate] = useState<Date | null>(null);
  const [brandId, setBrandId] = useState<string | null>(''); // null হতে পারবে

  const printRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(11);



  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(getCategoryDdl());
    dispatch(fetchBrandDdl());
  }, [dispatch]);

  useEffect(() => {
    if (Array.isArray(categoryData?.ddlData?.data?.category)) {
      setDdlCategory(categoryData.ddlData.data.category || []);
    }
  }, [categoryData]);

  useEffect(() => {
    if (needProductGroup) dispatch(getProductGroupDdl() as any);
  }, [dispatch, needProductGroup]);





  useEffect(() => {
    if (!stock.isLoading && Array.isArray(stock?.data)) {
      const grouped = buildBrandCategoryRows(stock.data);
      setTableData(grouped);
    } else if (!stock.isLoading) {
      setTableData([]);
    }
  }, [stock]);

  useEffect(() => {
    if (branchDdlData?.protectedData?.data && branchDdlData?.protectedData?.transactionDate) {
      setDropdownData(branchDdlData.protectedData.data);

      const [day, month, year] = branchDdlData.protectedData.transactionDate.split('/');
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

      setDefaultTransactionDate(parsedDate);
      setStartDate(parsedDate);
      setEndDate(parsedDate);

      if (authUser?.branch_id) {
        setBranchId(authUser.branch_id);
      } else {
        // The dropdown has no "All Branch" option, so an empty value would
        // still render the first branch while sending no branch filter at all.
        setBranchId((prev) => prev || branchDdlData.protectedData.data[0]?.id || '');
      }
    }
  }, [branchDdlData?.protectedData, authUser?.branch_id]);

  const handleBranchChange = (e: any) => {
    const val = e.target ? e.target.value : e;
    setBranchId(val);
  };

  const handleBrandChange = (selectedOption: any) => {
    setBrandId(selectedOption?.value ?? null); // "" এর বদলে null
  };

  const handleCategoryChange = (selectedOption: any) => {
    setCategoryId(selectedOption?.value ?? null);
  };

  const handleStartDate = (date: Date | null) => setStartDate(date);
  const handleEndDate = (date: Date | null) => setEndDate(date);

  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPerPage(isNaN(value) ? 10 : value);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFontSize(isNaN(value) ? 10 : value);
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
      template: { ...template, rowsPerPage: perPage, fontSize },
      data: toProductStockDocumentData({
        // Sentinels and all: the adapter turns the Brand and Category rows into
        // heading rows the paper prints, and drops the Grand Total, which the
        // table foots itself.
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

  const handleActionButtonClick = () => {
    /**
     * ⚠️ This used to `return` on a missing date, which made the Search button
     * a silent no-op: the click did nothing, the previous unfiltered list
     * stayed on screen, and a search looked like it had returned everything.
     * Fall back to the branch's own transaction date -- the value the box
     * starts with -- so the click always means something.
     */
    const from = startDate || defaultTransactionDate;
    const to = endDate || defaultTransactionDate;
    if (!from || !to) return;

    setButtonLoading(true);
    setFilterOpen(false);

    const startD = dayjs(from).format('YYYY-MM-DD');
    const endD = dayjs(to).format('YYYY-MM-DD');

    // ডিবাগের জন্য দেখতে পারেন
    console.log('Sending payload:', {
      branchId,
      brandId,           // এখন null হলে null-ই যাবে
      categoryId,
      search,
      startDate: startD,
      endDate: endD,
    });

    dispatch(
      getProductStock({
        branchId: branchId || null,
        brandId: brandId,           // null পাঠালে ব্যাকএন্ডে সব ব্র্যান্ড আসবে (আশা করা যায়)
        categoryId,
        groupId: needProductGroup ? groupId || null : null,
        search: search || undefined,
        startDate: startD,
        endDate: endD,
      })
    );

    setTimeout(() => setButtonLoading(false), 800);
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
    setBranchId(authUser?.branch_id || '');
    setBrandId('');
    setCategoryId('');
    setGroupId('');
    setSearchValue('');
    setPerPage(35);
    setStartDate(defaultTransactionDate);
    setEndDate(defaultTransactionDate);
    setFilterOpen(false);
  };

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
        if (isBrandRow(row)) {
          return <div className="font-bold py-1">{row.brand_name}</div>;
        }

        if (isCatRow(row)) {
          return (
            <div className="inline-flex items-center gap-1 whitespace-nowrap py-1 font-semibold">
              <span className="font-semibold">{row.brand_name}</span>
              <FiArrowRight className="shrink-0 text-gray-900 dark:text-gray-100" />

              <span>{row.cat_name}</span>
            </div>
          );
        }
        // The code in front of the name, and only the name where there is no
        // code -- a lone dash reads as a product with a missing name.
        return (
          <div>
            {row.code ? `${row.code} - ` : ''}
            {row.product_name}
          </div>
        );
      },
    },
    {
      key: 'opening',
      header: 'Opening',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) =>
        isGroupRow(row) ? (
          ''
        ) : isGrandTotalRow(row) ? (
          <p className="font-bold">
            {thousandSeparator(Math.floor(row.opening || 0))}
          </p>
        ) : row.opening ? (
          <p
            className={
              Math.floor(Number(row.opening) || 0) < 0
                ? 'font-semibold text-orange-700 dark:text-orange-300'
                : undefined
            }
          >
            {thousandSeparator(Math.floor(row.opening || 0))}
            <span className="text-sm"> ({row.unit})</span>
          </p>
        ) : (
          '-'
        ),
    },
    {
      key: 'stock_in',
      header: 'Stock In',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) =>
        isGroupRow(row) ? (
          ''
        ) : isGrandTotalRow(row) ? (
          <span className="text-sm font-bold">
            {thousandSeparator(Math.floor(row.stock_in || 0))}
          </span>
        ) : row.stock_in ? (
          <span className="text-sm">
            {thousandSeparator(Math.floor(row.stock_in))} ({row.unit})
          </span>
        ) : (
          '-'
        ),
    },
    {
      key: 'stock_out',
      header: 'Stock Out',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) =>
        isGroupRow(row) ? (
          ''
        ) : isGrandTotalRow(row) ? (
          <span className="text-sm font-bold">
            {thousandSeparator(Math.floor(row.stock_out || 0))}
          </span>
        ) : row.stock_out ? (
          <span className="text-sm">
            {thousandSeparator(Math.floor(row.stock_out))} ({row.unit})
          </span>
        ) : (
          '-'
        ),
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) =>
        isGroupRow(row) ? (
          ''
        ) : isGrandTotalRow(row) ? (
          <span className="text-sm font-bold">
            {thousandSeparator(Math.floor(row.balance || 0))}
          </span>
        ) : Math.floor(row.balance || 0) ? (
          <span
            className={`text-sm ${Math.floor(Number(row.balance) || 0) < 0
                ? 'font-semibold text-orange-700 dark:text-orange-300'
                : ''
              }`}
          >
            {thousandSeparator(Math.floor(row.balance))} ({row.unit})
          </span>
        ) : (
          '-'
        ),
    },
  ];

  const brandOptions = [{ id: '', name: 'All Brand' }, ...(brand?.brandDdl?.data || [])];
  const categoryOptions = [{ id: '', name: 'All Categories' }, ...(ddlCategory || [])];
  const groupOptions = [
    { id: '', name: 'All Groups' },
    ...(Array.isArray(productGroupData?.ddlData?.data) ? productGroupData.ddlData.data : []),
  ];
  const selectedBrandName = useMemo(() => {
    const found = brandOptions.find((item: any) => String(item.id) === String(brandId ?? ''));
    return found?.name || '';
  }, [brandId, brandOptions]);
  const selectedCategoryName = useMemo(() => {
    const found = categoryOptions.find((item: any) => String(item.id) === String(categoryId ?? ''));
    return found?.name || '';
  }, [categoryId, categoryOptions]);

  return (
    <div className="">
      <HelmetTitle title="Product Stock" />

      <div className="px-0 py-3 ">
        <div className="flex flex-wrap items-end gap-3">
          <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'w-full'}>
            {useFilterMenuEnabled && (
              <Button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className={`inline-flex w-10 items-center justify-center rounded border text-sm transition ${filterOpen
                    ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300' : 'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700'}`}
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
                        label=""
                        value={perPage.toString()}
                        onChange={handlePerPageChange}
                        type="text"
                        className="w-20! text-sm "
                      />
                    </div>
                  )}

                  <div className={BRANCH_CELL}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch</label>
                    {branchDdlData.isLoading ? (
                      <Loader />
                    ) : (
                      <BranchDropdown
                        defaultValue={authUser?.branch_id}
                        value={String(branchId)}
                        onChange={handleBranchChange}
                        className="w-full text-sm p-2 border "
                        branchDdl={dropdownData}
                      />
                    )}
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
                        className="w-full text-sm "
                        categoryDdl={brandOptions}
                        value={brandId}
                      />
                    ) : (
                      <FieldLoading />
                    )}
                  </div>

                  {/* Group sits between Brand and Category: the order the branch
                      files products in, and the order Stock Details draws them.
                      Hidden where the branch does not file products under groups
                      at all. */}
                  {needProductGroup ? (
                    <div className={FILTER_CELL}>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Group</label>
                      {productGroupData.loaded ? (
                        <CategoryDropdown
                          onChange={(opt: any) => setGroupId(String(opt?.value ?? ''))}
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

                  <div className={FILTER_CELL}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
                    {categoryData.loaded ? (
                      <CategoryDropdown
                        onChange={handleCategoryChange}
                        className="w-full text-sm"
                        categoryDdl={categoryOptions}
                        placeholder="All Categories"
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
                      id="productStockSearch"
                      label="Search"
                      placeholder="Search product name or code..."
                      search={search}
                      setSearchValue={setSearchValue}
                      className="w-full text-sm"
                    />
                  </div>

                  <div className={FILTER_CELL}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                    <InputDatePicker
                      setCurrentDate={handleStartDate}
                      className="w-full text-sm "
                      selectedDate={startDate}
                      setSelectedDate={setStartDate}
                    />
                  </div>

                  <div className={FILTER_CELL}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                    <InputDatePicker
                      setCurrentDate={handleEndDate}
                      className="w-full text-sm "
                      selectedDate={endDate}
                      setSelectedDate={setEndDate}
                    />
                  </div>

                  {!useFilterMenuEnabled && (
                    <div className={COMPACT_CELL}>
                      <PrintRowsInput
                        label="Rows"
                        value={perPage.toString()}
                        onChange={handlePerPageChange}
                        type="text"
                        className="w-16! text-sm text-center sm:w-20!"
                      />
                    </div>
                  )}

                  {!useFilterMenuEnabled && (
                    <div className={COMPACT_CELL}>
                      <PrintFontInput
                        label="Font"
                        value={fontSize.toString()}
                        onChange={handleFontSizeChange}
                        type="text"
                        className="w-16! text-sm text-center sm:w-20!"
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
                      <PrintButton onClick={handlePrint} label="" />
                    )}
                  </div>

                  {/* ⚠️ Rows/Font/Print are drawn above, in the row's own order
                      (Rows, Font, then the Apply/Reset/Print group), so there is
                      nothing left to place here. */}
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
                label="Rows"
                value={perPage.toString()}
                onChange={handlePerPageChange}
                type="text"
                className="w-16! text-sm text-center sm:w-20!"
              />
              <PrintFontInput
                label="Font"
                value={fontSize.toString()}
                onChange={handleFontSizeChange}
                type="text"
                className="w-16! text-sm text-center sm:w-20!"
              />
              <PrintButton onClick={handlePrint} label="" />
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* ⚠️ Only the *first* load replaces the table with a spinner. Later
            requests keep the previous table on screen -- a slim loader sits
            above it -- so Apply swaps one answer for the next instead of
            blanking the page in between. The slice no longer empties `data` on
            pending for the same reason. */}
        {stock.isLoading && !tableData?.length ? (
          <div className="flex justify-center py-10">
            <Loader />
          </div>
        ) : (
          <>
            <Table columns={columns} data={tableData || []} />
          </>
        )}

        {/* Print hidden content */}
        <div className="hidden">
          <StockBookPrint
            ref={printRef}
            rows={(tableData || []).filter((r: any) => !isGroupRow(r) && !isGrandTotalRow(r))}
            startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : undefined}
            endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
            title="Product Stock"
            rowsPerPage={perPage}
            fontSize={fontSize}
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

export default ProductStock;
