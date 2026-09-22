import dayjs from 'dayjs';
import type { DocumentData } from '../../utils/print-designer/DocumentPrint';

/**
 * Order With Transaction in the shape the print designer draws.
 *
 * The bespoke sheet (OrderWithProductPrint.tsx) knows its ten columns by name;
 * this hands the same facts over as data. The rows come in ALREADY WORKED OUT
 * by the screen -- quantity, rate, total, discount, payment, and the balance
 * carried down -- and are copied, not re-derived, so the paper cannot disagree
 * with the table somebody just looked at.
 *
 * `qty`, `price`, `amount`, `discount` and `received` take the keys the renderer
 * already separates and foots. `received` is the payment's absolute value, as
 * the bespoke sheet prints it: the sign says which way the money went, and the
 * column heading already says that.
 */
export type OrderTransactionDocumentOptions = {
  payload: any;
  rows: any[];
  /** The word over the payment column, as the screen chose it: Received or Payment. */
  receivedLabel: string;
  branchName?: string | null;
};

const num = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const dateText = (value: any) => (value ? dayjs(value).format('DD/MM/YYYY') : '');

const orderTypeWords = (orderType: any) => {
  const type = String(orderType ?? '');
  if (type === '1') return { order_type_label: 'Purchase', party_label: 'Supplier Name' };
  if (type === '2') return { order_type_label: 'Sales', party_label: 'Customer Name' };
  if (type === '3') return { order_type_label: 'Stock', party_label: 'Party Name' };
  return { order_type_label: 'Order', party_label: 'Party Name' };
};

export const toOrderTransactionDocumentData = ({
  payload,
  rows,
  receivedLabel,
  branchName,
}: OrderTransactionDocumentOptions): DocumentData => {
  const list = Array.isArray(rows) ? rows : [];
  const unit = payload?.product?.unit?.name || payload?.product?.unit?.full_name || '';

  const products = list.map((row) => ({
    sl: row?.sl,
    voucher_no: row?.challanNo ?? '',
    voucher_date: dateText(row?.challanDate),
    detail_lines: Array.isArray(row?.detailLines) ? row.detailLines : [],
    vehicle_no: row?.vehicleNo === '-' ? '' : row?.vehicleNo ?? '',
    // Blank rather than 0 on a row with no product line -- a receipt against
    // the order -- so the cell prints the dash the bespoke sheet prints.
    qty: row?.hasLineDetail ? num(row?.quantity) : 0,
    price: row?.hasLineDetail ? num(row?.rate) : 0,
    amount: row?.hasLineDetail ? num(row?.total) : 0,
    discount: num(row?.discount),
    received: Math.abs(num(row?.payment)),
    running_balance: num(row?.balance),
  }));

  const from = dateText(payload?.order_date);
  const to = dateText(payload?.last_delivery_date);

  return {
    basic: {
      ...orderTypeWords(payload?.order_type),
      received_label: receivedLabel,
      order_for: payload?.customer?.name || payload?.supplier?.name || '',
      address: payload?.customer?.manual_address || payload?.customer?.address || payload?.supplier?.address || '',
      order_number: payload?.order_number ?? '',
      order_date: from,
      product_name: payload?.product?.name || payload?.product_name || '',
      unit,
      contract_order_qty: num(payload?.contract_order_qty),
      order_rate: num(payload?.order_rate),
      total_order: num(payload?.total_order),
      order_amount: num(payload?.order_amount) || num(payload?.total_order) * num(payload?.order_rate),
      duration: from && to ? `${from} to ${to}` : from || to,
      delivery_location: payload?.delivery_location ?? '',
      notes: String(payload?.notes ?? '').trim(),
      closing_balance: list.length ? num(list[list.length - 1]?.balance) : 0,
      branch_name: branchName ?? '',
    },
    products,
  };
};
