import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getOrders } from './ordersSlice';
import { useNavigate } from 'react-router-dom';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import ProductDropdown from '../../utils/utils-functions/ProductDropdown';
import SearchInput from '../../utils/fields/SearchInput';
import { Button, ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import Pagination from '../../utils/utils-functions/Pagination';
import Link from '../../utils/others/Link';
import { FiCheckSquare, FiEye, FiFilter, FiPrinter, FiRefreshCw, FiX } from 'react-icons/fi';
import OrderTypes from '../../utils/utils-functions/OrderTypes';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import OrdersPrint from './OrdersPrint';
import OrderTransactionPrint from './OrderTransactionPrint';
import { useReactToPrint } from 'react-to-print';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../utils/fields/PrintRowsInput';
import InputDatePicker from '../../utils/fields/DatePicker';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import {
  API_ORDERS_LIST_URL,
  API_ORDERS_STATUS_URL,
  API_ORDERS_TRANSACTION_URL,
  API_PRINT_TEMPLATE_URL,
} from '../../services/apiRoutes';
import DocumentPrint from '../../utils/print-designer/DocumentPrint';
import type { DocumentData } from '../../utils/print-designer/DocumentPrint';
import {
  PrintTemplate,
  normalizeTemplate,
} from '../../utils/print-designer/printTemplate';
import httpService from '../../services/httpService';
import { toast } from 'react-toastify';
import { ORDER_STATUS } from '../../constant/constant/variables';
import { ORDER_LIST_SUCCESS } from '../../constant/constant/constant';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { render } from 'react-dom';
import { isUserFeatureEnabled } from '../../utils/userFeatureSettings';
import ActionButtons from '../../utils/fields/ActionButton';

const ORDERS_LIST_STATE_KEY = 'orders-list-state';

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumberOrDash = (value: any) => {
  const numericValue = toNumber(value);
  return numericValue === 0 ? '-' : thousandSeparator(numericValue);
};

const getPersistedOrdersListState = () => {
  try {
    const state = window.sessionStorage.getItem(ORDERS_LIST_STATE_KEY);
    return state ? JSON.parse(state) : {};
  } catch (error) {
    return {};
  }
};

const getOrderRemainingQuantity = (row: any) =>
  toNumber(row?.total_order) - toNumber(row?.trx_quantity);

// What an order is worth. The API sends the amount it computed from the order's
// own lines; older payloads carry no amount at all, and for those a single rate
// across the ordered quantity is the closest honest answer.
const getOrderAmount = (row: any) => {
  if (row?.total_amount !== undefined && row?.total_amount !== null && row?.total_amount !== '') {
    return toNumber(row.total_amount);
  }

  const items = Array.isArray(row?.items) ? row.items : [];
  if (items.length > 0) {
    return items.reduce((sum: number, item: any) => {
      const lineAmount = toNumber(item?.line_amount);
      return sum + (lineAmount !== 0 ? lineAmount : toNumber(item?.order_rate) * toNumber(item?.total_order));
    }, 0);
  }

  return toNumber(row?.order_rate) * toNumber(row?.total_order);
};

const getLinkedRemainingQuantity = (row: any) => {
  const totalOrder = row?.total_order;
  const linkedQuantity = row?.linked_quantity;

  if (
    totalOrder !== undefined &&
    totalOrder !== null &&
    totalOrder !== '' &&
    linkedQuantity !== undefined &&
    linkedQuantity !== null &&
    linkedQuantity !== ''
  ) {
    return toNumber(totalOrder) - toNumber(linkedQuantity);
  }

  return toNumber(row?.remaining_quantity);
};

const pickFirstNumber = (source: any, keys: string[]) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
};

const pickFirstValue = (sources: any[], keys: string[]) => {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;

    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
  }

  return undefined;
};

const formatDateValue = (date: Date | null) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const normalizeOrderPrintRow = (row: any, index: number, fallbackUnit?: string) => ({
  id: row?.id ?? row?.detail_id ?? row?.transaction_id ?? `trx-${index + 1}`,
  vr_no:
    pickFirstValue([row], ['vr_no', 'invoice_no', 'inv_no', 'invoice', 'voucher_no', 'challan_no']) ?? '-',
  date:
    pickFirstValue([row], ['date', 'invoice_date', 'inv_date', 'vr_date', 'delivery_date', 'trx_date']) ?? '-',
  vehicle_no:
    pickFirstValue([row], ['vehicle_no', 'truck_no', 'lorry_no', 'transport_no', 'car_no']) ?? '-',
  weight:
    pickFirstValue([row], ['weight', 'delivery_qty', 'qty', 'quantity', 'trx_quantity', 'order_qty', 'net_weight']) ?? 0,
  unit:
    pickFirstValue([row], ['unit', 'unit_name', 'weight_unit', 'qty_unit']) ?? fallbackUnit ?? '',
  rate:
    pickFirstValue([row], ['rate', 'order_rate', 'unit_rate', 'unit_price', 'price']) ?? 0,
  amount:
    pickFirstValue([row], ['amount', 'line_amount', 'total_amount', 'bill_amount']) ?? 0,
  receive:
    pickFirstValue([row], ['receive', 'received', 'received_amount', 'receive_amount', 'payment', 'payment_amount']) ?? 0,
  freight_charge:
    pickFirstValue([row], ['freight_charge', 'freight', 'freight_amount', 'transport_cost', 'carriage']) ?? 0,
  due_amount:
    pickFirstValue([row], ['due_amount', 'due', 'net_due', 'balance_amount']) ?? 0,
});

const toPrintNumber = (value: any) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const hasPrintableLineDetail = (row: any) =>
  toPrintNumber(row?.weight) !== 0 ||
  toPrintNumber(row?.rate) !== 0 ||
  toPrintNumber(row?.amount) !== 0 ||
  Boolean(String(row?.vehicle_no ?? '').trim().replace(/^-$/, ''));

const getOrderPrintRowKey = (row: any) =>
  [row?.vr_no, row?.date]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .join('|');

const mergeDuplicateOrderPrintRows = (rows: any[]) => {
  const lineRowsByInvoice = new Map<string, any>();

  rows.forEach((row) => {
    if (!hasPrintableLineDetail(row)) return;

    const key = getOrderPrintRowKey(row);
    if (!key || key === '-|-' || lineRowsByInvoice.has(key)) return;

    lineRowsByInvoice.set(key, row);
  });

  return rows.reduce((mergedRows: any[], row) => {
    const key = getOrderPrintRowKey(row);
    const lineRow = lineRowsByInvoice.get(key);

    if (!lineRow || lineRow === row || hasPrintableLineDetail(row)) {
      mergedRows.push(row);
      return mergedRows;
    }

    const paymentValue =
      toPrintNumber(row?.freight_charge) || toPrintNumber(row?.receive);

    if (
      paymentValue !== 0 &&
      toPrintNumber(lineRow?.freight_charge) === 0 &&
      toPrintNumber(lineRow?.receive) === 0
    ) {
      lineRow.receive = paymentValue;
    }

    if (
      toPrintNumber(lineRow?.due_amount) === 0 &&
      toPrintNumber(row?.due_amount) !== 0
    ) {
      lineRow.due_amount = row.due_amount;
    }

    return mergedRows;
  }, []);
};

