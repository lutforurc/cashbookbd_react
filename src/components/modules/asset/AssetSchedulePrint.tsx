import React from 'react';

import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

/**
 * The Schedule of Fixed Assets, on paper.
 *
 * ⚠️ THIS IS THE NOTE THAT GOES WITH THE ACCOUNTS, so it is laid out the way an
 * auditor reads one: cost across the top half, depreciation across the bottom,
 * and the difference at the right-hand end. Read left to right, each half says
 * "what we had, what came, what went, what we have".
 *
 * ⚠️ It prints what the screen was showing — the same figures, from the same
 * answer. Nothing is recomputed here: a printed page that disagreed with the
 * screen it was printed from would be the worst of both.
 */

type Row = {
  category: string;
  rate: number | null;
  assets: number;
  opening_cost: number;
  additions: number;
  disposals_cost: number;
  closing_cost: number;
  opening_dep: number;
  charge: number;
  disposals_dep: number;
  closing_dep: number;
  opening_wdv: number;
  closing_wdv: number;
};

type Props = {
  branchName?: string;
  yearStart: string;
  yearEnd: string;
  rows: Row[];
  total: Row;
  charged: boolean;
};

const onTheDay = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '';
};

const AssetSchedulePrint = React.forwardRef<HTMLDivElement, Props>(
  ({ branchName, yearStart, yearEnd, rows, total, charged }, ref) => (
    <div ref={ref} className="print-container hidden print:block">
      <PrintStyles />

      <div className="print-page">
        <PadPrinting />

        <div className="mb-4 text-xs">
          <h1 className="mt-3 text-center text-lg font-bold">Schedule of Fixed Assets</h1>
          <div className="mt-1 text-center">
            For the year {onTheDay(yearStart)} to {onTheDay(yearEnd)}
            {branchName ? ` · ${branchName}` : ''}
          </div>

          {/* ⚠️ Said on the paper, not left to be worked out. A schedule whose
              year has not been charged yet shows no depreciation for it, and a
              reader who is not told that reads it as a year in which nothing
              wore out. */}
          {!charged ? (
            <div className="mt-1 text-center font-semibold">
              This year has not been charged yet — the depreciation column is empty for that
              reason.
            </div>
          ) : null}
        </div>

        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="border border-gray-800 px-1 py-1 text-left" rowSpan={2}>
                Class of asset
              </th>
              <th className="border border-gray-800 px-1 py-1 text-right" rowSpan={2}>
                Rate
              </th>
              <th className="border border-gray-800 px-1 py-1 text-center" colSpan={4}>
                Cost
              </th>
              <th className="border border-gray-800 px-1 py-1 text-center" colSpan={4}>
                Depreciation
              </th>
              <th className="border border-gray-800 px-1 py-1 text-right" rowSpan={2}>
                Written down
              </th>
            </tr>
            <tr>
              <th className="border border-gray-800 px-1 py-1 text-right">At 1 July</th>
              <th className="border border-gray-800 px-1 py-1 text-right">Additions</th>
              <th className="border border-gray-800 px-1 py-1 text-right">Disposals</th>
              <th className="border border-gray-800 px-1 py-1 text-right">At 30 June</th>
              <th className="border border-gray-800 px-1 py-1 text-right">At 1 July</th>
              <th className="border border-gray-800 px-1 py-1 text-right">For the year</th>
              <th className="border border-gray-800 px-1 py-1 text-right">On disposals</th>
              <th className="border border-gray-800 px-1 py-1 text-right">At 30 June</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.category} className="avoid-break">
                <td className="border border-gray-800 px-1 py-0.5 align-middle">{row.category}</td>
                <td className="border border-gray-800 px-1 py-0.5 text-right align-middle">
                  {row.rate === null ? '' : `${Number(row.rate)}%`}
                </td>
                <td className="border border-gray-800 px-1 py-0.5 text-right align-middle">
                  {thousandSeparator(row.opening_cost)}
                </td>
                <td className="border border-gray-800 px-1 py-0.5 text-right align-middle">
                  {thousandSeparator(row.additions)}
                </td>
                <td className="border border-gray-800 px-1 py-0.5 text-right align-middle">
                  {thousandSeparator(row.disposals_cost)}
                </td>
                <td className="border border-gray-800 px-1 py-0.5 text-right align-middle">
                  {thousandSeparator(row.closing_cost)}
                </td>
                <td className="border border-gray-800 px-1 py-0.5 text-right align-middle">
                  {thousandSeparator(row.opening_dep)}
                </td>
                <td className="border border-gray-800 px-1 py-0.5 text-right align-middle">
                  {thousandSeparator(row.charge)}
                </td>
                <td className="border border-gray-800 px-1 py-0.5 text-right align-middle">
                  {thousandSeparator(row.disposals_dep)}
                </td>
                <td className="border border-gray-800 px-1 py-0.5 text-right align-middle">
                  {thousandSeparator(row.closing_dep)}
                </td>
                <td className="border border-gray-800 px-1 py-0.5 text-right align-middle font-semibold">
                  {thousandSeparator(row.closing_wdv)}
                </td>
              </tr>
            ))}

            <tr className="avoid-break font-bold">
              <td className="border border-gray-800 px-1 py-1 align-middle">Total</td>
              <td className="border border-gray-800 px-1 py-1 align-middle" />
              <td className="border border-gray-800 px-1 py-1 text-right align-middle">
                {thousandSeparator(total.opening_cost)}
              </td>
              <td className="border border-gray-800 px-1 py-1 text-right align-middle">
                {thousandSeparator(total.additions)}
              </td>
              <td className="border border-gray-800 px-1 py-1 text-right align-middle">
                {thousandSeparator(total.disposals_cost)}
              </td>
              <td className="border border-gray-800 px-1 py-1 text-right align-middle">
                {thousandSeparator(total.closing_cost)}
              </td>
              <td className="border border-gray-800 px-1 py-1 text-right align-middle">
                {thousandSeparator(total.opening_dep)}
              </td>
              <td className="border border-gray-800 px-1 py-1 text-right align-middle">
                {thousandSeparator(total.charge)}
              </td>
              <td className="border border-gray-800 px-1 py-1 text-right align-middle">
                {thousandSeparator(total.disposals_dep)}
              </td>
              <td className="border border-gray-800 px-1 py-1 text-right align-middle">
                {thousandSeparator(total.closing_dep)}
              </td>
              <td className="border border-gray-800 px-1 py-1 text-right align-middle">
                {thousandSeparator(total.closing_wdv)}
              </td>
            </tr>
          </tbody>
        </table>

        <PrintFooter />
      </div>
    </div>
  ),
);

AssetSchedulePrint.displayName = 'AssetSchedulePrint';

export default AssetSchedulePrint;
