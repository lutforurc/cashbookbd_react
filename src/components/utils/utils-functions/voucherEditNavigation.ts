import routes from '../../services/appRoutes';

export interface VoucherEditTarget {
  route: string;
  label: string;
  prefix: string;
}

export interface VoucherAutoEditState {
  voucherAutoEdit: true;
  voucherAutoEditNo: string;
  voucherAutoEditPrefix: string;
}

export interface CombinedVoucherOpenState {
  hasApprovedVoucher: boolean;
  editableVoucherNo: string;
}

const VOUCHER_EDIT_TARGETS: Record<string, VoucherEditTarget> = {
  '1': { route: routes.cash_received, label: 'Received Voucher', prefix: '1' },
  '2': { route: routes.cash_payment, label: 'Payment Voucher', prefix: '2' },
  '3': { route: routes.inv_sales, label: 'Sales Invoice', prefix: '3' },
  '4': { route: routes.inv_purchase, label: 'Purchase Invoice', prefix: '4' },
  '5': { route: routes.journal, label: 'Journal Voucher', prefix: '5' },
  // A purchase with nothing paid on it. It is booked as a journal and numbered
  // 9- rather than 4-, but it is entered and edited on the purchase screen like
  // any other purchase.
  '9': { route: routes.inv_purchase, label: 'Credit Purchase', prefix: '9' },
  // And its opposite number: a sale nobody has paid for, numbered 10- rather
  // than 3-, edited on the sales screen like any other sale.
  '10': { route: routes.inv_sales, label: 'Credit Sales', prefix: '10' },
};

/**
 * Which purchase type the invoice was saved under, for the edit lookup.
 *
 * PurchaseEditRepository searches on transaction_type, and a credit purchase is
 * a journal (5) where a paid or part-paid purchase is a payment (2). The screen
 * remembers whichever type the operator last picked, so a 9- voucher opened
 * from a report would be searched as a cash purchase and found nowhere.
 */
export const getPurchaseTypeForVoucher = (
  vrNo: string | number | null | undefined,
  fallback: string,
): string => (getVoucherTypePrefix(vrNo) === '9' ? '5' : fallback);

/**
 * The same question on the selling side, for SalesEditRepository.
 *
 * A credit sale is a journal (5) where a sale received in whole or in part is a
 * receipt (1), and the screen remembers whichever type was last picked.
 */
export const getSalesTypeForVoucher = (
  vrNo: string | number | null | undefined,
  fallback: string,
): string => (getVoucherTypePrefix(vrNo) === '10' ? '5' : fallback);

/**
 * The same two vouchers, opened on the bank screens instead.
 *
 * ⚠️ THE NUMBER CANNOT SAY WHICH PAIR TO USE. Its prefix is the acc_vr_type row
 * -- 1 "Cash Receipt", 2 "Cash Payment" -- so it says received or paid and
 * nothing about cash or bank: money banked on the Bank Received screen is
 * numbered 1-... exactly as a cash receipt is. The caller has to know, and on
 * the Bank Book the server says so per row (`is_bank_voucher`).
 *
 * Sending a bank voucher to the cash screen was not merely inconvenient: the
 * cash screen would save it back with its money leg moved from the bank to
 * Cash.
 */
const BANK_VOUCHER_EDIT_TARGETS: Record<string, VoucherEditTarget> = {
  '1': { route: routes.bank_receive, label: 'Bank Received Voucher', prefix: '1' },
  '2': { route: routes.bank_payment, label: 'Bank Payment Voucher', prefix: '2' },
};

export const getVoucherTypePrefix = (
  vrNo: string | number | null | undefined,
): string => {
  const normalizedVoucherNo = String(vrNo ?? '').trim();
  if (!normalizedVoucherNo) {
    return '';
  }

  return normalizedVoucherNo.split('-')[0]?.trim() || '';
};

