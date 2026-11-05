import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

/**
 * The printed installment statement, built from the saved schedule and the
 * saved allocation rows the details endpoint already returns.
 *
 * ⚠️ ONE RECEIPT, ONE LINE. A receipt that settles ten installments arrives as
 * ten allocation rows -- one on each installment's `payments[]`. Those rows are
 * grouped back into a single receipt here, keyed on the receipt's own number
 * first and only then on an id or a date, so the printed history never shows
 * the same money twice.
 */

export type StatementInstallmentStatus = 'Paid' | 'Partial' | 'Due';

export type StatementInstallment = {
  installmentNo: string;
  dueDate: string;
  scheduled: number;
  received: number;
  remaining: number;
  status: StatementInstallmentStatus;
  /**
   * Every distinct receipt date with money applied to this installment,
   * oldest first, DD/MM/YYYY. Empty when the money is old enough to have a
   * paid total but no allocation detail.
   */
  receiptDates: string[];
};

export type StatementAllocation = {
  installmentNo: string;
  applied: number;
  /** Where that installment stood at the moment this receipt was saved. */
  statusAfter: StatementInstallmentStatus;
};

export type StatementReceipt = {
  key: string;
  receiptNo: string;
  date: string;
  amount: number;
  mode: string;
  allocations: StatementAllocation[];
  /** "1–9 (Paid), 10 (Partial)" -- the installments this receipt touched. */
  covers: string;
};

export type StatementPlan = {
  customerName: string;
  customerId: string;
  planRef: string;
  unitRef: string;
  saleDate: string;
  installments: StatementInstallment[];
  receipts: StatementReceipt[];
  totals: {
    scheduled: number;
    received: number;
    remaining: number;
    paidCount: number;
    partialCount: number;
    dueCount: number;
  };
};

/** What the create page's normalised rows hand over. */
export type StatementSourceRow = {
  installment_no?: number | string | null;
  due_date?: string | null;
  amount?: number | null;
  paid_amount?: number | null;
  due_amount?: number | null;
  payments?: any[] | null;
};

type ReceiptDraft = {
  key: string;
  receiptNo: string;
  dateRaw: string;
  dateValue: number | null;
  mode: string;
  order: number;
  allocations: {
    installmentIndex: number;
    installmentNo: string;
    applied: number;
    statusAfter: StatementInstallmentStatus;
  }[];
};

