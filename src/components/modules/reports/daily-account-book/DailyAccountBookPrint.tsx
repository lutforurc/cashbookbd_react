import React from 'react';
import dayjs from 'dayjs';

import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

type Props = {
  report: any;
  fontSize?: number;
  rowsPerPage?: number;
};

const money = (value: any) => {
  const amount = Number(value || 0);
  return amount ? thousandSeparator(amount) : '';
};

const day = (value: any) => (value ? dayjs(value).format('DD/MM/YYYY') : '');

/**
 * A section's rows, cut into page-sized blocks.
 *
 * ⚠️ EVERY BLOCK CARRIES ITS OWN HEADING. The browser repeats a <thead> when a
 * table runs over a sheet, and a block that had none would print as a column of
 * figures with nothing over them -- which on a day of three hundred receipts is
 * the sheet somebody has to read.
 */
const chunkRows = <T,>(rows: T[], size: number): T[][] => {
  if (size <= 0) return [rows];
  const pages: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    pages.push(rows.slice(index, index + size));
  }
  return pages.length ? pages : [[]];
};

/**
 * The day book as it goes on paper.
 *
 * Receipts down the left and payments down the right, each section footed on
 * its own, the two sides footed under themselves, and the closing figure
 * written out at the end of the bank and wallet balances -- the order the desk
 * reads the paper in.
 */
const DailyAccountBookPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ report, fontSize = 10, rowsPerPage = 0 }, ref) => {
    if (!report) return <div ref={ref} />;

    const cell = 'border border-black px-1 py-0.5';
    const figure = `${cell} text-right whitespace-nowrap`;
    const fs = `${fontSize}px`;
    const small = `${Math.max(7, fontSize - 1)}px`;

    const receipt: any[] = report.sections?.receipt ?? [];
    const payment: any[] = report.sections?.payment ?? [];

    // One day reads as one date; a range reads as a range. The desk prints the
    // day book for a single day far more often than for a span, so the common
    // sheet must not carry a "to" that repeats its own date.
    const from = day(report.from);
    const to = day(report.to);
    const period =
      from && to && from !== to ? `${from} to ${to}` : to || from || '-';

    const Section = ({ section }: { section: any }) => {
      const blocks = chunkRows<any>(section.rows ?? [], rowsPerPage);

      return (
        <>
          {blocks.map((block, blockIndex) => (
            <table
              key={`${section.key}-${blockIndex}`}
              className="mb-2 w-full border-collapse avoid-break"
              style={{ fontSize: fs }}
            >
              <thead>
                <tr>
                  <th
                    colSpan={3}
                    className={`${cell} bg-gray-100 text-left`}
                    style={{ fontSize: small }}
                  >
                    {section.title}
                    {blockIndex > 0 ? ' (continued)' : ''}
                  </th>
                </tr>
                <tr>
                  <th className={`${cell} w-8 text-center`}>SL</th>
                  <th className={`${cell} text-left`}>Description</th>
                  <th className={`${cell} w-20 text-center`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {block.map((row: any) => (
                  <tr key={`${section.key}-${row.mtm_id}`}>
                    <td className={`${cell} text-center`}>{row.sl}</td>
                    <td className={cell}>{row.description}</td>
                    <td className={figure}>{money(row.amount)}</td>
                  </tr>
                ))}

                {/* ⚠️ The footing goes on the LAST block only. A Total repeated
                    under every block of one section would read as four totals
                    for four sections, and adding them is the first thing a
                    reader does with the page. */}
                {blockIndex === blocks.length - 1 ? (
                  <tr className="font-bold">
                    <td colSpan={2} className={`${cell} text-right`}>
                      Total
                    </td>
                    <td className={figure}>{money(section.total)}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ))}
        </>
      );
    };

    const BalanceTable = ({ title, table }: { title: string; table: any }) => (
      <table
        className="mb-2 w-full border-collapse avoid-break"
        style={{ fontSize: fs }}
      >
        <thead>
          <tr>
            <th
              colSpan={5}
              className={`${cell} bg-gray-100 text-left`}
              style={{ fontSize: small }}
            >
              {title}
            </th>
          </tr>
          <tr>
            <th className={`${cell} w-8 text-center`}>SL</th>
            <th className={`${cell} text-left`}>Account Name</th>
            <th className={`${cell} text-left`}>Account Number</th>
            <th className={`${cell} text-left`}>Details</th>
            <th className={`${cell} w-28 text-center`}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {(table?.rows ?? []).map((row: any) => (
            <tr key={`${title}-${row.sl}`}>
              <td className={`${cell} text-center`}>{row.sl}</td>
              <td className={cell}>{row.name}</td>
              <td className={cell}>{row.account_number}</td>
              <td className={cell}>{row.details}</td>
              <td className={figure}>{money(row.balance)}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td colSpan={4} className={`${cell} text-right`}>
              Total
            </td>
            <td className={figure}>{money(table?.total)}</td>
          </tr>
        </tbody>
      </table>
    );

    return (
      <div ref={ref} className="text-gray-900 print-root">
        {/* Receipts and payments stand side by side on this sheet, so the two
            of them want every millimetre the sides can give up. */}
        <PrintStyles orientation="portrait" narrowMargins />

        {/* ⚠️ THE LINE IS PINNED, AND THE BAND IT SITS IN IS RESERVED BY A
            REPEATING `<tfoot>`. Neither half works on its own; together they
            are the only arrangement that puts the line at the foot of EVERY
            sheet, the last one included.

            A `position: fixed` footer is not measured from the paper. It is
            positioned against the CONTENT area -- measured, not assumed: on
            this sheet the line lands 10mm from the paper's left edge while the
            rows beside it start at 9mm, which is the content left plus the
            margin PrintStyles had already taken. So on a FULL sheet the line
            prints ACROSS the last row. Raising the bottom margin does not help:
            the content area and the footer rise together, and the collision is
            identical at 5mm and at 10mm.

            But on the LAST sheet the pinned line is right, and that is the
            whole point: `bottom: 0` is the bottom of THAT PAGE's content area,
            which is the foot of the paper however little was printed on it. A
            <tfoot> is wrong there -- the browser repeats it after the last row
            of the final fragment, so a half-full last sheet prints the line
            under the data. Measured: closing balance y=93.7, footer y=103.5.

            So: the tfoot carries a HIDDEN copy of the line, and the real line
            is pinned. On a full sheet the hidden copy takes its own height out
            of the body above it, the last row stops where the band begins, and
            the pinned line lands inside that empty band. On the last sheet the
            hidden copy reserves nothing worth having -- and costs nothing, it
            is blank -- while the pinned line goes to the foot of the paper.

            ⚠️ THE HIDDEN COPY IS A REAL `<PrintFooter>` WITH `invisible`, not a
            spacer with a matching height. `invisible` keeps the layout and
            drops only the paint, so the band is EXACTLY the line's height and
            stays that way when the line's own markup changes.

            ⚠️ AND IT IS NOT FREE. The reserve is real paper, so a day that used
            to spill a few rows onto a second sheet can now need a third for the
            closing block alone. That is the trade for the line never printing
            through a row. */}
        <div className="print-page">
          <table className="flex-1 border-collapse">
            <tfoot>
              <tr>
                <td className="p-0">
                  {/* `pb-1` is the hair of daylight between the last row and
                      the line; without it the two rules touch. */}
                  <div className="invisible pb-1">
                    <PrintFooter fontSize={fontSize} />
                  </div>
                </td>
              </tr>
            </tfoot>

            <tbody>
              <tr>
                <td className="p-0 align-top">
                  <PadPrinting />

                  <div className="mb-2">
                    <h1 className="text-center text-2xl font-bold">
                      Daily Account Book
                    </h1>
                    <div className="mt-1 text-xs">
                      <span className="font-semibold">Report Date:</span>{' '}
                      {period}
                    </div>
                  </div>

                  <div
                    className={`${cell} mb-2 bg-gray-100 font-bold`}
                    style={{ fontSize: fs }}
                  >
                    <div className="flex justify-between">
                      <span>Opening Balance</span>
                      <span>{money(report.opening)}</span>
                    </div>
                  </div>

                  {/* Receipts left, payments right -- the paper's own arrangement, and
              the reason the two sides are read as two books rather than one. */}
                  <div className="flex gap-3">
                    <div className="w-1/2">
                      <div
                        className={`${cell} mb-1 text-center font-bold`}
                        style={{ fontSize: fs }}
                      >
                        RECEIPT
                      </div>
                      {receipt.map((section) => (
                        <Section key={section.key} section={section} />
                      ))}
                    </div>

                    <div className="w-1/2">
                      <div
                        className={`${cell} mb-1 text-center font-bold`}
                        style={{ fontSize: fs }}
                      >
                        PAYMENT
                      </div>
                      {payment.map((section) => (
                        <Section key={section.key} section={section} />
                      ))}
                    </div>
                  </div>

                  {/* ⚠️ TWO TABLES, NOT TWO FLEX BOXES, spaced by the same gap the
              RECEIPT and PAYMENT columns are spaced by. The label and the figure
              have to be two CELLS for one reason: the line between them is the
              cell border, and this is the only way it comes out the same height
              and the same weight as the line in the Total rows above. A single
              border drawn round both would read as one box with a line down it,
              not as two totals. */}
                  <div
                    className="avoid-break mb-3 flex gap-3 font-bold"
                    style={{ fontSize: fs }}
                  >
                    <table className="flex-1 border-collapse">
                      <tbody>
                        <tr>
                          <td className={cell}>Total Receipt Amount</td>
                          <td className={`${figure} w-20`}>
                            {money(report.totals?.receipt)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table className="flex-1 border-collapse">
                      <tbody>
                        <tr>
                          <td className={cell}>Total Payment Amount</td>
                          <td className={`${figure} w-20`}>
                            {money(report.totals?.payment)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <BalanceTable
                    title="Closing Bank Balance"
                    table={report.banks}
                  />
                  <BalanceTable
                    title="Mobile Bank Balance"
                    table={report.mobiles}
                  />

                  <table
                    className="w-full border-collapse avoid-break"
                    style={{ fontSize: fs }}
                  >
                    <tbody>
                      <tr className="font-bold">
                        <td className={cell}>Closing Receivable Amount</td>
                        <td className={`${figure} w-32`}>
                          {money(report.closing_receivable)}
                        </td>
                        <td className={cell}>Closing Payable Amount</td>
                        <td className={`${figure} w-32`}>
                          {money(report.closing_payable)}
                        </td>
                      </tr>
                      <tr className="font-bold">
                        <td className={cell}>Closing Balance</td>
                        <td className={`${figure} w-32`}>
                          {money(report.closing)}
                        </td>
                        <td className={cell} />
                        <td className={cell} />
                      </tr>
                    </tbody>
                  </table>

                  {/* The real line. See the note above the tfoot: this one is
                      drawn at the foot of every sheet, and the hidden copy in
                      the tfoot is what keeps a full sheet's last row off it. */}
                  <PrintFooter fixed fontSize={fontSize} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  },
);

DailyAccountBookPrint.displayName = 'DailyAccountBookPrint';

export default DailyAccountBookPrint;
