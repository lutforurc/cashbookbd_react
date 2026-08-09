import React from 'react';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import ReportFooter from '../../../utils/utils-functions/ReportFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';

type Section = 'summary' | 'building' | 'untagged';

type Props = {
  section: Section;
  rows: any[];
  totals: { direct: number; allocated: number; total: number };
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
    {
      label: 'Area (sqft)',
      align: 'text-right',
      get: (r) => (Number(r.total_sqft) > 0 ? amount(r.total_sqft) : 'not recorded'),
    },
    { label: 'Direct', align: 'text-right', get: (r) => amount(r.direct_cost) },
    { label: 'Project-wide', align: 'text-right', get: (r) => amount(r.common_cost) },
    { label: 'Total', align: 'text-right', get: (r) => amount(r.total_cost) },
    {
      label: 'Per sqft',
      align: 'text-right',
      get: (r) => (r.cost_per_sqft === null ? 'no area' : amount(r.cost_per_sqft)),
    },
  ],
  building: [
    { label: 'Project', get: (r) => r.project_name },
    {
      label: 'Building',
      get: (r) =>
        Number(r.building_sqft) > 0
          ? `${r.building_name} (${amount(r.building_sqft)} sqft, ${r.sqft_pct}%)`
          : r.building_name,
    },
    { label: 'Head', get: (r) => r.head },
    { label: 'Direct', align: 'text-right', get: (r) => amount(r.direct_cost) },
    { label: 'Allocated', align: 'text-right', get: (r) => amount(r.allocated_cost) },
    { label: 'Total', align: 'text-right', get: (r) => amount(r.total_cost) },
  ],
  untagged: [
    { label: 'Date', get: (r) => r.vr_date },
    { label: 'Voucher', get: (r) => r.vr_no },
    { label: 'Head', get: (r) => r.head },
    { label: 'Remarks', get: (r) => r.remarks },
    { label: 'Amount', align: 'text-right', get: (r) => amount(r.amount) },
  ],
};

const ProjectCostReportPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    { section, rows, totals, title = 'Project Cost', startDate, endDate, rowsPerPage = 20, fontSize = 10 },
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
                      {section === 'untagged' ? (
                        <>
                          <td className="border border-gray-400 px-1 py-1" colSpan={4}>
                            Total
                          </td>
                          <td className="border border-gray-400 px-1 py-1 text-right">
                            {amount(totals.total)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td
                            className="border border-gray-400 px-1 py-1"
                            colSpan={section === 'summary' ? 2 : 3}
                          >
                            Total
                          </td>
                          <td className="border border-gray-400 px-1 py-1 text-right">
                            {amount(totals.direct)}
                          </td>
                          <td className="border border-gray-400 px-1 py-1 text-right">
                            {amount(totals.allocated)}
                          </td>
                          <td className="border border-gray-400 px-1 py-1 text-right">
                            {amount(totals.total)}
                          </td>
                          {section === 'summary' ? (
                            <td className="border border-gray-400 px-1 py-1" />
                          ) : null}
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

ProjectCostReportPrint.displayName = 'ProjectCostReportPrint';

export default ProjectCostReportPrint;
