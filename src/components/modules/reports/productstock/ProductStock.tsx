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
  const authUser = user?.user ?? user;

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [ddlCategory, setDdlCategory] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [search, setSearchValue] = useState('');

  const [branchId, setBranchId] = useState<number | string | ''>(authUser?.branch_id || '');
  const [categoryId, setCategoryId] = useState<number | string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
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

      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Branch */}
          <div>
            <label className="block mb-1 text-sm font-medium">Select Branch</label>
            {branchDdlData.isLoading ? (
              <Loader />
            ) : (
              <BranchDropdown
                defaultValue={authUser?.branch_id}
                onChange={handleBranchChange}
                className="w-full text-sm p-2 border "
                branchDdl={dropdownData}
              />
            )}
          </div>

          {/* Brand */}
          <div>
            <label className="block mb-1 text-sm font-medium">Select Brand</label>
            <CategoryDropdown
              onChange={handleBrandChange}
              className="w-full text-sm h-8"
              categoryDdl={brandOptions}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block mb-1 text-sm font-medium">Select Category</label>
            {categoryData.isLoading ? (
              <Loader />
            ) : (
              <CategoryDropdown
                onChange={handleCategoryChange}
                className="w-full text-sm"
                categoryDdl={categoryOptions}
                placeholder="All Categories"
              />
            )}
          </div>

          {/* Search */}
          <div>
            <label className="block mb-1 text-sm font-medium">Search by Product Name</label>
            <SearchInput
              search={search}
              setSearchValue={setSearchValue}
              className="w-full text-sm h-10"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-sm font-medium">Start Date</label>
              <InputDatePicker
                setCurrentDate={handleStartDate}
                className="w-full text-sm h-10"
                selectedDate={startDate}
                setSelectedDate={setStartDate}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">End Date</label>
              <InputDatePicker
                setCurrentDate={handleEndDate}
                className="w-full text-sm h-10"
                selectedDate={endDate}
                setSelectedDate={setEndDate}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex gap-2">
              <InputElement
                label="Rows"
                value={perPage.toString()}
                onChange={handlePerPageChange}
                type="text"
                className="w-16 text-sm h-10"
              />
              <InputElement
                label="Font"
                value={fontSize.toString()}
                onChange={handleFontSizeChange}
                type="text"
                className="w-16 text-sm h-10"
              />
            </div>

            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="Run"
              className="h-10 px-6"
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
