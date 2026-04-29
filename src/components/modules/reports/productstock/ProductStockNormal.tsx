import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ButtonLoading,
  PrintButton,
} from '../../../../pages/UiElements/CustomButtons';
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
import dayjs from 'dayjs';
import StockBookPrint from './StockBookPrint';
import { useReactToPrint } from 'react-to-print';
import InputElement from '../../../utils/fields/InputElement';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { FiCheckSquare, FiFilter, FiRotateCcw } from 'react-icons/fi';
import { fetchBrandDdl } from '../../product/brand/brandSlice';
import StockBookPrintNormal from './StockBookPrintNormal';
import { isUserFeatureEnabled } from '../../../utils/userFeatureSettings';

// ======================
// âœ… Category-wise helper
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
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [defaultTransactionDate, setDefaultTransactionDate] = useState<Date | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState<number>(20);
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

  const handlePrint = useReactToPrint({
    content: () => {
      if (!printRef.current) return null;
      return printRef.current;
    },
    documentTitle: 'Product Stock',
    removeAfterPrint: true,
  });

  // âœ… stock data -> convert to category-wise rows
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
    setButtonLoading(true);
    setFilterOpen(false);
    const startD = dayjs(startDate).format('YYYY-MM-DD');
    const endD = dayjs(endDate).format('YYYY-MM-DD');

    dispatch(
      getProductStock({
        branchId,
        brandId,
        categoryId,
        search,
        startDate: startD,
        endDate: endD,
      }),
    ) as any;

    setTimeout(() => setButtonLoading(false), 500);
  };

  const handleResetFilters = () => {
    setSearchValue('');
    setPerPage(20);
    setBrandId(null);
    setCategoryId(null);
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
          <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'min-w-[320px] flex-1'}>
            {useFilterMenuEnabled && (
              <button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded border text-sm transition ${
                  filterOpen
                    ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                    : 'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700'
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
                    ? 'absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,320px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800'
                    : 'w-full'
                }
              >
                <div
                  className={
                    useFilterMenuEnabled
                      ? 'space-y-3'
                      : 'grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(180px,1.2fr)_minmax(180px,1.2fr)_minmax(180px,1.2fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto]'
                  }
                >
                  {useFilterMenuEnabled && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Show Rows</label>
                      <InputElement
                        id="perPage"
                        name="perPage"
                        label=""
                        value={perPage.toString()}
                        onChange={handlePerPageChange}
                        type="text"
                        className="text-sm h-10 !w-20"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch</label>
                    {branchDdlData.isLoading == true ? <Loader /> : ''}
                    <BranchDropdown
                      onChange={handleBranchChange}
                      value={branchId == null ? '' : String(branchId)}
                      className="w-full font-medium text-sm pl-1.5 pt-2 pb-2 h-9.5"
                      branchDdl={dropdownData}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Brand</label>
                    <CategoryDropdown
                      onChange={handleBrandChange}
                      className="w-full font-medium text-sm"
                      categoryDdl={brandOptions}
                      value={brandId}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
                    {categoryData.isLoading ? (
                      <Loader />
                    ) : (
                      <CategoryDropdown
                        onChange={handleCategoryChange}
                        className="w-full font-medium text-sm"
                        categoryDdl={optionsWithAll}
                        value={categoryId}
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                    <InputDatePicker
                      setCurrentDate={handleStartDate}
                      className="w-full font-medium text-sm h-10"
                      selectedDate={startDate}
                      setSelectedDate={setStartDate}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                    <InputDatePicker
                      setCurrentDate={handleEndDate}
                      className="w-full font-medium text-sm h-10"
                      selectedDate={endDate}
                      setSelectedDate={setEndDate}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Search</label>
                    <SearchInput
                      search={search}
                      setSearchValue={setSearchValue}
                      className="text-nowrap h-10 bg-transparent w-full"
                    />
                  </div>

                  <div
                    className={`flex gap-2 pt-1 ${
                      useFilterMenuEnabled
                        ? 'justify-end'
                        : 'justify-start self-end md:col-span-2 xl:col-span-1'
                    }`}
                  >
                    <ButtonLoading
                      onClick={handleActionButtonClick}
                      buttonLoading={false}
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

          <div className={`${useFilterMenuEnabled ? 'hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300' : 'hidden'}`}>
            Use the filter
          </div>

          <div className="ml-auto flex items-end gap-2">
            {useFilterMenuEnabled && selectedBrandName ? (
              <div className="flex h-10 min-w-[220px] max-w-[320px] items-center rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                <span className="truncate" title={selectedBrandName}>{selectedBrandName}</span>
              </div>
            ) : null}
            {useFilterMenuEnabled && selectedCategoryName ? (
              <div className="flex h-10 min-w-[220px] max-w-[320px] items-center rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                <span className="truncate" title={selectedCategoryName}>{selectedCategoryName}</span>
              </div>
            ) : null}
            <InputElement
              id="fontSize"
              name="fontSize"
              label="Font"
              value={fontSize.toString()}
              onChange={handleFontSizeChange}
              type="text"
              className="font-medium text-sm h-10 !w-20"
            />

            <PrintButton
              onClick={handlePrint}
              label="Print"
              className="pt-[0.45rem] pb-[0.45rem] h-10"
            />
          </div>
        </div>
      </div>

      <div className="overflow-y-auto">
        {stock.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} />

        {/* === Hidden Print Component === */}
        <div className="hidden">
          <StockBookPrintNormal
            ref={printRef}
            rows={(tableData || []).filter((r: any) => !isGroupRow(r))} // âœ… group row print à¦ à¦¯à¦¾à¦¬à§‡ à¦¨à¦¾
            startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : undefined}
            endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
            title="Product Stock"
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductStockNormal;
