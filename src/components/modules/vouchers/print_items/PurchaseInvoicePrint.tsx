import React from 'react';
import { useSelector } from 'react-redux';
import getPrintPaperKey, { PrintPaperKey } from '../../../utils/utils-functions/printPaperSizeSelector';
import PurchaseInvoicePrintA4Portrait from './purchase_invoice/PurchaseInvoicePrintA4Portrait';
import PurchaseInvoicePrintA4Landscape from './purchase_invoice/PurchaseInvoicePrintA4Landscape';
import PurchaseInvoicePrintHalfPortrait from './purchase_invoice/PurchaseInvoicePrintHalfPortrait';
import PurchaseInvoicePrintHalfLandscape from './purchase_invoice/PurchaseInvoicePrintHalfLandscape';

type Props = {
  data: any;
  rowsPerPage?: number;
  fontSize?: number;
};

const componentMap: Record<PrintPaperKey, React.ForwardRefExoticComponent<any>> = {
  'a4-portrait': PurchaseInvoicePrintA4Portrait,
  'a4-landscape': PurchaseInvoicePrintA4Landscape,
  'half-portrait': PurchaseInvoicePrintHalfPortrait,
  'half-landscape': PurchaseInvoicePrintHalfLandscape,
};

const PurchaseInvoicePrint = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const settings = useSelector((state: any) => state.settings);
  const paperKey = getPrintPaperKey(settings?.data?.branch?.paper_size);
  const SelectedComponent = componentMap[paperKey];

  return <SelectedComponent ref={ref} {...props} />;
});

PurchaseInvoicePrint.displayName = 'PurchaseInvoicePrint';

export default PurchaseInvoicePrint;