const normalizeOrderPrintPayload = (baseOrder: any, payload: any) => {
  const root = payload?.data ?? payload ?? {};
  const orderForSource =
    root?.orderFor ??
    root?.order_for ??
    root?.party ??
    root?.customer ??
    root?.supplier ??
    null;
  const orderSource =
    root?.order ??
    root?.invoice ??
    root?.invoice_order ??
    root?.header ??
    root;

  const sources = [orderSource, orderForSource, root, baseOrder];
  const fallbackUnit =
    pickFirstValue(sources, ['unit', 'unit_name', 'qty_unit']) ?? '';

  const transactionSource =
    root?.transactions ??
    root?.transaction_rows ??
    root?.details ??
    root?.items ??
    root?.rows ??
    orderSource?.transactions ??
    orderSource?.details ??
    [];

  const normalizedTransactions = Array.isArray(transactionSource)
    ? transactionSource.map((row: any, index: number) =>
        normalizeOrderPrintRow(row, index, fallbackUnit),
      )
    : [];
  const transactionRows = mergeDuplicateOrderPrintRows(normalizedTransactions);

  return {
    ...baseOrder,
    ...orderSource,
    order_type: pickFirstValue(sources, ['order_type', 'type_id']) ?? baseOrder?.order_type,
    order_for:
      pickFirstValue(sources, ['order_for', 'party_name', 'supplier_name', 'customer_name', 'company_name', 'name']) ??
      baseOrder?.order_for,
    address:
      pickFirstValue(sources, ['address', 'party_address', 'supplier_address', 'customer_address']) ??
      baseOrder?.address,
    mobile:
      pickFirstValue(sources, ['mobile', 'phone', 'mobile_no', 'phone_no']) ??
      baseOrder?.mobile,
    duration:
      pickFirstValue(sources, ['duration', 'date_range', 'period']) ??
      baseOrder?.duration,
    delivery_location:
      pickFirstValue(sources, ['delivery_location', 'delivery_place', 'delivery_address', 'address']) ??
      baseOrder?.delivery_location,
    product_name:
      pickFirstValue(sources, ['product_name', 'item_name', 'product']) ??
      baseOrder?.product_name,
    total_order:
      pickFirstValue(sources, ['total_order', 'order_qty', 'quantity', 'qty']) ??
      baseOrder?.total_order,
    contract_order_qty:
      pickFirstValue(sources, ['contract_order_qty']) ??
      baseOrder?.contract_order_qty,
    trx_quantity:
      pickFirstValue(sources, ['trx_quantity', 'delivery_qty', 'delivered_qty']) ??
      baseOrder?.trx_quantity,
    order_rate:
      pickFirstValue(sources, ['order_rate', 'rate', 'unit_rate', 'unit_price', 'price']) ??
      baseOrder?.order_rate,
    order_amount:
      pickFirstValue(sources, ['order_amount', 'amount', 'total_amount', 'net_amount', 'bill_amount']) ??
      (toNumber(baseOrder?.total_order) * toNumber(baseOrder?.order_rate)),
    order_details_text:
      pickFirstValue(sources, ['order_details', 'details_text', 'order_summary']) ??
      undefined,
    order_number:
      pickFirstValue(sources, ['order_number', 'order_no', 'po_no']) ??
      baseOrder?.order_number,
    order_date:
      pickFirstValue(sources, ['order_date', 'date', 'invoice_date']) ??
      baseOrder?.order_date,
    last_delivery_date:
      pickFirstValue(sources, ['last_delivery_date', 'delivery_date', 'last_date']) ??
      baseOrder?.last_delivery_date,
    notes:
      pickFirstValue(sources, ['notes', 'note', 'remark', 'remarks']) ??
      baseOrder?.notes,
    unit: fallbackUnit || baseOrder?.unit || '',
    transaction_rows: transactionRows,
  };
};

/**
 * The order print payload, in the shape DocumentPrint reads.
 *
 * Two things are worked out here rather than left to the renderer, because both
 * need to see more than one row:
 *
 *   received -- the freight charge where there is one, otherwise the money
 *               taken. One column on the paper, two columns in the data, and
 *               the rule for choosing between them is the order's own.
 *   due      -- RUNNING. What is still owed after this delivery and every one
 *               above it, not what this one left unpaid. A renderer drawing one
 *               cell cannot see the rows before it, so it could not do this.
 *
 * `qty`, `price` and `amount` take the challan's line keys deliberately: the
 * renderer already separates thousands in those three and already totals them,
 * so the order's table gets both without the renderer learning anything new.
 */
const orderDocumentData = (order: any): DocumentData => {
  const rows: any[] = Array.isArray(order?.transaction_rows) ? order.transaction_rows : [];

  let runningDue = 0;

  const products = rows.map((row) => {
    const qty = toNumber(row?.weight);
    const price = toNumber(row?.rate);
    const amount = toNumber(row?.amount) || qty * price;
    const freight = toNumber(row?.freight_charge);
    const received = freight > 0 ? freight : toNumber(row?.receive);

    runningDue += amount - received;

    return {
      ...row,
      qty,
      price,
      amount,
      received,
      due: runningDue,
    };
  });

  return {
    basic: { ...order },
    products,
  };
};

