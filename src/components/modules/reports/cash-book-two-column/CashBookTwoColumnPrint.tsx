import React from 'react';
import dayjs from 'dayjs';

import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

type Props = {
  report: any;
  branchName?: string;
  fontSize?: number;
  rowsPerPage?: number;
};

const money = (value: any) => {
  const amount = Number(value || 0);
  return amount ? thousandSeparator(amount) : '';
};

const day = (value: any) => (value ? dayjs(value).format('DD-MMM-YY') : '');

const chunkRows = <T,>(rows: T[], size: number): T[][] => {
  if (size <= 0) return [rows];
  const pages: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    pages.push(rows.slice(index, index + size));
  }
  return pages.length ? pages : [[]];
};

/**
 * The cash book as it goes on paper.
 *
 * ⚠️ Balance BD on the FIRST page and the totals with Balance C/D on the LAST.
 * A page total repeated on every sheet would read as four more balances, and a
 * balance brought down twice is the one thing nobody can reconcile.
 */
const CashBookTwoColumnPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ report, branchName, fontSize = 10, rowsPerPage = 22 }, ref) => {
    if (!report) return <div ref={ref} />;

    const rows: any[] = report.rows ?? [];
    const pages = chunkRows(rows, rowsPerPage);
    const fs = `${fontSize}px`;

    const cell = 'border border-black px-1 py-0.5';
    const figure = `${cell} text-right`;

    return (
      <div ref={ref} className="text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pageIndex) => {
          const isFirst = pageIndex === 0;
          const isLast = pageIndex === pages.length - 1;

          return (
            <div key={pageIndex} className="print-page">
              <PadPrinting />

              <div className="mb-1 text-center">
                <div className="text-base font-bold">Cash &amp; Bank Book</div>
                <div style={{ fontSize: fs }}>
                  {branchName ? branchName + ' — ' : ''}
                  {day(report.from)} to {day(report.to)}
                </div>
              </div>

              <table className="w-full border-collapse" style={{ fontSize: fs }}>
                <thead>
                  <tr>
                    <th rowSpan={2} className={`${cell} text-center`}>Date</th>
                    <th rowSpan={2} className={`${cell} text-center`}>Voucher#</th>
                    <th rowSpan={2} className={`${cell} text-center`}>Description</th>
                    <th colSpan={2} className={`${cell} text-center`}>Debit</th>
                    <th colSpan={2} className={`${cell} text-center`}>Credit</th>
                  </tr>
                  <tr>
                    <th className={`${cell} text-center`}>Cash</th>
                    <th className={`${cell} text-center`}>Bank</th>
                    <th className={`${cell} text-center`}>Cash</th>
                    <th className={`${cell} text-center`}>Bank</th>
                  </tr>
                </thead>

                <tbody>
                  {isFirst ? (
                    <tr className="font-bold">
                      <td className={cell}>{day(report.from)}</td>
                      <td className={cell} />
                      <td className={cell}>Balance BD</td>
                      <td className={figure}>{money(report.opening?.cash_debit)}</td>
                      <td className={figure}>{money(report.opening?.bank_debit)}</td>
                      <td className={figure}>{money(report.opening?.cash_credit)}</td>
                      <td className={figure}>{money(report.opening?.bank_credit)}</td>
                    </tr>
                  ) : null}

                  {pageRows.map((row: any) => (
                    <tr key={row.mtm_id} className="avoid-break align-top">
                      <td className={`${cell} whitespace-nowrap`}>{day(row.vr_date)}</td>
                      <td className={`${cell} whitespace-nowrap`}>{row.vr_no}</td>
                      <td className={cell}>
                        <div>
                          {row.description}
                          {row.is_contra ? <span className="font-bold"> (C)</span> : null}
                        </div>
                        {row.note && !row.is_contra ? (
                          <div style={{ fontSize: `${Math.max(7, fontSize - 2)}px` }}>({row.note})</div>
                        ) : null}
                      </td>
                      <td className={figure}>{money(row.debit_cash)}</td>
                      <td className={figure}>{money(row.debit_bank)}</td>
                      <td className={figure}>{money(row.credit_cash)}</td>
                      <td className={figure}>{money(row.credit_bank)}</td>
                    </tr>
                  ))}

                  {isLast ? (
                    <>
                      <tr className="font-bold">
                        <td colSpan={3} className={`${cell} text-right`}>Total</td>
                        <td className={figure}>{money(report.totals?.debit_cash)}</td>
                        <td className={figure}>{money(report.totals?.debit_bank)}</td>
                        <td className={figure}>{money(report.totals?.credit_cash)}</td>
                        <td className={figure}>{money(report.totals?.credit_bank)}</td>
                      </tr>
                      <tr className="font-bold">
                        <td colSpan={3} className={`${cell} text-right`}>Balance C/D</td>
                        <td className={figure}>{money(report.closing?.cash > 0 ? report.closing.cash : 0)}</td>
                        <td className={figure}>{money(report.closing?.bank > 0 ? report.closing.bank : 0)}</td>
                        <td className={figure}>{money(report.closing?.cash < 0 ? Math.abs(report.closing.cash) : 0)}</td>
                        <td className={figure}>{money(report.closing?.bank < 0 ? Math.abs(report.closing.bank) : 0)}</td>
                      </tr>
                    </>
                  ) : null}
                </tbody>
              </table>

              <PrintFooter page={pageIndex + 1} total={pages.length} fontSize={fontSize} />

              {!isLast ? <div className="page-break" /> : null}
            </div>
          );
        })}
      </div>
    );
  },
);

CashBookTwoColumnPrint.displayName = 'CashBookTwoColumnPrint';

export default CashBookTwoColumnPrint;
