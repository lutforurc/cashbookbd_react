import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheckSquare, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import type { Column, TableFooterCell } from '../../utils/others/Table';
import SearchInput from '../../utils/fields/SearchInput';
import InputDatePicker from '../../utils/fields/DatePicker';
import OrderTypes from '../../utils/utils-functions/OrderTypes';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import httpService from '../../services/httpService';
import { API_ORDERS_LIST_URL } from '../../services/apiRoutes';

/**
 * Undelivery Report.
 *
 * The Order List's product column already knows, line by line, what has gone
 * out against an order and what has not (`items[].delivered_qty` and
 * `items[].remaining_qty` from `invoice/order/list`). This screen does nothing
 * but ask that same endpoint for the orders and keep the lines with something
 * still to deliver -- so the answer cannot drift from the list it is read off.
 *
 * One row per product line, not per order: a multi-product order part delivered
 * has some lines finished and some not, and an order-level row would have to
 * pick one of them.
 */

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: any) => {
  const numeric = toNumber(value);
  return numeric === 0 ? '-' : thousandSeparator(numeric);
};

const formatDateValue = (date: Date | null) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface UndeliveredRow {
  key: string;
  order_number: string;
  order_date: string;
  order_for: string;
  product_name: string;
  order_qty: number;
  contract_qty: number | null;
  delivered_qty: number;
  remaining_qty: number;
  order_rate: number;
  remaining_amount: number;
}

/**
 * The API answers `foundData(paginator + summary)`, so the rows are at
 * `data.data.data` and the summary beside them at `data.data.summary`.
 */
const readOrders = (body: any) => {
  const root = body?.data ?? {};
  const payload = root?.data ?? root;
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  return rows as any[];
};

/**
 * One row per product line with something still to come.
 *
 * A single-product order written by an older client may carry no `items` at
 * all; its flat rate and quantities are the same truth, so it is read the same
 * way rather than dropped.
 *
 * [onlyUndelivered] is the report's default and its whole point. Turned off it
 * keeps every line, delivered ones included — which is how a reader checks that
 * a delivery was seen at all. A line that is finished has nothing to show in
 * this report's own columns (its remaining is nought), so the switch exists to
 * make the DELIVERED column say what it saw.
 */
const flattenUndelivered = (orders: any[], onlyUndelivered: boolean): UndeliveredRow[] => {
  const rows: UndeliveredRow[] = [];

  orders.forEach((order) => {
    const items = Array.isArray(order?.items) ? order.items : [];

    if (items.length === 0) {
      const ordered = toNumber(order?.total_order);
      const delivered = toNumber(order?.trx_quantity);
      const remaining = order?.remaining_quantity != null
        ? toNumber(order.remaining_quantity)
        : ordered - delivered;
      if (onlyUndelivered && remaining <= 0) return;

      const rate = toNumber(order?.order_rate);
      rows.push({
        key: `order-${order?.id ?? rows.length}`,
        order_number: order?.order_number ?? '-',
        order_date: order?.order_date ?? '-',
        order_for: order?.order_for ?? '-',
        product_name: order?.product_name ?? '-',
        order_qty: ordered,
        contract_qty: order?.contract_order_qty != null ? toNumber(order.contract_order_qty) : null,
        delivered_qty: delivered,
        remaining_qty: remaining,
        order_rate: rate,
        remaining_amount: remaining * rate,
      });
      return;
    }

    items.forEach((item: any, index: number) => {
      const ordered = toNumber(item?.total_order);
      const delivered = toNumber(item?.delivered_qty);
      const remaining = item?.remaining_qty != null
        ? toNumber(item.remaining_qty)
        : ordered - delivered;
      if (onlyUndelivered && remaining <= 0) return;

      const rate = toNumber(item?.order_rate);
      rows.push({
        key: `item-${order?.id ?? 'order'}-${item?.id ?? index}`,
        order_number: order?.order_number ?? '-',
        order_date: order?.order_date ?? '-',
        order_for: order?.order_for ?? '-',
        product_name: item?.product_name ?? '-',
        order_qty: ordered,
        contract_qty: item?.contract_order_qty != null ? toNumber(item.contract_order_qty) : null,
        delivered_qty: delivered,
        remaining_qty: remaining,
        order_rate: rate,
        remaining_amount: remaining * rate,
      });
    });
  });

  return rows;
};

