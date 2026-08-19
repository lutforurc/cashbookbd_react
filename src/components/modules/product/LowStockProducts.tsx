import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiAlertTriangle, FiRefreshCcw, FiSearch } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import SearchInput from '../../utils/fields/SearchInput';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../utils/fields/PrintRowsInput';
import SelectOption from '../../utils/utils-functions/SelectOption';
import CategoryDropdown from '../../utils/utils-functions/CategoryDropdown';
import Loader from '../../../common/Loader';
import { ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getCategoryDdl } from '../category/categorySlice';
import { fetchBrandDdl } from './brand/brandSlice';
import { fetchLowStockProducts } from './lowStockSlice';
import StockAlertPrint from './StockAlertPrint';

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getDisplayValue = (value: any) =>
  value === null || value === undefined || value === '' ? '-' : value;

const formatQuantity = (value: any, zeroAsDash = false) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '-';
  if (zeroAsDash && numericValue === 0) return '-';

  return numericValue.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    useGrouping: true,
  });
};

const getPagination = (payload: any, perPage: number) => {
  const root = payload?.data && !Array.isArray(payload.data) ? payload.data : payload || {};
  const meta = root.meta || {};
  const links = root.links || {};
  const total = root.total ?? meta.total ?? root?.pagination?.total ?? 0;
  const currentPage = root.current_page ?? meta.current_page ?? root?.pagination?.current_page ?? 1;
  const lastPage =
    root.last_page ??
    meta.last_page ??
    root?.pagination?.last_page ??
    (total && perPage ? Math.ceil(Number(total) / perPage) : 1);

  return {
    total: Number(total) || 0,
    currentPage: Number(currentPage) || 1,
    lastPage: Number(lastPage) || 1,
    hasLinks: Boolean(links),
  };
};

const getStatusBadge = (status: string) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'out_of_stock') {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-200">
        Out of Stock
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
      Low Stock
    </span>
  );
};

