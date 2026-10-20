import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { deleteProduct, deleteProductOpening, deleteProductWithPurchase, getProduct, saveProductInlineFields, updateProductQtyRate } from './productSlice';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { Button, ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { FiCheckSquare, FiClock, FiEdit2, FiPlus, FiTrash, FiTrash2, FiX } from 'react-icons/fi';
import httpService from '../../services/httpService';
import { API_PRODUCT_HISTORY_URL } from '../../services/apiRoutes';
import SearchInput from '../../utils/fields/SearchInput';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import InputElement from '../../utils/fields/InputElement';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../utils/fields/PrintRowsInput';
import { toast } from 'react-toastify';
import CategoryDropdown from '../../utils/utils-functions/CategoryDropdown';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { hasPermission } from '../../utils/permissionChecker';
import { getCategoryDdl } from '../category/categorySlice';
import { fetchBrandDdl } from './brand/brandSlice';
import { getProductGroupDdl } from '../productgroup/productGroupSlice';
import ProductPrint from './ProductPrint';
import { useReactToPrint } from 'react-to-print';
import { FIELD_TEXTAREA } from '../../../theme/fieldStyles';
import { Textarea } from '../../utils/fields/FormControls';
import { isBranchSettingOn } from '../../utils/userFeatureSettings';

const isGroupRow = (row: any) => row?.__type === 'CAT_HEADER';

/* A quantity is not money. thousandSeparator rounds by the branch's
   decimal_places -- a branch set to 0 printed 12.5 kg as 13 -- so stock reads
   with its own three decimals (the column is decimal(14,3)), trailing zeros
   dropped, and zero still prints a dash like every other figure here. */
const formatQty = (value: any) => {
  const qty = Number(value ?? 0);
  if (!Number.isFinite(qty) || qty === 0) return '-';
  return qty.toLocaleString('en-IN', { maximumFractionDigits: 3 });
};

/** The word over a filter box, written as Stock Details writes it. */
const FILTER_LABEL = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200';

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
  const productGroupData = useSelector((state: any) => state.productGroup);

  // The Group filter appears only where the branch files products under groups
  // at all -- the same switch that puts the box on the product form and the
  // dropdown on Stock Details.
  const needProductGroup = isBranchSettingOn(settings, 'need_product_group');

  // Branch Setup -> Product Setup. Off, the list offers only the plain delete;
  // the delete-with-opening-invoice button is not there at all.
  const deleteWithOpeningInvoice = isBranchSettingOn(settings, 'delete_with_opening_invoice');

  // Branch Setup -> Product Setup -> "Editable Measurement on Product List?".
  // On, the four measurement/package columns are drawn, each box saving as it
  // is left. Off, the list draws none of them.
  const inlineEditOn = isBranchSettingOn(settings, 'product_list_inline_edit');

  // The two unit pickers read the same authorized unit list the Add / Edit
  // forms use -- no second endpoint, and never a unit the branch cannot reach.
  // Memoized so the columns below are not rebuilt on every render.
  const unitDdl = categoryData?.ddlData?.data?.unit;
  const unitSelectOptions = useMemo(
    () => [{ id: '', name: 'Not applicable' }, ...(Array.isArray(unitDdl) ? unitDdl : [])],
    [unitDdl],
  );

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // ⚠️ The page, the three filters AND the search ride the address bar, not a
  // useState. An edit unmounts this list and comes back to it, and local state
  // would start over -- the page dumped back to one, the filters forgotten, and
  // (the one the clerk notices) the search word gone, so a search for "demo"
  // came back showing the whole catalogue. Held here, all of it survives the
  // trip, the browser's Back button, a refresh, and the edit screen's return.
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const brandId = searchParams.get('brand') || null;
  const categoryId = searchParams.get('category') || null;
  const groupId = searchParams.get('group') || null;

  // The applied word -- what the API is actually searching with. Derived, so it
  // and the box cannot drift apart.
  const appliedSearch = searchParams.get('search') ?? '';

  const [search, setSearchValue] = useState(appliedSearch); // the box's own text
  const [searchRun, setSearchRun] = useState(0); // ✅ একই শব্দে আবার Enter চাপলেও একবার request যাবে

  /* ⚠️ Only when the APPLIED word changes does the box follow it -- a Reset, a
     Back button, or coming home from an edit. Following every searchParams
     change instead would rub out what is being typed the moment a filter beside
     the box is touched, which is exactly when the box must keep its own text. */
  const prevAppliedSearch = useRef(appliedSearch);
  useEffect(() => {
    if (prevAppliedSearch.current === appliedSearch) return;
    prevAppliedSearch.current = appliedSearch;
    setSearchValue(appliedSearch);
  }, [appliedSearch]);

  /* One writer for the whole query, so setting a filter cannot drop the page,
     the search or another filter -- and turning a page cannot drop any of them.
     '' means "not set". */
  const setQuery = (patch: Record<string, any>) => {
    const next: Record<string, string> = {
      brand: searchParams.get('brand') ?? '',
      category: searchParams.get('category') ?? '',
      group: searchParams.get('group') ?? '',
      search: searchParams.get('search') ?? '',
      page: searchParams.get('page') ?? '',
    };

    for (const [key, value] of Object.entries(patch)) {
      next[key] = value === null || value === undefined || value === '' ? '' : String(value);
    }

    setSearchParams(
      Object.fromEntries(Object.entries(next).filter(([, value]) => value)),
      { replace: true },
    );
  };

  const goToPage = (p: number) => setQuery({ page: p > 1 ? p : '' });

  const [perPage, setPerPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(0);

  const [tableData, setTableData] = useState<any[]>([]);
  const [editedRows, setEditedRows] = useState<Record<string, any>>({}); // ✅ product_id hash string

  // Drafts for the four list-editable measurement/package fields, keyed by
  // product_id. Kept apart from `editedRows`, which belongs to the opening
  // stock Save beside them -- a measurement edit must not light that button up.
  const [fieldEdits, setFieldEdits] = useState<Record<string, any>>({});

  const [ddlCategory, setDdlCategory] = useState<any[]>([]);

  const printRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);
  const [deleteRow, setDeleteRow] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [purchaseDeleteRow, setPurchaseDeleteRow] = useState<any>(null);
  const [purchaseDeleteLoading, setPurchaseDeleteLoading] = useState(false);
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

  // Separate from the init effect above: whether this branch has groups at all
  // is a setting that arrives with `settings`, not with the first render.
  useEffect(() => {
    if (needProductGroup) dispatch(getProductGroupDdl() as any);
  }, [dispatch, needProductGroup]);

  /* ================= FETCH ================= */
  useEffect(() => {
    dispatch(getProduct({ page, perPage, categoryId, brandId, groupId, search: appliedSearch }) as any);
  }, [page, perPage, categoryId, brandId, groupId, appliedSearch, searchRun]);

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
  /* Enter is the only way in. The box keeps its own text while the filters
     beside it change -- typing is not a query, the API searches the whole
     filtered set (per_page is not in play), so a half-typed word would be
     looked up on every keystroke. */
  const submitSearch = () => {
    setTableData([]);
    setTotalPages(0);
    // The applied word lives in the address bar, so Enter writes it there --
    // that is what carries it through an edit and back. Page one, because a new
    // search has its own first page. Emptying the box and pressing Enter is the
    // explicit clear; nothing else takes the word away.
    setQuery({ search: search.trim(), page: '' });
    // An Enter on the word already applied changes no state, so the fetch
    // effect above would stay quiet; this is what still asks it once.
    setSearchRun((n) => n + 1);
  };

  /* The one deliberate "show me everything": search, filters and page together,
     back to the branch's whole catalogue. Nothing else clears the search. */
  const handleReset = () => {
    setSearchValue('');
    setTableData([]);
    setTotalPages(0);
    setSearchParams({}, { replace: true });
    // Every param may already have been empty, in which case setSearchParams
    // changes no state; this still asks the API once.
    setSearchRun((n) => n + 1);
  };

  /* On the cell, not the box: SearchInput is shared, and this is how the
     report screens already read Enter -- see ClosingStockReport. The guard
     keeps Enter on the per-page dropdown beside it out of the search. */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return;
    e.preventDefault(); // Enter inside a form submits it -- this is a search
    submitSearch();
  };

  const handlePageChange = (p: number) => {
    goToPage(p);
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

  /* ================= INLINE MEASUREMENT / PACKAGE ================= */
  // The same two scales the Add / Edit forms and the API keep: a measurement
  // takes three decimals, a package size two, and ".67" goes out as "0.67".
  const MEASUREMENT_PATTERN = /^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/;
  const PACKAGE_SIZE_PATTERN = /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/;

  const withLeadingZero = (value: any) =>
    typeof value === 'string' && value.trim().startsWith('.') ? `0${value.trim()}` : value;

  // What a box shows: the draft while the row is being edited, else the row's
  // own value. `?? ''` so a null reads as an empty box, never as 0.
  const fieldValue = (row: any, field: string) => {
    const draft = fieldEdits[row.product_id];
    if (draft && field in draft) return draft[field];
    return row[field] ?? '';
  };

  const handleFieldEdit = (productId: string, field: string, value: any) => {
    setFieldEdits((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [field]: value },
    }));
  };

  // The four fields as one row's answer, the drafts laid over the row's values.
  const mergedFields = (row: any) => {
    const draft = fieldEdits[row.product_id] || {};
    return {
      measurement: draft.measurement ?? row.measurement ?? '',
      measurement_unit_id: draft.measurement_unit_id ?? row.measurement_unit_id ?? '',
      package_size: draft.package_size ?? row.package_size ?? '',
      package_unit_id: draft.package_unit_id ?? row.package_unit_id ?? '',
    };
  };

  // The rules the API refuses on, said here first so a bad figure never leaves
  // the screen. Each pair goes together and each value keeps its own scale --
  // the same sentences the Add / Edit forms use.
  const inlineFieldError = (fields: any): string | null => {
    const decimal = (value: any, label: string, pattern: RegExp, word: string) => {
      const text = String(value ?? '').trim();
      if (text === '') return null;
      return pattern.test(text) ? null : `${label} must be a number with at most ${word} decimals.`;
    };

    const valueError =
      decimal(fields.measurement, 'Measurement', MEASUREMENT_PATTERN, 'three') ||
      decimal(fields.package_size, 'Package size', PACKAGE_SIZE_PATTERN, 'two');
    if (valueError) return valueError;

    const hasMeasurement = String(fields.measurement ?? '').trim() !== '';
    const hasMeasurementUnit = String(fields.measurement_unit_id ?? '').trim() !== '';
    if (hasMeasurement !== hasMeasurementUnit) {
      return 'Measurement and measurement unit must be given together.';
    }

    const hasPackageSize = String(fields.package_size ?? '').trim() !== '';
    const hasPackageUnit = String(fields.package_unit_id ?? '').trim() !== '';
    if (hasPackageSize !== hasPackageUnit) {
      return 'Package size and package type must be given together.';
    }

    return null;
  };

  // The save itself, on blur. A blur with nothing changed is not a save.
  const handleFieldBlur = async (row: any) => {
    if (isGroupRow(row)) return;

    const productId = row.product_id;
    if (!fieldEdits[productId]) return;

    const fields = mergedFields(row);

    const unchanged =
      String(fields.measurement ?? '') === String(row.measurement ?? '') &&
      String(fields.measurement_unit_id ?? '') === String(row.measurement_unit_id ?? '') &&
      String(fields.package_size ?? '') === String(row.package_size ?? '') &&
      String(fields.package_unit_id ?? '') === String(row.package_unit_id ?? '');
    if (unchanged) return;

    const issue = inlineFieldError(fields);
    if (issue) {
      toast.info(issue);
      return;
    }

    try {
      const result: any = await dispatch(
        saveProductInlineFields({
          product_id: productId,
          measurement: withLeadingZero(fields.measurement),
          measurement_unit_id: fields.measurement_unit_id,
          package_size: withLeadingZero(fields.package_size),
          package_unit_id: fields.package_unit_id,
        }) as any,
      );

      if (result?.success) {
        // The server's own reading wins: it has just turned '' into a stored
        // NULL, and the row reads as a blank box either way.
        const saved = result?.data?.data ?? {};
        const pick = (key: string, fallback: any) =>
          saved[key] === undefined ? fallback : saved[key];

        setTableData((prev) =>
          prev.map((item) => {
            if (isGroupRow(item) || item.product_id !== productId) return item;

            return {
              ...item,
              measurement: pick('measurement', fields.measurement),
              measurement_unit_id: pick('measurement_unit_id', fields.measurement_unit_id),
              package_size: pick('package_size', fields.package_size),
              package_unit_id: pick('package_unit_id', fields.package_unit_id),
            };
          }),
        );

        // The draft has been written; the row carries the answer now.
        setFieldEdits((prev) => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });

        toast.success(result?.message || 'Product updated successfully.');
      } else {
        toast.error(result?.message || 'Could not save the measurement.');
      }
    } catch (err: any) {
      // A refusal from this endpoint rides a 4xx; the interceptor has already
      // spoken for the ones that are its own (no permission, no network).
      if (!err?.toastReported) {
        toast.error(
          err?.response?.data?.message || err?.message || 'Could not save the measurement.',
        );
      }
    }
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
      }
    } catch (err: any) {
      console.error(err);

      // ⚠️ A refusal from this endpoint rides a 4xx, so it never reaches the
      // `else if` above -- axios throws, and the words went to the console and
      // nowhere else. The approved voucher is the one that bites: the row looks
      // saved, the figure snaps back on the next refetch, and the screen said
      // nothing. The interceptor has already spoken for the refusals that are
      // its own (no permission, expired session, no network); this stays quiet
      // for those and shows the rest.
      if (!err?.toastReported) {
        toast.error(
          err?.response?.data?.message || err?.message || 'Could not save the opening stock.'
        );
      }
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

    // The row being edited is on page five, and saving must put the clerk back
    // there. The list hands its own address (page and all) to the edit screen,
    // which returns to it -- see EditProduct's `backTo`.
    navigate(`/product/edit/${row.product_id}`, {
      state: { from: `${location.pathname}${location.search}` },
    });
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
            getProduct({ page, perPage, categoryId, brandId, groupId, search: appliedSearch }) as any,
          );
        } else {
          toast.error(res?.message || 'Product could not be deleted.');
        }
      }) as any,
    );
  };

  const handlePurchaseDeleteConfirm = () => {
    if (!purchaseDeleteRow?.product_id) return;

    setPurchaseDeleteLoading(true);
    dispatch(
      deleteProductWithPurchase(purchaseDeleteRow.product_id, (res: any) => {
        setPurchaseDeleteLoading(false);
        setPurchaseDeleteRow(null);

        if (res?.success) {
          toast.success(res?.message || 'Product deleted successfully.');
          dispatch(
            getProduct({ page, perPage, categoryId, brandId, groupId, search: appliedSearch }) as any,
          );
        } else {
          toast.error(res?.message || 'Product and its opening invoice could not be deleted.');
        }
      }) as any,
    );
  };

  /* ⚠️ A "change" to the value already chosen is not a change. These dropdowns
     fire onChange once on their own as the lists arrive, and with the page
     held in the address bar that spurious call stripped `?page=5` a second
     after the list opened -- the clerk's page 5 was gone before they could
     click anything. Compared as text, so '' and null are the same nothing. */
  const filterChanged = (next: any, current: any) =>
    String(next ?? '') !== String(current ?? '');

  const handleCategoryChange = (selectedOption: any) => {
    const next = selectedOption?.value ?? null;
    if (!filterChanged(next, categoryId)) return;
    setQuery({ category: next, page: '' });
  };

  const handleBrandChange = (selectedOption: any) => {
    const next = selectedOption?.value ?? null;
    if (!filterChanged(next, brandId)) return;
    setQuery({ brand: next, page: '' });
  };

  const handleGroupChange = (selectedOption: any) => {
    const next = selectedOption?.value ?? null;
    if (!filterChanged(next, groupId)) return;
    setQuery({ group: next, page: '' });
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
            {/* The deeper delete: the product AND the one old opening invoice
                that brought it in. The server refuses unless the owner's
                conditions all hold. */}
            {deleteWithOpeningInvoice && (
              <Button
                type="button"
                onClick={() => setPurchaseDeleteRow(row)}
                className="text-red-700 dark:text-red-400"
                title="Delete with opening invoice"
              >
                <FiTrash className="cursor-pointer" />
              </Button>
            )}
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
      // ⚠️ On EVERY branch, opening or not. It used to be drawn only where
      // opening was off -- "read as text, '0' is true" turned the switch into a
      // condition on the wrong side -- so the branches that actually file
      // products by category were the ones without the column. The band above
      // the rows groups by the same word; that is a heading, not a column, and
      // it was never the place somebody reads a product's category off.
      {
        key: 'category',
        header: 'Category',
        cellClass: 'w-32',
        render: (row: any) => (isGroupRow(row) ? '' : row.category),
      },
      {
        key: 'unit',
        header: 'Unit',
        cellClass: 'w-24',
        render: (row: any) => (isGroupRow(row) ? '' : row.unit),
      },
      // Branch Setup -> "Editable Measurement on Product List?". Drawn only
      // where the branch asked for them, each box saving as it is left. The
      // value is display-only information -- it never touches quantity, price
      // or stock.
      ...(inlineEditOn
        ? [
            {
              key: 'measurement',
              header: 'Measurement',
              cellClass: 'w-28',
              render: (row: any) => {
                if (isGroupRow(row)) return '';
                return (
                  <InputElement
                    type="text"
                    inputMode="decimal"
                    className="w-24"
                    placeholder="e.g. 0.667"
                    value={fieldValue(row, 'measurement')}
                    onChange={(e) => handleFieldEdit(row.product_id, 'measurement', e.target.value)}
                    onBlur={() => handleFieldBlur(row)}
                  />
                );
              },
            },
            {
              key: 'measurement_unit_id',
              header: 'Measurement Unit',
              cellClass: 'w-40',
              render: (row: any) => {
                if (isGroupRow(row)) return '';
                return (
                  <DropdownCommon
                    name={`measurement_unit_${row.product_id}`}
                    className="w-32"
                    data={unitSelectOptions}
                    value={String(fieldValue(row, 'measurement_unit_id') ?? '')}
                    onChange={(e) =>
                      handleFieldEdit(row.product_id, 'measurement_unit_id', e.target.value)
                    }
                    onBlur={() => handleFieldBlur(row)}
                  />
                );
              },
            },
            {
              key: 'package_size',
              header: 'Package Size',
              cellClass: 'w-28',
              render: (row: any) => {
                if (isGroupRow(row)) return '';
                return (
                  <InputElement
                    type="text"
                    inputMode="decimal"
                    className="w-24"
                    placeholder="e.g. 10"
                    value={fieldValue(row, 'package_size')}
                    onChange={(e) => handleFieldEdit(row.product_id, 'package_size', e.target.value)}
                    onBlur={() => handleFieldBlur(row)}
                  />
                );
              },
            },
            {
              key: 'package_unit_id',
              header: 'Package Type',
              cellClass: 'w-40',
              render: (row: any) => {
                if (isGroupRow(row)) return '';
                return (
                  <DropdownCommon
                    name={`package_unit_${row.product_id}`}
                    className="w-32"
                    data={unitSelectOptions}
                    value={String(fieldValue(row, 'package_unit_id') ?? '')}
                    onChange={(e) =>
                      handleFieldEdit(row.product_id, 'package_unit_id', e.target.value)
                    }
                    onBlur={() => handleFieldBlur(row)}
                  />
                );
              },
            },
          ]
        : []),
      // ⚠️ Where the branch edits the measurement from this list, those four
      // columns ARE the row and everything after them stands down: the stock
      // figure, the two prices, and the row's own Change log / Edit / Delete
      // buttons. A branch that leaves the switch off gets the table it has
      // always had, word for word.
      ...(inlineEditOn
        ? []
        : [
            // What this branch holds right now — bought, opened and sold netted
            // out by the API. Not the opening column below: that one is the
            // quantity the opening voucher was raised with, and it never moves
            // again.
            {
              key: 'current_stock',
              header: 'Stock Qty',
              headerClass: 'text-right',
              cellClass: 'text-right w-24',
              // A negative figure means more went out than came in; it is a
              // fault, so it reads red and bold instead of sitting quietly among
              // the rest.
              render: (row: any) => {
                if (isGroupRow(row)) return '';
                const qty = Number(row.current_stock ?? 0);
                return (
                  <span className={qty < 0 ? 'font-bold text-red-600 dark:text-red-400' : undefined}>
                    {formatQty(qty)}
                  </span>
                );
              },
            },
            ...(openingOn ? serialQtyRateColumns : priceActionColumns),
          ]),
    ];
    // ⚠️ `location` belongs here. The Action column closes over
    // handleProductEdit, which reads the list's own address -- and this memo
    // does not rebuild when the page changes, so without it the pencil kept
    // handing over the address from page one and the edit came back to page
    // one. Cost me a walk-through to see it.
  }, [settings, editedRows, fieldEdits, unitSelectOptions, inlineEditOn, openingDeleteRow, openingDeleteLoading, canDeleteVoucher, openingOn, location]);

  /* ================= RENDER ================= */
  const optionsWithAll = [
    { id: '', name: 'All Categories' },
    ...(Array.isArray(ddlCategory) ? ddlCategory : []),
  ];

  const brandOptions = [
    { id: '', name: 'All Brand' },
    ...(brand?.brandDdl?.data || []),
  ];

  // "All Groups" first, so the list opens unfiltered -- and the empty option
  // asks the API for no group at all (`group_id` reaches it as 0).
  const groupOptions = [
    { id: '', name: 'All Groups' },
    ...(Array.isArray(productGroupData?.ddlData?.data) ? productGroupData.ddlData.data : []),
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
        {/* ⚠️ Three named boxes, arranged as Stock Details arranges them: a word
            over each dropdown, and the row closing on the boxes' bottom edge.
            Two of these filters were here unnamed and read as one long strip of
            dropdowns; the same word over each is what says which is which. */}
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-nowrap lg:items-end">
          <div className="w-full lg:flex-1">
            <label className={FILTER_LABEL}>Brand</label>
            <CategoryDropdown
              onChange={handleBrandChange}
              className="w-full text-sm !"
              categoryDdl={brandOptions}
              value={brandId ?? ''}
            />
          </div>

          <div className="w-full lg:flex-1">
            <label className={FILTER_LABEL}>Category</label>
            {categoryData.isLoading ? (
              <Loader />
            ) : (
              <CategoryDropdown
                onChange={handleCategoryChange}
                className="w-full text-sm !"
                categoryDdl={optionsWithAll}
                value={categoryId ?? ''}
              />
            )}
          </div>

          {needProductGroup ? (
            <div className="w-full lg:flex-1">
              <label className={FILTER_LABEL}>Group</label>
              <CategoryDropdown
                onChange={handleGroupChange}
                className="w-full text-sm !"
                categoryDdl={groupOptions}
                value={groupId ?? ''}
              />
            </div>
          ) : null}

          {/* ⚠️ Enter replaced the Search button, so the cell is two boxes and
              the search takes every pixel the button used to hold. On lg the
              filters keep one share each and this cell two -- the search box is
              the only one here that wants the room, and at one share it came
              out narrower than the button's old `sm:w-64` box. */}
          <div
            className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:flex-2"
            onKeyDown={handleSearchKeyDown}
          >
            <div className="w-full shrink-0 sm:w-24">
              <SelectOption
                className="w-full! h-9"
                onChange={(e: any) => {
                  const v = Number(e.target.value); // ✅ string -> number
                  const next = Number.isFinite(v) ? v : 10;
                  if (next === perPage) return; // its own on-mount call, see filterChanged
                  setPerPage(next);
                  goToPage(1);
                }}
              />
            </div>
            <div className="w-full min-w-0 flex-1">
              <SearchInput className="w-full! " search={search} setSearchValue={setSearchValue} />
            </div>
          </div>

          {/* ⚠️ lg:w-auto + flex-none, not the w-full it wears on smaller
              screens. As a row-mate of the filters, `w-full` is a flex-basis of
              100% -- it claimed the whole row and squeezed the filters to their
              min-content (the search box down to 26px). Sized to its buttons,
              it leaves the rest of the row to them. */}
          <div className="flex w-full items-center lg:w-auto lg:flex-none">
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
            {/* The explicit clear. Without it the only way back to the whole
                catalogue was to empty the box and press Enter -- and, worse,
                nothing said so. Beside Print, at the filters' own height. */}
            <Button
              type="button"
              title="Clear search, filters and page"
              onClick={handleReset}
              className="ml-2 whitespace-nowrap border border-[rgb(var(--c-border))] px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-[rgb(var(--c-text-muted))] dark:hover:bg-meta-4"
            >
              Reset
            </Button>
            <PrintButton onClick={handlePrint} label="Print" className="ml-2" />

            {/* Beside Print, at Print's own size, rather than in a cell of
                its own beside a full-width filter group -- that cell was a
                sliver, and the button sat squeezed against the edge. */}
            <ButtonLoading
              onClick={() =>
                navigate('/product/add-product', {
                  // Hand over this list's address, page five included, so Save
                  // comes back here and not to page one.
                  state: { from: `${location.pathname}${location.search}` },
                })
              }
              label="New"
              className="ml-2 whitespace-nowrap pt-[0.45rem] pb-[0.45rem]"
              icon={<FiPlus className="h-5 w-5" />}
            />
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {product.isLoading && <Loader />}

        {/* ⚠️ An empty table has to say which empty it is. A load that failed
            carries its reason in `product.errors`; a request that succeeded
            with nothing to show is a real "no match" and says so. Same rows,
            two different things, so the message is picked by that. */}
        <Table
          columns={columns}
          data={tableData}
          noDataMessage={product.errors ? product.errors : 'No products found.'}
        />
        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} handlePageChange={handlePageChange} />
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

      {purchaseDeleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-xl">
            <div className="flex items-center gap-3 border-b border-[rgb(var(--c-border))] px-5 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-red-500/10 text-red-500">
                <FiTrash />
              </span>
              <h3 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Delete Product with Opening Invoice</h3>
            </div>

            <div className="px-5 py-4 text-sm text-slate-600 dark:text-[rgb(var(--c-text-muted))]">
              Delete
              <span className="font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]"> {purchaseDeleteRow.name}</span>
              {' '}and the one old opening invoice that brought it in?
              <p className="mt-2 text-xs text-slate-400">
                Only where the product has never been sold, sits in at most one
                opening invoice with no other product on it, and that invoice is
                dated before 01/10/2026. The invoice's stock and ledger voucher go
                with it. This cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-[rgb(var(--c-border))] px-5 py-3">
              <Button
                type="button"
                onClick={() => setPurchaseDeleteRow(null)}
                className="border border-[rgb(var(--c-border))] px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-[rgb(var(--c-text-muted))] dark:hover:bg-meta-4"
              >
                Cancel
              </Button>
              <ButtonLoading
                type="button"
                onClick={handlePurchaseDeleteConfirm}
                buttonLoading={purchaseDeleteLoading}
                disabled={purchaseDeleteLoading}
                label="Delete"
                icon={<FiTrash className="mr-2" />}
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
