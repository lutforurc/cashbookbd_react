import React from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';

type Props = {
  productName?: string;
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

// thousandSeparator prints a genuine zero as a dash, which is what the owner
// asked for on this sheet too.
const qty = (value: any) => thousandSeparator(Number(value || 0));
const dateText = (value?: string | null) =>
  value && dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : '';

/** A ledger row's description in the reader's language, from the API's kind/detail. */
export const describeRow = (row: any, t: (key: string, opts?: any) => string) => {
  const name = row?.detail || '';
  switch (row?.kind) {
    case 'opening':
      return t('materialIssueReport.kind_opening');
    case 'purchase':
      return name ? t('materialIssueReport.kind_purchaseWith', { name }) : t('materialIssueReport.kind_purchase');
    case 'return':
      return t('materialIssueReport.kind_return');
    case 'issue':
      return name ? t('materialIssueReport.kind_issueAt', { name }) : t('materialIssueReport.kind_issue');
    default:
      return row?.description || '';
  }
};

const HEAD = ['sn', 'date', 'description', 'unit', 'totalQty', 'issueQty', 'remaining', 'notes'];

const MaterialIssueProductWisePrint = React.forwardRef<HTMLDivElement, Props>(
  ({ productName, rows, totals, startDate, endDate, rowsPerPage = 20, fontSize = 10 }, ref) => {
    const { t } = useTranslation('common');
    const pages = chunkRows(rows || [], rowsPerPage);

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
                <h2 className="text-base font-bold">{t('materialIssueReport.titleProductWise')}</h2>
                <p className="text-xs font-semibold">{t('materialIssueReport.materialsName')}: {productName || ''}</p>
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
                          index === 2 || index === 7 ? 'text-left' : index === 0 || index === 1 || index === 3 ? 'text-center' : 'text-right'
                        }`}
                      >
                        {t(`materialIssueReport.${label}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, rowIndex) => (
                    <tr key={`${row?.sl ?? rowIndex}-${rowIndex}`}>
                      <td className="border border-gray-400 px-1 py-1 text-center">
                        {row?.sl ?? pageIndex * Math.max(rowsPerPage, 1) + rowIndex + 1}
                      </td>
                      <td className="border border-gray-400 px-1 py-1 text-center">
                        {dateText(row?.date)}
                      </td>
                      <td className="border border-gray-400 px-1 py-1">{describeRow(row, t)}</td>
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
                      <td className="border border-gray-400 px-1 py-1">{row?.note || ''}</td>
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

                {/* The total belongs on the last sheet only. */}
                {isLastPage && (rows?.length || 0) > 0 ? (
                  <tfoot>
                    <tr className="font-bold">
                      <td className="border border-gray-400 px-1 py-1" colSpan={4}>
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
                      <td className="border border-gray-400 px-1 py-1" />
                    </tr>
                  </tfoot>
                ) : null}
              </table>

              <PrintFooter page={pageIndex + 1} total={pages.length} fontSize={fontSize} />

              {!isLastPage ? <div className="page-break" /> : null}
            </div>
          );
        })}
      </div>
    );
  },
);

MaterialIssueProductWisePrint.displayName = 'MaterialIssueProductWisePrint';

export default MaterialIssueProductWisePrint;
