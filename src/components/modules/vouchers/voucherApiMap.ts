import { VoucherType } from './voucherTypes';

type ApiHandler = (row: any) => void;

export type VoucherApiMap = Record<VoucherType, ApiHandler>;

export const createVoucherApiMap = (
  handlers: Partial<VoucherApiMap>
): Partial<VoucherApiMap> => handlers;
