import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { deleteProduct, deleteProductOpening, getProduct, updateProductQtyRate } from './productSlice';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { Button, ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { FiCheckSquare, FiClock, FiEdit2, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import httpService from '../../services/httpService';
import { API_PRODUCT_HISTORY_URL } from '../../services/apiRoutes';
import SearchInput from '../../utils/fields/SearchInput';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { useNavigate } from 'react-router-dom';
import InputElement from '../../utils/fields/InputElement';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../utils/fields/PrintRowsInput';
import { toast } from 'react-toastify';
import CategoryDropdown from '../../utils/utils-functions/CategoryDropdown';
import { hasPermission } from '../../utils/permissionChecker';
import { getCategoryDdl } from '../category/categorySlice';
import { fetchBrandDdl } from './brand/brandSlice';
import ProductPrint from './ProductPrint';
import { useReactToPrint } from 'react-to-print';
import { FIELD_TEXTAREA } from '../../../theme/fieldStyles';
import { Textarea } from '../../utils/fields/FormControls';
import { isBranchSettingOn } from '../../utils/userFeatureSettings';

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
  const didInitRef = useRef(false);
  const [deleteRow, setDeleteRow] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [openingDeleteRow, setOpeningDeleteRow] = useState<any>(null);
  const [openingDeleteLoading, setOpeningDeleteLoading] = useState(false);

  // The Change Log, the customer list's own: who changed this product, when,
  // from what to what. Opened here because this is where the question is
  // asked -- somebody sees "000" where a name was and wants to know.
  const [historyProduct, setHistoryProduct] = useState<any>(null);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleShowHistory = async (row: any) => {
    setHistoryProduct(row);
    setHistoryEvents([]);
    setHistoryLoading(true);

    try {
      // product_id is the hashed id, the same one product-edit takes.
      const response = await httpService.get(`${API_PRODUCT_HISTORY_URL}${row.product_id}`);
      const payload = response?.data?.data?.data ?? response?.data?.data ?? {};

      setHistoryEvents(Array.isArray(payload?.events) ? payload.events : []);
    } catch (error) {
      console.error(error);
      toast.error('Could not load the change log for this product.');
      setHistoryProduct(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  /** A stamp as a person reads it: 05/09/2026 02:14 PM. */
  const historyStamp = (value: any) => {
    if (!value) return '';

    const at = new Date(String(value).replace(' ', 'T'));

    if (Number.isNaN(at.getTime())) return String(value);

    const two = (n: number) => String(n).padStart(2, '0');
    const hour = at.getHours() % 12 || 12;

    return `${two(at.getDate())}/${two(at.getMonth() + 1)}/${at.getFullYear()} `
      + `${two(hour)}:${two(at.getMinutes())} ${at.getHours() < 12 ? 'AM' : 'PM'}`;
  };

  // An empty field reads as a dash rather than as nothing at all, so a value
  // that was cleared is visibly a change and not a rendering fault.
  const historyValue = (value: any) =>
    value === null || value === undefined || String(value).trim() === '' ? '—' : String(value);

  // Removing opening stock removes a voucher, so it answers to the voucher
  // permission -- the same one the API checks.
  const canDeleteVoucher = hasPermission(settings?.data?.permissions, 'voucher.delete');

  const [fontSize, setFontSize] = useState<number>(12);
  const [rowsPerPage, setRowsPerPage] = useState<number>(0);

  /* ================= INIT ================= */
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    dispatch(getCategoryDdl() as any);
    dispatch(fetchBrandDdl() as any);
  }, [dispatch]);

  useEffect(() => {
    if (Array.isArray(categoryData?.ddlData?.data?.category)) {
      setDdlCategory(categoryData?.ddlData?.data?.category || []);
    }
  }, [categoryData]);

  /* ================= FETCH ================= */
  useEffect(() => {
    dispatch(getProduct({ page, perPage, categoryId, brandId, search: appliedSearch }) as any);
  }, [page, perPage, categoryId, brandId, appliedSearch]);

  /* ✅ এখানে per_page=0 (showAll) + paginate দুটোই handle হবে */
  useEffect(() => {
    if (!product?.data) return;

    const flatRows = normalizeProductRows({ data: product.data });
    const grouped = buildCategoryWiseRows(flatRows);
    setTableData(grouped);

    const paginationOff = product?.data?.meta?.pagination === false || perPage === 0;

    if (paginationOff) {
      setTotalPages(0);
    } else {
      const total = product?.data?.total ?? 0;
      setTotalPages(Math.ceil(total / perPage));
    }
  }, [product?.data, perPage]);

  /* ================= HANDLERS ================= */
  const handleSearchButton = () => {
    setTableData([]);
    setTotalPages(0);
    setPage(1);
    setCurrentPage(1);
    setAppliedSearch(search);
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

  const isRowDirty = (row: any) => {
    const edited = editedRows[row.product_id];
    if (!edited) return false;

    const qty0 = row.qty ?? row.openingbalance ?? '';
    const rate0 = row.rate ?? row.purchase ?? '';
    const serial0 = row.serial_no ?? '';

    const qty1 = edited.qty ?? qty0 ?? '';
    const rate1 = edited.rate ?? rate0 ?? '';
    const serial1 = edited.serial_no ?? serial0 ?? '';

    return (
      String(qty1 ?? '') !== String(qty0 ?? '') ||
      String(rate1 ?? '') !== String(rate0 ?? '') ||
      String(serial1 ?? '') !== String(serial0 ?? '')
    );
  };

  // ✅ Save button click এ API update হবে
  const handleSaveRow = async (row: any) => {
    if (isGroupRow(row)) return;

    const edited = editedRows[row.product_id];
    if (!edited) return;

    const payload = {
      product_id: row.product_id,
      branch_id: user.user.branch_id,
      qty: edited.qty ?? row.qty ?? row.openingbalance ?? 0,
      rate: edited.rate ?? row.rate ?? row.purchase ?? 0,
      serial_no: edited.serial_no ?? row.serial_no ?? '',
    };

    if (!payload.product_id || !payload.branch_id) return;

    try {
      const result: any = await dispatch(updateProductQtyRate(payload) as any);

      if (result?.success && result?.message) {
        toast.success(result.message);

        // foundData() nests the payload one level down; the voucher it carries
        // is what puts the number and the Delete button on the row without a
        // round trip to the list.
        const saved = result?.data?.data ?? {};

        setTableData((prev) =>
          prev.map((item) => {
            if (isGroupRow(item) || item.product_id !== row.product_id) return item;

            return {
              ...item,
              qty: payload.qty,
              openingbalance: payload.qty,
              rate: payload.rate,
              purchase: payload.rate,
              serial_no: payload.serial_no,
              main_trx_id: saved.main_trx_id ?? item.main_trx_id,
              opening_vr_no: saved.opening_vr_no ?? item.opening_vr_no,
            };
          })
        );

        // ✅ save হলে draft clear
        setEditedRows((prev) => {
          const copy = { ...prev };
          delete copy[row.product_id];
          return copy;
        });
      } else if (result?.message) {
        toast.info(result.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Cancel/Reset draft
  const handleCancelRow = (row: any) => {
    if (isGroupRow(row)) return;

    setEditedRows((prev) => {
      const copy = { ...prev };
      delete copy[row.product_id];
      return copy;
    });
  };

  const handleProductEdit = (row: any) => {
    if (isGroupRow(row)) return;
    navigate(`/product/edit/${row.product_id}`);
  };

  const handleOpeningDeleteConfirm = async () => {
    if (!openingDeleteRow?.product_id) return;

    setOpeningDeleteLoading(true);

    try {
      const res: any = await dispatch(
        deleteProductOpening(openingDeleteRow.product_id) as any,
      );

      if (res?.success) {
        toast.success(res?.message || 'Opening stock deleted.');

        setTableData((prev) =>
          prev.map((item) => {
            if (isGroupRow(item) || item.product_id !== openingDeleteRow.product_id) {
              return item;
            }

            return {
              ...item,
              qty: 0,
              openingbalance: 0,
              serial_no: '',
              main_trx_id: null,
              opening_vr_no: null,
            };
          }),
        );

        // A draft left in the boxes would read as though the stock survived.
        setEditedRows((prev) => {
          const copy = { ...prev };
          delete copy[openingDeleteRow.product_id];
          return copy;
        });
      } else {
        toast.error(res?.message || 'Opening stock could not be deleted.');
      }
    } finally {
      setOpeningDeleteLoading(false);
      setOpeningDeleteRow(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteRow?.product_id) return;

    setDeleteLoading(true);
    dispatch(
      deleteProduct(deleteRow.product_id, (res: any) => {
        setDeleteLoading(false);
        setDeleteRow(null);

        if (res?.success) {
          toast.success(res?.message || 'Product deleted successfully.');
          dispatch(
            getProduct({ page, perPage, categoryId, brandId, search: appliedSearch }) as any,
          );
        } else {
          toast.error(res?.message || 'Product could not be deleted.');
        }
      }) as any,
    );
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
      // A width in cellClass, not headerClass: that is the one the Table puts
      // on the <col>, and a table-fixed takes its column widths from there.
      // The Product column carries none on purpose -- it takes the rest.
      cellClass: 'w-40',
      render: (row: any) => {
        if (isGroupRow(row)) return '';
        return (
          <Textarea
            className={`${FIELD_TEXTAREA} w-full px-3 py-1 resize-none`}
            placeholder="IMEI Number"
            value={editedRows[row.product_id]?.serial_no ?? row.serial_no ?? ''}
            onChange={(e) => handleProductInputChange(row.product_id, 'serial_no', e.target.value)}
            onBlur={() => handleSerialBlur(row)}
          />
        );
      },
    },
    {
      key: 'qty',
      header: 'Qty',
      headerClass: 'text-center',
      cellClass: 'text-right w-24',
      render: (row: any) => {
        if (isGroupRow(row)) return '';
        return (
          <InputElement
            type="number"
            className="text-right w-16"
            placeholder="Qty"
            value={editedRows[row.product_id]?.qty ?? row.qty ?? row.openingbalance ?? ''}
            onChange={(e) => handleProductInputChange(row.product_id, 'qty', e.target.value)}
          // ✅ onBlur removed (auto-save বন্ধ)
          />
        );
      },
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-center',
      cellClass: 'text-right w-28',
      render: (row: any) => {
        if (isGroupRow(row)) return '';
        return (
          <InputElement
            type="number"
            placeholder="Rate"
            className="text-right w-20"
            value={editedRows[row.product_id]?.rate ?? row.purchase ?? ''}
            onChange={(e) => handleProductInputChange(row.product_id, 'rate', e.target.value)}
          // ✅ onBlur removed (auto-save বন্ধ)
          />
        );
      },
    },
    {
      key: 'save',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center w-36',
      render: (row: any) => {
        if (isGroupRow(row)) return '';

        const dirty = isRowDirty(row);

        // Icon alone, with the word kept as a tooltip. Three buttons carrying
        // "Save", "Cancel" and "Delete" across the row came to some 220px, and
        // took that width off the product name beside them.
        return (
          <div className="flex flex-col items-center gap-1">
            <div className="flex justify-center gap-1">
              <ButtonLoading icon={<FiCheckSquare />} title="Save" label="" className='py-1 px-2' type="button" disabled={!dirty} onClick={() => handleSaveRow(row)} />
              <ButtonLoading icon={<FiX />} title="Cancel" label="" className='py-1 px-2' type="button" disabled={!editedRows[row.product_id]} onClick={() => handleCancelRow(row)} />

              {/* Only where there is a voucher to delete. A product with no
                  opening stock has nothing to offer here. */}
              {row.opening_vr_no && canDeleteVoucher && (
                <ButtonLoading
                  icon={<FiTrash2 />}
                  title="Delete opening stock"
                  label=""
                  variant="danger"
                  className="py-1 px-2"
                  type="button"
                  buttonLoading={openingDeleteLoading && openingDeleteRow?.product_id === row.product_id}
                  disabled={openingDeleteLoading}
                  onClick={() => setOpeningDeleteRow(row)}
                />
              )}
            </div>

            {/* The voucher the opening stock came in on. Without it the figure
                is a quantity nobody can trace back. */}
            {row.opening_vr_no && (
              <span
                title={`Opening stock voucher ${row.opening_vr_no}`}
                className="font-mono text-[10px] leading-tight text-slate-500 dark:text-slate-400"
              >
                {row.opening_vr_no}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  // One reading of the branch's opening switch, so the four places below cannot
  // drift apart the way `settings?.data?.branch?.is_opening == 1` and
  // isBranchSettingOn() had.
  const openingOn = isBranchSettingOn(settings, 'is_opening');

  // Opening stock is entered rate by rate, and that group above brings its own
  // Save and Delete. So on a branch with opening on, these stand down rather
  // than print a second "Action" heading over the first.
  const priceActionColumns = [
    {
      key: 'purchase',
      header: 'P. Price',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        if (isGroupRow(row)) return '';
        return row.purchase > 0 ? thousandSeparator(row.purchase) : '-';
      },
    },
    {
      key: 'sales',
      header: 'S. Price',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        if (isGroupRow(row)) return '';
        return row.sales > 0 ? thousandSeparator(row.sales) : '-';
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
          <div className="flex justify-center items-center gap-2">
            {/* All three as Button, the way Category List does it: two bare
                icons beside one Button (which stands a control-height tall)
                sat higher than the bin. The clock stands where a book icon
                that did nothing used to. */}
            <Button
              type="button"
              title="Change log"
              className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              onClick={() => handleShowHistory(row)}
            >
              <FiClock size={15} />
            </Button>
            <Button type="button" onClick={() => handleProductEdit(row)} className="text-blue-500" title="Edit">
              <FiEdit2 className="cursor-pointer" />
            </Button>
            <Button type="button" onClick={() => setDeleteRow(row)} className="text-red-500" title="Delete">
              <FiTrash2 className="cursor-pointer" />
            </Button>
          </div>
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
        cellClass: 'text-center w-14',
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
              <div className="text-sm text-gray-500">{row.brand && <> Brand: {row.brand} </>}</div>
              <div>{row.code && <>{row.code} - </>} {row.name}</div>
            </div>
          );
        },
      },
      // Read as text, '0' is true and its negation is false -- which is why the
      // Category column was missing from every branch that has opening off.
      // ⚠️ Spread, never `cond && {...}`: a guard that fails leaves a `false`
      // in this array, and the table gives a false its own heading, cell and
      // col -- one blank column, sat to the left of Unit.
      ...(!openingOn
        ? [
            {
              key: 'category',
              header: 'Category',
              cellClass: 'w-32',
              render: (row: any) => (isGroupRow(row) ? '' : row.category),
            },
          ]
        : []),
      {
        key: 'unit',
        header: 'Unit',
        cellClass: 'w-24',
        render: (row: any) => (isGroupRow(row) ? '' : row.unit),
      },
      ...(openingOn ? serialQtyRateColumns : priceActionColumns),
    ];
  }, [settings, editedRows, openingDeleteRow, openingDeleteLoading, canDeleteVoucher, openingOn]);

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
      setRowsPerPage(0); // cleared box = All
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
    contentRef: printRef,
    documentTitle: 'Product Stock',
  });

  return (
    <div>
      <HelmetTitle title="Product List" />

      <div className="mb-2">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-nowrap lg:items-center">
          <div className="w-full ">
            <CategoryDropdown
              onChange={handleBrandChange}
              className="w-full text-sm !"
              categoryDdl={brandOptions}
            />
          </div>

          <div className="w-full ">
            {categoryData.isLoading ? (
              <Loader />
            ) : (
              <CategoryDropdown
                onChange={handleCategoryChange}
                className="w-full text-sm !"
                categoryDdl={optionsWithAll}
              />
            )}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full">
              <SelectOption
                className="w-full! h-9"
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
              <SearchInput className="w-full! " search={search} setSearchValue={setSearchValue} />
            </div>
            <ButtonLoading label="Search" icon={<FiSearch className="text-gray-500" />} onClick={handleSearchButton} className="w-full sm:w-auto" />
          </div>

          <div className="flex w-full items-center">
            <div className="mr-2">
              <PrintRowsInput
                id="perPage"
                name="perPage"
                label=""
                value={rowsPerPage.toString()}
                onChange={handlePerPageChange}
                type="text"
                className="font-medium text-sm w-12!"
              />
            </div>

            <div className="mr-2">
              <PrintFontInput
                id="fontSize"
                name="fontSize"
                label=""
                value={fontSize.toString()}
                onChange={handleFontSizeChange}
                type="text"
                className="font-medium text-sm w-12!"
              />
            </div>
            <PrintButton onClick={handlePrint} label="Print" className="ml-2" />

            {/* Beside Print, at Print's own size, rather than in a cell of
                its own beside a full-width filter group -- that cell was a
                sliver, and the button sat squeezed against the edge. */}
            <ButtonLoading
              onClick={() => navigate('/product/add-product')}
              label="New"
              className="ml-2 whitespace-nowrap pt-[0.45rem] pb-[0.45rem]"
              icon={<FiPlus className="h-5 w-5" />}
            />
          </div>
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

      {historyProduct && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-20">
          <div className="bg-white dark:bg-gray-800 rounded-sm w-[900px] max-h-[85vh] overflow-hidden shadow-xl border border-[rgb(var(--c-border))]">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-300 dark:bg-gray-700 border-b border-[rgb(var(--c-border))]">
              <h2 className="text-xs font-semibold uppercase text-gray-800 dark:text-gray-200">
                Change Log — {historyProduct?.name}
              </h2>

              <Button
                onClick={() => setHistoryProduct(null)}
                className="text-gray-600 dark:text-gray-300 hover:text-red-500"
              >
                <FiX className="text-lg cursor-pointer" />
              </Button>
            </div>

            <div className="overflow-auto max-h-[75vh]">
              <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
                <thead className="text-xs uppercase bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-b border-[rgb(var(--c-border))]">
                  <tr>
                    <th className="px-3 py-2 w-44">When</th>
                    <th className="px-3 py-2 w-40">Who</th>
                    <th className="px-3 py-2 w-24">Action</th>
                    <th className="px-3 py-2">What changed</th>
                  </tr>
                </thead>

                <tbody className="bg-[rgb(var(--c-table-body))] divide-y divide-gray-200 dark:divide-gray-700">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400">
                        Loading…
                      </td>
                    </tr>
                  ) : historyEvents.length > 0 ? (
                    historyEvents.map((event: any) => (
                      <tr key={event.id} className="align-top">
                        <td className="px-3 py-2 whitespace-nowrap">{historyStamp(event.at)}</td>
                        <td className="px-3 py-2">{event.user || '—'}</td>
                        <td className="px-3 py-2 capitalize">{event.action}</td>
                        <td className="px-3 py-2">
                          {Array.isArray(event.changes) && event.changes.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {event.changes.map((change: any, index: number) => (
                                <div key={index} className="flex flex-wrap items-baseline gap-2">
                                  <span className="font-semibold">{change.field}:</span>
                                  {/* A create has nothing before it, so it prints
                                      the value alone rather than an arrow out of
                                      an empty dash. */}
                                  {event.action === 'update' ? (
                                    <>
                                      <span className="line-through opacity-70">
                                        {historyValue(change.old)}
                                      </span>
                                      <span>→</span>
                                      <span className="font-semibold">{historyValue(change.new)}</span>
                                    </>
                                  ) : (
                                    <span>{historyValue(change.new ?? change.old)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400">
                        Nothing recorded for this product yet. Changes made before the log was
                        switched on are not in it.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Naming the voucher and the quantity, not just "are you sure": this
          takes stock back out of the ledger, and this is the last place to
          check it is the right product. */}
      {openingDeleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-xl">
            <div className="flex items-center gap-3 border-b border-[rgb(var(--c-border))] px-5 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-red-500/10 text-red-500">
                <FiTrash2 />
              </span>
              <h3 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Delete Opening Stock</h3>
            </div>

            <div className="px-5 py-4 text-sm text-slate-600 dark:text-[rgb(var(--c-text-muted))]">
              Delete the opening stock of
              <span className="font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]"> {openingDeleteRow.name}</span>?
              <div className="mt-2">
                Quantity{' '}
                <span className="font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  {openingDeleteRow.qty ?? openingDeleteRow.openingbalance ?? 0}
                </span>
                {' · '}Voucher{' '}
                <span className="font-mono font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  {openingDeleteRow.opening_vr_no}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                The voucher goes to the trash, not away for good. The product is
                not deleted. Stock already sold on cannot be removed this way.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-[rgb(var(--c-border))] px-5 py-3">
              <Button
                type="button"
                onClick={() => setOpeningDeleteRow(null)}
                className="border border-[rgb(var(--c-border))] px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-[rgb(var(--c-text-muted))] dark:hover:bg-meta-4"
              >
                Cancel
              </Button>
              <ButtonLoading
                type="button"
                onClick={handleOpeningDeleteConfirm}
                buttonLoading={openingDeleteLoading}
                disabled={openingDeleteLoading}
                label="Delete"
                icon={<FiTrash2 className="mr-2" />}
                variant="danger"
                className="px-6"
              />
            </div>
          </div>
        </div>
      )}

      {deleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-xl">
            <div className="flex items-center gap-3 border-b border-[rgb(var(--c-border))] px-5 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-red-500/10 text-red-500">
                <FiTrash2 />
              </span>
              <h3 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Delete Product</h3>
            </div>

            <div className="px-5 py-4 text-sm text-slate-600 dark:text-[rgb(var(--c-text-muted))]">
              Are you sure you want to delete
              <span className="font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]"> {deleteRow.name}</span>?
              <p className="mt-1 text-xs text-slate-400">
                This cannot be undone. A product already used in a transaction
                will not be deleted.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-[rgb(var(--c-border))] px-5 py-3">
              <Button
                type="button"
                onClick={() => setDeleteRow(null)}
                className="border border-[rgb(var(--c-border))] px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-[rgb(var(--c-text-muted))] dark:hover:bg-meta-4"
              >
                Cancel
              </Button>
              <ButtonLoading
                type="button"
                onClick={handleDeleteConfirm}
                buttonLoading={deleteLoading}
                disabled={deleteLoading}
                label="Delete"
                icon={<FiTrash2 className="mr-2" />}
                variant="danger"
                className="px-6"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Product;
