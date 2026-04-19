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

export const getVoucherAutoEditNoFromState = (state: any): string => {
  if (!state || typeof state !== 'object') {
    return '';
  }

  if (!state.voucherAutoEdit || !state.voucherAutoEditNo) {
    return '';
  }

  return String(state.voucherAutoEditNo).trim();
};
