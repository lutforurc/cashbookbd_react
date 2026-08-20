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
import { fetchStockAlertProducts, StockAlertType } from './stockAlertSlice';
import { formatDayMonthYear, formatDaySpan } from '../../utils/utils-functions/formatDate';
import StockAlertPrint from './StockAlertPrint';
import { FIELD_BASE } from '../../../theme/fieldStyles';
import { Input } from '../../utils/fields/FormControls';

type Props = {
  alertType: StockAlertType;
};

const ALERT_META = {
  negative: {
    title: 'Negative Stock Products',
    description: 'Products where stock out is greater than available stock.',
    empty: 'No negative stock product found',
    statusLabel: 'Negative Stock',
    statusClass: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    highlightClass: 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50',
  },
  slowMoving: {
    title: 'Slow Moving Products',
    description: 'Products with no or low movement in the selected period.',
    empty: 'No slow moving product found',
    statusLabel: 'Slow Moving',
    statusClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    highlightClass: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50',
  },
  warehouseDifference: {
    title: 'Warehouse Stock Difference',
    description: 'Products distributed unevenly across warehouses.',
    empty: 'No warehouse stock difference found',
    statusLabel: 'Stock Difference',
    statusClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    highlightClass: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50',
  },
};

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const display = (value: any) =>
  value === null || value === undefined || value === '' ? '-' : value;

const formatQuantity = (value: any) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '-';

  return numericValue.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    useGrouping: true,
  });
};

const formatDate = (value: any) => {
  if (!value) return '-';
  return String(value).slice(0, 10);
};

const getPagination = (payload: any, perPage: number) => {
  const root = payload?.data && !Array.isArray(payload.data) ? payload.data : payload || {};
  const meta = root.meta || {};
  const total = root.total ?? meta.total ?? root?.pagination?.total ?? 0;
  const lastPage =
    root.last_page ??
    meta.last_page ??
    root?.pagination?.last_page ??
    (total && perPage ? Math.ceil(Number(total) / perPage) : 1);

  return {
    total: Number(total) || 0,
    lastPage: Number(lastPage) || 1,
  };
};

const getRows = (payload: any) => {
  const candidates = [
    payload?.data?.data,
    payload?.data,
    payload?.items,
    payload?.products,
    payload,
  ];
  const list = candidates.find((item) => Array.isArray(item));
  return Array.isArray(list) ? list : [];
};

const StatusBadge = ({ label, className }: { label: string; className: string }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
    {label}
  </span>
);

const WarehouseList = ({ row }: { row: any }) => {
  const warehouses = Array.isArray(row?.warehouses) ? row.warehouses : [];

  if (warehouses.length === 0) {
    return <span>{display(row?.warehouse_name)}</span>;
  }

  return (
    <div className="flex min-w-52 flex-wrap gap-1">
      {warehouses.map((item: any, index: number) => (
        <span
          key={`${item?.warehouse_id ?? index}-${item?.warehouse_name ?? index}`}
          className="rounded-sm bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200"
        >
          {display(item?.warehouse_name)}: {formatQuantity(item?.current_stock ?? 0)}
        </span>
      ))}
    </div>
  );
};

