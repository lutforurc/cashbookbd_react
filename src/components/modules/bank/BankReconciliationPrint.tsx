import React from 'react';

import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

/**
 * The reconciliation statement, on paper.
 *
 * ⚠️ IT PRINTS THE OUTSTANDING ITEMS, NOT EVERY ENTRY. The four figures are the
 * statement; the list underneath is the evidence for two of them — which cheques
 * have not been presented and which deposits have not been credited. Printing
 * every cleared entry as well would bury that list in a month of ordinary
 * banking, and the cleared ones are on the bank's own statement anyway.
 *
 * ⚠️ SIGNED AT THE FOOT, because a reconciliation nobody has put their name to
 * settles nothing later — which is the only reason one is done at all.
 */

type Props = {
  accountName?: string;
  upTo: string;
  totals: any;
  rows: any[];
  closed: boolean;
};

const onTheDay = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '';
};

const amount = (value: any) => thousandSeparator(Number(value ?? 0).toFixed(2));

const BankReconciliationPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ accountName, upTo, totals, rows, closed }, ref) => (
    <div ref={ref} className="print-container hidden print:block">
      <PrintStyles />

      <div className="print-page">
        <PadPrinting />

        <div className="mb-4 text-xs">
          <h1 className="mt-3 text-center text-lg font-bold">Bank Reconciliation Statement</h1>
          <div className="mt-1 text-center">
            {accountName ? `${accountName} · ` : ''}as at {upTo}
          </div>

          {/* ⚠️ Said on the paper. A statement printed before the month was
              closed is a working paper, not a signed one, and a reader who is
              not told that will file it as the latter. */}
          {!closed ? (
            <div className="mt-1 text-center font-semibold">
              Not closed yet — this is a working copy.
            </div>
          ) : null}
        </div>

        <table className="w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className="py-1">Balance as per the books</td>
              <td className="py-1 text-right">{amount(totals.book_balance)}</td>
            </tr>
            <tr>
              <td className="py-1">Add: cheques written, not yet presented</td>
              <td className="py-1 text-right">{amount(totals.uncleared_out)}</td>
            </tr>
            <tr>
              <td className="py-1">Less: paid in, not yet credited</td>
              <td className="py-1 text-right">{amount(totals.uncleared_in)}</td>
            </tr>
            <tr className="font-semibold">
              <td className="border-t border-black py-1">Balance as it should appear at the bank</td>
              <td className="border-t border-black py-1 text-right">
                {amount(totals.expected_bank)}
              </td>
            </tr>
            <tr>
              <td className="py-1">Balance as per the bank statement</td>
              <td className="py-1 text-right">{amount(totals.statement_balance)}</td>
            </tr>
            <tr className="font-semibold">
              <td className="border-t border-black py-1">Difference</td>
              <td className="border-t border-black py-1 text-right">
                {amount(totals.difference)}
              </td>
            </tr>
          </tbody>
        </table>

        {rows.length ? (
          <>
            <div className="mt-5 text-[11px] font-semibold">
              Items not yet through the bank on {upTo}
            </div>

            <table className="mt-1 w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="border border-black px-1 py-1 text-left">Date</th>
                  <th className="border border-black px-1 py-1 text-left">Voucher</th>
                  <th className="border border-black px-1 py-1 text-left">What it was</th>
                  <th className="border border-black px-1 py-1 text-right">Paid in</th>
                  <th className="border border-black px-1 py-1 text-right">Paid out</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="border border-black px-1 py-1">
                      {onTheDay(String(row.vr_date).slice(0, 10))}
                    </td>
                    <td className="border border-black px-1 py-1">{row.vr_no}</td>
                    <td className="border border-black px-1 py-1">{row.remarks || row.note || ''}</td>
                    <td className="border border-black px-1 py-1 text-right">
                      {Number(row.debit) ? amount(row.debit) : ''}
                    </td>
                    <td className="border border-black px-1 py-1 text-right">
                      {Number(row.credit) ? amount(row.credit) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        <div className="mt-10 flex justify-between text-[10px]">
          <div className="border-t border-black px-6 pt-1">Prepared by</div>
          <div className="border-t border-black px-6 pt-1">Checked by</div>
          <div className="border-t border-black px-6 pt-1">Approved by</div>
        </div>

        <PrintFooter />
      </div>
    </div>
  ),
);

BankReconciliationPrint.displayName = 'BankReconciliationPrint';

export default BankReconciliationPrint;
