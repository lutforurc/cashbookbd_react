import React from 'react';
import { useSelector } from 'react-redux';
import ElectronicsSalesInvoicePrintBase from './ElectronicsSalesInvoicePrintBase';

type Props = { data: any; rowsPerPage?: number; fontSize?: number };

const ElectronicsSalesInvoicePrintA4Landscape = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const settings = useSelector((state: any) => state.settings);
  return <ElectronicsSalesInvoicePrintBase ref={ref} {...props} settings={settings} variant="a4-landscape" />;
});

ElectronicsSalesInvoicePrintA4Landscape.displayName = 'ElectronicsSalesInvoicePrintA4Landscape';

export default ElectronicsSalesInvoicePrintA4Landscape;
