import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiCheckSquare, FiRefreshCw } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import type { Column, TableFooterCell } from '../../utils/others/Table';
import OrderDropdown from '../../utils/utils-functions/OrderDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import PrintRowsInput from '../../utils/fields/PrintRowsInput';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import Loader from '../../../common/Loader';
import httpService from '../../services/httpService';
import { API_ORDERS_TRANSACTION_URL } from '../../services/apiRoutes';
import OrdersDeliveryHistoryPrint from './OrdersDeliveryHistoryPrint';

/**
 * Delivery History Report.
 *
 * Where the Undelivery Report answers "what is still owed", this one answers
 * the other half of the same question for one order: how much was ordered,
 * every delivery that came against it, how many there were, and what was left
 * at the end.
 *
 * It is the Order With Transaction page's own endpoint
 * (`invoice/order/transaction/{id}`) read one way: the header block gives the
 * order's quantities, and the transaction rows that carry a quantity are the
 * deliveries. A row with no quantity is a money movement (a receipt or a
 * payment), which belongs to that report, not this one.
 */

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: any) => {
  const numeric = toNumber(value);
  return numeric === 0 ? '-' : thousandSeparator(numeric);
};

export interface DeliveryLine {
  key: string;
  vr_no: string;
  date: string;
  vehicle_no: string;
  remarks: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
  freight: number;
  due: number;
}

export interface DeliveryHistory {
  orderNumber: string;
  orderType: string;
  orderFor: string;
  productName: string;
  unit: string;
  orderDate: string;
  contractQty: number | null;
  orderQty: number;
  deliveredQty: number;
  remainingQty: number;
  lines: DeliveryLine[];
}

const orderTypeLabel = (value: any) => {
  switch (String(value ?? '')) {
    case '1':
      return 'Purchase';
    case '2':
      return 'Sales';
    case '3':
      return 'Stock';
    default:
      return 'Order';
  }
};

/**
 * A delivery row is one that moved goods: a quantity, a rate or an amount.
 * Everything else on the endpoint is a receipt or a payment against the order.
 */
const isDeliveryRow = (row: any) =>
  toNumber(row?.weight) !== 0 ||
  toNumber(row?.rate) !== 0 ||
  toNumber(row?.amount) !== 0;

const buildHistory = (payload: any): DeliveryHistory => {
  const order = payload?.order ?? {};
  const orderFor = payload?.orderFor ?? {};
  const transactions = Array.isArray(payload?.transactions) ? payload.transactions : [];

  const lines: DeliveryLine[] = transactions
    .filter(isDeliveryRow)
    .map((row: any, index: number) => ({
      key: String(row?.id ?? `line-${index}`),
      vr_no: row?.vr_no ?? '-',
      date: row?.date ?? '-',
      vehicle_no: row?.vehicle_no ?? '',
      remarks: row?.remarks ?? '',
      qty: toNumber(row?.weight),
      unit: row?.unit ?? '',
      rate: toNumber(row?.rate),
      amount: toNumber(row?.amount),
      freight: toNumber(row?.freight_charge),
      due: toNumber(row?.due_amount),
    }));

  const orderQty = toNumber(order?.total_order);
  // The server's delivered figure is the true sum across vouchers; the rows
  // above are the same numbers grouped by voucher, so either answers. Falling
  // back to the rows keeps the report honest on a payload that has no header
  // figure (an order so old it carries no lines).
  const deliveredQty = order?.trx_quantity != null
    ? toNumber(order.trx_quantity)
    : lines.reduce((sum, line) => sum + line.qty, 0);

  return {
    orderNumber: order?.order_number ?? '-',
    orderType: orderTypeLabel(order?.order_type),
    orderFor: order?.order_for ?? orderFor?.name ?? '-',
    productName: order?.product_name ?? '-',
    unit: order?.unit ?? '',
    orderDate: order?.order_date ?? '-',
    contractQty: order?.contract_order_qty != null ? toNumber(order.contract_order_qty) : null,
    orderQty,
    deliveredQty,
    remainingQty: orderQty - deliveredQty,
    lines,
  };
};

