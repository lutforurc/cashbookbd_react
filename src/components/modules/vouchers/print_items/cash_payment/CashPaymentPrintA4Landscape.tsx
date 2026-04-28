import React from 'react';
import CashVoucherPrintBase from '../cash_voucher/CashVoucherPrintBase';

type Props = { data: any; fontSize?: number };

const CashPaymentPrintA4Landscape = React.forwardRef<HTMLDivElement, Props>((props, ref) => (
  <CashVoucherPrintBase ref={ref} {...props} mode="payment" variant="a4-landscape" />
));

CashPaymentPrintA4Landscape.displayName = 'CashPaymentPrintA4Landscape';

export default CashPaymentPrintA4Landscape;
