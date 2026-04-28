import React from 'react';
import { useSelector } from 'react-redux';
import getPrintPaperKey, { PrintPaperKey } from '../../../utils/utils-functions/printPaperSizeSelector';
import CashPaymentPrintA4Portrait from './cash_payment/CashPaymentPrintA4Portrait';
import CashPaymentPrintA4Landscape from './cash_payment/CashPaymentPrintA4Landscape';
import CashPaymentPrintHalfPortrait from './cash_payment/CashPaymentPrintHalfPortrait';
import CashPaymentPrintHalfLandscape from './cash_payment/CashPaymentPrintHalfLandscape';

type Props = {
  data: any;
  fontSize?: number;
};

const componentMap: Record<PrintPaperKey, React.ForwardRefExoticComponent<any>> = {
  'a4-portrait': CashPaymentPrintA4Portrait,
  'a4-landscape': CashPaymentPrintA4Landscape,
  'half-portrait': CashPaymentPrintHalfPortrait,
  'half-landscape': CashPaymentPrintHalfLandscape,
};

const CashPaymentPrint = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const settings = useSelector((state: any) => state.settings);
  const paperKey = getPrintPaperKey(settings?.data?.branch?.paper_size);
  const SelectedComponent = componentMap[paperKey];

  return <SelectedComponent ref={ref} {...props} />;
});

CashPaymentPrint.displayName = 'CashPaymentPrint';

export default CashPaymentPrint;
