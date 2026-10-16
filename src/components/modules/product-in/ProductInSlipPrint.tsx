import React, { forwardRef } from 'react';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { chartDate } from '../../utils/utils-functions/formatDate';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';

// A receipt is counter-signed: the person who handled the goods, the store, and
// the owner who approved it.
const SIGNATORIES = ['Prepared By', 'Store In-charge', 'Authorized By'];

type Props = {
  /** What `product-in/details` answers with: `{ master, details }`. */
  data: any;
  fontSize?: number;
};

/**
 * The Stock In Slip itself — the paper, with no dialog around it.
 *
 * ⚠️ EXTRACTED FROM THE MODAL SO THERE IS ONE PAPER, NOT TWO. The entry screen
 * prints a receipt from a dialog it opens itself, and the Product In Out ledger
 * prints one when its voucher number is clicked; both draw this. A second copy
 * of the layout would be a second place to fix the next time the slip changes,
 * and the two would drift.
 *
 * ⚠️ RATE AND VALUE PRINT ON A PENDING SLIP TOO. The write-off slip hides its
 * money column until the voucher is approved; a receipt must not. The rate is
 * what the clerk came to the screen to establish, and hiding it while the slip
 * is pending would hide the only figure that needed checking -- including the
 * ৳0 lines, which raise the quantity and not the value.
 */
const ProductInSlipPrint = forwardRef<HTMLDivElement, Props>(({ data, fontSize = 13 }, ref) => {
  const master = data?.master ?? null;
  const details: any[] = Array.isArray(data?.details) ? data.details : [];

  if (!master) {
    // Read through the ref, so the paper is printed only once the payload has
    // landed; printing an empty sheet is worse than printing none.
    return <div ref={ref} />;
  }

  const totalQty = details.reduce((sum, row) => sum + Number(row?.quantity || 0), 0);
  const totalValue = details.reduce((sum, row) => sum + Number(row?.value || 0), 0);
  const approved = Boolean(master?.is_approved);

  return (
    /* ===== Printable slip (always light, like a real document) ===== */
    <div ref={ref} className="bg-white p-6 text-gray-900" style={{ fontSize }}>
      <PrintStyles />
      <PadPrinting />

      <h2 className="my-4 text-center text-lg font-bold uppercase">Stock In Slip</h2>

      <div className="mb-3 grid grid-cols-2 gap-x-8 gap-y-1">
        <div>
          <b>In No:</b> {master.in_no || '-'}
        </div>
        <div className="text-right">
          <b>Date:</b> {chartDate(master.in_date) || '-'}
        </div>
        <div>
          <b>Reason:</b> {master.reason_name || '-'}
        </div>
        <div className="text-right">
          <b>To Warehouse:</b> {master.warehouse_name || 'Not Applicable'}
        </div>
        <div>
          <b>Came From:</b> {master.party_name || '-'}
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
            <th className="w-24 border border-black px-2 py-1 text-right">Rate</th>
            <th className="w-28 border border-black px-2 py-1 text-right">Value</th>
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
              <td className="border border-black px-2 py-1 text-right">
                {thousandSeparator(Number(row.rate || 0))}
              </td>
              <td className="border border-black px-2 py-1 text-right">
                {thousandSeparator(Number(row.value || 0))}
              </td>
              <td className="border border-black px-2 py-1">{row.note || '-'}</td>
            </tr>
          ))}
          {details.length === 0 && (
            <tr>
              <td colSpan={6} className="border border-black px-2 py-3 text-center">
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
            <td className="border border-black px-2 py-1"></td>
            <td className="border border-black px-2 py-1 text-right font-semibold">
              {thousandSeparator(totalValue)}
            </td>
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

ProductInSlipPrint.displayName = 'ProductInSlipPrint';

export default ProductInSlipPrint;
