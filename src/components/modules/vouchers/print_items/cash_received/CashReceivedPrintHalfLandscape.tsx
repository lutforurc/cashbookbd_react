import React from 'react';
import CashVoucherPrintBase from '../cash_voucher/CashVoucherPrintBase';

type Props = { data: any; fontSize?: number };

const CashReceivedPrintHalfLandscape = React.forwardRef<HTMLDivElement, Props>((props, ref) => (
  <CashVoucherPrintBase ref={ref} {...props} mode="received" variant="half-landscape" />
));

CashReceivedPrintHalfLandscape.displayName = 'CashReceivedPrintHalfLandscape';

export default CashReceivedPrintHalfLandscape;
