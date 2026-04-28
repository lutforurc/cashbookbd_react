import React from 'react';
import CashVoucherPrintBase from '../cash_voucher/CashVoucherPrintBase';

type Props = { data: any; fontSize?: number };

const CashReceivedPrintA4Portrait = React.forwardRef<HTMLDivElement, Props>((props, ref) => (
  <CashVoucherPrintBase ref={ref} {...props} mode="received" variant="a4-portrait" />
));

CashReceivedPrintA4Portrait.displayName = 'CashReceivedPrintA4Portrait';

export default CashReceivedPrintA4Portrait;
