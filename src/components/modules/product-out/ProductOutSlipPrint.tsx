import React, { forwardRef } from 'react';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { chartDate } from '../../utils/utils-functions/formatDate';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';

// A write-off is counter-signed: the person who handled the goods, the store,
// and the owner who approved the loss.
const SIGNATORIES = ['Prepared By', 'Store In-charge', 'Authorized By'];

type Props = {
  /** What `product-out/details` answers with: `{ master, details }`. */
  data: any;
  fontSize?: number;
};

/**
 * The Damage / Loss Slip itself — the paper, with no dialog around it.
 *
 * ⚠️ EXTRACTED FROM THE MODAL SO THERE IS ONE PAPER, NOT TWO. The write-off
 * screen prints a slip from a dialog it opens itself, and the Product In Out
 * ledger prints one when its voucher number is clicked; both draw this.
 *
 * ⚠️ THE COST COLUMN IS HIDDEN WHILE THE SLIP IS PENDING, and that rule is the
 * opposite of the receipt's — see the note on ProductInSlipPrint. A write-off's
 * cost is FIFO's answer, decided when the stock moved; a receipt's rate is the
 * figure somebody had to choose.
 */
const ProductOutSlipPrint = forwardRef<HTMLDivElement, Props>(({ data, fontSize = 13 }, ref) => {
  const master = data?.master ?? null;
  const details: any[] = Array.isArray(data?.details) ? data.details : [];

  if (!master) {
    // Read through the ref, so the paper is printed only once the payload has
    // landed; printing an empty sheet is worse than printing none.
    return <div ref={ref} />;
  }

  const totalQty = details.reduce((sum, row) => sum + Number(row?.quantity || 0), 0);
  const totalCost = details.reduce((sum, row) => sum + Number(row?.cost || 0), 0);
  const approved = Boolean(master?.is_approved);

  return (
    /* ===== Printable slip (always light, like a real document) ===== */
    <div ref={ref} className="bg-white p-6 text-gray-900" style={{ fontSize }}>
      <PrintStyles />
      <PadPrinting />

      <h2 className="my-4 text-center text-lg font-bold uppercase">Damage / Loss Slip</h2>

      <div className="mb-3 grid grid-cols-2 gap-x-8 gap-y-1">
        <div>
          <b>Out No:</b> {master.out_no || '-'}
        </div>
        <div className="text-right">
          <b>Date:</b> {chartDate(master.out_date) || '-'}
        </div>
        <div>
          <b>Reason:</b> {master.reason_name || '-'}
        </div>
        <div className="text-right">
          <b>From Warehouse:</b> {master.warehouse_name || 'Not Applicable'}
        </div>
        <div>
          <b>Went Back To:</b> {master.party_name || '-'}
        </div>
        <div className="text-right">
          <b>Voucher No:</b> {master.vr_no || '-'}
        </div>
      </div>

      {/* A pending slip says so on the paper. */}
      {!approved && (
        <div className="mb-3 border border-black px-2 py-1 text-center font-semibold uppercase">
          Pending approval
        </div>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-10 border border-black px-2 py-1 text-center">SL</th>
            <th className="border border-black px-2 py-1 text-left">Product</th>
            <th className="w-24 border border-black px-2 py-1 text-right">Quantity</th>
            {approved && <th className="w-28 border border-black px-2 py-1 text-right">Cost</th>}
            <th className="border border-black px-2 py-1 text-left">Note</th>
          </tr>
        </thead>
        <tbody>
          {details.map((row, index) => (
            <tr key={row.id ?? index}>
              <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
              <td className="border border-black px-2 py-1">{row.product_name || '-'}</td>
              <td className="border border-black px-2 py-1 text-right">
                {thousandSeparator(Number(row.quantity || 0))} {row.unit_name || ''}
              </td>
              {approved && (
                <td className="border border-black px-2 py-1 text-right">
                  {thousandSeparator(Number(row.cost || 0))}
                </td>
              )}
              <td className="border border-black px-2 py-1">{row.note || '-'}</td>
            </tr>
          ))}
          {details.length === 0 && (
            <tr>
              <td colSpan={approved ? 5 : 4} className="border border-black px-2 py-3 text-center">
                No items
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={2} className="border border-black px-2 py-1 text-right font-semibold">
              Total
            </td>
            <td className="border border-black px-2 py-1 text-right font-semibold">
              {thousandSeparator(totalQty)}
            </td>
            {approved && (
              <td className="border border-black px-2 py-1 text-right font-semibold">
                {thousandSeparator(totalCost)}
              </td>
            )}
            <td className="border border-black px-2 py-1"></td>
          </tr>
        </tbody>
      </table>

      {master.note && (
        <div className="mt-3">
          <b>Note:</b> {master.note}
        </div>
      )}

      <div className="mt-16 grid grid-cols-3 gap-x-8 gap-y-16 text-xs">
        {SIGNATORIES.map((label) => (
          <div key={label} className="text-center">
            <div className="mx-auto w-40 border-t border-black pt-1">{label}</div>
          </div>
        ))}
      </div>

      <PrintFooter fixed />
    </div>
  );
});

ProductOutSlipPrint.displayName = 'ProductOutSlipPrint';

export default ProductOutSlipPrint;