const LowStockProducts = () => {
  const dispatch = useDispatch();
  const lowStock = useSelector((state: any) => state.lowStock);
  const categoryData = useSelector((state: any) => state.category);
  const brand = useSelector((state: any) => state.brand);
  const printRef = useRef<HTMLDivElement>(null);

  const [search, setSearchValue] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | string>('');
  const [brandId, setBrandId] = useState<number | string>('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [printRowsPerPage, setPrintRowsPerPage] = useState(12);
  const [printFontSize, setPrintFontSize] = useState(12);

  useEffect(() => {
    dispatch(getCategoryDdl() as any);
    dispatch(fetchBrandDdl() as any);
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchLowStockProducts({
        search: appliedSearch,
        category_id: categoryId,
        brand_id: brandId,
        per_page: perPage,
        page,
      }) as any,
    );
  }, [appliedSearch, brandId, categoryId, dispatch, page, perPage]);

  const rows = useMemo(() => {
    const payload = lowStock?.data;
    const candidates = [
      payload?.data?.data,
      payload?.data,
      payload?.items,
      payload?.products,
      payload,
    ];

    const list = candidates.find((item) => Array.isArray(item));
    return Array.isArray(list) ? list : [];
  }, [lowStock?.data]);

  const pagination = useMemo(
    () => getPagination(lowStock?.data, perPage),
    [lowStock?.data, perPage],
  );

  const categoryOptions = useMemo(
    () => [
      { id: '', name: 'All Categories' },
      ...(categoryData?.ddlData?.data?.category || []),
    ],
    [categoryData?.ddlData?.data?.category],
  );

  const brandOptions = useMemo(() => {
    const brandList = Array.isArray(brand?.brandDdl)
      ? brand.brandDdl
      : brand?.brandDdl?.data || [];

    return [
      { id: '', name: 'All Brand' },
      ...brandList.map((item: any) => ({
        id: item.id ?? item.value,
        name: item.name ?? item.label,
      })),
    ];
  }, [brand?.brandDdl]);

  const handleSearchButton = () => {
    setAppliedSearch(search);
    setPage(1);
  };

  const handleReset = () => {
    setSearchValue('');
    setAppliedSearch('');
    setCategoryId('');
    setBrandId('');
    setPage(1);
    setPerPage(10);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Low Stock Products',
  });

  const handlePrintRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setPrintRowsPerPage(Number.isFinite(value) && value > 0 ? value : 12);
  };

  const handlePrintFontSizeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setPrintFontSize(Number.isFinite(value) && value > 0 ? value : 12);
  };

  const columns = useMemo(
    () => [
      {
        key: 'serial',
        header: 'SL',
        headerClass: 'text-center w-16',
        cellClass: 'text-center',
        render: (_row: any, index: number) => (page - 1) * perPage + index + 1,
      },
      {
        key: 'name',
        header: 'Product',
        render: (row: any) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-gray-900 dark:text-white">
              {getDisplayValue(row?.name)}
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        render: (row: any) => getDisplayValue(row?.category?.name ?? row?.category),
      },
      {
        key: 'brand',
        header: 'Brand',
        render: (row: any) => getDisplayValue(row?.brand?.name ?? row?.brand),
      },
      {
        key: 'unit',
        header: 'Unit',
        render: (row: any) => getDisplayValue(row?.unit?.name ?? row?.unit),
      },
      {
        key: 'order_level',
        header: 'Minimum Stock',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => thousandSeparator(row?.order_level ?? 0),
      },
      {
        key: 'stock_in',
        header: 'Stock In',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => thousandSeparator(row?.stock_in ?? 0),
      },
      {
        key: 'stock_out',
        header: 'Stock Out',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => thousandSeparator(row?.stock_out ?? 0),
      },
      {
        key: 'current_stock',
        header: 'Current Stock',
        headerClass: 'text-right',
        cellClass: 'text-right font-semibold',
        render: (row: any) => formatQuantity(row?.current_stock ?? row?.balance ?? 0, true),
      },
      {
        key: 'stock_status',
        header: 'Status',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => getStatusBadge(row?.stock_status),
      },
    ],
    [page, perPage],
  );

  return (
    <div>
      <HelmetTitle title="Low Stock Products" />

      <div className="mb-3 flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Low Stock Products
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Products that reached minimum stock level or are fully out of stock.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
          <CategoryDropdown
            key={`category-${categoryId}`}
            onChange={(option: any) => {
              setCategoryId(option?.value || '');
              setPage(1);
            }}
            value={categoryId}
            className="w-full text-sm h-9!"
            categoryDdl={categoryOptions}
          />

          <CategoryDropdown
            key={`brand-${brandId}`}
            onChange={(option: any) => {
              setBrandId(option?.value || '');
              setPage(1);
            }}
            value={brandId}
            className="w-full text-sm h-9!"
            categoryDdl={brandOptions}
          />

          <SelectOption
            key={`per-page-${perPage}`}
            className="w-full! h-9"
            onChange={(e: any) => {
              const value = e.target.value === '' ? 0 : Number(e.target.value) || 10;
              setPerPage(value);
              setPage(1);
            }}
          />

          <SearchInput
            className="w-full! h-9"
            search={search}
            setSearchValue={setSearchValue}
          />

          <div className="flex flex-wrap gap-2 xl:col-span-2 xl:flex-nowrap">
            <ButtonLoading
              label="Search"
              icon={<FiSearch className="text-gray-500" />}
              onClick={handleSearchButton}
              className="h-9 flex-1"
            />
            <ButtonLoading
              label="Reset"
              icon={<FiRefreshCcw className="text-gray-500" />}
              onClick={handleReset}
              className="h-9 flex-1"
            />
            <PrintRowsInput
              id="low-stock-print-rows"
              name="low-stock-print-rows"
              label=""
              title="Print rows per page"
              value={printRowsPerPage}
              onChange={handlePrintRowsPerPageChange}
              type="number"
              className="h-9 w-16! text-center"
            />
            <PrintFontInput
              id="low-stock-print-font"
              name="low-stock-print-font"
              label=""
              title="Print font size"
              value={printFontSize}
              onChange={handlePrintFontSizeChange}
              type="number"
              className="h-9 w-16! text-center"
            />
            <PrintButton
              label="Print"
              onClick={handlePrint}
              className="h-9 flex-1"
              disabled={rows.length === 0}
            />
          </div>
        </div>
      </div>

      {lowStock?.error ? (
        <div className="mb-3 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {lowStock.error}
        </div>
      ) : null}

      <div className="relative">
        {lowStock?.isLoading ? <Loader /> : null}

        <div className="hidden md:block">
          <Table
            columns={columns}
            data={rows}
            noDataMessage="No low stock product found"
            rowClassName={(row: any) =>
              toNumber(row?.current_stock) === 0
                ? 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50'
                : ''
            }
          />
        </div>

        <div className="space-y-3 md:hidden">
          {rows.length > 0 ? (
            rows.map((row: any, index: number) => {
              const isOut = toNumber(row?.current_stock) === 0;
              return (
                <div
                  key={row?.id ?? row?.product_id ?? index}
                  className={`rounded-sm border bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
                    isOut ? 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30' : 'border-gray-200'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-gray-500">
                        SL {(page - 1) * perPage + index + 1}
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {getDisplayValue(row?.name)}
                      </div>
                    </div>
                    {getStatusBadge(row?.stock_status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Category</span>
                      <div>{getDisplayValue(row?.category?.name ?? row?.category)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Brand</span>
                      <div>{getDisplayValue(row?.brand?.name ?? row?.brand)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Unit</span>
                      <div>{getDisplayValue(row?.unit?.name ?? row?.unit)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Minimum Stock</span>
                      <div>{thousandSeparator(row?.order_level ?? 0)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Stock In</span>
                      <div>{thousandSeparator(row?.stock_in ?? 0)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Stock Out</span>
                      <div>{thousandSeparator(row?.stock_out ?? 0)}</div>
                    </div>
                    <div className="col-span-2 rounded-sm bg-gray-100 px-3 py-2 dark:bg-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-gray-500">
                          <FiAlertTriangle />
                          Current Stock
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatQuantity(row?.current_stock ?? row?.balance ?? 0, true)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-sm border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              No low stock product found
            </div>
          )}
        </div>

        {pagination.lastPage > 1 ? (
          <Pagination
            currentPage={page}
            totalPages={pagination.lastPage}
            handlePageChange={(nextPage) => setPage(nextPage)}
          />
        ) : null}

        <div className="hidden">
          <StockAlertPrint
            ref={printRef}
            rows={rows}
            title="Low Stock Products"
            type="lowStock"
            emptyMessage="No low stock product found"
            startSerial={(page - 1) * perPage + 1}
            rowsPerPage={printRowsPerPage}
            fontSize={printFontSize}
          />
        </div>
      </div>
    </div>
  );
};

export default LowStockProducts;
