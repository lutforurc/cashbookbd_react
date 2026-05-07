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
): VoucherEditTarget | null => {
  const prefix = getVoucherTypePrefix(vrNo);
  return VOUCHER_EDIT_TARGETS[prefix] || null;
};

export const buildVoucherAutoEditState = (
  vrNo: string | number | null | undefined,
): VoucherAutoEditState | null => {
  const normalizedVoucherNo = String(vrNo ?? '').trim();
  const target = getVoucherEditTarget(normalizedVoucherNo);

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
