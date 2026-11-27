import React from 'react';
import { useTranslation } from 'react-i18next';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';

type Props = {
  rows: any[];
  totals: { total_qty?: number; issue_qty?: number; remaining?: number };
  startDate?: string;
  endDate?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];

  const pages: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    pages.push(data.slice(i, i + size));
  }

  return pages.length ? pages : [[]];
};

const qty = (value: any) => thousandSeparator(Number(value || 0));

const HEAD = ['sn', 'materialsName', 'unit', 'totalQty', 'issueQty', 'remaining'];

const MaterialIssueSummaryPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ rows, totals, startDate, endDate, rowsPerPage = 20, fontSize = 10 }, ref) => {
    const { t } = useTranslation('common');
    const pages = chunkRows(rows || [], rowsPerPage);
    // Kilos and pieces do not add up: a grand total only when every row shares one unit.
    const oneUnit = new Set((rows || []).map((r) => r?.unit_name || '')).size <= 1;

    return (
      <div
        ref={ref}
        className="print-root p-8 text-sm text-gray-900"
        style={{ fontSize: `${fontSize}px` }}
      >
        <PrintStyles />

        {pages.map((pageRows, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;

          return (
            <div className="print-page" key={pageIndex}>
              <PadPrinting />

              <div className="mb-2 text-center">
                <h2 className="text-base font-bold">{t('materialIssueReport.titleSummary')}</h2>
                {startDate || endDate ? (
                  <p className="text-xs">
                    {t('materialIssueReport.dateRange', { from: startDate, to: endDate })}
                  </p>
                ) : null}
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {HEAD.map((label, index) => (
                      <th
                        key={label}
                        className={`border border-gray-400 px-1 py-1 ${
                          index === 1 ? 'text-left' : index === 0 || index === 2 ? 'text-center' : 'text-right'
                        }`}
                      >
                        {t(`materialIssueReport.${label}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, rowIndex) => (
                    <tr key={`${row?.product_id ?? rowIndex}-${rowIndex}`}>
                      <td className="border border-gray-400 px-1 py-1 text-center">
                        {row?.sl ?? pageIndex * Math.max(rowsPerPage, 1) + rowIndex + 1}
                      </td>
                      <td className="border border-gray-400 px-1 py-1">{row?.product_name || ''}</td>
                      <td className="border border-gray-400 px-1 py-1 text-center">
                        {row?.unit_name || ''}
                      </td>
                      <td className="border border-gray-400 px-1 py-1 text-right">
                        {qty(row?.total_qty)}
                      </td>
                      <td className="border border-gray-400 px-1 py-1 text-right">
                        {qty(row?.issue_qty)}
                      </td>
                      <td className="border border-gray-400 px-1 py-1 text-right">
                        {qty(row?.remaining)}
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={HEAD.length} className="border border-gray-400 px-1 py-3 text-center">
                        {t('materialIssueReport.noData')}
                      </td>
                    </tr>
                  ) : null}
                </tbody>

                {isLastPage && oneUnit && (rows?.length || 0) > 0 ? (
                  <tfoot>
                    <tr className="font-bold">
                      <td className="border border-gray-400 px-1 py-1" colSpan={3}>
                        {t('materialIssueReport.total')}
                      </td>
                      <td className="border border-gray-400 px-1 py-1 text-right">
                        {qty(totals?.total_qty)}
                      </td>
                      <td className="border border-gray-400 px-1 py-1 text-right">
                        {qty(totals?.issue_qty)}
                      </td>
                      <td className="border border-gray-400 px-1 py-1 text-right">
                        {qty(totals?.remaining)}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>

              {isLastPage && !oneUnit && (rows?.length || 0) > 0 ? (
                <p className="mt-1 text-xs italic">{t('materialIssueReport.mixedUnits')}</p>
              ) : null}

              <PrintFooter page={pageIndex + 1} total={pages.length} fontSize={fontSize} />

              {!isLastPage ? <div className="page-break" /> : null}
            </div>
          );
        })}
      </div>
    );
  },
);

MaterialIssueSummaryPrint.displayName = 'MaterialIssueSummaryPrint';

export default MaterialIssueSummaryPrint;