const OrdersDeliveryHistory: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [history, setHistory] = useState<DeliveryHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // The Cash Book's print boxes: 0 rows means one unbroken sheet and the
  // browser breaks it.
  const [printRowsPerPage, setPrintRowsPerPage] = useState<number>(0);
  const [printFontSize, setPrintFontSize] = useState<number>(10);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Delivery History',
  });

  const handlePrintRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPrintRowsPerPage(Number.isNaN(value) ? 0 : value);
  };

  const handlePrintFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPrintFontSize(Number.isNaN(value) ? 10 : value);
  };

  const load = useCallback(async (order: any) => {
    if (!order?.value) {
      toast.info('Pick an order first.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await httpService.get(`${API_ORDERS_TRANSACTION_URL}/${order.value}`);
      const payload =
        response?.data?.data?.data ??
        response?.data?.data ??
        null;
      if (!payload) {
        throw new Error('Order payload not found');
      }
      setHistory(buildHistory(payload));
    } catch (error) {
      console.error(error);
      setHistory(null);
      toast.error('Delivery history load failed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Opened from the Orders list's Order No. (`?order=<id>&order_no=<number>`).
   *
   * That is the whole point of the link: the reader has just pointed at one
   * order, so this screen must not greet them with an empty picker and a
   * second "Apply". The query is read once on mount and the order loaded
   * straight away. Keeping the parameter in the URL means a refresh, or a link
   * sent to somebody else, opens the same order.
   */
  const queryOrderId = searchParams.get('order') ?? '';
  const queryOrderNo = searchParams.get('order_no') ?? '';

  useEffect(() => {
    if (!queryOrderId) return;

    const order = { value: queryOrderId, label: queryOrderNo || queryOrderId };
    setSelectedOrder(order);
    void load(order);
    // `load` is stable; the id is the only thing that should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryOrderId]);

  const handleApply = () => void load(selectedOrder);

  const handleReset = () => {
    setSelectedOrder(null);
    setHistory(null);
    // Drop the query too, or a reload would put the same order back.
    if (searchParams.has('order')) setSearchParams({}, { replace: true });
  };

  const totals = useMemo(() => {
    if (!history) {
      return { qty: 0, amount: 0, freight: 0 };
    }
    return history.lines.reduce(
      (acc, line) => {
        acc.qty += line.qty;
        acc.amount += line.amount;
        acc.freight += line.freight;
        return acc;
      },
      { qty: 0, amount: 0, freight: 0 },
    );
  }, [history]);

  const columns: Column[] = useMemo(
    () => [
      {
        key: 'sl',
        header: 'SL. NO.',
        width: 64,
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (_row, index) => index + 1,
      },
      {
        key: 'vr_no',
        header: 'CHALLAN NO. & DATE',
        width: '16%',
        render: (row: DeliveryLine) => (
          <div>
            <span className="block">{row.vr_no}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{row.date}</span>
          </div>
        ),
      },
      {
        key: 'vehicle_no',
        header: 'VEHICLE / REMARKS',
        width: '16%',
        render: (row: DeliveryLine) => (
          <div>
            {row.vehicle_no ? <span className="block">{row.vehicle_no}</span> : null}
            {row.remarks ? (
              <span className="block text-xs text-slate-500 dark:text-slate-400">{row.remarks}</span>
            ) : null}
            {!row.vehicle_no && !row.remarks ? '-' : null}
          </div>
        ),
      },
      {
        key: 'qty',
        header: 'DELIVERY QTY',
        width: '11%',
        headerClass: 'text-right',
        cellClass: 'text-right font-semibold',
        render: (row: DeliveryLine) =>
          `${formatNumber(row.qty)}${row.unit ? ` ${row.unit}` : ''}`,
      },
      {
        key: 'rate',
        header: 'RATE',
        width: '9%',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: DeliveryLine) => formatNumber(row.rate),
      },
      {
        key: 'amount',
        header: 'AMOUNT',
        width: '11%',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: DeliveryLine) => formatNumber(row.amount),
      },
      {
        key: 'freight',
        header: 'FREIGHT',
        width: '9%',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: DeliveryLine) => formatNumber(row.freight),
      },
      {
        key: 'due',
        header: 'DUE AMOUNT',
        width: '11%',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: DeliveryLine) => formatNumber(row.due),
      },
    ],
    [],
  );

  const footerRows: TableFooterCell[][] = history && history.lines.length
    ? [
        [
          { label: `Total (${history.lines.length} deliver${history.lines.length === 1 ? 'y' : 'ies'})`, colSpan: 3, className: 'text-right font-semibold' },
          { label: `${formatNumber(totals.qty)}${history.unit ? ` ${history.unit}` : ''}`, className: 'text-right font-semibold' },
          { label: '', className: 'text-right' },
          { label: formatNumber(totals.amount), className: 'text-right font-semibold' },
          { label: formatNumber(totals.freight), className: 'text-right font-semibold' },
          { label: '', className: 'text-right' },
        ],
      ]
    : [];

  return (
    <div>
      <HelmetTitle title={'Delivery History'} />

      <div className="mb-3 rounded-sm border border-[rgb(var(--c-border))] bg-white p-3 dark:bg-slate-800">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-3">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Select Order
            </label>
            <OrderDropdown onSelect={setSelectedOrder} value={selectedOrder} className="" />
          </div>
          <div className="flex gap-2">
            <ButtonLoading
              onClick={handleApply}
              buttonLoading={false}
              label="Apply"
              className="whitespace-nowrap"
              icon={<FiCheckSquare />}
            />
            <ButtonLoading
              onClick={handleReset}
              buttonLoading={false}
              label="Reset"
              className="whitespace-nowrap"
              icon={<FiRefreshCw />}
            />
          </div>
        </div>

        {/* Rows, Font and Print -- the Cash Book's own three controls. */}
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <PrintRowsInput
            id="delivery_history_print_rows"
            name="delivery_history_print_rows"
            label=""
            value={String(printRowsPerPage)}
            onChange={handlePrintRowsChange}
            type="text"
            className="w-20! text-center"
          />
          <PrintFontInput
            id="delivery_history_print_font"
            name="delivery_history_print_font"
            label=""
            value={String(printFontSize)}
            onChange={handlePrintFontSizeChange}
            type="text"
            className="w-20! text-center"
          />
          <PrintButton
            onClick={handlePrint}
            label="Print"
            className="px-6"
            disabled={!history || history.lines.length === 0}
          />
        </div>
      </div>

      {isLoading ? <Loader /> : null}

      {!isLoading && !history ? (
        <p className="rounded-sm border border-[rgb(var(--c-border))] bg-white p-6 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Pick an order, then tap Apply to see every delivery against it.
        </p>
      ) : null}

      {history ? (
        <>
          {/* Order Qty → Contract Qty → Delivered → Deliveries → Remaining,
              the strip the report is read for. */}
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <SummaryBox label="Order No" value={history.orderNumber} />
            <SummaryBox label="Order For" value={history.orderFor} />
            <SummaryBox label="Order Date" value={history.orderDate} />
            <SummaryBox label="Order Qty" value={`${formatNumber(history.orderQty)}${history.unit ? ` ${history.unit}` : ''}`} />
            <SummaryBox
              label="Contract Qty"
              value={history.contractQty == null ? '-' : formatNumber(history.contractQty)}
            />
            <SummaryBox
              label="Delivered Qty"
              value={`${formatNumber(history.deliveredQty)}${history.unit ? ` ${history.unit}` : ''}`}
              highlight
            />
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3">
            <SummaryBox label="No. of Deliveries" value={String(history.lines.length)} />
            <SummaryBox label="Product" value={history.productName} />
            <SummaryBox
              label="Last Remaining Qty"
              value={`${formatNumber(history.remainingQty)}${history.unit ? ` ${history.unit}` : ''}`}
              highlight
            />
          </div>

          <div className="mb-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">{history.productName}</span>
            <span className="mx-2">·</span>
            <span>{history.orderType} order</span>
            <span className="mx-2">·</span>
            <span>
              Ordered {formatNumber(history.orderQty)}
              {history.contractQty != null ? ` (contract ${formatNumber(history.contractQty)})` : ''}
              , delivered in {history.lines.length} deliver{history.lines.length === 1 ? 'y' : 'ies'}
              , {formatNumber(history.remainingQty)} still to come.
            </span>
          </div>

          <div className="relative overflow-x-auto">
            <Table
              columns={columns}
              data={history.lines}
              footerRows={footerRows}
              noDataMessage="No delivery has been made against this order yet."
            />
          </div>
        </>
      ) : null}

      <div className="hidden">
        <OrdersDeliveryHistoryPrint
          ref={printRef}
          history={history}
          rowsPerPage={printRowsPerPage}
          fontSize={printFontSize}
        />
      </div>
    </div>
  );
};

const SummaryBox: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight = false,
}) => (
  <div className="rounded-sm border border-[rgb(var(--c-border))] bg-white px-3 py-2 dark:bg-slate-800">
    <div className="truncate text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </div>
    <div
      className={`truncate text-sm font-semibold ${
        highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'
      }`}
      title={value}
    >
      {value}
    </div>
  </div>
);

export default OrdersDeliveryHistory;
