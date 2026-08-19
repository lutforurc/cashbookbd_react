import React from 'react';

import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';

type AttendanceMonthlyMatrixPrintProps = {
  monthName: string;
  year: number;
  monthIndex: number;
  days: number[];
  daysInMonth: number;
  reportRows: any[];
  dayTotals: number[];
  grandTotal: number;
  /** Employees per printed sheet. */
  rowsPerPage?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const pad = (value: number) => String(value).padStart(2, '0');
const toDateString = (year: number, monthIndex: number, day: number) => `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

/** Kept in step with the screen: holidays are marked but not totalled. */
const statusTotalValue = (code?: string) => {
  if (code === '✓' || code === '!' || code === 'L') return 1;
  if (code === '½') return 0.5;
  return 0;
};

const formatTotal = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

/**
 * The other branches this sheet has days from, named once each.
 *
 * On screen a boxed day can be hovered to see where it was given; paper has no
 * hovering, so the names are gathered and printed under the legend instead.
 */
const otherBranchNames = (reportRows: any[]): string[] => {
  const names = new Set<string>();

  reportRows.forEach((employee) => {
    Object.values(employee.dateRows ?? {}).forEach((entry: any) => {
      if (entry?.is_other_branch) {
        names.add(entry.attendance_branch_name || entry.branch_name || 'another branch');
      }
    });
  });

  return Array.from(names).sort();
};

const statusClassName = (code?: string) => {
  switch (code) {
    case '✓':
      return 'status-cell status-present';
    case '!':
      return 'status-cell status-late';
    case '✕':
      return 'status-cell status-absent';
    case 'W':
      return 'status-cell status-weekly';
    case 'H':
    case '○':
      return 'status-cell status-holiday';
    case 'L':
      return 'status-cell status-leave';
    case '½':
      return 'status-cell status-half-day';
    default:
      return 'status-cell status-empty';
  }
};

const AttendanceMonthlyMatrixPrint = React.forwardRef<HTMLDivElement, AttendanceMonthlyMatrixPrintProps>(
  ({ monthName, year, monthIndex, days, daysInMonth, reportRows, dayTotals, grandTotal, rowsPerPage = 25 }, ref) => {
    // Cut into sheets here rather than leaving it to the browser: a run of
    // employees broken mid-table left the following pages with no column
    // headings and nothing saying which sheet of the month they were.
    const pages = chunkRows(reportRows || [], rowsPerPage);
    const pageCount = pages.length || 1;

    return (
    <div ref={ref} className="attendance-monthly-print bg-white text-slate-950">
      <PrintStyles />
      <style>
        {`
          .attendance-monthly-print .matrix-header-cell {
            background: #e8eef6;
            color: #0f172a;
          }

          .attendance-monthly-print .status-cell {
            font-weight: 700;
          }

          .attendance-monthly-print .status-present {
            background: #e9f8ee;
            color: #137333;
          }

          /* Pink rather than amber. Leave below is #fff6db, and amber beside it
             was the same chip twice -- see the screen palette in
             AttendanceMonthlyMatrixReport for why pink is what was left. */
          .attendance-monthly-print .status-late {
            background: #fce7f3;
            color: #9d174d;
            box-shadow: inset 0 0 0 1px #ec4899;
          }

          .attendance-monthly-print .status-absent {
            background: #ffe8e8;
            color: #b91c1c;
            box-shadow: inset 0 0 0 1px #ef4444;
          }

          .attendance-monthly-print .status-weekly {
            background: #f1f5f9;
            color: #475569;
          }

          .attendance-monthly-print .status-holiday {
            background: #ede9fe;
            color: #6d28d9;
          }

          .attendance-monthly-print .status-leave {
            background: #fff6db;
            color: #92400e;
          }

          .attendance-monthly-print .status-half-day {
            background: #f3e8ff;
            color: #6b21a8;
          }

          .attendance-monthly-print .total-cell {
            background: #f8fafc;
            color: #0f172a;
          }

          .attendance-monthly-print tfoot td {
            background: #eef2f7;
            color: #0f172a;
          }

          .attendance-monthly-print .legend-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-right: 10px;
            margin-bottom: 4px;
            color: #334155;
          }

          .attendance-monthly-print .legend-mark {
            display: inline-flex;
            min-width: 18px;
            height: 18px;
            align-items: center;
            justify-content: center;
            border: 1px solid #cbd5e1;
            font-size: 11px;
            font-weight: 700;
          }

          /* A day marked at another branch. Boxed rather than tinted, so it
             survives a printer with no colour in it. */
          .attendance-monthly-print .cell-other-branch {
            outline: 2px solid #0f172a;
            outline-offset: -3px;
          }

          @media print {
            @page {
              size: A4 landscape;
              margin: 8mm;
            }

            html,
            body {
              background: #ffffff !important;
            }

            .attendance-monthly-print {
              width: 100% !important;
              overflow: visible !important;
              color: #000000 !important;
              background: #ffffff !important;
              font-family: Arial, Helvetica, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .attendance-monthly-print table {
              width: 100% !important;
              min-width: 0 !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
              font-size: 8px !important;
              line-height: 1.15 !important;
              color: #000000 !important;
            }

            .attendance-monthly-print th,
            .attendance-monthly-print td {
              border: 1px solid #000000 !important;
              padding: 2px 1px !important;
              overflow: hidden !important;
            }

            .attendance-monthly-print .matrix-header-cell {
              background: #e5e7eb !important;
              color: #000000 !important;
            }

            .attendance-monthly-print .serial-cell {
              width: 34px !important;
            }

            .attendance-monthly-print .name-cell {
              width: 128px !important;
              white-space: nowrap !important;
              text-overflow: ellipsis !important;
            }

            .attendance-monthly-print .day-cell {
              width: 18px !important;
              text-align: center !important;
            }

            .attendance-monthly-print .total-cell {
              width: 28px !important;
              text-align: center !important;
              font-weight: 700 !important;
              background: #eeeeee !important;
              color: #000000 !important;
            }

            .attendance-monthly-print .status-present {
              background: #eaf7ea !important;
              color: #000000 !important;
            }

            .attendance-monthly-print .status-late {
              background: #fbd5e6 !important;
              color: #000000 !important;
              box-shadow: inset 0 0 0 1px #000000 !important;
            }

            .attendance-monthly-print .status-absent {
              background: #ffdede !important;
              color: #000000 !important;
              box-shadow: inset 0 0 0 1px #000000 !important;
            }

            .attendance-monthly-print .status-weekly {
              background: #eef2f6 !important;
              color: #000000 !important;
            }

            .attendance-monthly-print .status-holiday {
              background: #e9e2fb !important;
              color: #000000 !important;
            }

            .attendance-monthly-print .status-leave {
              background: #fff1c7 !important;
              color: #000000 !important;
            }

            .attendance-monthly-print .status-half-day {
              background: #eee3f8 !important;
              color: #000000 !important;
            }

            .attendance-monthly-print .report-heading {
              display: flex !important;
              justify-content: center !important;
              gap: 12px !important;
              margin-bottom: 3px !important;
              font-size: 10px !important;
              font-weight: 400 !important;
              text-align: center !important;
              color: #000000 !important;
            }

            .attendance-monthly-print .print-legend {
              margin-top: 4px !important;
              font-size: 8px !important;
              color: #000000 !important;
            }

            .attendance-monthly-print .legend-mark {
              height: 14px !important;
              min-width: 14px !important;
              font-size: 8px !important;
            }
          }
        `}
      </style>
      {(pages.length ? pages : [[]]).map((pageRows, pIdx) => {
      const isLastPage = pIdx === pageCount - 1;
      const serialOffset = pIdx * rowsPerPage;

      return (
      <div key={pIdx} className="print-page">
        <PadPrinting />
        <div className="report-heading mb-1 flex w-full items-center justify-center gap-3 text-center text-sm text-slate-950">
          <div>Attendance for the Month of <span>{monthName} {year}</span></div>
        </div>
        <table className="min-w-full border-collapse border border-slate-900 text-xs text-slate-950">
          <thead>
            <tr>
              <th className="serial-cell matrix-header-cell w-10 border border-slate-900 px-1 py-1 text-center font-semibold">Sl. No.</th>
              <th className="name-cell matrix-header-cell min-w-45 border border-slate-900 px-1 py-1 text-left font-semibold">Name</th>
              {days.map((day) => (
                <th key={day} className="day-cell matrix-header-cell w-6 border border-slate-900 px-1 py-1 text-center font-semibold">
                  {day}
                </th>
              ))}
              <th className="total-cell matrix-header-cell w-8 border border-slate-900 px-1 py-1 text-center font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((employee, index) => {
              const employeeTotal = days.reduce((total, day) => {
                const dateKey = toDateString(year, monthIndex, day);
                return total + statusTotalValue(employee.dates[dateKey]);
              }, 0);

              return (
                <tr key={employee.employee_id || employee.employee_name}>
                  <td className="serial-cell border border-slate-900 px-1 py-1 text-center">{serialOffset + index + 1}</td>
                  <td className="name-cell border border-slate-900 px-1 py-1 text-left">{employee.employee_name || '-'}</td>
                  {days.map((day) => {
                    const dateKey = toDateString(year, monthIndex, day);
                    const code = employee.dates[dateKey] || '';
                    // Marked at another site. On paper there is no hovering, so
                    // the day is boxed and the branches are named underneath.
                    const elsewhere = employee.dateRows?.[dateKey]?.is_other_branch ? ' cell-other-branch' : '';
                    return (
                      <td
                        key={dateKey}
                        className={`day-cell border border-slate-900 px-1 py-1 text-center ${statusClassName(code)}${elsewhere}`}
                      >
                        {code}
                      </td>
                    );
                  })}
                  <td className="total-cell border border-slate-900 px-1 py-1 text-center font-semibold">{formatTotal(employeeTotal)}</td>
                </tr>
              );
            })}
            {reportRows.length === 0 && (
              <tr>
                <td colSpan={daysInMonth + 3} className="border border-slate-900 px-2 py-4 text-center">
                  No attendance data found
                </td>
              </tr>
            )}
          </tbody>
          {/* The month's totals close the report, so they go on the sheet that
              ends it -- on every sheet they would read as a subtotal for the
              employees listed there, which they are not. */}
          {reportRows.length > 0 && isLastPage && (
            <tfoot>
              <tr>
                <td colSpan={2} className="border border-slate-900 px-1 py-1 text-center font-semibold">Total</td>
                {dayTotals.map((dayTotal, index) => (
                  <td key={`day-total-${index}`} className="day-cell border border-slate-900 px-1 py-1 text-center font-semibold">
                    {formatTotal(dayTotal)}
                  </td>
                ))}
                <td className="total-cell border border-slate-900 px-1 py-1 text-center font-semibold">{formatTotal(grandTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* The key explains the marks above it, so it repeats on every sheet. */}
        <div className="print-legend mt-2 text-xs text-slate-600">
          <span className="legend-chip"><span className="legend-mark status-present">✓</span> Present</span>
          <span className="legend-chip"><span className="legend-mark status-late">!</span> Late</span>
          <span className="legend-chip"><span className="legend-mark status-weekly">W</span> Weekly holiday</span>
          <span className="legend-chip"><span className="legend-mark status-holiday">H</span> Holiday</span>
          <span className="legend-chip"><span className="legend-mark status-absent">✕</span> Absent</span>
          <span className="legend-chip"><span className="legend-mark status-leave">L</span> Leave</span>
          <span className="legend-chip"><span className="legend-mark status-half-day">½</span> Half Day</span>
          <span className="legend-chip"><span className="legend-mark total-cell">T</span> Present days</span>
          <span className="legend-chip">
            <span className="legend-mark cell-other-branch">✓</span> Another branch
          </span>
          {otherBranchNames(reportRows).length > 0 && (
            <div className="mt-1">
              Days marked at: {otherBranchNames(reportRows).join(', ')} — counted here,
              as this branch pays for them.
            </div>
          )}
        </div>

        <PrintFooter page={pIdx + 1} total={pageCount} />

        {!isLastPage && <div className="page-break" />}
      </div>
      );
      })}
    </div>
    );
  },
);

AttendanceMonthlyMatrixPrint.displayName = 'AttendanceMonthlyMatrixPrint';
export default AttendanceMonthlyMatrixPrint;
