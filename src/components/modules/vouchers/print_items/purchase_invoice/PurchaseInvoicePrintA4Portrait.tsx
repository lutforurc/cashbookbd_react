import React from 'react';
import { useSelector } from 'react-redux';
import PurchaseInvoicePrintBase from './PurchaseInvoicePrintBase';

type Props = { data: any; rowsPerPage?: number; fontSize?: number };

const PurchaseInvoicePrintA4Portrait = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const settings = useSelector((state: any) => state.settings);
  return <PurchaseInvoicePrintBase ref={ref} {...props} settings={settings} variant="a4-portrait" />;
});

PurchaseInvoicePrintA4Portrait.displayName = 'PurchaseInvoicePrintA4Portrait';

export default PurchaseInvoicePrintA4Portrait;