const Orders = () => {
  const orders = useSelector((state) => state.orders);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');
  const persistedOrdersListState = useMemo(() => getPersistedOrdersListState(), []);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [resetButtonLoading, setResetButtonLoading] = useState(false);
  const [page, setPage] = useState(Number(persistedOrdersListState.page ?? 1));
  const [perPage, setPerPage] = useState(Number(persistedOrdersListState.perPage ?? 10));
  const [printRowsPerPage, setPrintRowsPerPage] = useState(Number(persistedOrdersListState.printRowsPerPage ?? 0));
  const [printFontSize, setPrintFontSize] = useState(Number(persistedOrdersListState.printFontSize ?? 10));
  // Bumped by Apply so the list is fetched again even when nothing in the
  // filters has changed. The screen remembers its filters between visits, so
  // coming back with a term already in the box and pressing Apply set the same
  // value on the same state -- React saw no change, the effect never ran, and
  // the button looked broken.
  const [reloadToken, setReloadToken] = useState(0);
  const [search, setSearchValue] = useState(persistedOrdersListState.search ?? '');
  const [searchFilter, setSearchFilter] = useState(persistedOrdersListState.searchFilter ?? '');
  const [startDate, setStartDate] = useState(persistedOrdersListState.startDate ?? '');
  const [endDate, setEndDate] = useState(persistedOrdersListState.endDate ?? '');
  const [selectedProductOption, setSelectedProductOption] = useState<any | null>(persistedOrdersListState.selectedProductOption ?? null);
  const [selectedLedger, setSelectedLedger] = useState<any | null>(persistedOrdersListState.selectedLedger ?? null);
  const [currentPage, setCurrentPage] = useState(Number(persistedOrdersListState.currentPage ?? persistedOrdersListState.page ?? 1));
  const [orderType, setOrderType] = useState(persistedOrdersListState.orderType ?? '');
  const [orderStatus, setOrderStatus] = useState(persistedOrdersListState.orderStatus ?? 1);
  const [selectedLinkedOrder, setSelectedLinkedOrder] = useState<any | null>(null);
  const [printRows, setPrintRows] = useState<any[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const transactionPrintRef = useRef<HTMLDivElement>(null);
  const listPrintTimeoutRef = useRef<number | null>(null);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState<any | null>(null);
  // The branch's designed layout for this paper, or null where it has none --
  // in which case the built-in sheet below prints, exactly as before.
  const [orderTemplate, setOrderTemplate] = useState<PrintTemplate | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<number | string | null>(null);

  const ordersData = orders?.data ?? {};
  const tableData = Array.isArray(ordersData?.data) ? ordersData.data : [];
  const totalPages = Number(ordersData?.last_page ?? 0);
  const totalRows = Number(ordersData?.total ?? 0);

  const getOrdersListStateSnapshot = () => ({
    page,
    perPage,
    printRowsPerPage,
    printFontSize,
    search,
    searchFilter,
    startDate,
    endDate,
    selectedProductOption,
    selectedLedger,
    currentPage,
    orderType,
    orderStatus,
  });

  const persistOrdersListState = () => {
    window.sessionStorage.setItem(ORDERS_LIST_STATE_KEY, JSON.stringify(getOrdersListStateSnapshot()));
  };

  useEffect(() => {
    persistOrdersListState();
  }, [page, perPage, printRowsPerPage, printFontSize, search, searchFilter, startDate, endDate, selectedProductOption, selectedLedger, currentPage, orderType, orderStatus]);

  useEffect(() => {
    dispatch(
      getOrders({
        page,
        perPage,
        search: searchFilter,
        orderType,
        orderFor: selectedLedger?.value ?? '',
        productId: selectedProductOption?.value ?? '',
        status: orderStatus,
        startDate,
        endDate,
      }),
    );
  }, [dispatch, page, perPage, searchFilter, orderType, selectedLedger?.value, selectedProductOption?.value, startDate, endDate, orderStatus, reloadToken]);

  useEffect(() => {
    if (!orders?.isLoading) {
      setResetButtonLoading(false);
    }
  }, [orders?.isLoading]);

  const handleSearchButton = () => {
    setCurrentPage(1);
    setPage(1);
    setSearchFilter(search);
    setFilterOpen(false);
    setReloadToken((token) => token + 1);
  };
  const clearPendingListPrint = () => {
    if (listPrintTimeoutRef.current !== null) {
      window.clearTimeout(listPrintTimeoutRef.current);
      listPrintTimeoutRef.current = null;
    }
  };
  const handleResetFilters = () => {
    setResetButtonLoading(true);
    clearPendingListPrint();
    setPrintRows([]);
    setSelectedPrintOrder(null);
    setSearchValue('');
    setSearchFilter('');
    setStartDate('');
    setEndDate('');
    setSelectedProductOption(null);
    setSelectedLedger(null);
    setOrderType('');
    setOrderStatus(1);
    setPage(1);
    setCurrentPage(1);
    setPerPage(10);
    setFilterOpen(false);
    dispatch(
      getOrders({
        page: 1,
        perPage: 10,
        search: '',
        orderType: '',
        orderFor: '',
        productId: '',
        startDate: '',
        endDate: '',
        status: 1,
      }),
    );
  };
  const handleSelectChange = (event: any) => {
    setPerPage(Number(event.target.value));
    setPage(1);
    setCurrentPage(1);
  };
  const handleStartDate = (date: Date | null) => {
    const formattedDate = formatDateValue(date);
    setStartDate(formattedDate);
  };
  const handleEndDate = (date: Date | null) => {
    const formattedDate = formatDateValue(date);
    setEndDate(formattedDate);
  };
  const handlePageChange = (nextPage: any) => {
    setPage(nextPage);
    setCurrentPage(nextPage);
  };

  const handleOrderChange = (e: any) => {
    setOrderType(e.target.value);
  };
  const handleOrderStatus = (e: any) => {
    setOrderStatus(e.target.value);
  };
  const handleLedgerSelect = (option: any) => {
    setSelectedLedger(
      option
        ? {
          value: option.value,
          label: option.label,
        }
        : null,
    );
    setCurrentPage(1);
    setPage(1);
  };
  const selectedProduct = (option: any) => {
    setSelectedProductOption(
      option
        ? {
          value: option.value,
          label: option.label,
        }
        : null,
    );
    setCurrentPage(1);
    setPage(1);
  };
  const handlePrintRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value, 10);
    setPrintRowsPerPage(Number.isFinite(value) && value > 0 ? value : 0); // cleared box = All
  };
  const handlePrintFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value, 10);
    setPrintFontSize(Number.isFinite(value) && value > 0 ? value : 10);
  };
  const openLinkedOrdersModal = (row: any) => {
    setSelectedLinkedOrder(row);
  };
  const closeLinkedOrdersModal = () => {
    setSelectedLinkedOrder(null);
  };

  useEffect(() => {
    setCurrentPage(Number(ordersData?.current_page ?? page));
  }, [ordersData?.current_page, page]);

  const derivedSummary = useMemo(() => {
    return (Array.isArray(tableData) ? tableData : []).reduce(
      (acc, row: any) => {
        acc.totalOrder += toNumber(row?.total_order);
        acc.totalTrxQuantity += toNumber(row?.trx_quantity);
        acc.orderRemainingQuantity += getOrderRemainingQuantity(row);
        acc.baseOrderQuantity += toNumber(
          row?.base_order_quantity ?? row?.reference_order?.total_order,
        );
        acc.linkedQuantity += toNumber(row?.linked_quantity);
        acc.remainingQuantity += getLinkedRemainingQuantity(row);

        // The three money columns, added down. Not split by order type: these
        // answer "what was ordered, what has moved, what is short", which is
        // the same question whichever way the goods were going.
        acc.totalAmount += getOrderAmount(row);
        acc.trxAmount += toNumber(row?.trx_amount);

        if (toNumber(row?.order_type) === 1) {
          acc.purchaseQuantity += toNumber(row?.total_order);
          acc.purchaseAmount += getOrderAmount(row);
        }
        if (toNumber(row?.order_type) === 2) {
          acc.salesQuantity += toNumber(row?.total_order);
          acc.salesAmount += getOrderAmount(row);
        }
        return acc;
      },
      {
        totalOrder: 0,
        totalTrxQuantity: 0,
        orderRemainingQuantity: 0,
        baseOrderQuantity: 0,
        linkedQuantity: 0,
        remainingQuantity: 0,
        purchaseQuantity: 0,
        salesQuantity: 0,
        purchaseAmount: 0,
        salesAmount: 0,
        totalAmount: 0,
        trxAmount: 0,
      },
    );
  }, [tableData]);

  const apiSummarySource = useMemo(() => {
    return (
      orders?.data?.summary ??
      orders?.data?.totals ??
      orders?.data?.meta?.summary ??
      orders?.data?.meta?.totals ??
      null
    );
  }, [orders?.data]);

  const summary = useMemo(() => {
    const totalOrder =
      pickFirstNumber(apiSummarySource, ['total_order', 'order_quantity', 'total_order_quantity']) ??
      derivedSummary.totalOrder;
    const totalTrxQuantity =
      pickFirstNumber(apiSummarySource, ['total_trx_quantity', 'trx_quantity_total', 'trx_quantity']) ??
      derivedSummary.totalTrxQuantity;

    return {
      totalOrder,
      totalTrxQuantity,
      orderRemainingQuantity: totalOrder - totalTrxQuantity,
      baseOrderQuantity:
        pickFirstNumber(apiSummarySource, ['base_order_quantity', 'reference_order_quantity']) ??
        derivedSummary.baseOrderQuantity,
      linkedQuantity:
        pickFirstNumber(apiSummarySource, ['linked_quantity', 'total_linked_quantity']) ??
        derivedSummary.linkedQuantity,
      remainingQuantity:
        pickFirstNumber(apiSummarySource, ['remaining_quantity', 'total_remaining_quantity']) ??
        derivedSummary.remainingQuantity,
      purchaseQuantity:
        pickFirstNumber(apiSummarySource, ['purchase_quantity', 'total_purchase_quantity']) ??
        derivedSummary.purchaseQuantity,
      salesQuantity:
        pickFirstNumber(apiSummarySource, ['sales_quantity', 'total_sales_quantity']) ??
        derivedSummary.salesQuantity,
      // ⚠️ The API's figures cover every row the filter matched; the derived
      // ones only the page on screen. So the fallback is a smaller number, not
      // a wrong shape -- worth knowing before reading a total that disagrees
      // with a printed one.
      totalAmount:
        pickFirstNumber(apiSummarySource, ['total_amount', 'total_order_amount']) ??
        derivedSummary.totalAmount,
      trxAmount:
        pickFirstNumber(apiSummarySource, ['trx_amount', 'total_trx_amount']) ??
        derivedSummary.trxAmount,
      purchaseAmount:
        pickFirstNumber(apiSummarySource, ['purchase_amount', 'total_purchase_amount']) ??
        derivedSummary.purchaseAmount,
      salesAmount:
        pickFirstNumber(apiSummarySource, ['sales_amount', 'total_sales_amount']) ??
        derivedSummary.salesAmount,
      purchaseTrxQuantity:
        pickFirstNumber(apiSummarySource, ['purchase_trx_quantity', 'total_purchase_trx_quantity']) ?? 0,
      salesTrxQuantity:
        pickFirstNumber(apiSummarySource, ['sales_trx_quantity', 'total_sales_trx_quantity']) ?? 0,
      purchaseSalesRemainingQuantity:
        pickFirstNumber(apiSummarySource, ['purchase_sales_remaining_quantity']) ??
        ((pickFirstNumber(apiSummarySource, ['purchase_quantity', 'total_purchase_quantity']) ??
          derivedSummary.purchaseQuantity) -
          (pickFirstNumber(apiSummarySource, ['sales_quantity', 'total_sales_quantity']) ??
            derivedSummary.salesQuantity)),
      fromApi: Boolean(apiSummarySource),
    };
  }, [apiSummarySource, derivedSummary]);

  const summaryItems = useMemo(() => {
    const items = [
      {
        key: 'trx-qty',
        label: 'Total Trx Qty',
        value: thousandSeparator(summary.totalTrxQuantity),
      },
    ];

    if (orderType === '1') {
      items.push(
        {
          key: 'po-trx-qty',
          label: 'PO Trx Qty',
          value: thousandSeparator(summary.purchaseTrxQuantity),
        },
        {
          key: 'po-qty',
          label: 'PO Qty',
          value: thousandSeparator(summary.purchaseQuantity),
        },
        {
          key: 'po-bal-qty',
          label: 'PO Bal. Qty',
          value: thousandSeparator(summary.purchaseQuantity - summary.purchaseTrxQuantity),
          highlight: true,
        },
      );
    } else if (orderType === '2') {
      items.push(
        {
          key: 'do-trx-qty',
          label: 'DO Trx Qty',
          value: thousandSeparator(summary.salesTrxQuantity),
        },
        {
          key: 'do-qty',
          label: 'DO Qty',
          value: thousandSeparator(summary.salesQuantity),
        },
        {
          key: 'do-bal-qty',
          label: 'DO Bal. Qty',
          value: thousandSeparator(summary.salesQuantity - summary.salesTrxQuantity),
          highlight: true,
        },
      );
    } else {
      items.push(
        {
          key: 'po-trx-qty',
          label: 'PO Trx Qty',
          value: thousandSeparator(summary.purchaseTrxQuantity),
        },
        {
          key: 'do-trx-qty',
          label: 'DO Trx Qty',
          value: thousandSeparator(summary.salesTrxQuantity),
        },
        {
          key: 'po-bal-qty',
          label: 'PO Trx. Bal. Qty',
          value: thousandSeparator(summary.purchaseQuantity - summary.purchaseTrxQuantity),
          highlight: true,
        },
       
        {
          key: 'do-bal-qty',
          label: 'DO Trx. Bal. Qty',
          value: thousandSeparator(summary.salesQuantity - summary.salesTrxQuantity),
          highlight: true,
        },
        {
          key: 'trx-def-qty',
          label: 'Trx. Def. Qty',
          value: thousandSeparator(((summary.purchaseQuantity - summary.purchaseTrxQuantity) - (summary.salesQuantity - summary.salesTrxQuantity))),
          highlight: true,
        },
        // {
        //   key: 'po-qty',
        //   label: 'PO Qty',
        //   value: thousandSeparator(summary.purchaseQuantity),
        // },
        // {
        //   key: 'do-qty',
        //   label: 'DO Qty',
        //   value: thousandSeparator(summary.salesQuantity),
        // },
        // {
        //   key: 'po-do-bal-qty',
        //   label: 'Order Bal. Qty',
        //   value: thousandSeparator(summary.purchaseQuantity - summary.salesQuantity),
        //   highlight: true,
        // },
      );
    }

    /**
     * The three money figures, on every view.
     *
     * ⚠️ Outside the branch above, because they are the totals of three columns
     * the list ALWAYS draws -- purchase, sales or both. Inside it they existed
     * only when no type was chosen, and picking Purchase swapped them for a
     * single "PO Amount": the same number as Order Amount, under a different
     * name, with what had moved and what was short gone from the screen
     * altogether. Somebody narrowing to one type is not asking to be told less
     * about it.
     *
     * The old PO Amount and DO Amount tiles are gone rather than kept beside
     * these. Under a type filter each was Order Amount exactly, and two tiles
     * carrying one figure under two names invite the reader to add them.
     *
     * Trx. Def. Amount is subtracted here, from the same two figures printed
     * above it, so the row adds up in front of whoever reads it.
     */
    items.push(
      {
        key: 'order-amt',
        label: 'Order Amount',
        value: thousandSeparator(summary.totalAmount),
      },
      {
        key: 'trx-amt',
        label: 'Trx. Amount',
        value: thousandSeparator(summary.trxAmount),
      },
      {
        key: 'trx-def-amt',
        label: 'Trx. Def. Amount',
        value: thousandSeparator(summary.totalAmount - summary.trxAmount),
        highlight: true,
      },
    );

    return items;
  }, [orderType, summary]);

  const footerRows = useMemo(
    () => [
      [
        {
          label: (
            /*
              One row, always. A narrow screen shrinks the cards -- tighter
              padding, smaller type -- rather than folding the last of them onto
              a second line, where a total reads as if it belonged to another
              set. Below the width even the small cards need, the row scrolls
              sideways: a figure clipped mid-digit would be worse than one the
              reader has to reach for.
            */
            <div className="flex flex-nowrap items-stretch justify-center gap-1 overflow-x-auto xl:gap-2">
              {summaryItems.map((item) => (
                <div
                  key={item.key}
                  className={`shrink-0 rounded border px-1.5 py-1 text-left shadow-sm sm:px-2 xl:min-w-[140px] xl:px-3 xl:py-2 ${
 item.highlight
 ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-400/70 dark:bg-amber-400/10 dark:text-amber-200'
 : 'border-[rgb(var(--c-border))] bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200'
 }`}
                >
                  <div className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide opacity-80 sm:text-[10px] xl:text-[11px]">
                    {item.label}
                  </div>
                  <div className="whitespace-nowrap text-[11px] font-bold leading-tight sm:text-xs lg:text-sm xl:text-base">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          ),
          colSpan: 7,
          className: 'text-center',
        },
      ],
    ],
    [summaryItems],
  );

  const orderTypeLabel = useMemo(() => {
    if (orderType === '1') return 'Purchase Order';
    if (orderType === '2') return 'Sales Order';
    return 'All';
  }, [orderType]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Order List',
    onAfterPrint: () => {
      clearPendingListPrint();
      setPrintRows([]);
    },
  });

  const handleTransactionPrint = useReactToPrint({
    contentRef: transactionPrintRef,
    documentTitle: selectedPrintOrder?.order_number
      ? `Order-${selectedPrintOrder.order_number}`
      : 'Order Details Print',
    onAfterPrint: () => setSelectedPrintOrder(null),
  });

  useEffect(() => {
    if (!selectedPrintOrder) {
      return;
    }

    const timer = window.setTimeout(() => {
      handleTransactionPrint();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [handleTransactionPrint, selectedPrintOrder]);

  const handleOrderTransactionPrint = async (order: any) => {
    try {
      setPrintingOrderId(order?.id ?? null);
      const response = await httpService.get(`${API_ORDERS_TRANSACTION_URL}/${order?.id}`);
      const payload =
        response?.data?.data?.data ??
        response?.data?.data ??
        null;

      if (!payload) {
        throw new Error('Order print payload not found');
      }

      setSelectedPrintOrder(normalizeOrderPrintPayload(order, payload));

      // The branch's own layout for this paper, if it has designed one.
      //
      // Fetched beside the order rather than bundled into its endpoint, which
      // is what the challan does -- one extra request at the moment somebody
      // asks to print, against a backend change to a payload three screens
      // read. It is allowed to fail: a branch with no layout, or a server a
      // patch behind, simply prints the sheet it always has.
      try {
        const layoutResponse = await httpService.get(`${API_PRINT_TEMPLATE_URL}/sales_order`, {
          params: { branch_id: order?.branch_id ?? settings?.data?.branch?.id },
        });
        const layout = layoutResponse?.data?.data?.data?.layout ?? null;

        setOrderTemplate(layout ? normalizeTemplate(layout, 'sales_order') : null);
      } catch {
        setOrderTemplate(null);
      }
    } catch (error) {
      console.error(error);
      toast.error('Order print data load ÃƒÂ Ã‚Â¦Ã¢â‚¬Â¢ÃƒÂ Ã‚Â¦Ã‚Â°ÃƒÂ Ã‚Â¦Ã‚Â¾ ÃƒÂ Ã‚Â¦Ã‚Â¯ÃƒÂ Ã‚Â¦Ã‚Â¾ÃƒÂ Ã‚Â§Ã…Â¸ÃƒÂ Ã‚Â¦Ã‚Â¨ÃƒÂ Ã‚Â¦Ã‚Â¿ÃƒÂ Ã‚Â¥Ã‚Â¤');
    } finally {
      setPrintingOrderId(null);
    }
  };

  const handleOrderEdit = (row: any) => {
    persistOrdersListState();
    navigate(`/orders/edit/${row.id}`, { state: { order: row, returnToOrdersList: true } });
  };

  const refreshOrders = () => {
    dispatch(
      getOrders({
        page,
        perPage,
        search: searchFilter,
        orderType,
        orderFor: selectedLedger?.value ?? '',
        productId: selectedProductOption?.value ?? '',
        status: orderStatus,
        startDate,
        endDate,
      }),
    );
  };

  const handleOrderToggle = async (row: any) => {


    const nextStatus = Number(row?.status) === 1 ? 2 : 1;
    const ordersData = orders?.data ?? {};
    const originalTableData = Array.isArray(ordersData?.data) ? [...ordersData.data] : [];

    // Optimistic update: immediately toggle only this row's status
    const updatedTableData = originalTableData.map((order: any) =>
      order.id === row.id ? { ...order, status: nextStatus } : order
    );

    dispatch({
      type: ORDER_LIST_SUCCESS,
      payload: {
        ...ordersData,
        data: updatedTableData,
      },
    });

    try {
      const response = await httpService.post(API_ORDERS_STATUS_URL, {
        id: row.id,
        status: nextStatus,
      });

      if (response.data?.success) {
        toast.success(nextStatus === 1 ? 'Order activated successfully.' : 'Order inactivated successfully.');
        // If status changed from current filter, remove after brief delay
        if (orderStatus !== nextStatus) {
          setTimeout(() => {
            const finalData = updatedTableData.filter((order: any) => order.id !== row.id);
            dispatch({
              type: ORDER_LIST_SUCCESS,
              payload: {
                ...ordersData,
                data: finalData,
              },
            });
          }, 300);
        }
        return;
      }

      toast.error(response.data?.message || response.data?.error?.message || 'Order status update failed.');
      // Revert on error
      dispatch({
        type: ORDER_LIST_SUCCESS,
        payload: {
          ...ordersData,
          data: originalTableData,
        },
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error?.message || 'Order status update failed.');
      // Revert on error
      dispatch({
        type: ORDER_LIST_SUCCESS,
        payload: {
          ...ordersData,
          data: originalTableData,
        },
      });
    }
  };

  const handleListPrint = async () => {
    try {
      setButtonLoading(true);
      clearPendingListPrint();

      const response = await httpService.get(
        `${API_ORDERS_LIST_URL}?page=1&per_page=${Math.max(totalRows, perPage, 1)}&search=${encodeURIComponent(searchFilter)}&order_type=${encodeURIComponent(orderType)}&order_for=${encodeURIComponent(selectedLedger?.value ?? '')}&product_id=${encodeURIComponent(selectedProductOption?.value ?? '')}&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
      );

      const payload =
        response?.data?.data?.data ??
        response?.data?.data ??
        [];

      setPrintRows(Array.isArray(payload) ? payload : []);
      listPrintTimeoutRef.current = window.setTimeout(() => {
        listPrintTimeoutRef.current = null;
        handlePrint();
      }, 0);
    } catch (error) {
      console.error(error);
      toast.error('Orders print data load.');
    } finally {
      setButtonLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      clearPendingListPrint();
    };
  }, []);

  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'order_for',
      header: 'Order for',
      render: (data: any) => (
        <>
        <span className='block'>{data.order_for}</span>
        { data.delivery_location && <span className='block'>{data.delivery_location}</span> }
        { data.notes && <span className='block text-green-500 dark:text-yellow-300 font-semibold'>{data.notes}</span> }
        </>
      ),
    },
    {
      key: 'product_name',
      header: (
        <p>
          <span className="block">Product</span>
          <span className="block">Trx. Qty</span>
        </p>
      ),
      render: (data: any) => {
        // A multi-product order lists its products one per line, so the quantity
        // column beside it lines up row for row. One product renders as before.
        const items = Array.isArray(data.items) ? data.items : [];

        return (
          <p>
            {items.length > 1 ? (
              items.map((item: any, index: number) => (
                <span key={item.id ?? index} className="block">
                  {item.product_name || '-'}
                </span>
              ))
            ) : (
              <span className="block">{data.product_name}</span>
            )}
            <span className="block text-green-500 dark:text-yellow-300 font-semibold">
              {formatNumberOrDash(data.trx_quantity)}
            </span>
          </p>
        );
      },
    },

    {
      key: 'order_number',
      header: (
        <p>
          <span className="block">Order No.</span>
          <span className="block">Order Rate</span>
          <span className="block">Order Date</span>
        </p>
      ),
      //   headerClass: 'text-right',
      //   cellClass: 'text-right',
      render: (data: any) => (
        <p>
          {(data.linked_order_count ?? data.linked_orders_count ?? 0) > 0 ? (
            <Button
              type="button"
              className="block text-left hover:underline font-semibold text-green-500 dark:text-yellow-300"
              onClick={() => openLinkedOrdersModal(data)}
            >
              <span className=''> {data.order_number}</span>
            </Button>
          ) : (
            <span className="block">{data.order_number}</span>
          )}
          <span className="block">
            {/* One rate across different products would be meaningless. */}
            {Number(data.product_count ?? 1) > 1
              ? `${data.product_count} products`
              : `Tk. ${formatNumberOrDash(data.order_rate)}`}
          </span>
          <span className="block">{data.order_date}</span>
        </p>
      ),
    },
    {
      key: 'order_amount',
      header: (
        <p className="text-right">
          <span className="block">Order Amount</span>
          <span className="block">Trx. Amount</span>
          <span className="block">Balance Amount</span>
        </p>
      ),
      headerClass: 'text-right',
      cellClass: 'text-right',
      /**
       * The same three lines as the quantity column beside it, in money.
       *
       * ⚠️ All three arrive computed. None is worked out here, and none should
       * be: a multi-product order has a rate per product, so an amount derived
       * on screen from the order's single rate would price one product at
       * another's rate -- and would do it silently, on the column somebody
       * reads to decide what is still owed on a contract.
       *
       * The balance is the server's own subtraction, so the three add up on
       * the page exactly as a reader takes the middle from the top.
       */
      render: (data: any) => {
        /**
         * The outstanding figure, signed by which way the goods are going.
         *
         * ⚠️ A purchase order's balance is money about to leave, so it is
         * written negative; a sales order's is money about to arrive and takes
         * no sign. The same 66,60,000 means opposite things on the two, and the
         * list shows both kinds one under the other -- without the sign a
         * reader running down the column adds a payable to a receivable.
         *
         * Only ever ADDED to a positive balance. A dash means nothing is
         * outstanding and must not become "-​-", and an over-delivered order is
         * already negative from the arithmetic -- signing it again would flip
         * its meaning back.
         */
        const balance = toNumber(data.balance_amount);
        const owed = formatNumberOrDash(balance);
        const isPurchase = Number(data.order_type) === 1;

        return (
          <p className="text-right">
            <span className="block">{formatNumberOrDash(data.total_amount)}</span>
            <span className="block">{formatNumberOrDash(data.trx_amount)}</span>
            <span className="block text-green-500 dark:text-yellow-300 font-semibold">
              {isPurchase && balance > 0 ? `-${owed}` : owed}
            </span>
          </p>
        );
      },
    },
    {
      key: 'order_rate',
      header: (
        <p className="text-right">
          <span className="block">Contract Qty</span>
          <span className="block">Order Qty</span>
          <span className="block">Remaining Qty</span>
        </p>
      ),
      render: (data: any) => {
        const items = Array.isArray(data.items) ? data.items : [];

        // Multi-product: one ordered quantity per line, matching the product
        // column beside it, then the order's remaining below.
        if (items.length > 1) {
          return (
            <p className="text-right">
              {items.map((item: any, index: number) => (
                <span key={item.id ?? index} className="block">
                  {formatNumberOrDash(item.total_order)}
                </span>
              ))}
              <span className="block text-green-500 dark:text-yellow-300 font-semibold">
                {formatNumberOrDash(Number(data.total_order) - Number(data.trx_quantity))}
              </span>
            </p>
          );
        }

        return (
          <p className="text-right">

            <span className="block">
              {data.contract_order_qty != null && data.contract_order_qty !== ''
                ? formatNumberOrDash(data.contract_order_qty)
                : '-'}
            </span>
            <span className="block">
              {formatNumberOrDash(data.total_order)}
            </span>
            <span className="block text-green-500 dark:text-yellow-300 font-semibold">
              {formatNumberOrDash((Number(data.total_order) - Number(data.trx_quantity)))}
            </span>
          </p>
        );
      },
    },
    {
      key: 'linked_summary',
      header: (
        <p className="text-right">
          <span className="block">Linked Orders</span>
          <span className="block">Linked Qty</span>
          <span className="block">Remaining Qty</span>
        </p>
      ),
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (data: any) => (
        <p className="text-right">
          <span className="block">
            {data.linked_order_count != null || data.linked_orders_count != null
              ? formatNumberOrDash(data.linked_order_count ?? data.linked_orders_count ?? 0)
              : '-'}
          </span>
          <span className="block">
            {data.linked_quantity != null
              ? formatNumberOrDash(data.linked_quantity)
              : '-'}
          </span>
          <span className="block">
            {formatNumberOrDash(Number(data.total_order) - Number(data.linked_quantity))}
          </span>
        </p>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      render: (data: any) => (
        <div className="flex justify-center items-center">
          <Button
            type="button"
            onClick={() => void handleOrderTransactionPrint(data)}
            className="text-blue-500 mr-2"
            title="Open print page"
            disabled={printingOrderId === data?.id}
          >
            <FiPrinter className="cursor-pointer h-5 w-5" />
          </Button>
          <ActionButtons
            row={data}
            showEdit={true}
            handleEdit={handleOrderEdit}
            showDelete={false}
            showToggle={true}
            handleToggle={() => handleOrderToggle(data)}
          />
        </div>
      ),
    },
  ];


  return (
    <div>
      <HelmetTitle title={'Order List'} />
      <div className="mb-2">
        <div className={`gap-3 ${useFilterMenuEnabled ? 'flex flex-wrap items-end gap-2' : 'flex flex-col'}`}>
          <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'min-w-[320px] flex-1'}>
            {useFilterMenuEnabled && (
              <Button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className={`inline-flex w-10 items-center justify-center rounded border text-sm transition ${
 filterOpen
 ?'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300':'border-[rgb(var(--c-border))] bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`}
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
                    ? 'absolute left-0 top-full z-1000 mt-2 w-[min(92vw,360px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800'
                    : 'w-full'
                }
              >
                <div
                  className={
                    useFilterMenuEnabled
                      ? 'space-y-3'
                      : 'grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-6'
                  }
                >
                  {useFilterMenuEnabled && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Show Rows
                      </label>
                      <SelectOption onChange={handleSelectChange} className="h-9 w-full" />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Order Type
                    </label>
                    <OrderTypes
                      onChange={handleOrderChange}
                      value={orderType}
                      className="h-9 w-full"
                    />
                  </div>
                  <div>
                    {/* <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Order Status
                    </label> */}
                    {/* <OrderTypes onChange={handleOrderChange} className="h-9 w-full" /> */}
                    <DropdownCommon
 id="status"
 name={'status'}
 label="Order Status"
 onChange={handleOrderStatus}
 className="bg-transparent"
 value={orderStatus}
 data={ORDER_STATUS}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Account
                    </label>
                    <DdlMultiline
 onSelect={handleLedgerSelect}
 acType={''}
 value={selectedLedger}
 className=""
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Product
                    </label>
                    <ProductDropdown
 onSelect={selectedProduct}
 className="appearance-none "
 value={selectedProductOption}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Order Start Date
                    </label>
                    <InputDatePicker
 id="order_start_date"
 name="order_start_date"
 setCurrentDate={handleStartDate}
 placeholder="Order Start Date"
 className="font-medium text-sm w-full "
 selectedDate={startDate ? new Date(startDate) : null}
 setSelectedDate={(date) => setStartDate(formatDateValue(date))}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Order End Date
                    </label>
                    <InputDatePicker
 id="order_end_date"
 name="order_end_date"
 setCurrentDate={handleEndDate}
 placeholder="Order End Date"
 className="font-medium text-sm w-full "
 selectedDate={endDate ? new Date(endDate) : null}
 setSelectedDate={(date) => setEndDate(formatDateValue(date))}
                    />
                  </div>

                  <div className={useFilterMenuEnabled ? '' : 'xl:hidden'}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Search
                    </label>
                    <SearchInput
 search={search}
 setSearchValue={setSearchValue}
 className="w-full"
                    />
                  </div>

                  <div
                    className={`flex gap-2 pt-1 ${
                      useFilterMenuEnabled ? 'justify-end' : 'hidden'
                    }`}
                  >
                    <ButtonLoading
                      onClick={handleSearchButton}
                      buttonLoading={false}
                      label="Apply"
                      className="whitespace-nowrap"
                       icon={<FiCheckSquare />}
                    />
                    <ButtonLoading
                      onClick={handleResetFilters}
                      buttonLoading={resetButtonLoading}
                      label="Reset"
                      className="whitespace-nowrap"
                      icon={<FiRefreshCw />}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`${useFilterMenuEnabled ? 'hidden min-w-[180px] flex-1 text-sm dark:text-[rgb(var(--c-text))] text-slate-900 md:block dark:text-slate-300f' : 'hidden'}`}>
            {searchFilter || orderType || selectedLedger?.value || selectedProductOption?.value || startDate || endDate
              ? 'Filters applied' : 'Use the filter'}
          </div>

          <div className={useFilterMenuEnabled ? 'hidden' : 'flex flex-wrap items-end justify-between gap-3'}>
            <div className="flex flex-wrap items-end gap-2">
              <div className="hidden xl:block xl:min-w-[300px]">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Search
                </label>
                <SearchInput
 search={search}
 setSearchValue={setSearchValue}
 className="w-full"
                />
              </div>
              <ButtonLoading
                onClick={handleSearchButton}
                buttonLoading={false}
                label="Apply"
                className="whitespace-nowrap"
                 icon={<FiCheckSquare />}
                 />
              
              <ButtonLoading
                onClick={handleResetFilters}
                buttonLoading={resetButtonLoading}
                label="Reset"
                className="whitespace-nowrap"
                icon={<FiRefreshCw />}
              />

            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="shrink-0">
                <SelectOption onChange={handleSelectChange} value={String(perPage)} className="h-9 w-24!" />
              </div>
              <div className="shrink-0">
                <PrintRowsInput
 id="printRowsPerPage"
 name="printRowsPerPage"
 label=""
 value={String(printRowsPerPage)}
 onChange={handlePrintRowsChange}
 type="text"
 className="w-20! px-1 text-center"
                />
              </div>
              <div className="shrink-0">
                <PrintFontInput
 id="printFontSize"
 name="printFontSize"
 label=""
 value={String(printFontSize)}
 onChange={handlePrintFontSizeChange}
 type="text"
 className="w-20! px-1 text-center"
                />
              </div>
              <PrintButton
                onClick={() => void handleListPrint()}
                label="Print"
                className="shrink-0 whitespace-nowrap pt-[0.45rem] pb-[0.45rem]"
              />
              <div className="shrink-0">
                <Link to="/orders/add-order" className="text-nowrap self-start xl:self-auto h-9">
                  New Order
                </Link>
              </div>
            </div>
          </div>

          {useFilterMenuEnabled && (
            <>
              <div className="flex shrink-0 items-end gap-2">
                <div className="shrink-0">
                  <SelectOption onChange={handleSelectChange} value={String(perPage)} className="h-9 w-24!" />
                </div>
                <div className="shrink-0">
                  <PrintRowsInput
 id="printRowsPerPage"
 name="printRowsPerPage"
 label=""
 value={String(printRowsPerPage)}
 onChange={handlePrintRowsChange}
 type="text"
 className="w-20! px-1 text-center"
                  />
                </div>
                <div className="shrink-0">
                  <PrintFontInput
 id="printFontSize"
 name="printFontSize"
 label=""
 value={String(printFontSize)}
 onChange={handlePrintFontSizeChange}
 type="text"
 className="w-20! px-1 text-center"
                  />
                </div>
                <PrintButton
                  onClick={() => void handleListPrint()}
                  label="Print"
                  className="shrink-0 whitespace-nowrap pt-[0.45rem] pb-[0.45rem]"
                />
              </div>
              <div className="ml-auto shrink-0">
                <Link to="/orders/add-order" className="text-nowrap self-start xl:self-auto h-9">
                  New Order
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {orders.isLoading == true ? <Loader /> : ''}
        <Table columns={columns} data={tableData} className="" footerRows={footerRows} />

        {/* Pagination Controls */}
        {totalPages > 1 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        ) : (
          ''
        )}
      </div>

      <div className="hidden">
        <OrdersPrint
          ref={printRef}
          rows={printRows.length > 0 ? printRows : tableData}
          title="Order List"
          searchText={searchFilter}
          orderTypeLabel={orderTypeLabel}
          startDate={startDate}
          endDate={endDate}
          summary={summary}
          rowsPerPage={Number(printRowsPerPage)}
          fontSize={Number(printFontSize)}
        />

        {/*
          The designed sheet where the branch has one, the built-in sheet where
          it does not.

          Deliberately not "the designer's default for everybody". The component
          below carries rules the default template reproduces but cannot be
          proven identical to at a glance -- a running due, a freight charge
          standing in for money received -- and switching every branch's
          customer-facing paper on the day this shipped is not a change anyone
          asked for. A branch opting in by designing one is.

          The old component keeps the print settings it has always had. The
          designed sheet takes its own from the template, which is where those
          settings live once a paper is described rather than coded.
        */}
        {orderTemplate && selectedPrintOrder ? (
          <div className="hidden">
            <DocumentPrint
              ref={transactionPrintRef}
              template={orderTemplate}
              data={orderDocumentData(selectedPrintOrder)}
            />
          </div>
        ) : (
          <OrderTransactionPrint
            ref={transactionPrintRef}
            order={selectedPrintOrder}
            title={
              selectedPrintOrder
                ? `${selectedPrintOrder.order_type === 2 ? 'Sales' : 'Purchase'} Details`
                : 'Order Details'
            }
            rowsPerPage={Number(printRowsPerPage)}
            fontSize={Number(printFontSize)}
          />
        )}
      </div>

      {selectedLinkedOrder && (
        <div
          className="fixed inset-0 z-1000 flex items-center justify-center bg-black/50 px-3"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeLinkedOrdersModal();
            }
          }}
        >
          <div className="w-full max-w-3xl border border-[rgb(var(--c-border))] bg-slate-50 shadow-2xl ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
            <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] bg-white px-4 py-3 dark:bg-slate-700">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
                  Linked Orders
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Order No: {selectedLinkedOrder.order_number}
                </p>
              </div>
              <Button
                type="button"
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 dark:text-gray-300 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:focus:ring-red-500/30"
                aria-label="Close linked orders modal"
                onClick={closeLinkedOrdersModal}
              >
                <FiX size={18} />
              </Button>
            </div>

            <div className="bg-slate-50 p-4 dark:bg-slate-800">
              <div className="mb-3 text-sm text-gray-700 dark:text-gray-300">
                Total Linked Orders:{' '}
                {thousandSeparator(
                  selectedLinkedOrder.linked_order_count ??
                  selectedLinkedOrder.linked_orders_count ??
                  0)}
              </div>

              <div className="overflow-x-auto border border-[rgb(var(--c-border))] bg-white shadow-sm dark:bg-slate-900">
                <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
                  <thead className="bg-gray-200 text-xs uppercase dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-center">Sl. No.</th>
                      <th className="px-3 py-2">Company Name</th>
                      <th className="px-3 py-2 text-right">Order Qty</th>
                      <th className="px-3 py-2 text-right">Order Rate</th>
                      <th className="px-3 py-2 text-right">Delivery Qty</th>
                      <th className="px-3 py-2 text-right">Remaining Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(selectedLinkedOrder.linked_orders) &&
                      selectedLinkedOrder.linked_orders.length > 0 ? (
                      selectedLinkedOrder.linked_orders.map((item: any, index: number) => (
                        <tr
                          key={item.id ?? index}
                          className="border-b bg-[rgb(var(--c-table-body))] dark:border-gray-700"
                        >
                          <td className="px-3 py-2 text-center">
                            {item.serial ?? index + 1}
                          </td>
                          <td className="px-3 py-2">
                            {item.company_name || '-'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {thousandSeparator(item.order_qty ?? 0)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {thousandSeparator(item.order_rate ?? 0)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {thousandSeparator(item.delivery_qty ?? 0)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {thousandSeparator(item.remaining_qty ?? 0)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-4 text-center text-gray-500 dark:text-gray-400"
                        >
                          No linked orders found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
