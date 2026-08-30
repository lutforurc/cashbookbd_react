import React from 'react';

import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

/**
 * The ageing, on paper — the sheet somebody takes to the telephone.
 *
 * ⚠️ IT CARRIES THE EXPLANATION WITH IT. A printed page outlives the screen it
 * came from, and "0–30 days" means nothing to the person handed it a fortnight
 * later unless the page says what the age is counted from. The note is the same
 * sentence the server sends the screen, so the two cannot drift apart.
 *
 * ⚠️ AND IT PRINTS THE CONTACT. The report exists to be acted on, and a chasing
 * list without a telephone number sends somebody back to another screen for
 * every line.
 */

type Props = {
  side: string;
  asOn: string;
  buckets: string[];
  rows: any[];
  totals: any;
  note?: string;
};

const amount = (value: any) =>
  Number(value ?? 0) ? thousandSeparator(Number(value).toFixed(2)) : '';

const onTheDay = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '';
};

const AgeingPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ side, asOn, buckets, rows, totals, note }, ref) => (
    <div ref={ref} className="print-container hidden print:block">
      <PrintStyles />

      <div className="print-page">
        <PadPrinting />

        <div className="mb-3 text-xs">
          <h1 className="mt-3 text-center text-lg font-bold">
            {side === 'payable' ? 'What We Owe — by age' : 'What Is Owed To Us — by age'}
          </h1>
          <div className="mt-1 text-center">As on {asOn}</div>
        </div>

        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 text-left">
                {side === 'payable' ? 'Supplier' : 'Customer'}
              </th>
              <th className="border border-black px-1 py-1 text-left">Contact</th>
              <th className="border border-black px-1 py-1 text-center">Terms</th>
              <th className="border border-black px-1 py-1 text-right">Not yet due</th>
              {buckets.map((one) => (
                <th key={one} className="border border-black px-1 py-1 text-right">
                  {one}
                </th>
              ))}
              <th className="border border-black px-1 py-1 text-right">Owed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.coa4_id}>
                <td className="border border-black px-1 py-1">
                  {row.party_name || row.name}
                  {row.oldest_due ? (
                    <div className="text-[8px]">
                      oldest due {onTheDay(row.oldest_due)} · {row.oldest_days} day(s)
                    </div>
                  ) : null}
                </td>
                <td className="border border-black px-1 py-1">{row.mobile ?? ''}</td>
                <td className="border border-black px-1 py-1 text-center">
                  {row.credit_days ? `${row.credit_days} d` : 'cash'}
                </td>
                <td className="border border-black px-1 py-1 text-right">{amount(row.not_due)}</td>
                {buckets.map((one) => (
                  <td key={one} className="border border-black px-1 py-1 text-right">
                    {amount(row.buckets?.[one])}
                  </td>
                ))}
                <td className="border border-black px-1 py-1 text-right font-semibold">
                  {amount(row.outstanding)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="border border-black px-1 py-1" colSpan={3}>
                Total
              </td>
              <td className="border border-black px-1 py-1 text-right">{amount(totals.not_due)}</td>
              {buckets.map((one) => (
                <td key={one} className="border border-black px-1 py-1 text-right">
                  {amount(totals[one])}
                </td>
              ))}
              <td className="border border-black px-1 py-1 text-right">
                {amount(totals.outstanding)}
              </td>
            </tr>
          </tfoot>
        </table>

        {note ? <p className="mt-3 text-[8px] leading-snug">{note}</p> : null}

        <div className="mt-10 flex justify-between text-[10px]">
          <div className="border-t border-black px-6 pt-1">Prepared by</div>
          <div className="border-t border-black px-6 pt-1">Checked by</div>
        </div>

        <PrintFooter />
      </div>
    </div>
  ),
);

AgeingPrint.displayName = 'AgeingPrint';

export default AgeingPrint;
