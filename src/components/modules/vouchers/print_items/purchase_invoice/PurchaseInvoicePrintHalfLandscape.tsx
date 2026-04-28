import React from 'react';
import { useSelector } from 'react-redux';
import PurchaseInvoicePrintBase from './PurchaseInvoicePrintBase';

type Props = { data: any; rowsPerPage?: number; fontSize?: number };

const PurchaseInvoicePrintHalfLandscape = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const settings = useSelector((state: any) => state.settings);
  return <PurchaseInvoicePrintBase ref={ref} {...props} settings={settings} variant="half-landscape" />;
});

PurchaseInvoicePrintHalfLandscape.displayName = 'PurchaseInvoicePrintHalfLandscape';

export default PurchaseInvoicePrintHalfLandscape;
