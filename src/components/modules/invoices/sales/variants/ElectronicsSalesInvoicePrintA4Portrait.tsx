import React from 'react';
import { useSelector } from 'react-redux';
import ElectronicsSalesInvoicePrintBase from './ElectronicsSalesInvoicePrintBase';

type Props = { data: any; rowsPerPage?: number; fontSize?: number };

const ElectronicsSalesInvoicePrintA4Portrait = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const settings = useSelector((state: any) => state.settings);
  return <ElectronicsSalesInvoicePrintBase ref={ref} {...props} settings={settings} variant="a4-portrait" />;
});

ElectronicsSalesInvoicePrintA4Portrait.displayName = 'ElectronicsSalesInvoicePrintA4Portrait';

export default ElectronicsSalesInvoicePrintA4Portrait;
