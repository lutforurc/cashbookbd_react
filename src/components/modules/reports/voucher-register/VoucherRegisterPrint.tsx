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
  render: (row: any) => any;
};

type Props = {
  report: any;
  /** The screen's own columns, so the paper says exactly what the screen says. */
  columns: PrintColumn[];
  fontSize?: number;
};

/**
 * The Voucher Register on paper, laid out the way the Cash Book prints: the
 * pad at the top, the title, the range, the table, the foot. A year is at
 * most twelve rows, so it is one sheet and the browser keeps the breaks.
 */
const VoucherRegisterPrint = React.forwardRef<HTMLDivElement, Props>(({ report, columns, fontSize = 9 }, ref) => {
  const months: any[] = report?.months ?? [];

  // ⚠️ The screen's widths (w-36, w-40 ...) are pixels sized for a wide
  // monitor; nine of them side by side ran off the right edge of the sheet.
  // Only the alignment is kept, and the table shares the paper out itself.
  const align = (c: PrintColumn) => (c.cellClass ?? '').includes('text-right') ? 'text-right' : 'text-left';
  const cell = (c: PrintColumn) => `border border-gray-900 px-1.5 py-1 ${align(c)}`;

  return (
    <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
      {/* Landscape: nine figure columns do not fit a portrait sheet at a
          size anybody can read, and the register is a wide paper anyway. */}
      <PrintStyles orientation="landscape" />

      <div className="print-page">
        <PadPrinting />

        <div className="mb-2">
          <h1 className="text-2xl font-bold text-center">Voucher Register</h1>
          <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
            <div>
              <span className="font-semibold">Voucher Type:</span> {report?.voucher_type?.name ?? '-'}
            </div>
            <div>
              <span className="font-semibold">Report Date:</span>{' '}
              {report?.from ? dayjs(report.from).format('DD/MM/YYYY') : '-'} to{' '}
              {report?.to ? dayjs(report.to).format('DD/MM/YYYY') : '-'}
            </div>
          </div>
        </div>

        <table className="w-full table-fixed border-collapse" style={{ fontSize }}>
          <thead className="bg-gray-100">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`border border-gray-900 px-1.5 py-1.5 ${align(c)}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((row) => (
              <tr key={row.month} className="avoid-break">
                {columns.map((c) => (
                  <td key={c.key} className={cell(c)}>
                    {c.render(row)}
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
                  {c.render(report?.grand ?? {})}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>

        <PrintFooter fixed fontSize={fontSize} />
      </div>
    </div>
  );
});

VoucherRegisterPrint.displayName = 'VoucherRegisterPrint';
export default VoucherRegisterPrint;
