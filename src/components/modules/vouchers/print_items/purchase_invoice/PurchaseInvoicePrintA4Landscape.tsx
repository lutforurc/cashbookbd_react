import React from 'react';
import { useSelector } from 'react-redux';
import PurchaseInvoicePrintBase from './PurchaseInvoicePrintBase';

type Props = { data: any; rowsPerPage?: number; fontSize?: number };

const PurchaseInvoicePrintA4Landscape = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const settings = useSelector((state: any) => state.settings);
  return <PurchaseInvoicePrintBase ref={ref} {...props} settings={settings} variant="a4-landscape" />;
});

PurchaseInvoicePrintA4Landscape.displayName = 'PurchaseInvoicePrintA4Landscape';

export default PurchaseInvoicePrintA4Landscape;
