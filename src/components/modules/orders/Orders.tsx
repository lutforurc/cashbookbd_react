import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getOrders } from './ordersSlice';
import { useNavigate } from 'react-router-dom';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import SearchInput from '../../utils/fields/SearchInput';
import { ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import Pagination from '../../utils/utils-functions/Pagination';
import Link from '../../utils/others/Link';
import { FiEdit2, FiEye, FiTrash2, FiX } from 'react-icons/fi';
import OrderTypes from '../../utils/utils-functions/OrderTypes';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import OrdersPrint from './OrdersPrint';
import OrderTransactionPrint from './OrderTransactionPrint';
import { useReactToPrint } from 'react-to-print';
import InputElement from '../../utils/fields/InputElement';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import { API_ORDERS_LIST_URL, API_ORDERS_TRANSACTION_URL } from '../../services/apiRoutes';
import httpService from '../../services/httpService';
import { toast } from 'react-toastify';

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getOrderRemainingQuantity = (row: any) =>
  toNumber(row?.total_order) - toNumber(row?.trx_quantity);

const getLinkedRemainingQuantity = (row: any) => {
  const totalOrder = row?.total_order;
  const trxQuantity = row?.trx_quantity;

  if (
    totalOrder !== undefined &&
    totalOrder !== null &&
    totalOrder !== '' &&
    trxQuantity !== undefined &&
    trxQuantity !== null &&
    trxQuantity !== ''
  ) {
    return getOrderRemainingQuantity(row);
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
  freight_charge:
    pickFirstValue([row], ['freight_charge', 'freight', 'freight_amount', 'transport_cost', 'carriage']) ?? 0,
  due_amount:
    pickFirstValue([row], ['due_amount', 'due', 'net_due', 'balance_amount']) ?? 0,
});

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
    ? transactionSource.map((row: any, index: number) => normalizeOrderPrintRow(row, index, fallbackUnit))
    : [];

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
    transaction_rows: normalizedTransactions,
  };
};

