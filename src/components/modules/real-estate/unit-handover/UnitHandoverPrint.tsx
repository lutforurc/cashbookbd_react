import React from 'react';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

/**
 * Unit Handover in print. Rows per page 0 ("All") puts the whole building on
 * one sheet; a number cuts the table into sheets of that many rows, each with
 * its own heading row, the total on the last. The type size is the reader's. The state colours print as small dots and
 * the building strip prints in colour (print-color-adjust), the same meaning
 * the screen gives them.
 */

type State = 'handed' | 'sold' | 'landowner' | 'unsold';

const DOT: Record<State, string> = {
  handed: '#6366f1',
  sold: '#fbbf24',
  landowner: '#8b5cf6',
  unsold: '#34d399',
};

const stateOf = (row: any): State =>
  row.handover ? 'handed' : row.sale_id ? 'sold' : row.is_landowner_share ? 'landowner' : 'unsold';

const money = (value: any) => (value === null || value === undefined ? '-' : thousandSeparator(Number(value), 2));

type Props = {
  data: any;
  labels: Record<string, string>;
  stateLabel: Record<State, string>;
  buildingName: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const UnitHandoverPrint = React.forwardRef<HTMLDivElement, Props>(({ data, labels, stateLabel, buildingName, rowsPerPage = 0, fontSize = 10 }, ref) => {
  const rows: any[] = data?.rows || [];
  const fs = fontSize;
  const size = rowsPerPage > 0 ? rowsPerPage : Math.max(rows.length, 1);
  const pages: any[][] = [];
  for (let i = 0; i < rows.length; i += size) pages.push(rows.slice(i, i + size));
  if (!pages.length) pages.push([]);
  const cell = 'border border-gray-700 px-1.5 py-0.5';
  const sum = (pick: (row: any) => any) => rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);
  const counts = rows.reduce(
    (c: Record<State, number>, row) => ({ ...c, [stateOf(row)]: c[stateOf(row)] + 1 }),
    { handed: 0, sold: 0, landowner: 0, unsold: 0 },
  );

  return (
    <div ref={ref} className="unit-handover-print p-6 text-gray-900 print-root" style={{ fontSize: fs }}>
      <PrintStyles />
      <style>
        {`@media print {
            .unit-handover-print, .unit-handover-print * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .unit-handover-print tr { break-inside: avoid; }
            .unit-handover-print .uh-sheet + .uh-sheet { break-before: page; }
          }`}
      </style>

      <div className="print-page">
        <PadPrinting />

        <div className="mb-2 text-center">
          <h1 className="text-lg font-bold">{labels.title}</h1>
          <div className="mt-0.5">
            {buildingName}
            {data?.building?.completed_on ? ` — ${labels.completedOn}` : ` — ${labels.notCompleteShort}`}
          </div>
        </div>

        <div className="mb-2 flex justify-between gap-4">
          <div>
            <span className="font-semibold">{labels.buildingCost}:</span> {money(data?.cost?.total)}
            <span className="ml-2 text-gray-600">({labels.costSplit})</span>
          </div>
          <div className="flex gap-3">
            {(Object.keys(DOT) as State[]).map((state) => (
              <span key={state} className="flex items-center gap-1">
                <span style={{ background: DOT[state], width: 7, height: 7, borderRadius: 9999, display: 'inline-block' }} />
                {stateLabel[state]} {counts[state]}
              </span>
            ))}
          </div>
        </div>

        {/* The building strip, as on the screen. */}
        <div className="mb-2 flex w-full overflow-hidden border border-gray-700" style={{ height: 10 }}>
          {rows.map((row) => (
            <div
              key={row.unit_id}
              style={{
                width: `${Math.max(Number(row.share) * 100, 0.6)}%`,
                background: DOT[stateOf(row)],
                borderRight: '1px solid #fff',
              }}
            />
          ))}
        </div>

        {pages.map((page, pageIndex) => (
        <div key={pageIndex} className="uh-sheet">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className={`${cell} w-8 text-center`}>{labels.slNo}</th>
              <th className={`${cell} text-left`}>{labels.unit}</th>
              <th className={`${cell} text-left`}>{labels.customer}</th>
              <th className={`${cell} text-right`}>{labels.salePrice}</th>
              <th className={`${cell} text-right`}>{labels.received}</th>
              <th className={`${cell} text-right`}>{labels.due}</th>
              <th className={`${cell} text-right`}>{labels.share}</th>
              <th className={`${cell} text-right`}>{labels.cost}</th>
              <th className={`${cell} text-left`}>{labels.state}</th>
            </tr>
          </thead>
          <tbody>
            {page.map((row, index) => {
              const state = stateOf(row);
              return (
                <tr key={row.unit_id}>
                  <td className={`${cell} text-center`}>{pageIndex * size + index + 1}</td>
                  <td className={cell}>
                    {row.unit_no}
                    {row.parking_no ? ` + ${row.parking_no}` : ''}
                  </td>
                  <td className={cell}>{row.is_landowner_share ? labels.landowner : row.customer || '-'}</td>
                  <td className={`${cell} text-right`}>{money(row.sale_total)}</td>
                  <td className={`${cell} text-right`}>{money(row.received)}</td>
                  <td className={`${cell} text-right`}>{money(row.due)}</td>
                  <td className={`${cell} text-right`}>{(Number(row.share) * 100).toFixed(2)}%</td>
                  <td className={`${cell} text-right`}>{money(row.handover ? row.handover.cost : row.cost)}</td>
                  <td className={cell}>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <span style={{ background: DOT[state], width: 6, height: 6, borderRadius: 9999, display: 'inline-block' }} />
                      {stateLabel[state]}
                      {row.handover ? ` ${row.handover.date}${row.handover.vr_no ? `, ${row.handover.vr_no}` : ''}` : ''}
                    </span>
                  </td>
                </tr>
              );
            })}
            {pageIndex === pages.length - 1 && (
            <tr className="bg-gray-100 font-semibold">
              <td className={cell} colSpan={3}>{labels.total}</td>
              <td className={`${cell} text-right`}>{money(sum((r) => r.sale_total))}</td>
              <td className={`${cell} text-right`}>{money(sum((r) => r.received))}</td>
              <td className={`${cell} text-right`}>{money(sum((r) => r.due))}</td>
              <td className={`${cell} text-right`}>{(sum((r) => r.share) * 100).toFixed(2)}%</td>
              <td className={`${cell} text-right`}>{money(sum((r) => (r.handover ? r.handover.cost : r.cost)))}</td>
              <td className={cell}></td>
            </tr>
            )}
          </tbody>
        </table>
        </div>
        ))}

        <PrintFooter fixed fontSize={fs} />
      </div>
    </div>
  );
});

UnitHandoverPrint.displayName = 'UnitHandoverPrint';
export default UnitHandoverPrint;
