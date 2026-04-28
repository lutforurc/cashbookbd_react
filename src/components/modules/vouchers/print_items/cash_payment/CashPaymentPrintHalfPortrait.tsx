import React from 'react';
import CashVoucherPrintBase from '../cash_voucher/CashVoucherPrintBase';

type Props = { data: any; fontSize?: number };

const CashPaymentPrintHalfPortrait = React.forwardRef<HTMLDivElement, Props>((props, ref) => (
  <CashVoucherPrintBase ref={ref} {...props} mode="payment" variant="half-portrait" />
));

CashPaymentPrintHalfPortrait.displayName = 'CashPaymentPrintHalfPortrait';

export default CashPaymentPrintHalfPortrait;
