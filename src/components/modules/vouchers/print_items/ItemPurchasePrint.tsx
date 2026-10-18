import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

type Props = {
  data: any;
  fontSize?: number;
};

/**
 * The hotel Accounts Transaction bill -- chairs, meat, soap -- as a paper.
 *
 * ⚠️ NOT THE PURCHASE INVOICE. That paper reads `purchase_master`, which this
 * screen never writes; its lines are `item_purchase_lines`, sent beside the
 * voucher by the same `salesPrintData` fetch every other paper uses. The
 * registry picks this paper when those lines are present.
 *
 * "Paid from" is the voucher's credit leg -- Cash, the bank, or the supplier on
 * a credit bill -- read off the ledger rather than carried separately, so the
 * paper cannot disagree with what was posted.
 */
const ItemPurchasePrint = forwardRef<HTMLDivElement, Props>(({ data, fontSize = 11 }, ref) => {
  const lines: any[] = Array.isArray(data?.item_purchase_lines) ? data.item_purchase_lines : [];

  if (!lines.length) {
    return <div ref={ref}>No bill data found</div>;
  }

  const masters = data?.acc_transaction_master;
  const master = Array.isArray(masters) ? masters[0] : masters;
  const legs: any[] = Array.isArray(master?.acc_transaction_details) ? master.acc_transaction_details : [];
  const paidFrom = legs
    .filter((leg: any) => Number(leg?.credit) > 0)
    .map((leg: any) => leg?.coa_l4?.name)
    .filter(Boolean)
    .join(', ');

  const total = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const isCredit = String(data?.vr_no ?? '').startsWith('9-');

  const preparedBy = data?.user?.name ?? '';
  const approvedBy = data?.approved_user?.name ?? '';
  const approvedAt = data?.approved_date ?? '';

  return (
    <div ref={ref} className="print-root bg-white p-6 text-gray-900" style={{ fontSize }}>
      <PrintStyles />
      <PadPrinting />

      <h1 className="my-4 text-center font-bold uppercase" style={{ fontSize: fontSize + 6 }}>
        {isCredit ? 'Credit Purchase' : 'Purchase Voucher'}
      </h1>

      <div className="mb-3 grid grid-cols-2 gap-1">
        <div>
          <b>Voucher No:</b> {data?.vr_no || '-'}
        </div>
        <div className="text-right">
          <b>Date:</b> {data?.vr_date ? dayjs(data.vr_date).format('DD/MM/YYYY') : '-'}
        </div>
        <div>
          <b>{isCredit ? 'Supplier' : 'Paid from'}:</b> {paidFrom || '-'}
        </div>
        <div className="text-right">
          {data?.manual_voucher_no ? (
            <>
              <b>Cheque No:</b> {data.manual_voucher_no}
            </>
          ) : null}
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-8 border border-black px-2 py-1 text-center">SL</th>
            <th className="border border-black px-2 py-1 text-left">Item</th>
            <th className="border border-black px-2 py-1 text-left">Head of Account</th>
            <th className="w-24 border border-black px-2 py-1 text-right">Quantity</th>
            <th className="w-24 border border-black px-2 py-1 text-right">Rate</th>
            <th className="w-28 border border-black px-2 py-1 text-right">Amount (Taka)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id ?? index}>
              <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
              <td className="border border-black px-2 py-1">{line.item_name ?? ''}</td>
              <td className="border border-black px-2 py-1">{line.head_name ?? ''}</td>
              <td className="border border-black px-2 py-1 text-right">
                {Number(line.quantity)} {line.unit_name ?? ''}
              </td>
              <td className="border border-black px-2 py-1 text-right">
                {thousandSeparator(Number(line.rate) || 0)}
              </td>
              <td className="border border-black px-2 py-1 text-right">
                {thousandSeparator(Number(line.amount) || 0)}
              </td>
            </tr>
          ))}

          <tr>
            <td colSpan={5} className="border border-black px-2 py-1 text-right font-semibold">
              Total
            </td>
            <td className="border border-black px-2 py-1 text-right font-semibold">
              {thousandSeparator(total)}
            </td>
          </tr>
        </tbody>
      </table>

      {master?.note ? (
        <div className="mt-2">
          <b>Note:</b> {master.note}
        </div>
      ) : null}

      <div className="mt-16 grid grid-cols-2 gap-x-8 text-xs">
        <div className="text-center">
          <div className="mx-auto w-40 border-t border-black pt-1">Prepared By</div>
          {preparedBy && <div className="mt-1">{preparedBy}</div>}
          {data?.created_at && <div>{dayjs(data.created_at).format('DD/MM/YYYY hh:mm A')}</div>}
        </div>
        <div className="text-center">
          <div className="mx-auto w-40 border-t border-black pt-1">Authorized By</div>
          {approvedBy && <div className="mt-1">{approvedBy}</div>}
          {approvedBy && approvedAt && <div>{dayjs(approvedAt).format('DD/MM/YYYY hh:mm A')}</div>}
        </div>
      </div>

      <PrintFooter fixed />
    </div>
  );
});

ItemPurchasePrint.displayName = 'ItemPurchasePrint';

export default ItemPurchasePrint;