const OrdersUndelivery: React.FC = () => {
  const [orderType, setOrderType] = useState('');
  const [status, setStatus] = useState<'1' | '2'>('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  /**
   * The report's own question is "what is still owed", so only lines with a
   * remainder are listed. This switch keeps every line instead — the way a
   * reader checks that a sale against the order was seen at all, without
   * leaving the report for Order With Transaction.
   */
  const [onlyUndelivered, setOnlyUndelivered] = useState(true);

  // The filters the table is standing on: changed only by Apply, so typing in
  // a box does not move the figures under the reader's eye.
  const [applied, setApplied] = useState({
    orderType: '',
    startDate: '',
    endDate: '',
    search: '',
    status: '1' as '1' | '2',
    onlyUndelivered: true,
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(
    async (filters: typeof applied) => {
      setIsLoading(true);
      try {
        // Every matched order, not one page. `per_page=0` does not mean "all"
        // here -- the endpoint passes it straight to Laravel's paginator, which
        // then returns no rows at all -- so the pages are walked instead and
        // the remainder is worked out over the whole set. A remainder read off
        // one page of ten would be a different number every time.
        const perPage = 500;
        const collected: any[] = [];

        for (let page = 1; page <= 100; page += 1) {
          const response = await httpService.get(API_ORDERS_LIST_URL, {
            params: {
              page,
              per_page: perPage,
              search: filters.search,
              order_type: filters.orderType,
              order_for: '',
              product_id: '',
              start_date: filters.startDate,
              end_date: filters.endDate,
              status: filters.status,
            },
          });

          const root = response?.data?.data ?? {};
          const paginator = root?.data ?? root;
          const pageRows = readOrders(response?.data);
          collected.push(...pageRows);

          const lastPage = Number(paginator?.last_page ?? 1);
          if (!pageRows.length || page >= lastPage) break;
        }

        setOrders(collected);
      } catch (error) {
        console.error(error);
        setOrders([]);
        toast.error('Undelivery report load failed.');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(applied);
  }, [load, applied]);

  const handleApply = () => {
    setSearchFilter(search);
    setApplied({ orderType, startDate, endDate, search, status, onlyUndelivered });
  };

  const handleReset = () => {
    setOrderType('');
    setStatus('1');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setSearchFilter('');
    setOnlyUndelivered(true);
    setApplied({
      orderType: '', startDate: '', endDate: '', search: '', status: '1', onlyUndelivered: true,
    });
  };

  const rows = useMemo(
    () => flattenUndelivered(orders, applied.onlyUndelivered),
    [orders, applied.onlyUndelivered],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc.orderQty += row.order_qty;
          acc.contractQty += row.contract_qty ?? 0;
          acc.deliveredQty += row.delivered_qty;
          acc.remainingQty += row.remaining_qty;
          acc.remainingAmount += row.remaining_amount;
          return acc;
        },
        { orderQty: 0, contractQty: 0, deliveredQty: 0, remainingQty: 0, remainingAmount: 0 },
      ),
    [rows],
  );

  const columns: Column[] = [
    {
      key: 'sl',
      header: 'SL. NO.',
      width: 64,
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (_row, index) => index + 1,
    },
    { key: 'order_number', header: 'ORDER NO.', width: '9%' },
    { key: 'order_date', header: 'ORDER DATE', width: '8%' },
    { key: 'order_for', header: 'ORDER FOR', width: '14%' },
    { key: 'product_name', header: 'PRODUCT', width: '18%' },
    {
      key: 'order_qty',
      header: 'ORDER QTY',
      width: '8%',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: UndeliveredRow) => formatNumber(row.order_qty),
    },
    {
      key: 'contract_qty',
      header: 'CONTRACT QTY',
      width: '8%',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: UndeliveredRow) =>
        row.contract_qty == null ? '-' : formatNumber(row.contract_qty),
    },
    {
      key: 'delivered_qty',
      header: 'DELIVERED QTY',
      width: '8%',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: UndeliveredRow) => formatNumber(row.delivered_qty),
    },
    {
      key: 'remaining_qty',
      header: 'Remaining Qty',
      width: '8%',
      headerClass: 'text-right',
      cellClass: 'text-right font-semibold text-emerald-600 dark:text-emerald-400',
      render: (row: UndeliveredRow) => formatNumber(row.remaining_qty),
    },
    {
      key: 'order_rate',
      header: 'RATE',
      width: '7%',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: UndeliveredRow) => formatNumber(row.order_rate),
    },
    {
      key: 'remaining_amount',
      header: 'REMAINING AMOUNT',
      width: '9%',
      headerClass: 'text-right',
      cellClass: 'text-right font-semibold',
      render: (row: UndeliveredRow) => formatNumber(row.remaining_amount),
    },
  ];

  const footerRows: TableFooterCell[][] = rows.length
    ? [
        [
          { label: 'Total', colSpan: 5, className: 'text-right font-semibold' },
          { label: formatNumber(totals.orderQty), className: 'text-right font-semibold' },
          { label: formatNumber(totals.contractQty), className: 'text-right font-semibold' },
          { label: formatNumber(totals.deliveredQty), className: 'text-right font-semibold' },
          { label: formatNumber(totals.remainingQty), className: 'text-right font-semibold' },
          { label: '', className: 'text-right' },
          { label: formatNumber(totals.remainingAmount), className: 'text-right font-semibold' },
        ],
      ]
    : [];

  return (
    <div>
      <HelmetTitle title={'Pending Deliveries Report'} />

      <div className="mb-3 rounded-sm border border-[rgb(var(--c-border))] bg-white p-3 dark:bg-slate-800">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Order Type
            </label>
            <OrderTypes
              onChange={(e: any) => setOrderType(e?.target?.value ?? '')}
              value={orderType}
              className="h-9 w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Order Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as '1' | '2')}
              className="h-9 w-full rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-2 text-sm dark:bg-slate-900"
            >
              <option value="1">Active</option>
              <option value="2">Inactive</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Order Start Date
            </label>
            <InputDatePicker
              id="undelivery_start_date"
              name="undelivery_start_date"
              setCurrentDate={(date: any) => setStartDate(formatDateValue(date))}
              placeholder="Order Start Date"
              className="w-full text-sm font-medium"
              selectedDate={startDate ? new Date(startDate) : null}
              setSelectedDate={(date: any) => setStartDate(formatDateValue(date))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Order End Date
            </label>
            <InputDatePicker
              id="undelivery_end_date"
              name="undelivery_end_date"
              setCurrentDate={(date: any) => setEndDate(formatDateValue(date))}
              placeholder="Order End Date"
              className="w-full text-sm font-medium"
              selectedDate={endDate ? new Date(endDate) : null}
              setSelectedDate={(date: any) => setEndDate(formatDateValue(date))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Search
            </label>
            <SearchInput search={search} setSearchValue={setSearch} className="w-full" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
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

          {/* The two readings of this report, in the card's own empty space so
              a reader sees that lines have been dropped and can bring them
              back. "Only undelivered" is what the report is for; "All lines"
              is how a delivery is checked -- a finished line's remainder is
              nought, so it never shows beside its delivered quantity otherwise. */}
          <div className="flex items-center gap-2">
            {[
              { key: true, label: 'Pending Only' },
              { key: false, label: 'All Lines' },
            ].map((option) => {
              const active = applied.onlyUndelivered === option.key;
              return (
                <Button
                  key={String(option.key)}
                  type="button"
                  // The theme's own pair: the reading in force is the primary
                  // button, the other a quiet one beside it.
                  variant={active ? 'primary' : 'ghost'}
                  className={`px-3 text-sm ${active ? '' : 'border border-[rgb(var(--c-border))]'}`}
                  onClick={() => {
                    // Both readings are of the SAME fetched rows, so this takes
                    // effect at once -- no Apply, nothing refetched.
                    setOnlyUndelivered(option.key);
                    setApplied((prev) => ({ ...prev, onlyUndelivered: option.key }));
                  }}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {isLoading ? <Loader /> : ''}
        <Table
          columns={columns}
          data={rows}
          footerRows={footerRows}
          noDataMessage={
            applied.onlyUndelivered
              ? 'Every ordered product has been delivered.'
              : 'No order line matched these filters.'
          }
        />
      </div>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {searchFilter ? `Search: ${searchFilter} · ` : ''}
        {applied.onlyUndelivered
          ? `${rows.length} line${rows.length === 1 ? '' : 's'} still to deliver.`
          : `${rows.length} line${rows.length === 1 ? '' : 's'} in all, delivered and outstanding.`}
      </p>
    </div>
  );
};

export default OrdersUndelivery;
