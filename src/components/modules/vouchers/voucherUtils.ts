import { VoucherType } from './voucherTypes';

export const getVoucherTypeFromVrNo = (
  vrNo?: string
): VoucherType | null => {
  if (!vrNo) return null;
  return vrNo.split('-')[0] as VoucherType;
};