const StockAlertProducts = ({ alertType }: Props) => {
  const dispatch = useDispatch();
  const meta = ALERT_META[alertType];
  const stockAlert = useSelector((state: any) => state.stockAlert?.[alertType]);
  const categoryData = useSelector((state: any) => state.category);
  const brand = useSelector((state: any) => state.brand);
  const printRef = useRef<HTMLDivElement>(null);
  const canPrint = alertType === 'negative' || alertType === 'slowMoving';

  const [search, setSearchValue] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | string>('');
  const [brandId, setBrandId] = useState<number | string>('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [days, setDays] = useState(90);
  const [printRowsPerPage, setPrintRowsPerPage] = useState(12);
  const [printFontSize, setPrintFontSize] = useState(12);

  useEffect(() => {
    dispatch(getCategoryDdl() as any);
    dispatch(fetchBrandDdl() as any);
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchStockAlertProducts({
        type: alertType,
        params: {
          search: appliedSearch,
          category_id: categoryId,
          brand_id: brandId,
          per_page: perPage,
          page,
          days: alertType === 'slowMoving' ? days : undefined,
        },
      }) as any,
    );
  }, [alertType, appliedSearch, brandId, categoryId, days, dispatch, page, perPage]);

  const rows = useMemo(() => getRows(stockAlert?.data), [stockAlert?.data]);
  const pagination = useMemo(
    () => getPagination(stockAlert?.data, perPage),
    [stockAlert?.data, perPage],
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

  const baseColumns = [
    {
      key: 'serial',
      header: 'SL',
      headerClass: 'text-center w-16',
      cellClass: 'text-center',
      render: (_row: any, index: number) => (page - 1) * perPage + index + 1,
    },
    {
      key: 'brand',
      header: 'Brand',
      render: (row: any) => display(row?.brand?.name ?? row?.brand),
    },
     {
      key: 'category',
      header: 'Category',
      render: (row: any) => display(row?.category?.name ?? row?.category),
    },
    {
      key: 'name',
      header: 'Product',
      render: (row: any) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
            {display(row?.name)}
          </div>
        </div>
      ),
    },
   
    
    {
      key: 'unit',
      header: 'Unit',
      render: (row: any) => display(row?.unit?.name ?? row?.unit),
    },
  ];

  const stockColumns = [
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
      render: (row: any) => formatQuantity(row?.current_stock ?? row?.balance ?? 0),
    },
  ];

  const columns = useMemo(() => {
    if (alertType === 'warehouseDifference') {
      return [
        ...baseColumns,
        {
          key: 'warehouses',
          header: 'Warehouses',
          render: (row: any) => <WarehouseList row={row} />,
        },
        {
          key: 'min_stock',
          header: 'Min',
          headerClass: 'text-right',
          cellClass: 'text-right',
          render: (row: any) => formatQuantity(row?.min_stock ?? 0),
        },
        {
          key: 'max_stock',
          header: 'Max',
          headerClass: 'text-right',
          cellClass: 'text-right',
          render: (row: any) => formatQuantity(row?.max_stock ?? 0),
        },
        {
          key: 'stock_difference',
          header: 'Difference',
          headerClass: 'text-right',
          cellClass: 'text-right font-semibold',
          render: (row: any) => formatQuantity(row?.stock_difference ?? 0),
        },
        {
          key: 'status',
          header: 'Status',
          headerClass: 'text-center',
          cellClass: 'text-center',
          render: () => <StatusBadge label={meta.statusLabel} className={meta.statusClass} />,
        },
      ];
    }

    if (alertType === 'slowMoving') {
      return [
        ...baseColumns,
        ...stockColumns,
        {
          key: 'last_movement_date',
          header: 'Last Movement',
          cellClass: 'whitespace-nowrap',
          render: (row: any) => formatDayMonthYear(row?.last_movement_date),
        },
        {
          key: 'days_without_movement',
          header: 'Days Idle',
          headerClass: 'text-right',
          cellClass: 'text-right whitespace-nowrap',
          render: (row: any) => formatDaySpan(row?.days_without_movement),
        },
        {
          key: 'status',
          header: 'Status',
          headerClass: 'text-center',
          cellClass: 'text-center',
          render: () => <StatusBadge label={meta.statusLabel} className={meta.statusClass} />,
        },
      ];
    }

    return [
      ...baseColumns,
      ...stockColumns,
      {
        key: 'status',
        header: 'Status',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: () => <StatusBadge label={meta.statusLabel} className={meta.statusClass} />,
      },
    ];
  }, [alertType, meta.statusClass, meta.statusLabel, page, perPage]);

  const handleSearch = () => {
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
    setDays(90);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: meta.title,
  });

  const handlePrintRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setPrintRowsPerPage(Number.isFinite(value) && value > 0 ? value : 12);
  };

  const handlePrintFontSizeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setPrintFontSize(Number.isFinite(value) && value > 0 ? value : 12);
  };

  const isHighlighted = (row: any) => {
    if (alertType === 'negative') return toNumber(row?.current_stock ?? row?.balance) < 0;
    if (alertType === 'warehouseDifference') return toNumber(row?.stock_difference) > 0;
    return true;
  };

  return (
    <div>
      <HelmetTitle title={meta.title} />

      <div className="mb-3 flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
            {meta.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {meta.description}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-7">
          <CategoryDropdown
            key={`${alertType}-category-${categoryId}`}
            onChange={(option: any) => {
              setCategoryId(option?.value || '');
              setPage(1);
            }}
            value={categoryId}
            className="w-full text-sm !"
            categoryDdl={categoryOptions}
          />

          <CategoryDropdown
            key={`${alertType}-brand-${brandId}`}
            onChange={(option: any) => {
              setBrandId(option?.value || '');
              setPage(1);
            }}
            value={brandId}
            className="w-full text-sm !"
            categoryDdl={brandOptions}
          />

          {alertType === 'slowMoving' ? (
            <Input
 type="number"
 min="1"
 className={`${FIELD_BASE} w-full px-3 text-sm`}
 value={days}
 onChange={(event) => {
                setDays(Number(event.target.value) || 90);
                setPage(1);
              }}
              placeholder="Days"
            />
          ) : null}

          <SelectOption
            key={`${alertType}-per-page-${perPage}`}
            className="w-full! h-9"
            onChange={(e: any) => {
              const value = e.target.value === '' ? 0 : Number(e.target.value) || 10;
              setPerPage(value);
              setPage(1);
            }}
          />

          <SearchInput
 className="w-full! "
 search={search}
 setSearchValue={setSearchValue}
          />

          <div className="flex flex-wrap gap-2 xl:col-span-2 xl:flex-nowrap">
            <ButtonLoading
              label="Search"
              icon={<FiSearch className="text-gray-500" />}
              onClick={handleSearch}
              className="flex-1"
            />
            <ButtonLoading
              label="Reset"
              icon={<FiRefreshCcw className="text-gray-500" />}
              onClick={handleReset}
              className="flex-1"
            />
            {canPrint ? (
              <>
                <PrintRowsInput
 id={`${alertType}-print-rows`}
 name={`${alertType}-print-rows`}
 label=""
 title="Print rows per page"
 value={printRowsPerPage}
 onChange={handlePrintRowsPerPageChange}
 type="number"
 className="w-16! text-center"
                />
                <PrintFontInput
 id={`${alertType}-print-font`}
 name={`${alertType}-print-font`}
 label=""
 title="Print font size"
 value={printFontSize}
 onChange={handlePrintFontSizeChange}
 type="number"
 className="w-16! text-center"
                />
                <PrintButton
                  label="Print"
                  onClick={handlePrint}
                  className="flex-1"
                  disabled={rows.length === 0}
                />
              </>
            ) : null}
          </div>
        </div>
      </div>

      {stockAlert?.error ? (
        <div className="mb-3 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {stockAlert.error}
        </div>
      ) : null}

      <div className="relative">
        {stockAlert?.isLoading ? <Loader /> : null}

        <div className="hidden md:block">
          <Table
            columns={columns}
            data={rows}
            noDataMessage={meta.empty}
            rowClassName={(row: any) => (isHighlighted(row) ? meta.highlightClass : '')}
          />
        </div>

        <div className="space-y-3 md:hidden">
          {rows.length > 0 ? (
            rows.map((row: any, index: number) => (
              <div
                key={row?.id ?? row?.product_id ?? index}
                className={`rounded-sm border bg-white p-3 shadow-sm dark:bg-gray-800 ${
 isHighlighted(row) ? meta.highlightClass : 'border-[rgb(var(--c-border))]'
 }`}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-500">
                      SL {(page - 1) * perPage + index + 1}
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
                      {display(row?.name)}
                    </div>
                  </div>
                  <StatusBadge label={meta.statusLabel} className={meta.statusClass} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Category</span>
                    <div>{display(row?.category?.name ?? row?.category)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Brand</span>
                    <div>{display(row?.brand?.name ?? row?.brand)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Unit</span>
                    <div>{display(row?.unit?.name ?? row?.unit)}</div>
                  </div>

                  {alertType === 'warehouseDifference' ? (
                    <>
                      <div>
                        <span className="text-gray-500">Difference</span>
                        <div>{formatQuantity(row?.stock_difference ?? 0)}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Warehouses</span>
                        <div className="mt-1">
                          <WarehouseList row={row} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-gray-500">Stock In</span>
                        <div>{thousandSeparator(row?.stock_in ?? 0)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Stock Out</span>
                        <div>{thousandSeparator(row?.stock_out ?? 0)}</div>
                      </div>
                      {alertType === 'slowMoving' ? (
                        <>
                          <div>
                            <span className="text-gray-500">Last Movement</span>
                            <div>{formatDayMonthYear(row?.last_movement_date)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Days Idle</span>
                            <div>{formatDaySpan(row?.days_without_movement)}</div>
                          </div>
                        </>
                      ) : null}
                      <div className="col-span-2 rounded-sm bg-gray-100 px-3 py-2 dark:bg-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-2 text-gray-500">
                            <FiAlertTriangle />
                            Current Stock
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
                            {formatQuantity(row?.current_stock ?? row?.balance ?? 0)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-sm border border-[rgb(var(--c-border))] bg-white px-4 py-8 text-center text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {meta.empty}
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

        {canPrint ? (
          <div className="hidden">
            <StockAlertPrint
              ref={printRef}
              rows={rows}
              title={meta.title}
              type={alertType as 'negative' | 'slowMoving'}
              emptyMessage={meta.empty}
              startSerial={(page - 1) * perPage + 1}
              days={days}
              rowsPerPage={printRowsPerPage}
              fontSize={printFontSize}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StockAlertProducts;
