import React from 'react';
import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import { defaultTemplate, normalizeTemplate } from '../../../utils/print-designer/printTemplate';
import { toPurchaseInvoiceDocumentData } from './purchaseInvoiceDocumentData';

type Props = {
  data: any;
  rowsPerPage?: number;
  fontSize?: number;
};

/**
 * The Purchase Invoice, drawn by the Print Template Designer -- the same
 * cutover Sales Invoice went through
 * (docs/superpowers/specs/2026-09-20-purchase-invoice-print-designer-design.md).
 * `data` is the SAME raw payload `electronics/sales/invoice-print` has
 * always returned -- reshaped here, not upstream, because other print
 * components read it in its original shape too.
 */
const PurchaseInvoicePrint = React.forwardRef<HTMLDivElement, Props>(
  ({ data }, ref) => {
    if (!data?.purchase_master) {
      return <div ref={ref}>No purchase invoice data found</div>;
    }

    const documentData = toPurchaseInvoiceDocumentData(data);
    // NOT data?.purchase_print_layout?.layout -- it IS the raw layout (or
    // null). See the plan's Global Constraints and Sales Invoice's Task 1
    // ruling for why.
    const savedLayout = data?.purchase_print_layout;
    const template = savedLayout
      ? normalizeTemplate(savedLayout, 'purchase_invoice')
      : defaultTemplate('purchase_invoice');

    return <DocumentPrint ref={ref} template={template} data={documentData} />;
  },
);

PurchaseInvoicePrint.displayName = 'PurchaseInvoicePrint';

export default PurchaseInvoicePrint;
