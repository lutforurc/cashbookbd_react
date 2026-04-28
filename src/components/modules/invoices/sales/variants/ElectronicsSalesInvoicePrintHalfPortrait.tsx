import React from 'react';
import { useSelector } from 'react-redux';
import ElectronicsSalesInvoicePrintBase from './ElectronicsSalesInvoicePrintBase';

type Props = { data: any; rowsPerPage?: number; fontSize?: number };

const ElectronicsSalesInvoicePrintHalfPortrait = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const settings = useSelector((state: any) => state.settings);
  return <ElectronicsSalesInvoicePrintBase ref={ref} {...props} settings={settings} variant="half-portrait" />;
});

ElectronicsSalesInvoicePrintHalfPortrait.displayName = 'ElectronicsSalesInvoicePrintHalfPortrait';

export default ElectronicsSalesInvoicePrintHalfPortrait;
