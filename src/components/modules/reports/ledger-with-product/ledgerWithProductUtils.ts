import type {
  LedgerWithProductRow,
  LedgerWithProductSummary,
} from './ledgerWithProductTypes';

export const parseAmount = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const normalized = String(value ?? '')
    .replace(/,/g, '')
    .trim();
  const isNegative = normalized.startsWith('(') && normalized.endsWith(')');
  const amount = Number(normalized.replace(/[()]/g, ''));

  if (!Number.isFinite(amount)) return 0;

  return isNegative ? -amount : amount;
};

export const isZeroAmount = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue === 0;
};

export const getVoucherType = (vrNo: unknown) => {
  const prefix = String(vrNo || '')
    .split('-')[0]
    ?.trim();
  const parsed = Number.parseInt(prefix, 10);
  return Number.isNaN(parsed) ? prefix : String(parsed);
};

export const isOpeningRow = (row: LedgerWithProductRow) =>
  String(row?.vr_no || '').toLowerCase() === 'opening' ||
  /opening balance/i.test(String(row?.remarks || ''));

export const getDisplayedReceivedValue = (row: LedgerWithProductRow) => {
  if (Number.isFinite(Number(row?.displayed_received))) {
    return Number(row.displayed_received);
  }

  if (isOpeningRow(row)) return 0;

  return Number(row?.received || 0);
};

export const getDisplayedPaymentValue = (row: LedgerWithProductRow) => {
  if (Number.isFinite(Number(row?.displayed_payment))) {
    return Number(row.displayed_payment);
  }

  return Number(row?.payment || 0);
};

export const getApiVoucherType = (row: LedgerWithProductRow) =>
  Number(row?.voucher_type ?? row?.voucher_type_id ?? 0);

export const getVoucherSideAmount = (row: LedgerWithProductRow) => {
  const receivedValue = getDisplayedReceivedValue(row);
  const paymentValue = getDisplayedPaymentValue(row);

  return paymentValue || receivedValue;
};

export const getDisplayedDebitValue = (row: LedgerWithProductRow) => {
  if (isOpeningRow(row)) {
    const debitValue = Number(row?.debit || 0);
    const balanceValue = Number(row?.balance || 0);

    return debitValue || (balanceValue > 0 ? balanceValue : 0);
  }

  const voucherType = getApiVoucherType(row);

  if (voucherType === 2) return getVoucherSideAmount(row);
  if (voucherType === 1) return 0;

  return getDisplayedReceivedValue(row);
};

export const getDisplayedCreditValue = (row: LedgerWithProductRow) => {
  if (isOpeningRow(row)) {
    const creditValue = Number(row?.credit || 0);
    const balanceValue = Number(row?.balance || 0);

    return creditValue || (balanceValue < 0 ? Math.abs(balanceValue) : 0);
  }

  const voucherType = getApiVoucherType(row);

  if (voucherType === 1) return getVoucherSideAmount(row);
  if (voucherType === 2) return 0;

  return getDisplayedPaymentValue(row);
};

export const getBalanceDebitValue = (row: LedgerWithProductRow) => {
  if (isOpeningRow(row)) return getDisplayedDebitValue(row);

  const totalValue = Number(row?.total || 0);
  const voucherType = getVoucherType(row?.vr_no);
  const salesValue = voucherType === '3' && totalValue > 0 ? totalValue : 0;
  const debitValue = getDisplayedDebitValue(row);

  return salesValue + debitValue;
};

export const getBalanceCreditValue = (row: LedgerWithProductRow) => {
  const totalValue = Number(row?.total || 0);
  const voucherType = getVoucherType(row?.vr_no);
  const purchaseValue = voucherType === '4' && totalValue > 0 ? totalValue : 0;
  const creditValue = getDisplayedCreditValue(row);

  return purchaseValue + creditValue;
};

export const getCashAmount = (
  row: LedgerWithProductRow,
  key: 'debit' | 'credit',
) => {
  const masters = Array.isArray(row?.acc_transaction_master)
    ? row.acc_transaction_master
    : row?.acc_transaction_master
      ? [row.acc_transaction_master]
      : [];

  return masters.reduce((sum: number, master: any) => {
    const details = Array.isArray(master?.acc_transaction_details)
      ? master.acc_transaction_details
      : [];

    return (
      sum +
      details
        .filter((detail: any) => Number(detail?.coa4_id) === 17)
        .reduce(
          (detailSum: number, detail: any) =>
            detailSum + Number(detail?.[key] || 0),
          0,
        )
    );
  }, 0);
};

export const getPurchaseQty = (row: LedgerWithProductRow) => {
  if (isOpeningRow(row)) return 0;
  return getVoucherType(row?.vr_no) === '4' ? Number(row?.quantity || 0) : 0;
};

export const getSalesQty = (row: LedgerWithProductRow) => {
  if (isOpeningRow(row)) return 0;
  return getVoucherType(row?.vr_no) === '3' ? Number(row?.quantity || 0) : 0;
};

export const getPurchaseAmount = (row: LedgerWithProductRow) =>
  getVoucherType(row?.vr_no) === '4' ? Number(row?.purchase_total || 0) : 0;

export const getSalesAmount = (row: LedgerWithProductRow) =>
  getVoucherType(row?.vr_no) === '3' ? Number(row?.sales_total || 0) : 0;

export const shouldShowZeroProductAmountMark = (
  row: LedgerWithProductRow,
  rate: number,
  purchaseTotal: number,
  salesTotal: number,
) => {
  const hasProductQuantity = Boolean(getPurchaseQty(row) || getSalesQty(row));

  return (
    hasProductQuantity &&
    isZeroAmount(rate) &&
    isZeroAmount(purchaseTotal) &&
    isZeroAmount(salesTotal)
  );
};

export const buildRowsWithRunningBalance = (
  rawRows: LedgerWithProductRow[],
  rawSummary: LedgerWithProductSummary = {},
) => {
  const hasOpeningRow = rawRows.some((row) => isOpeningRow(row));
  let runningBalance = hasOpeningRow
    ? 0
    : parseAmount(rawSummary?.opening_balance);

  return rawRows.map((row) => {
    const voucherType = getVoucherType(row?.vr_no);
    const total = Number(row?.total || 0);
    const rawReceived = Number(row?.received || 0);
    const rawPayment = Number(row?.payment || 0);
    const cashReceived = getCashAmount(row, 'debit');
    const cashPayment = getCashAmount(row, 'credit');
    const received = cashReceived > 0 ? cashReceived : rawReceived;
    const payment = cashPayment > 0 ? cashPayment : rawPayment;

    const normalizedRow: LedgerWithProductRow = {
      ...row,
      received: voucherType === '4' && received === total ? 0 : received,
      payment: voucherType === '3' && payment === total ? 0 : payment,
    };
    const displayedReceived = getDisplayedReceivedValue(normalizedRow);
    const displayedPayment = getDisplayedPaymentValue(normalizedRow);
    runningBalance +=
      getBalanceDebitValue(normalizedRow) -
      getBalanceCreditValue(normalizedRow);

    return {
      ...normalizedRow,
      displayed_received: displayedReceived,
      displayed_payment: displayedPayment,
      running_balance: runningBalance,
    };
  });
};
