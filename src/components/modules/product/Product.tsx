import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProduct, updateProductQtyRate } from './productSlice';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { FiBook, FiEdit2, FiTrash2 } from 'react-icons/fi';
import SearchInput from '../../utils/fields/SearchInput';
import Link from '../../utils/others/Link';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { useNavigate } from 'react-router-dom';
import InputElement from '../../utils/fields/InputElement';
import { toast } from 'react-toastify';
import { getSettings } from '../settings/settingsSlice';
import CategoryDropdown from '../../utils/utils-functions/CategoryDropdown';
import { getCategoryDdl } from '../category/categorySlice';
import { fetchBrandDdl } from './brand/brandSlice';
import ProductPrint from './ProductPrint';
import { useReactToPrint } from 'react-to-print';

const isGroupRow = (row: any) => row?.__type === 'CAT_HEADER';

const buildCategoryWiseRows = (rows: any[]) => {
  if (!Array.isArray(rows)) return [];

  const sorted = [...rows].sort((a, b) => {
    const c1 = String(a.category || '').localeCompare(String(b.category || ''));
    if (c1 !== 0) return c1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const map = new Map<string, any[]>();
  for (const r of sorted) {
    const key = (r.category || 'Uncategorized').trim() || 'Uncategorized';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const out: any[] = [];
  for (const [cat, items] of map.entries()) {
    out.push({ __type: 'CAT_HEADER', category: cat, _count: items.length });
    out.push(...items);
  }

  return out;
};

// ✅ API response কে flat rows এ normalize করবে (paginate vs showAll)
const normalizeProductRows = (apiState: any) => {
  const raw = apiState?.data?.data;

  // ✅ flat paginate response
  if (Array.isArray(raw) && raw.length > 0 && !raw[0]?.items) {
    return raw;
  }

  // ✅ grouped showAll response: [{category, items:[]}, ...]
  if (Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0]?.items)) {
    const flat: any[] = [];
    raw.forEach((group: any) => {
      if (Array.isArray(group.items)) flat.push(...group.items);
    });
    return flat;
  }

  return [];
};

const Product = (user: any) => {
  const product = useSelector((state: any) => state.product);
  const settings = useSelector((state: any) => state.settings);
  const categoryData = useSelector((state: any) => state.category);
  const brand = useSelector((state: any) => state.brand);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [search, setSearchValue] = useState('');
  const [appliedSearch, setAppliedSearch] = useState(''); // ✅ Search চাপলে apply হবে

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [tableData, setTableData] = useState<any[]>([]);
  const [editedRows, setEditedRows] = useState<Record<string, any>>({}); // ✅ product_id hash string

  const [ddlCategory, setDdlCategory] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<number | string | null>(null);
  const [brandId, setBrandId] = useState<number | string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number>(12);
  const [rowsPerPage, setRowsPerPage] = useState<number>(12);

  /* ================= INIT ================= */
  useEffect(() => {
    dispatch(getSettings());
    dispatch(getCategoryDdl());
    dispatch(fetchBrandDdl());
  }, []);

  useEffect(() => {
    if (Array.isArray(categoryData?.ddlData?.data?.category)) {
      setDdlCategory(categoryData?.ddlData?.data?.category || []);
    }
  }, [categoryData]);

  /* ================= FETCH ================= */
  useEffect(() => {
    dispatch(getProduct({ page, perPage, categoryId, brandId, search: appliedSearch }));
  }, [page, perPage, categoryId, brandId, appliedSearch]);

  /* ✅ এখানে per_page=0 (showAll) + paginate দুটোই handle হবে */
  useEffect(() => {
    if (!product?.data) return;

    const flatRows = normalizeProductRows(product);
    const grouped = buildCategoryWiseRows(flatRows);
    setTableData(grouped);

    const paginationOff = product?.data?.meta?.pagination === false || perPage === 0;

    if (paginationOff) {
      setTotalPages(0);
    } else {
      const total = product?.data?.total ?? 0;
      setTotalPages(Math.ceil(total / perPage));
    }
  }, [product, perPage]);

  /* ================= HANDLERS ================= */
  const handleSearchButton = () => {
    setTableData([]);
    setTotalPages(0);
    setPage(1);
    setCurrentPage(1);
    setAppliedSearch(search);

    dispatch(getProduct({ page: 1, perPage, categoryId, brandId, search }));
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    setCurrentPage(p);
  };

  const handleProductInputChange = (
    productId: string,
    field: 'qty' | 'rate' | 'serial_no',
    value: any
  ) => {
    setEditedRows((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSerialBlur = (row: any) => {
    const edited = editedRows[row.product_id];
    if (!edited?.serial_no) return;

    const serialArray = edited.serial_no
      .split(/\r?\n/)
      .map((s: string) => s.trim())
      .filter(Boolean);

    setEditedRows((prev) => ({
      ...prev,
      [row.product_id]: {
        ...prev[row.product_id],
        serial_no: serialArray.join('\n'),
        qty: serialArray.length,
      },
    }));
  };

  const handleProductBlur = async (e: any, row: any) => {
    e.preventDefault();
    e.stopPropagation();

    if (isGroupRow(row)) return;

    const edited = editedRows[row.product_id];
    if (!edited) return;

    const payload = {
      product_id: row.product_id,
      branch_id: user.user.branch_id,
      qty: edited.qty ?? row.qty ?? row.openingbalance ?? 0,
      rate: edited.rate ?? row.rate ?? 0,
      serial_no: edited.serial_no ?? row.serial_no ?? '',
    };

    if (!payload.product_id || !payload.branch_id) return;

    try {
      const result: any = await dispatch(updateProductQtyRate(payload) as any);
      if (result?.success && result?.message) toast.success(result.message);
      else if (result?.message) toast.info(result.message);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProductEdit = (row: any) => {
    if (isGroupRow(row)) return;
    navigate(`/product/edit/${row.product_id}`);
  };

  const handleCategoryChange = (selectedOption: any) => {
    setCategoryId(selectedOption ? selectedOption.value : null);
    setPage(1);
    setCurrentPage(1);
  };

  const handleBrandChange = (selectedOption: any) => {
    const selectedId = selectedOption?.value ?? null;
    setBrandId(selectedId);
    setPage(1);
    setCurrentPage(1);
  };

  /* ================= TABLE ================= */
  const serialQtyRateColumns = [
    {
      key: 'serial_no',
      header: 'IMEI / Serial',
      render: (row: any) => {
        if (isGroupRow(row)) return '';
        return (
          <textarea
            rows={2}
            className="w-full px-3 py-1 text-gray-600 bg-white border rounded-xs outline-none
              dark:bg-transparent dark:border-gray-600 dark:text-white dark:placeholder-gray-500
              focus:outline-none focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
            placeholder="IMEI Number"
            value={editedRows[row.product_id]?.serial_no ?? row.serial_no ?? ''}
            onChange={(e) => handleProductInputChange(row.product_id, 'serial_no', e.target.value)}
            onBlur={(e) => {
              handleSerialBlur(row);
              handleProductBlur(e, row);
            }}
          />
        );
      },
    },
    {
      key: 'qty',
      header: 'Qty',
      headerClass: 'text-center',
      cellClass: 'text-right',
      render: (row: any) => {
        if (isGroupRow(row)) return '';
        return (
          <InputElement
            type="number"
            className="text-right w-20"
            placeholder="Qty"
            value={editedRows[row.product_id]?.qty ?? row.qty ?? row.openingbalance ?? ''}
            onChange={(e) => handleProductInputChange(row.product_id, 'qty', e.target.value)}
            onBlur={(e) => handleProductBlur(e, row)}
          />
        );
      },
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-center',
      cellClass: 'text-right',
      render: (row: any) => {
        if (isGroupRow(row)) return '';
        return (
          <InputElement
            type="number"
            placeholder="Rate"
            className="text-right w-24"
            value={editedRows[row.product_id]?.rate ?? row.rate ?? ''}
            onChange={(e) => handleProductInputChange(row.product_id, 'rate', e.target.value)}
            onBlur={(e) => handleProductBlur(e, row)}
          />
        );
      },
    },
  ];

  const columns = useMemo(() => {
    return [
      {
        key: 'serial',
        header: 'Sl',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => (isGroupRow(row) ? '' : row.serial),
      },
      {
        key: 'name',
        header: 'Product',
        render: (row: any) => {
          if (isGroupRow(row)) {
            return (
              <div className="font-semibold py-1">
                Category: {row.category}{' '}
                <span className="text-xs text-gray-500">({row._count})</span>
              </div>
            );
          }
          return (
            <div>
              <div className="text-sm text-gray-500">{row.brand && <>{row.brand}. </>}</div>
              <div>{row.name}</div>
            </div>
          );
        },
      },
      {
        key: 'category',
        header: 'Category',
        render: (row: any) => (isGroupRow(row) ? '' : row.category),
      },
      {
        key: 'unit',
        header: 'Unit',
        render: (row: any) => (isGroupRow(row) ? '' : row.unit),
      },
      ...(settings?.data?.branch?.is_opening == 1 ? serialQtyRateColumns : []),
      {
        key: 'purchase',
        header: 'P. Price',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => {
          if (isGroupRow(row)) return '';
          return row.purchase > 0 ? thousandSeparator(row.purchase, 0) : '-';
        },
      },
      {
        key: 'sales',
        header: 'S. Price',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => {
          if (isGroupRow(row)) return '';
          return row.sales > 0 ? thousandSeparator(row.sales, 0) : '-';
        },
      },
      {
        key: 'action',
        header: 'Action',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => {
          if (isGroupRow(row)) return '';
          return (
            <div className="flex justify-center gap-2">
              <FiBook className="cursor-pointer text-blue-500" />
              <FiEdit2 className="cursor-pointer text-blue-500" onClick={() => handleProductEdit(row)} />
              <FiTrash2 className="cursor-pointer text-red-500" />
            </div>
          );
        },
      },
    ];
  }, [settings, editedRows]);

  /* ================= RENDER ================= */
  const optionsWithAll = [
    { id: '', name: 'All Categories' },
    ...(Array.isArray(ddlCategory) ? ddlCategory : []),
  ];

  const brandOptions = [
    { id: '', name: 'All Brand' },
    ...(brand?.brandDdl?.data || []),
  ];


  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setRowsPerPage(value);
    } else {
      setRowsPerPage(10);
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

  return (
    <div>
      <HelmetTitle title="Product List" />

      <div className="mb-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-nowrap lg:items-center">
          <div className="w-full sm:w-56">
            <CategoryDropdown
              onChange={handleBrandChange}
              className="w-full text-sm !h-9"
              categoryDdl={brandOptions}
            />
          </div>

          <div className="w-full sm:w-56">
            {categoryData.isLoading ? (
              <Loader />
            ) : (
              <CategoryDropdown
                onChange={handleCategoryChange}
                className="w-full text-sm !h-9"
                categoryDdl={optionsWithAll}
              />
            )}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full">
              <SelectOption
                className="!w-full h-9"
                onChange={(e: any) => {
                  const v = Number(e.target.value); // ✅ string -> number
                  const next = Number.isFinite(v) ? v : 10;
                  setPerPage(next);
                  setPage(1);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="w-full sm:w-64">
              <SearchInput className="!w-full h-9" search={search} setSearchValue={setSearchValue} />
            </div>
            <ButtonLoading label="Search" onClick={handleSearchButton} className="h-9 w-full sm:w-auto" />
          </div>

          <div className="flex w-full">
            <div className="mr-2">
              <InputElement
                id="perPage"
                name="perPage"
                label=""
                value={rowsPerPage.toString()}
                onChange={handlePerPageChange}
                type="text"
                className="font-medium text-sm h-9 w-12"
              />
            </div>

            <div className="mr-2">
              <InputElement
                id="fontSize"
                name="fontSize"
                label=""
                value={fontSize.toString()}
                onChange={handleFontSizeChange}
                type="text"
                className="font-medium text-sm h-9 w-12"
              />
            </div>
            <PrintButton
              onClick={handlePrint}
              label="Print"
              className="ml-2 pt-[0.45rem] pb-[0.45rem] h-9"
            />
          </div>
        </div>

        <div>
          <Link to="/product/add-product" className="w-full rounded-md px-3 py-2 text-center text-sm sm:w-auto">
            New
          </Link>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {product.isLoading && <Loader />}

        <Table columns={columns} data={tableData} />
        {totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} handlePageChange={handlePageChange} />
        )}

        <div className="hidden">
          <ProductPrint
            ref={printRef}
            rows={(tableData || []).filter((r: any) => !isGroupRow(r))} // ✅ group row print এ যাবে না

            title="Product List"
            rowsPerPage={Number(rowsPerPage)}
            fontSize={Number(fontSize)}
          />
        </div>
      </div>
    </div>
  );
};

export default Product;
