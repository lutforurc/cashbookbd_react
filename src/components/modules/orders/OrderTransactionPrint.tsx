import React from 'react';
import { useSelector } from 'react-redux';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { formatTransportationNumber } from '../../utils/utils-functions/formatRoleName';
import { formatDayMonthYear } from '../../utils/utils-functions/formatDate';
import { formatMobile, useMobileFormat } from '../../utils/utils-functions/mobileFormat';

type OrderRow = {
  id?: number | string;
  order_type?: number | string;
  order_for?: string;
  address?: string;
  mobile?: string;
  duration?: string;
  delivery_location?: string;
  order_number?: string;
  product_name?: string;
  total_order?: number | string;
  contract_order_qty?: number | string;
  trx_quantity?: number | string;
  order_rate?: number | string;
  order_date?: string;
  last_delivery_date?: string;
  order_amount?: number | string;
  order_details_text?: string;
  notes?: string;
  unit?: string;
  /** One entry per ordered product; a single-product order has exactly one. */
  items?: PrintOrderItem[];
  product_count?: number;
  transaction_rows?: PrintTransactionRow[];
};

type PrintOrderItem = {
  product_id?: number;
  product_name?: string;
  order_rate?: number | string;
  total_order?: number | string;
  contract_order_qty?: number | string;
  line_amount?: number | string;
  unit?: string;
};

export type PrintTransactionRow = {
  id: string | number;
  vr_no?: string;
  date?: string;
  vehicle_no?: string;
  weight?: number | string;
  unit?: string;
  rate?: number | string;
  amount?: number | string;
  receive?: number | string;
  freight_charge?: number | string;
  due_amount?: number | string;
};

type Props = {
  order: OrderRow | null;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getOrderTypeLabel = (value: string | number | undefined) => {
  if (String(value) === '1') return 'Purchase';
  if (String(value) === '2') return 'Sales';
  if (String(value) === '3') return 'Stock';
  return 'Order';
};


const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];

  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }

  return out;
};

const buildFallbackTransactions = (order: OrderRow | null): PrintTransactionRow[] => {
  if (!order) return [];

  const trxQty = toNumber(order.trx_quantity);
  if (trxQty <= 0) return [];

  return [
    {
      id: `${order.id ?? 'order'}-summary`,
      vr_no: '-',
      date: order.order_date || '-',
      vehicle_no: '-',
      weight: trxQty,
      unit: order.unit || '',
      rate: toNumber(order.order_rate),
      freight_charge: 0,
    },
  ];
};

const calculateTransactionTotals = (rows: PrintTransactionRow[]) => rows.reduce(
  (acc, row) => {
    const weight = toNumber(row.weight);
    const rate = toNumber(row.rate);
    const freight = toNumber(row.freight_charge);
    const receive = toNumber(row.receive);
    const paymentOrReceive = freight > 0 ? freight : receive;
    const amount = toNumber(row.amount) || (weight * rate);
    const due = amount - paymentOrReceive;

    acc.weight += weight;
    acc.amount += amount;
    acc.freight += paymentOrReceive;
    acc.due += due;

    return acc;
  },
  { weight: 0, amount: 0, freight: 0, due: 0 },
);

const calculateCumulativeDueAmounts = (rows: PrintTransactionRow[]) => {
  let runningDue = 0;

  return rows.map((row) => {
    const weight = toNumber(row.weight);
    const rate = toNumber(row.rate);
    const freight = toNumber(row.freight_charge);
    const receive = toNumber(row.receive);
    const paymentOrReceive = freight > 0 ? freight : receive;
    const amount = toNumber(row.amount) || (weight * rate);

    runningDue += amount - paymentOrReceive;
    return runningDue;
  });
};

const getPageEndDue = (cumulativeDueAmounts: number[], pageIndex: number, rowsPerPage: number) => {
  const endIndex = Math.min((pageIndex + 1) * rowsPerPage, cumulativeDueAmounts.length) - 1;

  return endIndex >= 0 ? cumulativeDueAmounts[endIndex] : 0;
};

const OrderTransactionPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ order, title, rowsPerPage = 20, fontSize = 11 }, ref) => {
    const fs = Number.isFinite(fontSize) ? fontSize : 11;
    // Name of the logged-in user who prints the report → shown under "Prepared by".
    const preparedByName = useSelector((state: any) => state.settings?.data?.user?.name) || '';
    // The branch's reference heading, the same three settings the allotment
    // letter is headed with. Off, or unread because the settings have not
    // arrived yet, the report prints exactly as it always has -- straight from
    // the pad head into the party block.
    const printReferenceNo =
      useSelector((state: any) => state.settings?.data?.branch?.print_letter_ref) != 0;
    const referencePrefix = String(
      useSelector((state: any) => state.settings?.data?.branch?.letter_ref_prefix) ?? '',
    ).trim();
    // Unset, the report is dated the day it is printed -- which is what the
    // allotment letter does with the same blank setting.
    const referenceDate = String(
      useSelector((state: any) => state.settings?.data?.branch?.letter_ref_date) ?? '',
    ).trim();
    const mobileFormat = useMobileFormat();
    const orderTypeLabel = getOrderTypeLabel(order?.order_type);
    const partyLabel = orderTypeLabel === 'Purchase' ? 'Supplier Name' : 'Customer Name';
    const transactionRows = Array.isArray(order?.transaction_rows) && order.transaction_rows.length > 0
      ? order.transaction_rows
      : buildFallbackTransactions(order);
    // Zero is "All": one page holding every row. The page size is needed as a
    // real number further down -- the running due and the serial both count in
    // it -- and a literal 0 there made the due read from index -1.
    const pageSize = Number(rowsPerPage) > 0 ? Number(rowsPerPage) : transactionRows.length;
    const pages = chunkRows(transactionRows, pageSize);
    const printablePages = pages.length > 0 ? pages : [[]];
    const cumulativeDueAmounts = calculateCumulativeDueAmounts(transactionRows);

    const totals = calculateTransactionTotals(transactionRows);
    /**
     * The rate the order was agreed at, and a delivery that disagrees with it.
     *
     * ⚠️ The whole point of this sheet is that the two match: an order at 19.40
     * with one lorry invoiced at 21.00 is either a price change nobody recorded
     * or a typing mistake, and in a column of eighteen identical figures the
     * odd one is exactly what the eye slides past. Marked, the paper points at
     * it -- see the same rule in DocumentPrint, which draws the designed
     * version of this sheet.
     *
     * ⚠️ NOTHING IS MARKED ON A MULTI-PRODUCT ORDER: several products at several
     * agreed rates, and a delivery row that does not say which product it
     * carried, means a correctly billed lorry would be marked against the wrong
     * product's rate.
     *
     * Half a paisa of tolerance, because 19.4 and 19.400 are one price; and a
     * row with no rate of its own -- a receipt against the order, "Cash" across
     * the delivery columns -- is silence, not disagreement.
     */
    const agreedRate =
      Array.isArray(order?.items) && order.items.length > 1 ? 0 : toNumber(order?.order_rate);
    const isOffRate = (value: number) =>
      agreedRate > 0 && value > 0 && Math.abs(value - agreedRate) >= 0.005;
    const hasOffRate = transactionRows.some((row: any) => isOffRate(toNumber(row?.rate)));
    const computedOrderAmount = toNumber(order?.order_amount) || (toNumber(order?.total_order) * toNumber(order?.order_rate));
    // The ordered products. Older payloads carry none, in which case the single
    // product on the order itself still describes it.
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    const orderItemsAmount = orderItems.reduce(
      (sum, item) =>
        sum + (toNumber(item.line_amount) || toNumber(item.total_order) * toNumber(item.order_rate)),
      0,
    );
    const orderDetailsText =
      order?.order_details_text ||
      `Order Qty: ${thousandSeparator(toNumber(order?.total_order))} , Rate: ${thousandSeparator(toNumber(order?.order_rate))}`;


      const receivedOrPaymentText = orderTypeLabel === 'Purchase' ? 'Payment' : 'Received';

    // Built from the local calendar rather than toISOString(), which is UTC and
    // would date a report printed before 6am with yesterday.
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const referenceHeadingDate = formatDayMonthYear(referenceDate || today);


    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

		        {printablePages.map((pageRows, pageIndex) => {
		          const pageTotals = calculateTransactionTotals(pageRows);
		          const pageEndDue = getPageEndDue(cumulativeDueAmounts, pageIndex, pageSize);
		          const isLastPage = pageIndex === printablePages.length - 1;

          return (
          <div key={pageIndex} className="print-page">
            <PadPrinting />

            {/* The branch's reference heading, between the pad and the party
                block. On every page, not only the first: a sheet that gets
                separated from the rest still has to say which paper it is.
                The reference itself is only as much as the branch has written
                -- nothing is added to it -- so a branch that has set no prefix
                gets the date alone rather than an empty "Ref:". */}
            {printReferenceNo && (
              <div className="mt-3 flex items-baseline justify-between text-xs leading-4 md:text-sm">
                <span>{referencePrefix ? `Ref: ${referencePrefix}` : ''}</span>
                <span>Date: {referenceHeadingDate}</span>
              </div>
            )}

            <div className="mt-5 grid grid-cols-[auto_200px] items-start justify-between gap-x-6 text-xs leading-4 md:text-sm">
              <div className="min-w-0 space-y-1 text-left">
                <div className="flex flex-wrap leading-4">
                  <span className="w-24 shrink-0">{partyLabel}:</span>
                  <span className="">{order?.order_for || '-'}</span>
                </div>
                <div className="flex flex-wrap leading-4">
                  <span className="w-24 shrink-0">Address:</span>
                  <span className="">{order?.address || '-'}</span>
                </div>
                { order?.mobile && order?.mobile.length >= 5 && (
                <div className="flex flex-wrap leading-4">
                  <span className="w-24 shrink-0">Mobile:</span>
                  <span className="">{formatMobile(order?.mobile, mobileFormat) || '-'}</span>
                </div>
                )}
                <div className="flex flex-wrap leading-4">
                  <span className="w-24 shrink-0">Duration:</span>
                  <span className="">{order?.duration || '-'}</span>
                </div>
                <div className="flex flex-wrap leading-4">
                  <span className="w-24 shrink-0">Delivery Location:</span>
                  <span className="">{order?.delivery_location || '-'}</span>
                </div>
                <div className="flex flex-wrap leading-4">
                  <span className="w-24 shrink-0">Order No.</span>
                  <span className="">{order?.order_number || '-'}</span>
                </div>
              </div>

              {/* Several products cannot be described by one rate and one
                  quantity, so they are listed instead. One product keeps the
                  original block, unchanged. */}
              {orderItems.length > 1 ? (
                <div className="justify-self-end w-[330px] text-left">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        <th style={{ fontSize: fs }} className="border border-black px-1 py-1 text-left">Product</th>
                        <th style={{ fontSize: fs }} className="border border-black px-1 py-1 text-right">Qty</th>
                        <th style={{ fontSize: fs }} className="border border-black px-1 py-1 text-right">Rate</th>
                        <th style={{ fontSize: fs }} className="border border-black px-1 py-1 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item, index) => (
                        <tr key={item.product_id ?? index}>
                          <td style={{ fontSize: fs }} className="border border-black px-1 py-1">
                            {item.product_name || '-'}
                          </td>
                          <td style={{ fontSize: fs }} className="border border-black px-1 py-1 text-right">
                            {thousandSeparator(toNumber(item.total_order))}
                          </td>
                          <td style={{ fontSize: fs }} className="border border-black px-1 py-1 text-right">
                            {thousandSeparator(toNumber(item.order_rate))}
                          </td>
                          <td style={{ fontSize: fs }} className="border border-black px-1 py-1 text-right">
                            {thousandSeparator(
                              toNumber(item.line_amount) ||
                              toNumber(item.total_order) * toNumber(item.order_rate),
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-bold">
                        <td style={{ fontSize: fs }} className="border border-black px-1 py-1 text-right" colSpan={3}>
                          Total
                        </td>
                        <td style={{ fontSize: fs }} className="border border-black px-1 py-1 text-right">
                          Tk. {thousandSeparator(orderItemsAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
              <div className="justify-self-end w-[200px] space-y-1 text-left">
                <div className="flex flex-wrap leading-4">
                  <span className="w-24 shrink-0">Product Name:</span>
                  <span className="">{order?.product_name || '-'}</span>
                </div>

                { order?.contract_order_qty && (
                  <div className="flex flex-wrap leading-4">
                    <span className="w-24 shrink-0">Contact Qty:</span>
                    <span className="">{thousandSeparator(toNumber(order?.contract_order_qty || 0))} </span>
                    {/* <span className="">{thousandSeparator(toNumber(order?.contract_order_qty || 0))} { order?.unit }</span> */}
                  </div>
                )}

                
                <div className="flex flex-wrap leading-4">
                  <span className="w-24 shrink-0">Order Rate:</span>
                  <span className="">{thousandSeparator(toNumber(order?.order_rate))}</span>
                </div>
                <div className="flex flex-wrap leading-4">
                  <span className="w-24 shrink-0">Order Qty:</span>
                  <span className="">{thousandSeparator(toNumber(order?.total_order))} { order?.unit }</span>
                </div>

                <div className="flex flex-wrap leading-4">
                  <span className="w-24 shrink-0">Amount:</span>
                  <span className="">
                    Tk. {thousandSeparator(computedOrderAmount)}
                  </span>
                </div>
              </div>
              )}
            </div>

            <div className="mb-2 text-center text-base font-bold ">
              {title || `${orderTypeLabel} Details`}
            </div>

            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Sl. No.</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Inv. No.</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Inv. Date</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Vehicle No.</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Quantity</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Rate</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Amount</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">{receivedOrPaymentText}</th>
                  <th style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">Due Amount</th>
                </tr>
              </thead>

              <tbody>
                {pageRows.length > 0 ? (
                  pageRows.map((row, index) => {
                    const weight = toNumber(row.weight);
                    const rate = toNumber(row.rate);
                    const freight = toNumber(row.freight_charge);
                    const receive = toNumber(row.receive);
                    const paymentOrReceive = freight > 0 ? freight : receive;
                    const amount = toNumber(row.amount) || (weight * rate);
                    const due = cumulativeDueAmounts[pageIndex * pageSize + index] ?? 0;

                    /**
                     * A money row -- a receipt or a payment against this order,
                     * not a delivery.
                     *
                     * It carries no lorry, no quantity, no rate and no invoice
                     * value: four cells of dashes with the account name squeezed
                     * into the first. Merged into one cell they read as what
                     * they are -- "CITY BANK BANK-SME", or "Cash".
                     *
                     * A delivery row always answers 0 to `receive` (the server
                     * writes it so), and it always has a weight or a value, so
                     * the two cannot be mistaken for each other.
                     */
                    const isMoneyRow = receive > 0 && weight === 0 && amount === 0;

                    return (
                      <tr key={row.id}>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">
                          {pageIndex * pageSize + index + 1}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">
                          {row.vr_no || '-'}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">
                          {row.date || '-'}
                        </td>
                        {isMoneyRow ? (
                          /* ⚠️ Not through formatTransportationNumber: what sits
                             here is an account name, not a lorry plate. */
                          <td
                            colSpan={4}
                            style={{ fontSize: fs }}
                            className="border border-black px-2 py-2 text-left"
                          >
                            {row.vehicle_no || '-'}
                          </td>
                        ) : (
                          <>
                            <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-center">
                              { formatTransportationNumber (row.vehicle_no) || '-'}
                            </td>
                            <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                              {thousandSeparator(weight)} 
                            </td>
                            {/* Marked in the paper's own black -- bold, with
                                an asterisk -- rather than in colour: this sheet
                                goes out on a laser printer, which renders red
                                as a grey no darker than the figures around it,
                                and is photocopied after that. */}
                            <td
                              style={{ fontSize: fs }}
                              className={
                                'border border-black px-2 py-2 text-right ' +
                                (isOffRate(rate) ? 'font-bold' : '')
                              }
                            >
                              {thousandSeparator(rate)}
                              {isOffRate(rate) ? ' *' : ''}
                            </td>
                            <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                              {thousandSeparator(amount)}
                            </td>
                          </>
                        )}
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                          {paymentOrReceive > 0 ? thousandSeparator(paymentOrReceive) : '-'}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                          {thousandSeparator(due)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ fontSize: fs }}
                      className="border border-black px-3 py-6 text-center text-gray-500"
                    >
                      No transaction rows found
                    </td>
                  </tr>
                )}
              </tbody>

		              <tfoot>
		                {!isLastPage ? (
		                  <tr className="bg-gray-100 font-semibold">
		                    <td style={{ fontSize: fs }} colSpan={4} className="border border-black px-2 py-2 text-right">
		                      Page Total
		                    </td>
		                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
		                      {thousandSeparator(pageTotals.weight)} 
		                    </td>
		                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right"></td>
		                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
		                      {thousandSeparator(pageTotals.amount)}
		                    </td>
		                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
		                      {pageTotals.freight > 0 ? thousandSeparator(pageTotals.freight) : '-'}
		                    </td>
		                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
		                      {thousandSeparator(pageEndDue)}
		                    </td>
		                  </tr>
		                ) : null}
		                {isLastPage ? (
		                  <tr className="bg-gray-200 font-bold">
	                    <td style={{ fontSize: fs }} colSpan={4} className="border border-black px-2 py-2 text-right">
	                      Grand Total
	                    </td>
                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                      {thousandSeparator(totals.weight)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right"></td>
                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                      {thousandSeparator(totals.amount)}
                    </td>
                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
                      {totals.freight > 0 ? thousandSeparator(totals.freight) : '-'}
                    </td>
	                    <td style={{ fontSize: fs }} className="border border-black px-2 py-2 text-right">
	                      {thousandSeparator(totals.due)}
	                    </td>
	                  </tr>
	                ) : null}
              </tfoot>
            </table>

            {/* What the asterisks mean, under the table on the last page only
                -- read once, beside the grand total, rather than on every sheet
                of a long order. Absent when nothing is marked: a note pointing
                at a mark that is not there sends the reader hunting. */}
            {isLastPage && hasOffRate ? (
              <div style={{ fontSize: fs }} className="mt-2 font-semibold">
                * Rate differs from the order rate ({thousandSeparator(agreedRate)}).
              </div>
            ) : null}

            {order?.notes ? (
              <div style={{ fontSize: fs }} className="mt-4 text-xs md:text-sm">
                <span className="font-semibold">Notes:</span> {order.notes}
              </div>
            ) : null}

            {isLastPage ? (
              <div style={{ fontSize: fs }} className="mt-16 flex items-start justify-between text-xs">
                <div className="w-32 border-t border-gray-700 pt-1 text-center">
                  {preparedByName ? <div className="font-semibold">{preparedByName}</div> : null}
                  <div>Prepared by</div>
                </div>
                <div className="w-32 border-t border-gray-700 pt-1 text-center">Authorized by</div>
              </div>
            ) : null}

            {/* No print time on this one: the sheet is already dated at the head,
                and a second date a few lines below it -- a different date, since
                one is the paper's date and the other the moment it came off the
                printer -- is read as a discrepancy rather than as two facts. */}
            <PrintFooter page={pageIndex + 1} total={printablePages.length} fontSize={fs} hidePrintedAt />

		            {pageIndex !== printablePages.length - 1 ? <div className="page-break" /> : null}
	          </div>
	          );
	        })}
      </div>
    );
  },
);

OrderTransactionPrint.displayName = 'OrderTransactionPrint';

const OrderWithProduct = OrderTransactionPrint;

export default OrderWithProduct;
