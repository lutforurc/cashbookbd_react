import React from 'react';
import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import { defaultTemplate, normalizeTemplate } from '../../../utils/print-designer/printTemplate';
import { toSalesInvoiceDocumentData } from './salesInvoiceDocumentData';

type Props = { data: any };

/**
 * A Company Scheme invoice on paper: the branch's own Sales Invoice layout,
 * filled from the same print payload the Electronics invoice uses.
 *
 * One difference, made here rather than in the shared mapper: the invoice's
 * account is the brand, so the address printed is the buyer's own (typed on
 * the scheme form), not the brand's. Name and mobile already come from the
 * invoice first.
 */
const CompanySchemeInvoicePrint = React.forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  if (!data?.sales_master) {
    return <div ref={ref} />;
  }

  const documentData = toSalesInvoiceDocumentData(data);
  if (data.sales_master.address) {
    documentData.basic = { ...documentData.basic, manual_address: data.sales_master.address };
  }

  const template = data?.print_layout
    ? normalizeTemplate(data.print_layout, 'sales_invoice')
    : defaultTemplate('sales_invoice');

  return <DocumentPrint ref={ref} template={template} data={documentData} />;
});

CompanySchemeInvoicePrint.displayName = 'CompanySchemeInvoicePrint';

export default CompanySchemeInvoicePrint;