const Orders = () => {
  const orders = useSelector((state) => state.orders);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [printRowsPerPage, setPrintRowsPerPage] = useState(12);
  const [printFontSize, setPrintFontSize] = useState(10);
  const [search, setSearchValue] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedLedger, setSelectedLedger] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [orderType, setOrderType] = useState('');
  const [selectedLinkedOrder, setSelectedLinkedOrder] = useState<any | null>(null);
  const [printRows, setPrintRows] = useState<any[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const transactionPrintRef = useRef<HTMLDivElement>(null);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState<any | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<number | string | null>(null);

  const ordersData = orders?.data ?? {};
  const tableData = Array.isArray(ordersData?.data) ? ordersData.data : [];
  const totalPages = Number(ordersData?.last_page ?? 0);
  const totalRows = Number(ordersData?.total ?? 0);

  useEffect(() => {
    dispatch(
      getOrders({
        page,
        perPage,
        search: searchFilter,
        orderType,
        orderFor: selectedLedger?.value ?? '',
      }),
    );
  }, [dispatch, page, perPage, searchFilter, orderType, selectedLedger?.value]);

  const handleSearchButton = () => {
    setCurrentPage(1);
    setPage(1);
    setSearchFilter(search);
  };
  const handleResetFilters = () => {
    setSearchValue('');
    setSearchFilter('');
    setSelectedLedger(null);
    setOrderType('');
    setPage(1);
    setCurrentPage(1);
    setPerPage(10);
    dispatch(
      getOrders({
        page: 1,
        perPage: 10,
        search: '',
        orderType: '',
        orderFor: '',
      }),
    );
  };
  const handleSelectChange = (event: any) => {
    setPerPage(Number(event.target.value));
    setPage(1);
    setCurrentPage(1);
  };
  const handlePageChange = (nextPage: any) => {
    setPage(nextPage);
    setCurrentPage(nextPage);
  };

  const handleOrderChange = (e: any) => {
    setOrderType(e.target.value);
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
  const handlePrintRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value, 10);
    setPrintRowsPerPage(Number.isFinite(value) && value > 0 ? value : 12);
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
        if (toNumber(row?.order_type) === 1) {
          acc.purchaseQuantity += toNumber(row?.total_order);
        }
        if (toNumber(row?.order_type) === 2) {
          acc.salesQuantity += toNumber(row?.total_order);
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

  const footerRows = useMemo(
    () => [
      [
        {
          label: '',
          colSpan: 1,
          className: 'text-right',
        },
        {
          label: `Trx Qty: ${thousandSeparator(summary.totalTrxQuantity, 0)}`,
          className: 'text-right',
        },
        {
          label: `Purchase Trx Qty: ${thousandSeparator(summary.purchaseTrxQuantity, 0)}`,
          className: 'text-right',
        },
        {
          label: `Sales Trx Qty: ${thousandSeparator(summary.salesTrxQuantity, 0)}`,
          className: 'text-right',
        },
        {
          label: `Purchase Qty: ${thousandSeparator(summary.purchaseQuantity, 0)}`,
          className: 'text-right',
        },
        {
          label: `Sales Qty: ${thousandSeparator(summary.salesQuantity, 0)}`,
          className: 'text-right',
        },
        {
          label: `Remaining Qty: ${thousandSeparator(summary.purchaseSalesRemainingQuantity, 0)}`,
          className: 'text-right',
        },
      ],
    ],
    [summary],
  );

  const orderTypeLabel = useMemo(() => {
    if (orderType === '1') return 'Purchase Order';
    if (orderType === '2') return 'Sales Order';
    return 'All';
  }, [orderType]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Orders List Print',
    removeAfterPrint: true,
    onAfterPrint: () => setPrintRows([]),
  });

  const handleTransactionPrint = useReactToPrint({
    content: () => transactionPrintRef.current,
    documentTitle: selectedPrintOrder?.order_number
      ? `Order-${selectedPrintOrder.order_number}`
      : 'Order Details Print',
    removeAfterPrint: true,
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
    } catch (error) {
      console.error(error);
      toast.error('Order print data load করা যায়নি।');
    } finally {
      setPrintingOrderId(null);
    }
  };

  const handleListPrint = async () => {
    try {
      setButtonLoading(true);

      const response = await httpService.get(
        `${API_ORDERS_LIST_URL}?page=1&per_page=${Math.max(totalRows, perPage, 1)}&search=${encodeURIComponent(searchFilter)}&order_type=${encodeURIComponent(orderType)}&order_for=${encodeURIComponent(selectedLedger?.value ?? '')}`,
      );

      const payload =
        response?.data?.data?.data ??
        response?.data?.data ??
        [];

      setPrintRows(Array.isArray(payload) ? payload : []);
      window.setTimeout(() => {
        handlePrint();
      }, 0);
    } catch (error) {
      console.error(error);
      toast.error('Orders print data load করা যায়নি।');
    } finally {
      setButtonLoading(false);
    }
  };

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
    },
    {
      key: 'product_name',
      header: (
        <p>
          <span className="block">Product</span>
          <span className="block">Trx. Qty</span>
        </p>
      ),
      render: (data: any) => (
        <p>
          <span className="block">{data.product_name}</span>
          { data.trx_quantity == 0 ? "-" : (
          <span className="block text-green-500 dark:text-yellow-300 font-semibold">{thousandSeparator(data.trx_quantity, 0)}</span>
          )}
        </p>
      ),
    },

    {
      key: 'order_number',
      header: (
        <p>
          <span className="block">Order No.</span>
          <span className="block">Order Date</span>
        </p>
      ),
      //   headerClass: 'text-right',
      //   cellClass: 'text-right',
      render: (data: any) => (
        <p>
          {(data.linked_order_count ?? data.linked_orders_count ?? 0) > 0 ? (
            <button
              type="button"
              className="block text-left hover:underline font-semibold text-green-500 dark:text-yellow-300"
              onClick={() => openLinkedOrdersModal(data)}
            >
              <span className=''> {data.order_number}</span>
            </button>
          ) : (
            <span className="block">{data.order_number}</span>
          )}
          <span className="block">{data.order_date}</span>
        </p>
      ),
    },
    {
      key: 'order_rate',
      header: (
        <p className="text-right">
          <span className="block">Order Rate</span>
          <span className="block">Order Qty</span>
          <span className="block">Remaining Qty</span>
        </p>
      ),
      render: (data: any) => (
        <p className="text-right">
          <span className="block">{data.order_rate}</span>
          <span className="block">
            {thousandSeparator(data.total_order, 0)}
          </span>
          <span className="block text-green-500 dark:text-yellow-300 font-semibold">
            {thousandSeparator((Number(data.total_order) - Number(data.trx_quantity)), 0)}
          </span>
        </p>
      ),
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
              ? thousandSeparator(data.linked_order_count ?? data.linked_orders_count ?? 0, 0)
              : '-'}
          </span>
          <span className="block">
            {data.linked_quantity != null
              ? thousandSeparator(data.linked_quantity, 0)
              : '-'}
          </span>
          <span className="block">
            { thousandSeparator(Number(data.total_order) - Number(data.linked_quantity), 0) }
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
          <button
            type="button"
            onClick={() => void handleOrderTransactionPrint(data)}
            className="text-blue-500"
            title="Open print page"
            disabled={printingOrderId === data?.id}
          >
            <FiEye className="cursor-pointer" />
          </button>
          <button onClick={() => navigate(`/orders/edit/${data.id}`, { state: { order: data } })} className="text-blue-500  ml-2">
            <FiEdit2 className="cursor-pointer" />
          </button>
          <button onClick={() => { }} className="text-red-500 ml-2">
            <FiTrash2 className="cursor-pointer" />
          </button>
        </div>
      ),
    },
  ];


  return (
    <div>
      <HelmetTitle title={'Orders List'} />
      <div className="flex flex-col gap-2 mb-1 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <SelectOption
            onChange={handleSelectChange}
            className="h-9"
          />
          <OrderTypes onChange={handleOrderChange} className="h-9" />
          <div className="min-w-[260px]">
            <DdlMultiline
              onSelect={handleLedgerSelect}
              acType={''}
              value={selectedLedger}
              className='h-9'
            />
          </div>
          <div className="flex flex-nowrap items-end min-w-[320px]">
            <SearchInput
              search={search}
              setSearchValue={setSearchValue}
              className="text-nowrap h-9 min-w-[220px]"
            />
            <ButtonLoading
              onClick={handleSearchButton}
              buttonLoading={buttonLoading}
              label="Search"
              className="whitespace-nowrap h-9 mr-2"
            />
            <ButtonLoading
              onClick={handleResetFilters}
              buttonLoading={false}
              label="Reset"
              className="whitespace-nowrap h-9"
            />
          </div>
          <div>
            <InputElement
              id="printRowsPerPage"
              name="printRowsPerPage"
              label=""
              value={String(printRowsPerPage)}
              onChange={handlePrintRowsChange}
              type="text"
              className="h-9 w-14"
            />
          </div>
          <div>
            <InputElement
              id="printFontSize"
              name="printFontSize"
              label=""
              value={String(printFontSize)}
              onChange={handlePrintFontSizeChange}
              type="text"
              className="h-9 w-14"
            />
          </div>
          <PrintButton
            onClick={() => void handleListPrint()}
            label="Print"
            className="pt-[0.45rem] pb-[0.45rem] h-9 whitespace-nowrap"
          />
        </div>
        <Link to="/orders/add-order" className="text-nowrap self-start xl:self-auto">
          New orders
        </Link>
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
          title="Orders List Print"
          searchText={search}
          orderTypeLabel={orderTypeLabel}
          summary={summary}
          rowsPerPage={Number(printRowsPerPage)}
          fontSize={Number(printFontSize)}
        />

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
      </div>

      {selectedLinkedOrder && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-3"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeLinkedOrdersModal();
            }
          }}
        >
          <div className="w-full max-w-3xl border border-slate-200 bg-slate-50 shadow-2xl ring-1 ring-black/5 dark:border-slate-600 dark:bg-slate-800 dark:ring-white/10">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-700">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Linked Orders
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Order No: {selectedLinkedOrder.order_number}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 dark:text-gray-300 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:focus:ring-red-500/30"
                aria-label="Close linked orders modal"
                onClick={closeLinkedOrdersModal}
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 dark:bg-slate-800">
              <div className="mb-3 text-sm text-gray-700 dark:text-gray-300">
                Total Linked Orders:{' '}
                {thousandSeparator(
                  selectedLinkedOrder.linked_order_count ??
                  selectedLinkedOrder.linked_orders_count ??
                  0,
                  0,
                )}
              </div>

              <div className="overflow-x-auto border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900">
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
                          className="border-b bg-white dark:border-gray-700 dark:bg-gray-800"
                        >
                          <td className="px-3 py-2 text-center">
                            {item.serial ?? index + 1}
                          </td>
                          <td className="px-3 py-2">
                            {item.company_name || '-'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {thousandSeparator(item.order_qty ?? 0, 0)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {thousandSeparator(item.order_rate ?? 0, 2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {thousandSeparator(item.delivery_qty ?? 0, 0)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {thousandSeparator(item.remaining_qty ?? 0, 0)}
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
