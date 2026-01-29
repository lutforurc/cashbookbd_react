export const VOUCHER_TYPES = {
  SALES: '3',
  CASH_RECEIVE: '1',
  CASH_PAYMENT: '2',
  PURCHASE: '4',
} as const;

export type VoucherType =
  | '3'
  | '1'
  | '2'
  | '4';