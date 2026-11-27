import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiCheckSquare, FiRefreshCw } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import SearchInput from '../../utils/fields/SearchInput';
import InputDatePicker from '../../utils/fields/DatePicker';
import OrderTypes from '../../utils/utils-functions/OrderTypes';
import { Button, ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import PrintRowsInput from '../../utils/fields/PrintRowsInput';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import Loader from '../../../common/Loader';
import httpService from '../../services/httpService';
import { API_ORDERS_LIST_URL } from '../../services/apiRoutes';
import OrdersUndeliveryPrint from './OrdersUndeliveryPrint';

/**
 * Pending Deliveries Report.
 *
 * The Order List's product column already knows, line by line, what has gone
 * out against an order and what has not (`items[].delivered_qty` and
 * `items[].remaining_qty` from `invoice/order/list`). This screen does nothing
 * but ask that same endpoint for the orders and keep the lines with something
 * still to deliver -- so the answer cannot drift from the list it is read off.
 *
 * The report is laid out the way the printed sheet is read: one block per
 * order, its number, date and party merged down the side of the block, one row
 * per product line, and a Total row closing each block. A single In Total row
 * under the table sums the blocks.
 */

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** A quantity: no forced decimals, and a nought is shown as a dash. */
const formatQty = (value: any) => {
  const numeric = toNumber(value);
  return numeric === 0
    ? '-'
    : numeric.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

/** Money and rates print to two places, in the lakh grouping the sheet uses. */
const formatMoney = (value: any) => {
  const numeric = toNumber(value);
  return numeric === 0
    ? '-'
    : numeric.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
};

const formatDateValue = (date: Date | null) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface UndeliveredLine {
  key: string;
  product_name: string;
  order_qty: number;
  delivered_qty: number;
  remaining_qty: number;
  order_rate: number;
  remaining_amount: number;
}

export interface UndeliveredGroup {
  key: string;
  order_number: string;
  order_date: string;
  order_for: string;
  lines: UndeliveredLine[];
  order_qty: number;
  delivered_qty: number;
  remaining_qty: number;
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
 * The orders, each turned into a block of its own lines.
 *
 * A single-product order written by an older client may carry no `items` at
 * all; its flat rate and quantities are the same truth, so it is read the same
 * way rather than dropped.
 *
 * [onlyUndelivered] is the report's default and its whole point. Turned off it
 * keeps every line, delivered ones included — which is how a reader checks that
 * a delivery was seen at all. A finished line's remainder is nought, so it
 * never shows beside its delivered quantity otherwise.
 */
const buildGroups = (orders: any[], onlyUndelivered: boolean): UndeliveredGroup[] => {
  const groups: UndeliveredGroup[] = [];

  orders.forEach((order) => {
    if (!order) return;
    const items = Array.isArray(order?.items) ? order.items : [];
    const lines: UndeliveredLine[] = [];

    if (items.length === 0) {
      const ordered = toNumber(order?.total_order);
      const delivered = toNumber(order?.trx_quantity);
      const remaining = order?.remaining_quantity != null
        ? toNumber(order.remaining_quantity)
        : ordered - delivered;

      if (!onlyUndelivered || remaining > 0) {
        const rate = toNumber(order?.order_rate);
        lines.push({
          key: `order-${order?.id ?? 'line'}`,
          product_name: order?.product_name ?? '-',
          order_qty: ordered,
          delivered_qty: delivered,
          remaining_qty: remaining,
          order_rate: rate,
          remaining_amount: remaining * rate,
        });
      }
    } else {
      items.forEach((item: any, index: number) => {
        const ordered = toNumber(item?.total_order);
        const delivered = toNumber(item?.delivered_qty);
        const remaining = item?.remaining_qty != null
          ? toNumber(item.remaining_qty)
          : ordered - delivered;

        if (onlyUndelivered && remaining <= 0) return;

        const rate = toNumber(item?.order_rate);
        lines.push({
          key: `item-${order?.id ?? 'order'}-${item?.id ?? index}`,
          product_name: item?.product_name ?? '-',
          order_qty: ordered,
          delivered_qty: delivered,
          remaining_qty: remaining,
          order_rate: rate,
          remaining_amount: remaining * rate,
        });
      });
    }

    if (!lines.length) return;

    groups.push({
      key: `order-${order?.id ?? order?.order_number ?? groups.length}`,
      order_number: order?.order_number ?? '-',
      order_date: order?.order_date ?? '-',
      order_for: order?.order_for ?? '-',
      lines,
      order_qty: lines.reduce((sum, line) => sum + line.order_qty, 0),
      delivered_qty: lines.reduce((sum, line) => sum + line.delivered_qty, 0),
      remaining_qty: lines.reduce((sum, line) => sum + line.remaining_qty, 0),
      remaining_amount: lines.reduce((sum, line) => sum + line.remaining_amount, 0),
    });
  });

  return groups;
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

  // The Cash Book's print boxes: 0 rows means one unbroken sheet and the
  // browser breaks it.
  const [printRowsPerPage, setPrintRowsPerPage] = useState<number>(0);
  const [printFontSize, setPrintFontSize] = useState<number>(10);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Pending Deliveries Report',
  });

  const handlePrintRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPrintRowsPerPage(Number.isNaN(value) ? 0 : value);
  };

  const handlePrintFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPrintFontSize(Number.isNaN(value) ? 10 : value);
  };

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

  const groups = useMemo(
    () => buildGroups(orders, applied.onlyUndelivered),
    [orders, applied.onlyUndelivered],
  );

  const grandTotal = useMemo(
    () =>
      groups.reduce(
        (acc, group) => {
          acc.orderQty += group.order_qty;
          acc.deliveredQty += group.delivered_qty;
          acc.remainingQty += group.remaining_qty;
          acc.remainingAmount += group.remaining_amount;
          return acc;
        },
        { orderQty: 0, deliveredQty: 0, remainingQty: 0, remainingAmount: 0 },
      ),
    [groups],
  );

  const lineCount = groups.reduce((sum, group) => sum + group.lines.length, 0);

  const cell = 'border border-[rgb(var(--c-border))] px-3 py-2';
  const headCell =
    'border border-[rgb(var(--c-border))] bg-[rgb(var(--c-table-head))] px-3 py-3 text-xs font-semibold uppercase text-gray-800 dark:text-gray-300';

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
              back. "Pending Only" is what the report is for; "All Lines" is
              how a delivery is checked. */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: true, label: 'Pending Only' },
              { key: false, label: 'All Lines' },
            ].map((option) => {
              const active = applied.onlyUndelivered === option.key;
              return (
                <Button
                  key={String(option.key)}
                  type="button"
                  variant={active ? 'primary' : 'ghost'}
                  className={`px-3 text-sm ${active ? '' : 'border border-[rgb(var(--c-border))]'}`}
                  onClick={() => {
                    // Both readings are of the SAME fetched orders, so this
                    // takes effect at once -- no Apply, nothing refetched.
                    setOnlyUndelivered(option.key);
                    setApplied((prev) => ({ ...prev, onlyUndelivered: option.key }));
                  }}
                >
                  {option.label}
                </Button>
              );
            })}

            {/* Rows, Font and Print -- the Cash Book's own three controls. */}
            <PrintRowsInput
              id="undelivery_print_rows"
              name="undelivery_print_rows"
              label=""
              value={String(printRowsPerPage)}
              onChange={handlePrintRowsChange}
              type="text"
              className="w-20! text-center"
            />
            <PrintFontInput
              id="undelivery_print_font"
              name="undelivery_print_font"
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
              disabled={groups.length === 0}
            />
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto bg-[rgb(var(--c-table-body))]">
        {isLoading ? <Loader /> : ''}

        <table className="w-full table-fixed border-collapse text-sm text-gray-700 dark:text-gray-300">
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '23%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>

          <thead>
            <tr>
              <th className={`${headCell} text-center`}>SL. NO.</th>
              {/* The order's date is read on its number rather than in a
                  column of its own -- one fewer column between the reader and
                  the products. */}
              <th className={headCell}>
                <span className="block">ORDER NO.</span>
                <span className="block">ORDER DATE</span>
              </th>
              <th className={headCell}>ORDER FOR</th>
              <th className={headCell}>PRODUCT</th>
              <th className={`${headCell} text-right`}>ORDER QTY</th>
              <th className={`${headCell} text-right`}>DELIVERED QTY</th>
              <th className={`${headCell} text-right`}>Remaining Qty</th>
              <th className={`${headCell} text-right`}>RATE</th>
              <th className={`${headCell} text-right`}>REMAINING AMOUNT</th>
            </tr>
          </thead>

          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="border border-[rgb(var(--c-border))] px-3 py-6 text-center text-gray-500 dark:text-gray-400"
                >
                  {applied.onlyUndelivered
                    ? 'Every ordered product has been delivered.'
                    : 'No order line matched these filters.'}
                </td>
              </tr>
            ) : (
              groups.map((group) => {
                // A single-product block needs no Total row: it would only
                // repeat the one line above it. The block's heavier closing rule
                // then falls on that line.
                const hasTotalRow = group.lines.length > 1;

                return (
                  <React.Fragment key={group.key}>
                    {group.lines.map((line, lineIndex) => {
                      return (
                        <tr
                          key={line.key}
                          className="hover:bg-indigo-50 dark:hover:bg-gray-700"
                        >
                          <td className={`${cell} text-center align-top`}>{lineIndex + 1}</td>
                          {lineIndex === 0 ? (
                            <>
                              {/* The block's identity, merged down every line and
                                  the Total row beside them, the way the printed
                                  sheet reads. The date sits under its number. */}
                              <td
                                rowSpan={group.lines.length + (hasTotalRow ? 1 : 0)}
                                className={`${cell} text-center align-middle`}
                              >
                                <span className="block font-medium">{group.order_number}</span>
                                <span className="block text-xs text-slate-500 dark:text-slate-400">
                                  {group.order_date}
                                </span>
                              </td>
                              <td
                                rowSpan={group.lines.length + (hasTotalRow ? 1 : 0)}
                                className={`${cell} align-middle`}
                              >
                                {group.order_for}
                              </td>
                            </>
                          ) : null}
                          <td className={cell}>{line.product_name}</td>
                          <td className={`${cell} text-right`}>{formatQty(line.order_qty)}</td>
                          <td className={`${cell} text-right`}>{formatQty(line.delivered_qty)}</td>
                          <td
                            className={`${cell} text-right font-semibold text-emerald-600 dark:text-emerald-400`}
                          >
                            {formatQty(line.remaining_qty)}
                          </td>
                          <td className={`${cell} text-right`}>{formatMoney(line.order_rate)}</td>
                          <td className={`${cell} text-right font-semibold`}>
                            {formatMoney(line.remaining_amount)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* The block's own total, where it has more than one line. */}
                    {hasTotalRow ? (
                      <tr className="bg-slate-50/70 dark:bg-slate-900/40">
                        <td className={cell} />
                        <td className={`${cell} text-right font-semibold`}>
                          Total:
                        </td>
                        <td className={`${cell} text-right font-semibold`}>
                          {formatQty(group.order_qty)}
                        </td>
                        <td className={`${cell} text-right font-semibold`}>
                          {formatQty(group.delivered_qty)}
                        </td>
                        <td className={`${cell} text-right font-semibold`}>
                          {formatQty(group.remaining_qty)}
                        </td>
                        <td className={cell} />
                        <td className={`${cell} text-right font-semibold`}>
                          {formatMoney(group.remaining_amount)}
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {groups.length > 0 ? (
            <tfoot>
              <tr className="bg-slate-100 font-semibold text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                <td colSpan={4} className={`${cell} text-right font-bold`}>
                  In Total
                </td>
                <td className={`${cell} text-right font-bold`}>{formatQty(grandTotal.orderQty)}</td>
                <td className={`${cell} text-right font-bold`}>
                  {formatQty(grandTotal.deliveredQty)}
                </td>
                <td className={`${cell} text-right font-bold`}>
                  {formatQty(grandTotal.remainingQty)}
                </td>
                <td className={cell} />
                <td className={`${cell} text-right font-bold`}>
                  {formatMoney(grandTotal.remainingAmount)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {searchFilter ? `Search: ${searchFilter} · ` : ''}
        {applied.onlyUndelivered
          ? `${lineCount} line${lineCount === 1 ? '' : 's'} still to deliver in ${groups.length} order${groups.length === 1 ? '' : 's'}.`
          : `${lineCount} line${lineCount === 1 ? '' : 's'} in ${groups.length} order${groups.length === 1 ? '' : 's'}, delivered and outstanding.`}
      </p>

      <div className="hidden">
        <OrdersUndeliveryPrint
          ref={printRef}
          groups={groups}
          startDate={applied.startDate}
          endDate={applied.endDate}
          searchText={searchFilter}
          onlyUndelivered={applied.onlyUndelivered}
          rowsPerPage={printRowsPerPage}
          fontSize={printFontSize}
        />
      </div>
    </div>
  );
};

export default OrdersUndelivery;
