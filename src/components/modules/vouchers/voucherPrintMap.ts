import { VoucherType } from './voucherTypes';

type PrintHandler = () => void;

export type VoucherPrintMap = Record<VoucherType, PrintHandler>;

export const createVoucherPrintMap = (
  handlers: Partial<VoucherPrintMap>
): Partial<VoucherPrintMap> => handlers;
