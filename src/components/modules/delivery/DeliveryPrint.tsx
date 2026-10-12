import React, { forwardRef } from 'react';

/**
 * The delivery slip, printed from the browser.
 *
 * Deliberately a plain built-in layout -- the branch's saved "Delivery Challan"
 * template is fetched with the data (print-data returns `layout`) and can be
 * drawn the same way the invoice paper is, later. What matters on the paper is
 * the number it went out under, the date, and the quantities -- including a
 * partial trip.
 */
const DeliveryPrint = forwardRef<HTMLDivElement, { data: any }>(({ data }, ref) => {
  const delivery = data?.delivery;
  const voucher = data?.voucher;
  const lines = delivery?.details || [];

  if (!delivery) {
    return <div ref={ref} />;
  }

  return (
    <div ref={ref} className="p-6 text-sm text-black">
      <div className="mb-3 text-center">
        <h2 className="text-lg font-bold">Delivery Challan</h2>
      </div>

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
    </div>
  );
});

export default DeliveryPrint;
