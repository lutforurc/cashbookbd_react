import React from 'react';
import CashVoucherPrintBase from '../cash_voucher/CashVoucherPrintBase';

type Props = { data: any; fontSize?: number };

const CashReceivedPrintHalfPortrait = React.forwardRef<HTMLDivElement, Props>((props, ref) => (
  <CashVoucherPrintBase ref={ref} {...props} mode="received" variant="half-portrait" />
));

CashReceivedPrintHalfPortrait.displayName = 'CashReceivedPrintHalfPortrait';

export default CashReceivedPrintHalfPortrait;
