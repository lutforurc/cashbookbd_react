import React from 'react';

import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';

/**
 * The count, on paper — twice over, and for two different readers.
 *
 * ⚠️ IT IS BOTH THE SHEET TO WALK ROUND WITH AND THE RECORD OF WHAT WAS FOUND.
 * Printed before the count it is a list with empty boxes; printed after, the
 * boxes are filled. One page rather than two, because a store room with no
 * signal is exactly where somebody needs the paper, and a form that has to be
 * printed from a different screen than the results is a form nobody prints.
 *
 * ⚠️ SIGNED AT THE FOOT. A count with nobody's name on it settles no argument
 * later — which is the only reason a count is done at all.
 */

type Row = {
  asset_id: number;
  code: string;
  name: string;
  register_says?: string | null;
  found?: string | null;
  seen_at?: string | null;
  note?: string | null;
};

type Props = {
  branchName?: string;
  countedOn: string;
  rows: Row[];
  summary: { total: number; found: number; missing: number; damaged: number; not_looked: number };
};

const FOUND_NAMES: Record<string, string> = {
  found: 'There',
  missing: 'NOT THERE',
  damaged: 'Damaged',
};

const AssetVerificationPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ branchName, countedOn, rows, summary }, ref) => (
    <div ref={ref} className="print-container hidden print:block">
      <PrintStyles />

      <div className="print-page">
        <PadPrinting />

        <div className="mb-3 text-xs">
          <h1 className="mt-3 text-center text-lg font-bold">Physical Verification of Assets</h1>
          <div className="mt-1 text-center">
            The count of {countedOn}
            {branchName ? ` · ${branchName}` : ''}
          </div>

          <div className="mt-1 text-center">
            {summary.total} asset(s) · there {summary.found} · damaged {summary.damaged} · not
            there {summary.missing} · not looked at {summary.not_looked}
          </div>

          {/* ⚠️ Said on the paper: a sheet showing eleven missing chairs is not
              a sheet that has written eleven chairs off. */}
          {summary.missing ? (
            <div className="mt-1 text-center font-semibold">
              Nothing on this sheet is written off. The missing items are for whoever decides that.
            </div>
          ) : null}
        </div>

        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 text-left">Code</th>
              <th className="border border-black px-1 py-1 text-left">Asset</th>
              <th className="border border-black px-1 py-1 text-left">Register says</th>
              <th className="border border-black px-1 py-1 text-left">Actually at</th>
              <th className="border border-black px-1 py-1 text-center">Found</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.asset_id}>
                <td className="border border-black px-1 py-1 font-mono">{row.code}</td>
                <td className="border border-black px-1 py-1">{row.name}</td>
                <td className="border border-black px-1 py-1">{row.register_says ?? ''}</td>
                {/* Left blank where nobody has said otherwise, so the same sheet
                    can be carried round and written on. */}
                <td className="border border-black px-1 py-1">{row.seen_at ?? ''}</td>
                <td className="border border-black px-1 py-1 text-center font-semibold">
                  {row.found ? FOUND_NAMES[row.found] ?? row.found : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-10 flex justify-between text-[10px]">
          <div className="border-t border-black px-6 pt-1">Counted by</div>
          <div className="border-t border-black px-6 pt-1">Checked by</div>
          <div className="border-t border-black px-6 pt-1">Approved by</div>
        </div>

        <PrintFooter />
      </div>
    </div>
  ),
);

AssetVerificationPrint.displayName = 'AssetVerificationPrint';

export default AssetVerificationPrint;
