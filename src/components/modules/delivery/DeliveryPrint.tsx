import React, { forwardRef } from 'react';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';

/**
 * The delivery slip, printed from the browser.
 *
 * ⚠️ IT IS HEADED BY THE SAME PAD THE CASH BOOK IS. The paper goes out under
 * the branch's own letterhead -- company at the top, then the branch the goods
 * left -- rather than a bare title on a blank sheet, so a challan filed beside
 * a cash book carries the same masthead. PadPrinting, PrintStyles and
 * PrintFooter are the shared pieces that draw it; this screen adds only the
 * challan's own heading and figures.
 *
 * The layout stays a plain built-in one -- the branch's saved "Delivery
 * Challan" template is fetched with the data (print-data returns `layout`) and
 * can be drawn the same way the invoice paper is, later. What matters on the
 * paper is the number it went out under, the date, and the quantities --
 * including a partial trip.
 */
const DeliveryPrint = forwardRef<HTMLDivElement, { data: any }>(({ data }, ref) => {
  const delivery = data?.delivery;
  const voucher = data?.voucher;
  const lines = delivery?.details || [];

  if (!delivery) {
    return <div ref={ref} />;
  }

  return (
    <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
      <PrintStyles />

      <div className="print-page">
        {/* The pad is stationery -- the same three lines at the same size on
            every paper the branch prints, and the Cash Book's own header. */}
        <div style={{ fontSize: '1rem' }}>
          <PadPrinting />
        </div>

        <h1 className="mt-3 mb-4 text-center text-2xl font-bold uppercase">
          Delivery Challan
        </h1>

        <div className="mb-2 flex justify-between">
          <div>
            <div>
              <strong>Vr. No.:</strong> {voucher?.vr_no || '-'}
            </div>
            <div>
              <strong>Date:</strong> {delivery.delivery_date || '-'}
            </div>
          </div>
          <div className="text-right">
            <div>
              <strong>Challan:</strong> {delivery.challan_no || '-'}
            </div>
            <div>
              <strong>Vehicle:</strong> {delivery.vehicle_no || '-'}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div>
            <strong>Customer:</strong> {delivery.customer?.name || '-'}
          </div>
          {delivery.driver_name ? (
            <div>
              <strong>Driver:</strong> {delivery.driver_name} {delivery.driver_mobile || ''}
            </div>
          ) : null}
          {delivery.receiver_name ? (
            <div>
              <strong>Receiver:</strong> {delivery.receiver_name} {delivery.receiver_mobile || ''}
            </div>
          ) : null}
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr>
              <th className="border border-black px-1 text-center">Sl.</th>
              <th className="border border-black px-1 text-left">Product</th>
              <th className="border border-black px-1 text-right">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line: any, index: number) => (
              <tr key={line.id ?? index}>
                <td className="border border-black px-1 text-center">{index + 1}</td>
                <td className="border border-black px-1">
                  {line.product?.name || line.product_id}
                </td>
                <td className="border border-black px-1 text-right">{line.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {delivery.notes ? <div className="mt-3">Note: {delivery.notes}</div> : null}

        <div className="mt-10 flex justify-between">
          <div>Receiver's Signature</div>
          <div>Authorised Signature</div>
        </div>

        <PrintFooter />
      </div>
    </div>
  );
});

export default DeliveryPrint;
