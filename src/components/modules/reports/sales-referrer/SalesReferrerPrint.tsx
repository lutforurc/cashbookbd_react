import React from 'react';
import dayjs from 'dayjs';

import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';

export type PrintColumn = {
  key: string;
  header: string;
  headerClass?: string;
  cellClass?: string;
  render?: (row: any) => any;
};

type Props = {
  report: any;
  /** The screen's own columns, so the paper says exactly what the screen says. */
  columns: PrintColumn[];
  /** The bills under the row the reader has open, printed under the summary. */
  bills?: any[];
  billColumns?: PrintColumn[];
  openLabel?: string;
  fontSize?: number;
};

/**
 * The referrer account on paper -- the shop's own sheet, never the customer's.
 *
 * ⚠️ WHERE THIS PAPER GOES IS THE WHOLE POINT OF THE FEATURE. The invoice must
 * not carry the name, and it does not; this is the sheet the owner settles the
 * commission from, and it is filed with the shop's own papers.
 */
const SalesReferrerPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ report, columns, bills, billColumns, openLabel, fontSize = 9 }, ref) => {
    const rows: any[] = report?.rows ?? [];

    // The screen's widths (w-36, w-40 ...) are pixels sized for a monitor; a
    // row of them ran off the sheet. Only the alignment is kept, and the table
    // shares the paper out itself.
    const align = (c: PrintColumn) => ((c.cellClass ?? '').includes('text-right') ? 'text-right' : 'text-left');
    const cell = (c: PrintColumn) => `border border-gray-900 px-1.5 py-1 ${align(c)}`;

    /**
     * ⚠️ A COLUMN NEED NOT CARRY ITS OWN `render`. The screen's columns are the
     * ones printed here, and a plain column -- Mobile, Voucher# -- names only a
     * key; that is a shape the on-screen table accepts, falling back to
     * `row[key]`. Calling `c.render(row)` regardless threw "c.render is not a
     * function" on the first such column, and because this paper is always
     * mounted (hidden) beside the table, the throw took the whole tree down:
     * the reader saw a blank page rather than a blank cell. So the paper falls
     * back exactly the way the table does.
     *
     * ⚠️ AND IT IS HANDED THE ROW'S PLACE, the way the table hands it over. A
     * column that numbers its rows -- "Sl No." is `(_row, index) => index + 1` --
     * read `undefined + 1` and put NaN on the paper when only the row was passed.
     */
    const value = (c: PrintColumn, row: any, index?: number) =>
      (c.render ? c.render(row, index) : (row ?? {})[c.key]);

    const head = (list: PrintColumn[]) => (
      <thead className="bg-gray-100">
        <tr>
          {list.map((c) => (
            <th key={c.key} className={`border border-gray-900 px-1.5 py-1.5 ${align(c)}`}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
    );

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles orientation="portrait" />

        <div className="print-page">
          <PadPrinting />

          <div className="mb-2">
            <h1 className="text-2xl font-bold text-center">Referer</h1>
            <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
              <div>
                <span className="font-semibold">Report Date:</span>{' '}
                {report?.from ? dayjs(report.from).format('DD/MM/YYYY') : '-'} to{' '}
                {report?.to ? dayjs(report.to).format('DD/MM/YYYY') : '-'}
              </div>
            </div>
          </div>

          <table className="w-full table-fixed border-collapse" style={{ fontSize }}>
            {head(columns)}
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row.referrer_id} className="avoid-break">
                  {columns.map((c) => (
                    <td key={c.key} className={cell(c)}>
                      {value(c, row, rowIndex)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={2} className="border border-gray-900 px-2 py-1 text-right">
                  Total
                </td>
                {columns.slice(2).map((c) => (
                  <td key={c.key} className={cell(c)}>
                    {value(c, report?.grand ?? {})}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>

          {/* The bills behind the row the reader had open when they pressed
              Print -- the sheet the commission is actually worked out on. */}
          {bills?.length && billColumns?.length ? (
            <div className="mt-4">
              <div className="mb-1 text-sm font-semibold">{openLabel}</div>
              <table className="w-full table-fixed border-collapse" style={{ fontSize }}>
                {head(billColumns)}
                <tbody>
                  {bills.map((row, rowIndex) => (
                    <tr key={row.id} className="avoid-break">
                      {billColumns.map((c) => (
                        <td key={c.key} className={cell(c)}>
                          {value(c, row, rowIndex)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <PrintFooter fixed fontSize={fontSize} />
        </div>
      </div>
    );
  },
);

SalesReferrerPrint.displayName = 'SalesReferrerPrint';
export default SalesReferrerPrint;
