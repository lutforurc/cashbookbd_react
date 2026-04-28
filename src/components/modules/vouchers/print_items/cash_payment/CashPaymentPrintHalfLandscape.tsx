import React from 'react';
import CashVoucherPrintBase from '../cash_voucher/CashVoucherPrintBase';

type Props = { data: any; fontSize?: number };

const CashPaymentPrintHalfLandscape = React.forwardRef<HTMLDivElement, Props>((props, ref) => (
  <CashVoucherPrintBase ref={ref} {...props} mode="payment" variant="half-landscape" />
));

CashPaymentPrintHalfLandscape.displayName = 'CashPaymentPrintHalfLandscape';

export default CashPaymentPrintHalfLandscape;