export const getVoucherEditTarget = (
  vrNo: string | number | null | undefined,
  options?: { bank?: boolean },
): VoucherEditTarget | null => {
  const prefix = getVoucherTypePrefix(vrNo);

  // Invoices and journals have one screen each, so the bank list only holds the
  // two that come in a pair -- and a prefix missing from it falls through to
  // the ordinary target rather than to nothing.
  if (options?.bank) {
    return BANK_VOUCHER_EDIT_TARGETS[prefix] || VOUCHER_EDIT_TARGETS[prefix] || null;
  }

  return VOUCHER_EDIT_TARGETS[prefix] || null;
};

export const buildVoucherAutoEditState = (
  vrNo: string | number | null | undefined,
  options?: { bank?: boolean },
): VoucherAutoEditState | null => {
  const normalizedVoucherNo = String(vrNo ?? '').trim();
  const target = getVoucherEditTarget(normalizedVoucherNo, options);

  if (!normalizedVoucherNo || !target) {
    return null;
  }

  return {
    voucherAutoEdit: true,
    voucherAutoEditNo: normalizedVoucherNo,
    voucherAutoEditPrefix: target.prefix,
  };
};

const isApprovedValue = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'approved'].includes(normalized);
};

const getFirstTextValue = (source: any, keys: string[]): string => {
  if (!source || typeof source !== 'object') return '';

  for (const key of keys) {
    const value = source[key];
    const normalized = String(value ?? '').trim();
    if (normalized) return normalized;
  }

  return '';
};

const getFirstApprovedValue = (source: any, keys: string[]): boolean =>
  keys.some((key) => isApprovedValue(source?.[key]));

export const getCombinedVoucherOpenState = (source: any): CombinedVoucherOpenState => {
  if (!source || typeof source !== 'object') {
    return { hasApprovedVoucher: false, editableVoucherNo: '' };
  }

  const currentVoucherNo = getFirstTextValue(source, ['vr_no', 'voucher_no']);
  const currentPrefix = getVoucherTypePrefix(currentVoucherNo);
  const currentApproved = isApprovedValue(source.is_approved);

  const purchaseVoucherNo =
    getFirstTextValue(source, [
      'purchase_vr_no',
      'purchaseVrNo',
      'purchase_voucher_no',
      'purchaseVoucherNo',
      'purchase_voucher',
      'purchaseVoucher',
    ]) || (currentPrefix === '4' ? currentVoucherNo : '');
  const salesVoucherNo =
    getFirstTextValue(source, [
      'sales_vr_no',
      'salesVrNo',
      'sales_voucher_no',
      'salesVoucherNo',
      'sales_voucher',
      'salesVoucher',
    ]) || (currentPrefix === '3' ? currentVoucherNo : '');

  const purchaseApproved =
    getFirstApprovedValue(source, [
      'purchase_is_approved',
      'purchaseIsApproved',
      'is_purchase_approved',
      'purchase_approved',
      'purchaseApproved',
      'purchase_voucher_is_approved',
    ]) || (currentPrefix === '4' && currentApproved);
  const salesApproved =
    getFirstApprovedValue(source, [
      'sales_is_approved',
      'salesIsApproved',
      'is_sales_approved',
      'sales_approved',
      'salesApproved',
      'sales_voucher_is_approved',
    ]) || (currentPrefix === '3' && currentApproved);

  if (!purchaseApproved && !salesApproved) {
    return { hasApprovedVoucher: false, editableVoucherNo: '' };
  }

  if (purchaseApproved && !salesApproved && salesVoucherNo) {
    return { hasApprovedVoucher: true, editableVoucherNo: salesVoucherNo };
  }

  if (salesApproved && !purchaseApproved && purchaseVoucherNo) {
    return { hasApprovedVoucher: true, editableVoucherNo: purchaseVoucherNo };
  }

  return { hasApprovedVoucher: true, editableVoucherNo: '' };
};

export const getVoucherAutoEditNoFromState = (state: any): string => {
  if (!state || typeof state !== 'object') {
    return '';
  }

  if (!state.voucherAutoEdit || !state.voucherAutoEditNo) {
    return '';
  }

  return String(state.voucherAutoEditNo).trim();
};
