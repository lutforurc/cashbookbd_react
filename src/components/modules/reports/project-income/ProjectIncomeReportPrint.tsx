import React from 'react';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import ReportFooter from '../../../utils/utils-functions/ReportFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';

type Section = 'summary' | 'detail' | 'untagged';

type Props = {
  section: Section;
  rows: any[];
  totals: { direct: number; common: number; total: number };
  title?: string;
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

/**
 * Zero and nothing-recorded read the same through thousandSeparator, which
 * turns 0 into a dash. On paper that difference cannot be asked about later, so
 * a real zero is printed as a zero.
 */
const amount = (value: any) => (Number(value) === 0 ? '0.00' : thousandSeparator(Number(value)));

const COLUMNS: Record<Section, { label: string; align?: string; get: (row: any) => React.ReactNode }[]> = {
  summary: [
    { label: 'Project', get: (r) => r.project_name },
    { label: 'Building', align: 'text-right', get: (r) => amount(r.direct_income) },
    { label: 'Project-wide', align: 'text-right', get: (r) => amount(r.common_income) },
    { label: 'Total', align: 'text-right', get: (r) => amount(r.total_income) },
  ],
  detail: [
    { label: 'Project', get: (r) => r.project_name },
    { label: 'Building', get: (r) => r.building_name || 'Whole project' },
    { label: 'Head', get: (r) => r.head_name },
    { label: 'Amount', align: 'text-right', get: (r) => amount(r.amount) },
  ],
  untagged: [
    { label: 'Date', get: (r) => r.vr_date },
    { label: 'Voucher', get: (r) => r.vr_no },
    { label: 'Head', get: (r) => r.head_name },
    { label: 'Remarks', get: (r) => r.remarks },
    { label: 'Amount', align: 'text-right', get: (r) => amount(r.amount) },
  ],
};

const ProjectIncomeReportPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    { section, rows, totals, title = 'Project Income', startDate, endDate, rowsPerPage = 20, fontSize = 10 },
    ref,
  ) => {
    const columns = COLUMNS[section];
    const pages = chunkRows(rows || [], rowsPerPage);

    return (
      <div ref={ref} className="print-root p-8 text-sm text-gray-900" style={{ fontSize: `${fontSize}px` }}>
        <PrintStyles />

        {pages.map((pageRows, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;

          return (
            <div className="print-page" key={pageIndex}>
              <PadPrinting />

              <div className="mb-2 text-center">
                <h2 className="text-base font-bold">{title}</h2>
                {startDate || endDate ? (
                  <p className="text-xs">
                    {startDate} to {endDate}
                  </p>
                ) : null}
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.label}
                        className={`border border-gray-400 px-1 py-1 text-left ${column.align || ''}`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {columns.map((column) => (
                        <td
                          key={column.label}
                          className={`border border-gray-400 px-1 py-1 ${column.align || ''}`}
                        >
                          {column.get(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>

                {/* The total belongs on the last page only; repeating it per
                    page would read as several totals. */}
                {isLastPage ? (
                  <tfoot>
                    <tr className="font-bold">
                      {section === 'summary' ? (
                        <>
                          <td className="border border-gray-400 px-1 py-1">Total</td>
                          <td className="border border-gray-400 px-1 py-1 text-right">
                            {amount(totals.direct)}
                          </td>
                          <td className="border border-gray-400 px-1 py-1 text-right">
                            {amount(totals.common)}
                          </td>
                          <td className="border border-gray-400 px-1 py-1 text-right">
                            {amount(totals.total)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td
                            className="border border-gray-400 px-1 py-1"
                            colSpan={columns.length - 1}
                          >
                            Total
                          </td>
                          <td className="border border-gray-400 px-1 py-1 text-right">
                            {amount(totals.total)}
                          </td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                ) : null}
              </table>

              <p className="mt-2 text-right text-xs">
                Page {pageIndex + 1} of {pages.length}
              </p>

              {!isLastPage ? <div className="page-break" /> : null}
            </div>
          );
        })}

        <ReportFooter />
      </div>
    );
  },
);

ProjectIncomeReportPrint.displayName = 'ProjectIncomeReportPrint';

export default ProjectIncomeReportPrint;
