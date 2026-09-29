import React from 'react';
import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import { defaultTemplate, normalizeTemplate } from '../../../utils/print-designer/printTemplate';
import { toReturnDocumentData, type ReturnKind } from './returnDocumentData';

type Props = {
  data: any;
  /** Which of the two returns this is. Both papers share this component. */
  kind: ReturnKind;
  rowsPerPage?: number;
  fontSize?: number;
};

/**
 * A Purchase Return or a Sales Return, drawn by the Print Template Designer.
 *
 * One component for the two papers rather than two: they differ only in which
 * master they read, which saved layout they wear and which way the money runs
 * -- all three of which are `kind`. Two files would be two copies of these
 * fifteen lines.
 *
 * `data` is the SAME raw payload `electronics/sales/invoice-print` returns to
 * every other paper here. That endpoint resolves a voucher by its NUMBER and
 * never asks what type it is, which is why a 12-/13- voucher already reaches it
 * today; what it could not do before is carry the return's own master.
 */
const ReturnPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ data, kind }, ref) => {
    const master =
      kind === 'sales_return' ? data?.sales_return_master : data?.purchase_return_master;

    // ⚠️ The placeholder and the paper below are different element types, so
    // React mounts a NEW node when the payload lands. VoucherPrintRegistry
    // reads the ref's `.current` at print time for exactly this reason; do not
    // "simplify" this into a single always-DocumentPrint.
    if (!master) {
      return <div ref={ref}>No return data found</div>;
    }

    const documentData = toReturnDocumentData(data, kind);

    // The raw layout (or null), not `layout.layout` -- the same bare-field
    // convention the two invoice papers use.
    const savedLayout =
      kind === 'sales_return' ? data?.sales_return_print_layout : data?.purchase_return_print_layout;

    const template = savedLayout
      ? normalizeTemplate(savedLayout, kind)
      : defaultTemplate(kind);

    return <DocumentPrint ref={ref} template={template} data={documentData} />;
  },
);

ReturnPrint.displayName = 'ReturnPrint';

export default ReturnPrint;
