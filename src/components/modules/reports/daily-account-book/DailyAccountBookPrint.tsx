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
                  <th colSpan={4} className={`${cell} bg-gray-100 text-left`} style={{ fontSize: small }}>
                    {section.title}
                    {blockIndex > 0 ? ' (continued)' : ''}
                  </th>
                </tr>
                <tr>
                  <th className={`${cell} w-8 text-center`}>SL</th>
                  <th className={`${cell} w-20 text-center`}>Date</th>
                  <th className={`${cell} text-left`}>Description</th>
                  <th className={`${cell} w-24 text-center`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {block.map((row: any) => (
                  <tr key={`${section.key}-${row.mtm_id}`}>
                    <td className={`${cell} text-center`}>{row.sl}</td>
                    <td className={`${cell} whitespace-nowrap`}>{day(row.vr_date)}</td>
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
                    <td colSpan={3} className={`${cell} text-right`}>
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
      <table className="mb-2 w-full border-collapse avoid-break" style={{ fontSize: fs }}>
        <thead>
          <tr>
            <th colSpan={5} className={`${cell} bg-gray-100 text-left`} style={{ fontSize: small }}>
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
        <PrintStyles orientation="portrait" />

        <div className="print-page">
          <PadPrinting />

          <div className="mb-2">
            <h1 className="text-center text-2xl font-bold">Daily Account Book</h1>
            <div className="mt-1 text-xs">
              <span className="font-semibold">Report Date:</span> {day(report.to) || '-'}
            </div>
          </div>

          <div className={`${cell} mb-2 bg-gray-100 font-bold`} style={{ fontSize: fs }}>
            <div className="flex justify-between">
              <span>Opening Balance</span>
              <span>{money(report.opening)}</span>
            </div>
          </div>

          {/* Receipts left, payments right -- the paper's own arrangement, and
              the reason the two sides are read as two books rather than one. */}
          <div className="flex gap-3">
            <div className="w-1/2">
              <div className={`${cell} mb-1 text-center font-bold`} style={{ fontSize: fs }}>
                RECEIPT
              </div>
              {receipt.map((section) => (
                <Section key={section.key} section={section} />
              ))}
            </div>

            <div className="w-1/2">
              <div className={`${cell} mb-1 text-center font-bold`} style={{ fontSize: fs }}>
                PAYMENT
              </div>
              {payment.map((section) => (
                <Section key={section.key} section={section} />
              ))}
            </div>
          </div>

          <table className="mb-3 w-full border-collapse avoid-break" style={{ fontSize: fs }}>
            <tbody>
              <tr className="font-bold">
                <td className={`${cell} text-right`}>Total Receipt Amount</td>
                <td className={`${figure} w-32`}>{money(report.totals?.receipt)}</td>
              </tr>
              <tr className="font-bold">
                <td className={`${cell} text-right`}>Total Payment Amount</td>
                <td className={`${figure} w-32`}>{money(report.totals?.payment)}</td>
              </tr>
            </tbody>
          </table>

          <BalanceTable title="Closing Bank Balance" table={report.banks} />
          <BalanceTable title="Mobile Bank Balance" table={report.mobiles} />

          <table className="w-full border-collapse avoid-break" style={{ fontSize: fs }}>
            <tbody>
              <tr className="font-bold">
                <td className={cell}>Closing Receivable Amount</td>
                <td className={`${figure} w-32`}>{money(report.closing_receivable)}</td>
                <td className={cell}>Closing Payable Amount</td>
                <td className={`${figure} w-32`}>{money(report.closing_payable)}</td>
              </tr>
              <tr className="font-bold">
                <td className={cell}>Closing Balance</td>
                <td className={`${figure} w-32`}>{money(report.closing)}</td>
                <td className={cell} />
                <td className={cell} />
              </tr>
            </tbody>
          </table>

          <PrintFooter fontSize={fontSize} />
        </div>
      </div>
    );
  },
);

DailyAccountBookPrint.displayName = 'DailyAccountBookPrint';

export default DailyAccountBookPrint;
