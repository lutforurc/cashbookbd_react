import React from 'react';
import CashVoucherPrintBase from '../cash_voucher/CashVoucherPrintBase';

type Props = { data: any; fontSize?: number };

const CashReceivedPrintA4Landscape = React.forwardRef<HTMLDivElement, Props>((props, ref) => (
  <CashVoucherPrintBase ref={ref} {...props} mode="received" variant="a4-landscape" />
));

CashReceivedPrintA4Landscape.displayName = 'CashReceivedPrintA4Landscape';

export default CashReceivedPrintA4Landscape;
