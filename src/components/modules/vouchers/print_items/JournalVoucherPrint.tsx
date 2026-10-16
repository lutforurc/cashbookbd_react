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
 * A journal voucher's paper — the heads it moved, both directions, and nothing
 * else.
 *
 * ⚠️ THIS ONE IS NEW, AND IT IS THE ONLY PAPER IN THE APP THAT DID NOT ALREADY
 * EXIST SOMEWHERE. Every other voucher type printed from a layout a screen had
 * already drawn; a journal had none, so its number in the Daily Account Book was
 * clickable and answered "Unknown voucher type: 5". The layout below is therefore
 * NOT copied from the shop's own journal paper -- it follows the conventions the
 * papers beside it keep (bordered table, a rule per signature, the approval
 * named only while it still stands), and is expected to be adjusted once the
 * owner has looked at a sheet.
 *
 * ⚠️ THE LEGS COME FROM THE SAME FETCH EVERY OTHER PAPER USES. `salesPrintData`
 * on the server loads `AccTransactionMaster.AccTransactionDetails.coaL4` for
 * every voucher it is asked about, whatever the type -- that is why a journal
 * needs no endpoint of its own.
 */
const JournalVoucherPrint = forwardRef<HTMLDivElement, Props>(({ data, fontSize = 11 }, ref) => {
  const masters = data?.acc_transaction_master;
  const master = Array.isArray(masters) ? masters[0] : masters;
  const legs: any[] = Array.isArray(master?.acc_transaction_details)
    ? master.acc_transaction_details
    : [];

  if (!legs.length) {
    return <div ref={ref}>No journal data found</div>;
  }

  const rows = legs.map((leg: any) => ({
    name: leg?.coa_l4?.name ?? '',
    debit: Number(leg?.debit) || 0,
    credit: Number(leg?.credit) || 0,
    remarks: String(leg?.remarks ?? '').trim(),
  }));

  const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0);

  const preparedBy = data?.user?.name ?? '';
  const approvedBy = data?.approved_user?.name ?? data?.approved_by ?? '';
  const approvedAt = data?.approved_date ?? '';

  return (
    <div ref={ref} className="print-root bg-white p-6 text-gray-900" style={{ fontSize }}>
      <PrintStyles />
      <PadPrinting />

      <h1 className="my-4 text-center font-bold uppercase" style={{ fontSize: fontSize + 6 }}>
        Journal Voucher
      </h1>

      <div className="mb-3 flex justify-between">
        <div>
          <b>Voucher No:</b> {data?.vr_no || '-'}
        </div>
        <div>
          <b>Date:</b> {data?.vr_date ? dayjs(data.vr_date).format('DD/MM/YYYY') : '-'}
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-8 border border-black px-2 py-1 text-center">SL</th>
            <th className="border border-black px-2 py-1 text-left">Head of Account</th>
            <th className="w-32 border border-black px-2 py-1 text-right">Debit (Taka)</th>
            <th className="w-32 border border-black px-2 py-1 text-right">Credit (Taka)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
              <td className="border border-black px-2 py-1">
                {row.name}
                {/* The line's own remark, bracketed, so it reads as a note about
                    the account above rather than as another head. */}
                {row.remarks && <span className="text-gray-700"> ({row.remarks})</span>}
              </td>
              <td className="border border-black px-2 py-1 text-right">
                {row.debit ? thousandSeparator(row.debit) : ''}
              </td>
              <td className="border border-black px-2 py-1 text-right">
                {row.credit ? thousandSeparator(row.credit) : ''}
              </td>
            </tr>
          ))}

          <tr>
            <td colSpan={2} className="border border-black px-2 py-1 text-right font-semibold">
              Total
            </td>
            <td className="border border-black px-2 py-1 text-right font-semibold">
              {thousandSeparator(totalDebit)}
            </td>
            <td className="border border-black px-2 py-1 text-right font-semibold">
              {thousandSeparator(totalCredit)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ⚠️ A JOURNAL THAT DOES NOT BALANCE IS SAID SO ON THE PAPER rather than
          left for whoever is holding it to add up. Nothing in this system should
          produce one; the line is here because a voucher is the one document
          where not noticing costs the most. */}
      {Math.abs(totalDebit - totalCredit) > 0.005 && (
        <div className="mt-2 border border-black px-2 py-1 text-center font-semibold">
          This voucher does not balance: Debit {thousandSeparator(totalDebit)}, Credit{' '}
          {thousandSeparator(totalCredit)}
        </div>
      )}

      <div className="mt-16 grid grid-cols-2 gap-x-8 text-xs">
        <div className="text-center">
          <div className="mx-auto w-40 border-t border-black pt-1">Prepared By</div>
          {preparedBy && <div className="mt-1">{preparedBy}</div>}
          {data?.created_at && <div>{dayjs(data.created_at).format('DD/MM/YYYY hh:mm A')}</div>}
        </div>
        <div className="text-center">
          <div className="mx-auto w-40 border-t border-black pt-1">Authorized By</div>
          {/* The name and the date are printed only while the approval still
              stands -- taking one back clears both, but a stale date has been
              left behind before. */}
          {approvedBy && <div className="mt-1">{approvedBy}</div>}
          {approvedBy && approvedAt && <div>{dayjs(approvedAt).format('DD/MM/YYYY hh:mm A')}</div>}
        </div>
      </div>

      <PrintFooter fixed />
    </div>
  );
});

JournalVoucherPrint.displayName = 'JournalVoucherPrint';

export default JournalVoucherPrint;
