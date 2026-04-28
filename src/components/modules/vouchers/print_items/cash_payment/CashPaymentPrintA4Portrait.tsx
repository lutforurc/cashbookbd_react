import React from 'react';
import CashVoucherPrintBase from '../cash_voucher/CashVoucherPrintBase';

type Props = { data: any; fontSize?: number };

const CashPaymentPrintA4Portrait = React.forwardRef<HTMLDivElement, Props>((props, ref) => (
  <CashVoucherPrintBase ref={ref} {...props} mode="payment" variant="a4-portrait" />
));

CashPaymentPrintA4Portrait.displayName = 'CashPaymentPrintA4Portrait';

export default CashPaymentPrintA4Portrait;