const toNumber = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const parseDateValue = (value: any): number | null => {
  if (!value) return null;
  const parsed = dayjs(value, ['YYYY-MM-DD', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss', 'DD/MM/YYYY HH:mm:ss'], true);
  if (parsed.isValid()) return parsed.valueOf();
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.valueOf() : null;
};

export const formatStatementDate = (value: any): string => {
  const parsed = parseDateValue(value);
  if (parsed === null) return value ? String(value) : '-';
  return dayjs(parsed).format('DD/MM/YYYY');
};

/** The schedule's Due Date column: two-digit year, to keep the column narrow. */
export const formatStatementDueDate = (value: any): string => {
  const parsed = parseDateValue(value);
  if (parsed === null) return value ? String(value) : '-';
  return dayjs(parsed).format('DD/MM/YY');
};

const compareInstallmentNo = (a: string, b: string): number => {
  const an = Number(a);
  const bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
};

const statusFor = (scheduled: number, received: number): StatementInstallmentStatus => {
  if (received <= 0) return 'Due';
  if (received + 0.005 < scheduled) return 'Partial';
  return 'Paid';
};

const paymentReceiptNo = (payment: any): string =>
  String(
    payment?.receipt_no ??
      payment?.money_receipt_no ??
      payment?.mr_no ??
      payment?.vr_no ??
      payment?.voucher_no ??
      payment?.invoice_no ??
      '',
  ).trim();

const paymentId = (payment: any): string =>
  String(payment?.payment_id ?? payment?.id ?? payment?.unit_sale_payment_id ?? '').trim();

const paymentDateRaw = (payment: any): string =>
  String(payment?.payment_date ?? payment?.paid_at ?? payment?.date ?? '').trim();

const paymentMode = (payment: any): string =>
  String(payment?.payment_mode ?? payment?.mode ?? payment?.payment_type ?? '').trim();

/**
 * A receipt's identity across the installments it settled.
 *
 * ⚠️ The amount is deliberately NOT part of the key: a receipt is split across
 * installments, so the same receipt arrives with a different amount on every
 * allocation row. Including it would print one receipt many times.
 */
const receiptKey = (payment: any): string => {
  const no = paymentReceiptNo(payment);
  if (no) return `no:${no}`;
  const id = paymentId(payment);
  if (id) return `id:${id}`;
  return `date:${paymentDateRaw(payment)}`;
};

const groupCovers = (allocations: StatementAllocation[]): string => {
  const sorted = [...allocations].sort((a, b) => compareInstallmentNo(a.installmentNo, b.installmentNo));
  const groups: { from: string; to: string; status: StatementInstallmentStatus }[] = [];

  sorted.forEach((allocation) => {
    const last = groups[groups.length - 1];
    const consecutive = (() => {
      const from = Number(last?.to);
      const to = Number(allocation.installmentNo);
      return Number.isFinite(from) && Number.isFinite(to) && to === from + 1;
    })();

    if (last && last.status === allocation.statusAfter && consecutive) {
      last.to = allocation.installmentNo;
      return;
    }
    groups.push({
      from: allocation.installmentNo,
      to: allocation.installmentNo,
      status: allocation.statusAfter,
    });
  });

  return groups
    .map((group) =>
      group.from === group.to
        ? `${group.from} (${group.status})`
        : `${group.from}–${group.to} (${group.status})`,
    )
    .join(', ');
};

export function buildStatementPlan(args: {
  rows: StatementSourceRow[];
  customerName?: string | null;
  customerId?: string | number | null;
  planRef?: string | null;
  unitRef?: string | null;
  saleDate?: string | null;
}): StatementPlan {
  const { rows, customerName, customerId, planRef, unitRef, saleDate } = args;

  const source = (Array.isArray(rows) ? rows : [])
    .filter(Boolean)
    .map((row, order) => ({ row, order }));

  source.sort((a, b) => {
    const result = compareInstallmentNo(
      String(a.row.installment_no ?? ''),
      String(b.row.installment_no ?? ''),
    );
    return result !== 0 ? result : a.order - b.order;
  });

  const installments: StatementInstallment[] = [];
  const receipts = new Map<string, ReceiptDraft>();
  let receiptOrder = 0;

  source.forEach(({ row }, index) => {
    const installmentNo = String(row.installment_no ?? index + 1);
    const scheduled = toNumber(row.amount ?? row.due_amount);

    installments.push({
      installmentNo,
      dueDate: formatStatementDueDate(row.due_date),
      scheduled,
      received: 0,
      remaining: scheduled,
      status: 'Due',
      receiptDates: [],
    });

    const payments = Array.isArray(row.payments) ? row.payments : [];

    payments.forEach((payment) => {
      const applied = toNumber(payment?.amount);
      if (applied <= 0) return;

      const key = receiptKey(payment);
      let draft = receipts.get(key);
      if (!draft) {
        draft = {
          key,
          receiptNo: paymentReceiptNo(payment),
          dateRaw: paymentDateRaw(payment),
          dateValue: parseDateValue(paymentDateRaw(payment)),
          mode: paymentMode(payment),
          order: receiptOrder++,
          allocations: [],
        };
        receipts.set(key, draft);
      }

      draft.allocations.push({
        installmentIndex: index,
        installmentNo,
        applied,
        statusAfter: 'Due',
      });
    });
  });

  // Oldest receipt first, so the running status is the one the customer saw at
  // the time each receipt was saved.
  const orderedReceipts = Array.from(receipts.values()).sort((a, b) => {
    if (a.dateValue !== null && b.dateValue !== null && a.dateValue !== b.dateValue) {
      return a.dateValue - b.dateValue;
    }
    if (a.dateValue === null && b.dateValue !== null) return 1;
    if (a.dateValue !== null && b.dateValue === null) return -1;
    return a.order - b.order;
  });

  const running = new Map<number, number>();
  /** Every receipt date applied to an installment, deduplicated by the day. */
  const receiptDates = new Map<number, Map<string, number>>();
  const receiptRows: StatementReceipt[] = [];

  orderedReceipts.forEach((draft) => {
    let amount = 0;

    draft.allocations.forEach((allocation) => {
      amount += allocation.applied;
      const installment = installments[allocation.installmentIndex];
      const total = (running.get(allocation.installmentIndex) ?? 0) + allocation.applied;
      running.set(allocation.installmentIndex, total);
      allocation.statusAfter = statusFor(installment.scheduled, total);

      // A receipt without a date cannot answer "when was this paid", so it is
      // left out rather than printed as the oldest possible date. Two receipts
      // on the same day are one date in this list, not two lines.
      if (draft.dateValue !== null) {
        const label = formatStatementDate(draft.dateRaw);
        const dates = receiptDates.get(allocation.installmentIndex) ?? new Map<string, number>();

        if (!dates.has(label)) dates.set(label, draft.dateValue);
        receiptDates.set(allocation.installmentIndex, dates);
      }
    });

    const allocations: StatementAllocation[] = draft.allocations.map((allocation) => ({
      installmentNo: allocation.installmentNo,
      applied: allocation.applied,
      statusAfter: allocation.statusAfter,
    }));

    receiptRows.push({
      key: draft.key,
      receiptNo: draft.receiptNo || '-',
      date: formatStatementDate(draft.dateRaw),
      amount,
      mode: draft.mode,
      allocations,
      covers: groupCovers(allocations),
    });
  });

  // A row with a stored paid total but no allocation detail (older data) still
  // reads as received; the allocation-derived figure wins when both exist.
  installments.forEach((installment, index) => {
    const fromAllocations = running.get(index) ?? 0;
    const fallback = toNumber(source[index]?.row?.paid_amount);
    const received = fromAllocations > 0 ? fromAllocations : fallback;

    installment.received = received;
    installment.remaining = Math.max(installment.scheduled - received, 0);
    installment.status = statusFor(installment.scheduled, received);
    installment.receiptDates = Array.from(receiptDates.get(index)?.entries() ?? [])
      .sort((a, b) => a[1] - b[1])
      .map(([label]) => label);
  });

  const totals = installments.reduce(
    (acc, installment) => {
      acc.scheduled += installment.scheduled;
      acc.received += installment.received;
      acc.remaining += installment.remaining;
      if (installment.status === 'Paid') acc.paidCount += 1;
      else if (installment.status === 'Partial') acc.partialCount += 1;
      else acc.dueCount += 1;
      return acc;
    },
    {
      scheduled: 0,
      received: 0,
      remaining: 0,
      paidCount: 0,
      partialCount: 0,
      dueCount: 0,
    },
  );

  return {
    customerName: String(customerName ?? '').trim(),
    customerId: String(customerId ?? '').trim(),
    planRef: String(planRef ?? '').trim(),
    unitRef: String(unitRef ?? '').trim(),
    saleDate: formatStatementDate(saleDate),
    installments,
    receipts: receiptRows,
    totals,
  };
}
