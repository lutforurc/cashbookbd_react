import React from 'react';
import { useTranslation } from 'react-i18next';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import { dmy, money } from './BuyerDuesReport';

type Props = {
  rows: any[];
  totals: { total: number; received: number; due: number; overdue: number };
  asOf: string;
  rowsPerPage?: number;
  fontSize?: number;
};

/** Buyer Dues & Installments on paper: rows per page 0 = all on one sheet. */
const BuyerDuesReportPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ rows, totals, asOf, rowsPerPage = 0, fontSize = 10 }, ref) => {
    const { t } = useTranslation('common');
    const size = rowsPerPage > 0 ? rowsPerPage : Math.max(rows.length, 1);
    const pages: any[][] = [];
    for (let i = 0; i < rows.length; i += size) pages.push(rows.slice(i, i + size));
    if (!pages.length) pages.push([]);
    const cell = 'border border-gray-700 px-1.5 py-0.5';

    return (
      <div ref={ref} className="buyer-dues-print p-6 text-gray-900 print-root" style={{ fontSize }}>
        <PrintStyles />
        <style>{`@media print { .buyer-dues-print tr { break-inside: avoid; } .buyer-dues-print .bd-sheet + .bd-sheet { break-before: page; } }`}</style>
        <div className="print-page">
          <PadPrinting />
          <div className="mb-2 text-center">
            <h1 className="text-lg font-bold">{t('buyerDues.title')}</h1>
            <div>{t('buyerDues.asOf')}: {asOf}</div>
          </div>
          {pages.map((page, pageIndex) => (
            <div key={pageIndex} className="bd-sheet">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className={`${cell} w-8 text-center`}>#</th>
                    <th className={`${cell} text-left`}>{t('buyerDues.unit')}</th>
                    <th className={`${cell} text-left`}>{t('buyerDues.customer')}</th>
                    <th className={`${cell} text-right`}>{t('buyerDues.total')}</th>
                    <th className={`${cell} text-right`}>{t('buyerDues.received')}</th>
                    <th className={`${cell} text-right`}>{t('buyerDues.due')}</th>
                    <th className={`${cell} text-center`}>{t('buyerDues.installments')}</th>
                    <th className={`${cell} text-left`}>{t('buyerDues.next')}</th>
                    <th className={`${cell} text-right`}>{t('buyerDues.overdue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {page.map((row, index) => (
                    <tr key={row.sale_id}>
                      <td className={`${cell} text-center`}>{pageIndex * size + index + 1}</td>
                      <td className={cell}>{row.unit_no}{row.parking_no ? ` + ${row.parking_no}` : ''}</td>
                      <td className={cell}>{row.customer}{row.mobile ? `, ${row.mobile}` : ''}</td>
                      <td className={`${cell} text-right`}>{money(row.total)}</td>
                      <td className={`${cell} text-right`}>{money(row.received)}</td>
                      <td className={`${cell} text-right`}>{money(row.due)}</td>
                      <td className={`${cell} text-center`}>
                        {Number(row.inst_count) === 0 ? t('buyerDues.noScheduleShort') : `${row.paid_count} / ${row.inst_count}`}
                      </td>
                      <td className={cell}>{row.next_due_date ? `${dmy(row.next_due_date)}, ${money(row.next_due_amount)}` : '-'}</td>
                      <td className={`${cell} text-right`}>
                        {Number(row.overdue_amount) > 0 ? `${money(row.overdue_amount)} (${row.overdue_count})` : '-'}
                      </td>
                    </tr>
                  ))}
                  {pageIndex === pages.length - 1 && (
                    <tr className="bg-gray-100 font-semibold">
                      <td className={cell} colSpan={3}>{t('handover.total')}</td>
                      <td className={`${cell} text-right`}>{money(totals.total)}</td>
                      <td className={`${cell} text-right`}>{money(totals.received)}</td>
                      <td className={`${cell} text-right`}>{money(totals.due)}</td>
                      <td className={cell} colSpan={2}></td>
                      <td className={`${cell} text-right`}>{money(totals.overdue)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
          <PrintFooter fixed fontSize={fontSize} />
        </div>
      </div>
    );
  },
);

BuyerDuesReportPrint.displayName = 'BuyerDuesReportPrint';
export default BuyerDuesReportPrint;
