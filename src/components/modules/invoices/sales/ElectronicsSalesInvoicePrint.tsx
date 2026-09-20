import React from 'react';
import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import { defaultTemplate, normalizeTemplate } from '../../../utils/print-designer/printTemplate';
import { toSalesInvoiceDocumentData } from './salesInvoiceDocumentData';

type Props = {
  data: any;
  rowsPerPage?: number;
  fontSize?: number;
};

/**
 * The Electronics Sales Invoice, drawn by the Print Template Designer.
 *
 * Replaces four bespoke paper-size variants and their shared base component
 * (see docs/superpowers/specs/2026-09-20-sales-invoice-print-designer-design.md)
 * with the same self-service layout system Delivery Challan/Order/the two
 * hotel papers already use. `data` is the SAME raw payload
 * `electronics/sales/invoice-print` has always returned -- reshaped here,
 * not upstream, because three other print components
 * (CashReceivedPrint/CashPaymentPrint/PurchaseInvoicePrint) still read it in
 * its original shape.
 *
 * `fontSize`/`rowsPerPage` props are accepted for interface compatibility
 * with VoucherPrintRegistry's other print components but are no longer read
 * here -- both are now template properties the tenant sets in the designer,
 * the same as every other doc type on it.
 */
const ElectronicsSalesInvoicePrint = React.forwardRef<HTMLDivElement, Props>(
  ({ data }, ref) => {
    if (!data?.sales_master) {
      return <div ref={ref}>No invoice data</div>;
    }

    const documentData = toSalesInvoiceDocumentData(data);
    // NOT `data?.print_layout?.layout` — print_layout IS the raw layout
    // (or null), the same bare-field convention apiSalesChallanData's own
    // `layout` field already uses. See the ruling on Task 1 in the SDD
    // ledger for why.
    const savedLayout = data?.print_layout;
    const template = savedLayout
      ? normalizeTemplate(savedLayout, 'sales_invoice')
      : defaultTemplate('sales_invoice');

    return <DocumentPrint ref={ref} template={template} data={documentData} />;
  },
);

ElectronicsSalesInvoicePrint.displayName = 'ElectronicsSalesInvoicePrint';

export default ElectronicsSalesInvoicePrint;
