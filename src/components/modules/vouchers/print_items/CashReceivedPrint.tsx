import React from 'react';
import { useSelector } from 'react-redux';
import getPrintPaperKey, { PrintPaperKey } from '../../../utils/utils-functions/printPaperSizeSelector';
import CashReceivedPrintA4Portrait from './cash_received/CashReceivedPrintA4Portrait';
import CashReceivedPrintA4Landscape from './cash_received/CashReceivedPrintA4Landscape';
import CashReceivedPrintHalfPortrait from './cash_received/CashReceivedPrintHalfPortrait';
import CashReceivedPrintHalfLandscape from './cash_received/CashReceivedPrintHalfLandscape';

type Props = {
  data: any;
  fontSize?: number;
};

const componentMap: Record<PrintPaperKey, React.ForwardRefExoticComponent<any>> = {
  'a4-portrait': CashReceivedPrintA4Portrait,
  'a4-landscape': CashReceivedPrintA4Landscape,
  'half-portrait': CashReceivedPrintHalfPortrait,
  'half-landscape': CashReceivedPrintHalfLandscape,
};

const CashReceivedPrint = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const settings = useSelector((state: any) => state.settings);
  const paperKey = getPrintPaperKey(settings?.data?.branch?.paper_size);
  const SelectedComponent = componentMap[paperKey];

  return <SelectedComponent ref={ref} {...props} />;
});

CashReceivedPrint.displayName = 'CashReceivedPrint';

export default CashReceivedPrint;
