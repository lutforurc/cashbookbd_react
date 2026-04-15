import React, { useEffect, useRef, useState } from 'react';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
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
import { FiFilter } from 'react-icons/fi';
import { fetchBrandDdl } from '../../product/brand/brandSlice'; 

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

const ProductStock = ( user : any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const categoryData = useSelector((state: any) => state.category);
  const stock = useSelector((state: any) => state.stock);
  const brand = useSelector((state: any) => state.brand);
  const settings = useSelector((state: any) => state.settings);
  const authUser = user?.user ?? user;
  const useFilterMenuEnabled = String(settings?.data?.branch?.use_filter_parameter ?? '') === '1';

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [ddlCategory, setDdlCategory] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [search, setSearchValue] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const [branchId, setBranchId] = useState<number | string | ''>(authUser?.branch_id || '');
  const [categoryId, setCategoryId] = useState<number | string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [defaultTransactionDate, setDefaultTransactionDate] = useState<Date | null>(null);
  const [brandId, setBrandId] = useState<string | null>(''); // null হতে পারবে

  const printRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState<number>(35);
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

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Product Stock',
    removeAfterPrint: true,
  });

  const handleActionButtonClick = () => {
    if (!startDate || !endDate) return;

    setButtonLoading(true);
    setFilterOpen(false);

    const startD = dayjs(startDate).format('YYYY-MM-DD');
    const endD = dayjs(endDate).format('YYYY-MM-DD');

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
        search: search || undefined,
        startDate: startD,
        endDate: endD,
      })
    );

    setTimeout(() => setButtonLoading(false), 800);
  };

  const handleResetFilters = () => {
    setBranchId(authUser?.branch_id || '');
    setBrandId('');
    setCategoryId('');
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
            <div className="font-semibold py-1">
              <span className="font-semibold">{row.brand_name}</span>
              <span className="mx-1 text-gray-800 dark:text-gray-100">→</span>
              <span>{row.cat_name}</span>
            </div>
          );
        }
        return <div>{row.product_name}</div>;
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
            {thousandSeparator(Math.floor(row.opening || 0), 0)}
          </p>
        ) : (
          <p>
            {thousandSeparator(Math.floor(row.opening || 0), 0)}
            {row.opening ? <span className="text-sm"> ({row.unit})</span> : ''}
          </p>
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
            {thousandSeparator(Math.floor(row.stock_in || 0), 0)}
          </span>
        ) : row.stock_in ? (
          <span className="text-sm">
            {thousandSeparator(Math.floor(row.stock_in), 0)} ({row.unit})
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
            {thousandSeparator(Math.floor(row.stock_out || 0), 0)}
          </span>
        ) : row.stock_out ? (
          <span className="text-sm">
            {thousandSeparator(Math.floor(row.stock_out), 0)} ({row.unit})
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
            {thousandSeparator(Math.floor(row.balance || 0), 0)}
          </span>
        ) : Math.floor(row.balance || 0) ? (
          <span className="text-sm">
            {thousandSeparator(Math.floor(row.balance), 0)} ({row.unit})
          </span>
        ) : (
          '-'
        ),
    },
  ];

  const brandOptions = [{ id: '', name: 'All Brand' }, ...(brand?.brandDdl?.data || [])];
  const categoryOptions = [{ id: '', name: 'All Categories' }, ...(ddlCategory || [])];

  return (
    <div className="">
      <HelmetTitle title="Product Stock" />

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
                        label=""
                        value={perPage.toString()}
                        onChange={handlePerPageChange}
                        type="text"
                        className="w-full text-sm h-10"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch</label>
                    {branchDdlData.isLoading ? (
                      <Loader />
                    ) : (
                      <BranchDropdown
                        defaultValue={authUser?.branch_id}
                        value={String(branchId)}
                        onChange={handleBranchChange}
                        className="w-full text-sm p-2 border"
                        branchDdl={dropdownData}
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Brand</label>
                    <CategoryDropdown
                      onChange={handleBrandChange}
                      className="w-full text-sm h-8"
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
                        className="w-full text-sm"
                        categoryDdl={categoryOptions}
                        placeholder="All Categories"
                        value={categoryId}
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                    <InputDatePicker
                      setCurrentDate={handleStartDate}
                      className="w-full text-sm h-10"
                      selectedDate={startDate}
                      setSelectedDate={setStartDate}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                    <InputDatePicker
                      setCurrentDate={handleEndDate}
                      className="w-full text-sm h-10"
                      selectedDate={endDate}
                      setSelectedDate={setEndDate}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Search</label>
                    <SearchInput
                      search={search}
                      setSearchValue={setSearchValue}
                      className="w-full text-sm h-10"
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
                      buttonLoading={buttonLoading}
                      label="Apply"
                      className="h-10 px-6"
                    />
                    <ButtonLoading
                      onClick={handleResetFilters}
                      buttonLoading={false}
                      label="Reset"
                      className="h-10 px-4"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`${useFilterMenuEnabled ? 'hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300' : 'hidden'}`}>
            {branchId || brandId || categoryId || search || startDate || endDate
              ? 'Use the filter'
              : 'Use the filter'}
          </div>

          <div className="ml-auto flex items-end gap-2">
            <InputElement
              label="Rows"
              value={perPage.toString()}
              onChange={handlePerPageChange}
              type="text"
              className="!w-20 text-sm h-10 text-center"
            />
            <InputElement
              label="Font"
              value={fontSize.toString()}
              onChange={handleFontSizeChange}
              type="text"
              className="!w-20 text-sm h-10 text-center"
            />
            <PrintButton onClick={handlePrint} label="" className="h-10 px-6" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {stock.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader />
          </div>
        ) : (
          <Table columns={columns} data={tableData || []} />
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
        </div>
      </div>
    </div>
  );
};

export default ProductStock;
