import React from 'react';
import { useSelector } from 'react-redux';
import getPrintPaperKey, { PrintPaperKey } from '../../../utils/utils-functions/printPaperSizeSelector';
import ElectronicsSalesInvoicePrintA4Portrait from './variants/ElectronicsSalesInvoicePrintA4Portrait';
import ElectronicsSalesInvoicePrintA4Landscape from './variants/ElectronicsSalesInvoicePrintA4Landscape';
import ElectronicsSalesInvoicePrintHalfPortrait from './variants/ElectronicsSalesInvoicePrintHalfPortrait';
import ElectronicsSalesInvoicePrintHalfLandscape from './variants/ElectronicsSalesInvoicePrintHalfLandscape';

type Props = {
  data: any;
  rowsPerPage?: number;
  fontSize?: number;
};

const componentMap: Record<PrintPaperKey, React.ForwardRefExoticComponent<any>> = {
  'a4-portrait': ElectronicsSalesInvoicePrintA4Portrait,
  'a4-landscape': ElectronicsSalesInvoicePrintA4Landscape,
  'half-portrait': ElectronicsSalesInvoicePrintHalfPortrait,
  'half-landscape': ElectronicsSalesInvoicePrintHalfLandscape,
};

const ElectronicsSalesInvoicePrint = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const settings = useSelector((state: any) => state.settings);
  const paperKey = getPrintPaperKey(settings?.data?.branch?.paper_size);
  const SelectedComponent = componentMap[paperKey];

  return <SelectedComponent ref={ref} {...props} />;
});

ElectronicsSalesInvoicePrint.displayName = 'ElectronicsSalesInvoicePrint';

export default ElectronicsSalesInvoicePrint;
