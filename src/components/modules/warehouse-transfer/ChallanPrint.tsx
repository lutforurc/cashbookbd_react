import React from 'react';
import dayjs from 'dayjs';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

type Props = {
  master: any;
  details: any[];
  fontSize?: number;
  // The same layout prints both sides of a transfer, so the heading is passed
  // in: a challan when goods leave, a receive note when they arrive.
  title?: string;
};

// The transport column stores the transport input as `reference` and the note
// as `notes` (see WarehouseTransferController::apiTransferDetails).
const ChallanPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ master, details, fontSize = 11, title = 'Delivery Challan' }, ref) => {
    if (!master) {
      return <div ref={ref}>No challan data.</div>;
    }

    const rawDate = master?.challan_date || master?.vr_date;
    const challanDate = rawDate ? dayjs(rawDate).format('DD/MM/YYYY') : '';
    const rows = Array.isArray(details) ? details : [];

    // An issue detail fills issued_qty/stock_out; a receive detail fills
    // received_qty/stock_in and leaves the other pair 0 — so pick the first
    // non-zero of the four (|| skips both null and 0, unlike ??).
    const lineQty = (d: any) =>
      Number(d?.issued_qty) ||
      Number(d?.received_qty) ||
      Number(d?.stock_out) ||
      Number(d?.stock_in) ||
      0;

    const totalQty = rows.reduce((sum, d) => sum + lineQty(d), 0);
    const totalDamaged = rows.reduce((sum, d) => sum + Number(d?.damaged_qty ?? 0), 0);
    const totalShort = rows.reduce((sum, d) => sum + Number(d?.short_qty ?? 0), 0);

    const Meta = ({ label, value }: { label: string; value: any }) => (
      <div className="flex gap-1">
        <span className="font-semibold whitespace-nowrap">{label}:</span>
        <span>{value || '-'}</span>
      </div>
    );

    return (
      <div ref={ref} className="print-root text-gray-900" style={{ fontSize }}>
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 8mm 10mm 8mm;
            }
            .print-root {
              padding: 0 !important;
            }
          }
        `}</style>

        <PadPrinting />

        <h1
          className="text-center font-bold uppercase mt-3 mb-4"
          style={{ fontSize: fontSize + 6 }}
        >
          {title}
        </h1>

        {/* Meta: challan/voucher/date on one side, branches on the other. */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-3">
          <Meta label="Challan No" value={master?.challan_number} />
          <Meta label="From Branch" value={master?.from_branch_name} />
          <Meta label="Voucher No" value={master?.vr_no} />
          <Meta label="To Branch" value={master?.to_branch_name} />
          <Meta label="Date" value={challanDate} />
          <Meta label="Transport" value={master?.reference} />
          <Meta label="Receiver" value={master?.receiver_name} />
          <Meta label="Receiver Mobile" value={master?.receiver_mobile_number} />
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 text-center w-10">#</th>
              <th className="border border-black px-2 py-1 text-left">Product</th>
              <th className="border border-black px-2 py-1 text-right w-24">Qty</th>
              <th className="border border-black px-2 py-1 text-right w-28">Damaged</th>
              <th className="border border-black px-2 py-1 text-right w-24">Short</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((d, i) => (
                <tr key={d?.id ?? i}>
                  <td className="border border-black px-2 py-1 text-center">{i + 1}</td>
                  <td className="border border-black px-2 py-1 text-left">{d?.product_name || '-'}</td>
                  <td className="border border-black px-2 py-1 text-right">
                    {thousandSeparator(lineQty(d))}
                  </td>
                  <td className="border border-black px-2 py-1 text-right">
                    {thousandSeparator(Number(d?.damaged_qty ?? 0))}
                  </td>
                  <td className="border border-black px-2 py-1 text-right">
                    {thousandSeparator(Number(d?.short_qty ?? 0))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black px-2 py-3 text-center" colSpan={5}>
                  No product on this challan.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="border border-black px-2 py-1 text-right" colSpan={2}>
                Total
              </td>
              <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totalQty)}</td>
              <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totalDamaged)}</td>
              <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totalShort)}</td>
            </tr>
          </tfoot>
        </table>

        {master?.notes ? (
          <div className="mt-3">
            <span className="font-semibold">Note: </span>
            {master.notes}
          </div>
        ) : null}

        <div className="mt-12 grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="border-t border-black pt-1">Delivered By</div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-1">Driver</div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-1">Received By</div>
          </div>
        </div>
      </div>
    );
  },
);

ChallanPrint.displayName = 'ChallanPrint';

export default ChallanPrint;
