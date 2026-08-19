import React from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

type ReportEntry = {
  year?: string;
  debit?: number | string;
  credit?: number | string;
  qty?: number | string;
  total?: number | string;
};

type ReportSection = {
  title: string;
  rows: Record<string, ReportEntry[]>;
};

type Props = {
  title?: string;
  startDate?: string;
  endDate?: string;
  sections: ReportSection[];
  months: string[];
  rowsPerPage?: number;
  fontSize?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const chunks: T[][] = [];
  for (let index = 0; index < data.length; index += size) {
    chunks.push(data.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
};

const amountText = (value: number) => (value > 0 ? thousandSeparator(value) : '-');

const pairForMonth = (entries: ReportEntry[], month: string, isPurchase: boolean) =>
  entries
    .filter((entry) => entry.year === month)
    .reduce(
      (sum, entry) => ({
        left: sum.left + Number((isPurchase ? entry.qty : entry.debit) || 0),
        right: sum.right + Number((isPurchase ? entry.total : entry.credit) || 0),
      }),
      { left: 0, right: 0 },
    );

const buildTotals = (
  rows: [string, ReportEntry[]][],
  months: string[],
  isPurchase: boolean,
) => {
  const monthTotals = months.reduce<Record<string, { left: number; right: number }>>((totals, month) => {
    totals[month] = { left: 0, right: 0 };
    return totals;
  }, {});
  let grandLeft = 0;
  let grandRight = 0;

  rows.forEach(([, entries]) => {
    months.forEach((month) => {
      const pair = pairForMonth(entries, month, isPurchase);
      monthTotals[month].left += pair.left;
      monthTotals[month].right += pair.right;
      grandLeft += pair.left;
      grandRight += pair.right;
    });
  });

  return { monthTotals, grandLeft, grandRight };
};

const valueColumnWidth = (hasValue: boolean, fontSize: number) => {
  if (!hasValue) return `${Math.max(18, fontSize * 2.4)}px`;
  return `${Math.max(44, fontSize * 6.2)}px`;
};

const GroupReportPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      title = 'Group Report',
      startDate,
      endDate,
      sections,
      months,
      rowsPerPage = 14,
      fontSize,
    },
    ref,
  ) => {
    const fs = Number.isFinite(fontSize) ? Number(fontSize) : 8;
    const pages = sections.flatMap((section) => {
      const rows = Object.entries(section.rows || {});
      const chunks = chunkRows(rows, rowsPerPage);
      return chunks.map((pageRows, pageIndex) => ({
        section,
        sectionRows: rows,
        pageRows,
        pageIndex,
        pageCount: chunks.length,
      }));
    });

    return (
      <div ref={ref} className="print-root p-8 text-sm text-gray-900">
        <PrintStyles orientation="landscape" />
        <style>
          {`
            @media print {
              .group-report-print-page {
                min-height: var(--print-page-height) !important;
              }
            }
          `}
        </style>

        {pages.length ? pages.map(({ section, sectionRows, pageRows, pageIndex, pageCount }, pageNumber) => {
          const isPurchase = section.title === 'Purchase Cost';
          const leftHeader = isPurchase ? 'Qty' : 'Payment';
          const rightHeader = isPurchase ? 'Amount' : 'Bill';
          const pageTotals = buildTotals(pageRows, months, isPurchase);
          const sectionTotals = buildTotals(sectionRows, months, isPurchase);
          const isLastSectionPage = pageIndex === pageCount - 1;
          const footerTotals = isLastSectionPage ? sectionTotals : pageTotals;
          const monthColumnWidths = months.reduce<Record<string, { left: string; right: string }>>((widths, month) => {
            widths[month] = {
              left: valueColumnWidth(sectionTotals.monthTotals[month].left > 0, fs),
              right: valueColumnWidth(sectionTotals.monthTotals[month].right > 0, fs),
            };
            return widths;
          }, {});
          const lineTotalLeftWidth = valueColumnWidth(sectionTotals.grandLeft > 0, fs);
          const lineTotalRightWidth = valueColumnWidth(sectionTotals.grandRight > 0, fs);

          return (
            <div key={`${section.title}-${pageNumber}`} className="print-page group-report-print-page">
              <PadPrinting />
              <div className="">
                <h1 className="text-center text-2xl font-bold">{title}</h1>
                <div className="flex items-center justify-between gap-4 text-xs">
                  <div className="text-sm font-semibold">{section.title}</div>
                  <div className="text-right">
                    <span className="font-semibold">Report Date:</span> {startDate || '-'} to {endDate || '-'}
                  </div>
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '180px' }} />
                    {months.map((month) => (
                      <React.Fragment key={`${month}-cols`}>
                        <col style={{ width: monthColumnWidths[month].left }} />
                        <col style={{ width: monthColumnWidths[month].right }} />
                      </React.Fragment>
                    ))}
                    <col style={{ width: lineTotalLeftWidth }} />
                    <col style={{ width: lineTotalRightWidth }} />
                  </colgroup>
                  <thead className="bg-gray-100">
                    <tr>
                      <th
                        rowSpan={2}
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-1 py-1 text-left align-middle"
                      >
                        Description
                      </th>
                      {months.map((month) => (
                        <th
                          key={month}
                          colSpan={2}
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-1 py-1 text-center"
                        >
                          {month}
                        </th>
                      ))}
                      <th
                        colSpan={2}
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-1 py-1 text-center"
                      >
                        Line Total
                      </th>
                    </tr>
                    <tr>
                      {months.map((month) => (
                        <React.Fragment key={`${month}-head`}>
                          <th style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-center">{leftHeader}</th>
                          <th style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-center">{rightHeader}</th>
                        </React.Fragment>
                      ))}
                      <th style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-center">{leftHeader}</th>
                      <th style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-center">{rightHeader}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length ? pageRows.map(([name, entries], index) => {
                      let rowLeft = 0;
                      let rowRight = 0;
                      const description = isPurchase
                        ? `(${pageIndex * rowsPerPage + index + 1}) ${name}`
                        : name;

                      return (
                        <tr key={name} className="avoid-break align-top">
                          <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1">
                            {description}
                          </td>
                          {months.map((month) => {
                            const pair = pairForMonth(entries, month, isPurchase);
                            rowLeft += pair.left;
                            rowRight += pair.right;

                            return (
                              <React.Fragment key={`${name}-${month}`}>
                                <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">{amountText(pair.left)}</td>
                                <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">{amountText(pair.right)}</td>
                              </React.Fragment>
                            );
                          })}
                          <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">{amountText(rowLeft)}</td>
                          <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">{amountText(rowRight)}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td
                          colSpan={(months.length * 2) + 3}
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-6 text-center text-gray-500"
                        >
                          No data found
                        </td>
                      </tr>
                    )}
                    <tr className="font-bold">
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">
                        {isLastSectionPage ? 'Grand Total' : 'Page Total'}
                      </td>
                      {months.map((month) => (
                        <React.Fragment key={`${month}-total`}>
                          <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">{amountText(footerTotals.monthTotals[month].left)}</td>
                          <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">{amountText(footerTotals.monthTotals[month].right)}</td>
                        </React.Fragment>
                      ))}
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">{amountText(footerTotals.grandLeft)}</td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">{amountText(footerTotals.grandRight)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <PrintFooter page={pageNumber + 1} total={pages.length} fontSize={fs} />

              {pageNumber !== pages.length - 1 && <div className="page-break" />}
            </div>
          );
        }) : (
          <div className="print-page group-report-print-page">
            <PadPrinting />
            <h1 className="text-center text-2xl font-bold">{title}</h1>
            <div className="mt-6 text-center text-sm text-gray-500">No data found</div>
          </div>
        )}
      </div>
    );
  },
);

GroupReportPrint.displayName = 'GroupReportPrint';
export default GroupReportPrint;
