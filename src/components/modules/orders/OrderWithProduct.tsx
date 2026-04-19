import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiFilter, FiRefreshCcw, FiX } from 'react-icons/fi';
import Loader from '../../../common/Loader';
import { ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import httpService from '../../services/httpService';
import { API_ADMIN_ORDERS_TRANSACTION_URL } from '../../services/apiRoutes';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import OrderDropdown from '../../utils/utils-functions/OrderDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import Table from '../../utils/others/Table';
import { formatDate } from '../../utils/utils-functions/formatDate';
import OrderWithProductPrint from './OrderWithProductPrint';
import { VoucherPrintRegistry } from '../vouchers/VoucherPrintRegistry';
import { useVoucherPrint } from '../vouchers';

type Primitive = string | number | null | undefined;

type OrderUnit = {
  id?: number;
  name?: string;
  full_name?: string;
};

type OrderProduct = {
  id?: number;
  name?: string;
  description?: string;
  unit?: OrderUnit | null;
};

type OrderCustomer = {
  id?: number;
  name?: string;
};

type SalesDetail = {
  id?: number;
  product_id?: number;
  quantity?: Primitive;
  sales_price?: Primitive;
  weight_variance?: Primitive;
  variance_type?: Primitive;
};

type SalesMaster = {
  id?: number;
  customer_id?: number;
  vehicle_no?: string | null;
  purchase_order_no?: Primitive;
  notes?: string | null;
  total?: Primitive;
  discount?: Primitive;
  netpayment?: Primitive;
  transact_date?: string;
  details?: SalesDetail[];
};

type PurchaseDetail = {
  id?: number;
  product_id?: number;
  quantity?: Primitive;
  purchase_price?: Primitive;
  weight_variance?: Primitive;
  variance_type?: Primitive;
};

type PurchaseMaster = {
  id?: number;
  supplier_id?: number;
  vehicle_no?: string | null;
  order_no?: Primitive;
  notes?: string | null;
  total?: Primitive;
  discount?: Primitive;
  netpayment?: Primitive;
  transact_date?: string;
  details?: PurchaseDetail[];
};

type MainTransactionMaster = {
  id?: number;
  vr_no?: string;
  vr_date?: string;
  mtmId?: string;
  sales_master?: SalesMaster | null;
  purchase_master?: PurchaseMaster | null;
};

type AccTransactionDetail = {
  id?: number;
  coa4_id?: number;
  remarks?: string | null;
  debit?: Primitive;
  credit?: Primitive;
  coa_l4?: {
    id?: number;
    name?: string;
  } | null;
};

type TransactionWithOrder = {
  id?: number;
  note?: string | null;
  order_no?: Primitive;
  reference?: Primitive;
  acc_transaction_details?: AccTransactionDetail[];
  main_transaction_master?: MainTransactionMaster | null;
};

type OrderPayload = {
  id?: number;
  branch_id?: number;
  customer_id?: number;
  order_number?: string;
  delivery_location?: string | null;
  order_type?: Primitive;
  order_date?: string;
  last_delivery_date?: string;
  product_id?: number;
  order_rate?: Primitive;
  total_order?: Primitive;
  notes?: string | null;
  product?: OrderProduct | null;
  customer?: OrderCustomer | null;
  transaction_with_order?: TransactionWithOrder[];
};

type OrderTransactionEnvelope = {
  data?: {
    data?: OrderPayload;
    transaction_date?: string;
  };
};

type OrderWithProductProps = {
  orderId?: string | number | null;
  initialPayload?: OrderPayload | null;
  title?: string;
  className?: string;
};

type OrderOption = {
  value: string | number;
  label: string;
  id?: string | number;
  order_number?: string;
};

const toNumber = (value: Primitive) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatBalanceAmount = (value: Primitive, decimal = 0) => {
  const amount = toNumber(value);
  return amount < 0
    ? `(-) ${thousandSeparator(Math.abs(amount), decimal)}`
    : thousandSeparator(amount, decimal);
};

const OrderWithProduct = ({
  orderId,
  initialPayload = null,
  title = 'Order With Transaction',
  className = '',
}: OrderWithProductProps) => {
  const dispatch = useDispatch();
  const auth = useSelector((state: any) => state.auth);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const printRef = useRef<HTMLDivElement>(null);
  const voucherRegistryRef = useRef<any>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);
  const useFilterMenuEnabled = String(settings?.data?.branch?.use_filter_parameter ?? '') === '1';

  const [payload, setPayload] = useState<OrderPayload | null>(initialPayload);
  const [transactionDate, setTransactionDate] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderOption | null>(null);
  const [requestedOrderId, setRequestedOrderId] = useState<string | number | null>(orderId ?? null);
  const [branchId, setBranchId] = useState<string | number>(auth?.me?.branch_id ?? '');
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [perPage, setPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    setBranchId(auth?.me?.branch_id ?? '');
  }, [auth?.me?.branch_id, dispatch]);

  useEffect(() => {
    if (Array.isArray(branchDdlData?.protectedData?.data)) {
      setDropdownData(branchDdlData.protectedData.data);
    }
  }, [branchDdlData?.protectedData?.data]);

  useEffect(() => {
    setPayload(initialPayload);
    if (!initialPayload) {
      setTransactionDate('');
    }
  }, [initialPayload]);

  useEffect(() => {
    setRequestedOrderId(orderId ?? null);
  }, [orderId]);

  useEffect(() => {
    if (!isFilterMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterMenuOpen]);

  const resolvedOrderRequest = useMemo(() => {
    const selectedRawValue = selectedOrder?.id ?? selectedOrder?.value ?? requestedOrderId;
    const selectedOrderNumber = selectedOrder?.order_number ?? selectedOrder?.label ?? '';
    const rawValue = selectedRawValue ?? requestedOrderId;
    const numericId = Number(rawValue);
    const hasNumericId =
      rawValue !== undefined &&
      rawValue !== null &&
      rawValue !== '' &&
      Number.isFinite(numericId) &&
      String(rawValue).trim() === String(numericId);

    return {
      order_id: hasNumericId ? numericId : undefined,
      order_number: hasNumericId ? selectedOrderNumber || undefined : String(rawValue || selectedOrderNumber || '').trim() || undefined,
    };
  }, [requestedOrderId, selectedOrder]);

  useEffect(() => {
    if (!requestedOrderId && !selectedOrder?.value) {
      return;
    }

    let ignore = false;

    const loadOrder = async () => {
      try {
        setButtonLoading(true);
        setError('');

        const requestPayload = {
          order_id: resolvedOrderRequest.order_id,
          id: resolvedOrderRequest.order_id,
          order_number: resolvedOrderRequest.order_number,
          order_no: resolvedOrderRequest.order_number,
          orderNumber: resolvedOrderRequest.order_number,
          branch_id: branchId || undefined,
        };

        const response = await httpService.post(API_ADMIN_ORDERS_TRANSACTION_URL, {
          ...requestPayload,
        });

        const root: OrderTransactionEnvelope = response?.data ?? {};
        const nextPayload = root?.data?.data ?? root?.data ?? null;

        if (!ignore) {
          setPayload(nextPayload);
          setTransactionDate(root?.data?.transaction_date ?? '');
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load order transactions.');
          setPayload(null);
        }
      } finally {
        if (!ignore) {
          setButtonLoading(false);
        }
      }
    };

    void loadOrder();

    return () => {
      ignore = true;
    };
  }, [branchId, requestedOrderId, resolvedOrderRequest.order_id, resolvedOrderRequest.order_number, selectedOrder?.value]);

  const transactions = useMemo(
    () => (Array.isArray(payload?.transaction_with_order) ? payload.transaction_with_order : []),
    [payload],
  );

  const uniqueTransactions = useMemo(() => {
    const seen = new Set<string>();

    return transactions.filter((trx, index) => {
      const mtmId = trx?.main_transaction_master?.id;
      const vrNo = trx?.main_transaction_master?.vr_no;
      const key = String(mtmId ?? vrNo ?? trx?.id ?? index);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [transactions]);

  const rows = useMemo(
    () =>
      uniqueTransactions.map((trx, index) => {
        const salesMaster = trx?.main_transaction_master?.sales_master;
        const purchaseMaster = trx?.main_transaction_master?.purchase_master;
        const salesDetails = Array.isArray(salesMaster?.details) ? salesMaster.details : [];
        const purchaseDetails = Array.isArray(purchaseMaster?.details) ? purchaseMaster.details : [];
        const firstSalesDetail = salesDetails[0];
        const firstPurchaseDetail = purchaseDetails[0];
        const accDetails = Array.isArray(trx?.acc_transaction_details) ? trx.acc_transaction_details : [];
        const debitTotal = accDetails.reduce(
          (sum, item) => sum + toNumber(item?.debit),
          0,
        );
        const creditTotal = accDetails.reduce(
          (sum, item) => sum + toNumber(item?.credit),
          0,
        );
        const coaNames = accDetails
          .map((item) => item?.coa_l4?.name)
          .filter((item): item is string => Boolean(item))
          .filter((item, itemIndex, arr) => arr.indexOf(item) === itemIndex);
        const coa17Name =
          accDetails.find((item) => Number(item?.coa4_id) === 17)?.coa_l4?.name || '';
        const primaryLedgerName =
          coa17Name ||
          accDetails.find((item) => toNumber(item?.debit) > 0)?.coa_l4?.name ||
          accDetails.find((item) => toNumber(item?.credit) > 0)?.coa_l4?.name ||
          coaNames[0] ||
          '-';
        const hasSales = Boolean(salesMaster);
        const hasPurchase = Boolean(purchaseMaster);
        const activeDetail = firstSalesDetail || firstPurchaseDetail;
        const hasLineDetail = Boolean(activeDetail);
        const transactionAmount =
          toNumber(salesMaster?.total) ||
          toNumber(purchaseMaster?.total) ||
          Math.max(debitTotal, creditTotal);
        const cashLedgerDebit = accDetails
          .filter((item) => Number(item?.coa4_id) === 17)
          .reduce((sum, item) => sum + toNumber(item?.debit), 0);
        const cashLedgerCredit = accDetails
          .filter((item) => Number(item?.coa4_id) === 17)
          .reduce((sum, item) => sum + toNumber(item?.credit), 0);
        const transactionPayment = hasLineDetail
          ? cashLedgerDebit > 0
            ? cashLedgerDebit
            : cashLedgerCredit > 0
              ? -cashLedgerCredit
              : 0
          : creditTotal > 0
            ? -creditTotal
            : debitTotal;
        const transactionRate =
          hasLineDetail
            ? toNumber(firstSalesDetail?.sales_price) ||
              toNumber(firstPurchaseDetail?.purchase_price) ||
              toNumber(payload?.order_rate)
            : 0;
        const transactionQty = toNumber(activeDetail?.quantity);
        const notes = trx?.note || salesMaster?.notes || purchaseMaster?.notes || payload?.notes || '-';
        const detailLines = [
          hasSales || hasPurchase ? payload?.product?.name || '-' : primaryLedgerName,
          notes && notes !== '-' ? `Notes: ${notes}` : '',
        ].filter(Boolean);

        return {
          id: trx?.id ?? index,
          mtm_id: trx?.id ?? trx?.main_transaction_master?.id ?? index,
          vr_no: trx?.main_transaction_master?.vr_no || '-',
          sl: index + 1,
          challanNo: trx?.main_transaction_master?.vr_no || '-',
          challanDate:
            trx?.main_transaction_master?.vr_date ||
            salesMaster?.transact_date ||
            purchaseMaster?.transact_date ||
            '-',
          productName: payload?.product?.name || '-',
          detailLines,
          notes,
          vehicleNo: salesMaster?.vehicle_no || purchaseMaster?.vehicle_no || '-',
          quantity: hasLineDetail ? transactionQty : null,
          rate: hasLineDetail ? transactionRate : null,
          total: hasLineDetail ? transactionAmount : null,
          discount: toNumber(salesMaster?.discount) || toNumber(purchaseMaster?.discount),
          payment: transactionPayment,
          unitName: payload?.product?.unit?.name || payload?.product?.unit?.full_name || '',
          voucherType: hasSales ? 'Sales' : hasPurchase ? 'Purchase' : 'Transaction',
          hasLineDetail,
        };
      }),
    [
      payload?.customer?.name,
      payload?.notes,
      payload?.order_rate,
      payload?.product?.name,
      payload?.product?.unit?.full_name,
      payload?.product?.unit?.name,
      uniqueTransactions,
    ],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc.quantity += row.quantity;
          acc.total += row.total;
          acc.discount += row.discount;
          acc.payment += row.payment;
          return acc;
        },
        { quantity: 0, total: 0, discount: 0, payment: 0 },
      ),
    [rows],
  );

  const unitName = payload?.product?.unit?.name || payload?.product?.unit?.full_name || '';

  const paymentColumnLabel = useMemo(() => {
    const voucherTypes = Array.from(
      new Set(rows.map((row) => row.voucherType).filter(Boolean)),
    );

    if (voucherTypes.length === 1 && voucherTypes[0] === 'Sales') {
      return 'RECEIVED';
    }

    return 'PAYMENT';
  }, [rows]);

  const columns = useMemo(
    () => [
      {
        key: 'sl',
        header: 'SL. NO',
        headerClass: 'text-center',
        cellClass: 'text-center w-20',
      },
      {
        key: 'challanNo',
        header: 'CHAL. NO. & DATE',
        cellClass: 'w-52',
        render: (row: any) => (
          <div
            className="cursor-pointer hover:underline"
            onClick={() =>
              handleVoucherPrint({
                ...row,
                vr_no: row?.vr_no ?? row?.challanNo,
                mtm_id:
                  row?.mtm_id ??
                  row?.mtmId ??
                  row?.mid ??
                  row?.id,
              })
            }
          >
            <div>{row.challanNo}</div>
            <div>{formatDate(row.challanDate)}</div>
          </div>
        ),
      },
      {
        key: 'productName',
        header: 'PRODUCT & DETAILS',
        cellClass: 'w-72',
        render: (row: any) => (
          <div>
            {Array.isArray(row.detailLines) && row.detailLines.length > 0 ? (
              row.detailLines.map((line: string, lineIndex: number) => (
                <div key={`${row.id}-line-${lineIndex}`} className={lineIndex === 0 ? '' : 'text-gray-400'}>
                  {line}
                </div>
              ))
            ) : (
              <div>{row.productName}</div>
            )}
          </div>
        ),
      },
      {
        key: 'vehicleNo',
        header: 'VEHICLE NUMBER',
        cellClass: 'w-44',
      },
      {
        key: 'quantity',
        header: 'QUANTITY',
        headerClass: 'text-right',
        cellClass: 'text-right w-36',
        render: (row: any) => (
          <span>
            {row.hasLineDetail ? `${thousandSeparator(row.quantity, 2)} ${row.unitName}` : '-'}
          </span>
        ),
      },
      {
        key: 'rate',
        header: 'RATE',
        headerClass: 'text-right',
        cellClass: 'text-right w-28',
        render: (row: any) => <span>{row.hasLineDetail ? thousandSeparator(row.rate, 2) : '-'}</span>,
      },
      {
        key: 'total',
        header: 'TOTAL',
        headerClass: 'text-right',
        cellClass: 'text-right w-28',
        render: (row: any) => <span>{row.hasLineDetail ? thousandSeparator(row.total, 0) : '-'}</span>,
      },
      {
        key: 'discount',
        header: 'DISCOUNT',
        headerClass: 'text-right',
        cellClass: 'text-right w-28',
        render: (row: any) => <span>{thousandSeparator(row.discount, 0)}</span>,
      },
      {
        key: 'payment',
        header: paymentColumnLabel,
        headerClass: 'text-right',
        cellClass: 'text-right w-28',
        render: (row: any) => <span>{thousandSeparator(Math.abs(toNumber(row.payment)), 0)}</span>,
      },
      {
        key: 'balance',
        header: 'BALANCE',
        headerClass: 'text-right',
        cellClass: 'text-right w-28',
        render: (row: any) => {
          const balance =
            toNumber(row.total) - toNumber(row.discount) - Math.abs(toNumber(row.payment));
          return <span>{formatBalanceAmount(balance, 0)}</span>;
        },
      },
    ],
    [handleVoucherPrint, paymentColumnLabel],
  );

  const footerRows = useMemo(
    () =>
      rows.length > 0
        ? [
            [
              {
                label: 'Total',
                colSpan: 4,
                className: 'text-right',
              },
              {
                label: (
                  <span>
                    {thousandSeparator(totals.quantity, 2)} {unitName}
                  </span>
                ),
                className: 'text-right',
              },
              {
                label: "",
                className: 'text-right',
              },
              {
                label: thousandSeparator(totals.total, 0),
                className: 'text-right',
              },
              {
                label: thousandSeparator(totals.discount, 0),
                className: 'text-right',
              },
              {
                label: thousandSeparator(Math.abs(totals.payment), 0),
                className: 'text-right',
              },
              {
                label: formatBalanceAmount(
                  totals.total - totals.discount - Math.abs(totals.payment),
                  0,
                ),
                className: 'text-right',
              },
            ],
          ]
        : [],
    [payload?.order_rate, rows.length, totals.discount, totals.payment, totals.quantity, totals.total, unitName],
  );

  const handleRun = () => {
    if (!selectedOrder?.value) {
      toast.info('Please select an order.');
      return;
    }

    setRequestedOrderId(selectedOrder.value);
  };

  const handleApplyFilters = () => {
    handleRun();
    setIsFilterMenuOpen(false);
  };

  const handleResetFilters = () => {
    const defaultBranchId = auth?.me?.branch_id ?? '';

    setBranchId(defaultBranchId);
    setPerPage(12);
    setFontSize(12);
    setError('');

    if (showSelector) {
      setSelectedOrder(null);
      setRequestedOrderId(null);
      setPayload(initialPayload);
      setTransactionDate('');
    }

    setIsFilterMenuOpen(false);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: payload?.order_number ? `Order-${payload.order_number}` : 'Order With Transaction',
    removeAfterPrint: true,
  });

  const showSelector = orderId === undefined || orderId === null;

  return (
    <>
      <HelmetTitle title={title} />
      <div className={className}>
        <div className="px-0 py-3">
        
          <div className="flex flex-wrap items-end gap-3">
            <div
              className={useFilterMenuEnabled ? 'relative shrink-0' : 'min-w-[320px] flex-1'}
              ref={filterMenuRef}
            >
              {useFilterMenuEnabled && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded border text-sm transition ${
                      isFilterMenuOpen
                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                        : 'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-boxdark dark:text-blue-300 dark:hover:bg-boxdark-2'
                    }`}
                    aria-label="Toggle filter menu"
                  >
                    <FiFilter className="text-lg" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                    className="text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-bodydark dark:hover:text-white"
                  >
                    Use the filter
                  </button>
                </div>
              )}

              {(useFilterMenuEnabled ? isFilterMenuOpen : true) ? (
                <div
                  className={
                    useFilterMenuEnabled
                      ? 'absolute left-0 top-full z-30 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-md border border-stroke bg-white p-4 shadow-2xl dark:border-form-strokedark dark:bg-boxdark'
                      : 'w-full'
                  }
                >
                  {useFilterMenuEnabled && (
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800 dark:text-white">Filter Menu</span>
                      <button
                        type="button"
                        onClick={() => setIsFilterMenuOpen(false)}
                        className="rounded-sm p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-boxdark-2 dark:hover:text-bodydark1"
                        aria-label="Close filter menu"
                      >
                        <FiX />
                      </button>
                    </div>
                  )}

                  <div
                    className={
                      useFilterMenuEnabled
                        ? 'space-y-3'
                        : 'grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.2fr)_minmax(280px,1.8fr)_auto]'
                    }
                  >
                    <div>
                      <label htmlFor="branch_id" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-bodydark1">
                        Select Branch
                      </label>
                      {branchDdlData?.isLoading ? <Loader /> : null}
                      <BranchDropdown
                        id="branch_id"
                        onChange={(e: any) => setBranchId(e?.target?.value ?? '')}
                        className="h-10 w-full border-stroke bg-white font-medium text-sm dark:border-form-strokedark dark:bg-boxdark-2"
                        branchDdl={dropdownData}
                        defaultValue={String(branchId || '')}
                        value={String(branchId || '')}
                      />
                    </div>

                    <div>
                      <label htmlFor="order_with_transaction" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-bodydark1">
                        Select Order
                      </label>
                      {showSelector ? (
                        <OrderDropdown
                          id="order_with_transaction"
                          heightPx="40px"
                          onSelect={(option) =>
                            setSelectedOrder(
                              option
                                ? {
                                    value: option.value,
                                    label: option.label,
                                    id: option.id ?? option.value,
                                    order_number: option.order_number ?? option.label,
                                  }
                                : null,
                            )
                          }
                          value={
                            selectedOrder
                              ? {
                                  value: selectedOrder.value,
                                  label: selectedOrder.label,
                                }
                              : null
                          }
                          defaultValue={
                            selectedOrder
                              ? {
                                  value: selectedOrder.value,
                                  label: selectedOrder.label,
                                }
                              : null
                          }
                        />
                      ) : (
                        <InputElement
                          id="order_with_transaction_text"
                          name="order_with_transaction_text"
                          value={payload?.order_number || ''}
                          onChange={() => {}}
                          placeholder="Select Order"
                          label=""
                          className="h-10 border-stroke bg-white dark:border-form-strokedark dark:bg-boxdark-2"
                          disabled
                        />
                      )}
                    </div>

                    <div
                      className={`flex items-center gap-2 pt-2 ${
                        useFilterMenuEnabled
                          ? 'justify-end'
                          : 'justify-start self-end md:col-span-2 xl:col-span-1'
                      }`}
                    >
                      <ButtonLoading
                        onClick={handleApplyFilters}
                        buttonLoading={buttonLoading}
                        label="Apply"
                        className="h-10 min-w-[92px] bg-meta-4 px-4 hover:bg-graydark focus:bg-graydark"
                        icon={<FiCheckSquare className="text-white text-base ml-0 mr-0" />}
                      />
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="inline-flex h-10 min-w-[92px] items-center justify-center bg-meta-4 px-4 text-sm font-medium text-white transition hover:bg-graydark focus:bg-graydark focus:outline-none"
                      >
                          Reset
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="ml-auto flex items-end gap-2">
              
              <div className="grid grid-cols-2 gap-2">
                <div className="w-28">
                  <label htmlFor="rows" className="mb-1 block text-sm font-medium text-slate-700 dark:text-bodydark1">
                    Rows
                  </label>
                  <InputElement
                    id="rows"
                    name="rows"
                    type="number"
                    value={String(perPage)}
                    onChange={(e) => setPerPage(Number(e.target.value) || 12)}
                    placeholder="Rows"
                    label=""
                    className="h-10 !w-full border-stroke bg-white text-center dark:border-form-strokedark dark:bg-boxdark"
                  />
                </div>

                <div className="w-28">
                  <label htmlFor="font_size" className="mb-1 block text-sm font-medium text-slate-700 dark:text-bodydark1">
                    Font
                  </label>
                  <InputElement
                    id="font_size"
                    name="font_size"
                    type="number"
                    value={String(fontSize)}
                    onChange={(e) => setFontSize(Number(e.target.value) || 12)}
                    placeholder="Font"
                    label=""
                    className="h-10 !w-full border-stroke bg-white text-center dark:border-form-strokedark dark:bg-boxdark"
                  />
                </div>
              </div>
              <PrintButton
                onClick={handlePrint}
                className="h-10 min-w-[52px] justify-center bg-meta-4 px-0 hover:bg-graydark focus:bg-graydark"
                label=""
              />
            </div>
          </div>
        </div>

        {buttonLoading && !payload ? (
          <div className="py-6">
            <Loader />
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-3">
          <Table
            columns={columns}
            data={rows || []}
            noDataMessage="No order transaction data found."
            footerRows={footerRows}
            getRowKey={(row: any) => row.id}
            className=""
            // tableClassName="min-w-[1180px] text-sm text-gray-100 dark:text-gray-100"
            // theadClassName="bg-slate-700 text-white dark:bg-slate-700 dark:text-white"
            // tbodyClassName="divide-y divide-slate-700 bg-slate-800 dark:divide-slate-700 dark:bg-slate-800"
            // rowClassName="hover:bg-slate-700 dark:hover:bg-slate-700"
          />
        </div>

        <div className="hidden">
          <OrderWithProductPrint
            ref={printRef}
            title={title}
            branchName={dropdownData.find((item: any) => String(item?.id) === String(branchId))?.name || '-'}
            transactionDate={transactionDate || '-'}
            payload={payload}
            rows={rows}
            rowsPerPage={perPage}
            fontSize={fontSize}
          />
          <VoucherPrintRegistry
            ref={voucherRegistryRef}
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
          />
        </div>
      </div>
    </>
  );
};

export default OrderWithProduct;
