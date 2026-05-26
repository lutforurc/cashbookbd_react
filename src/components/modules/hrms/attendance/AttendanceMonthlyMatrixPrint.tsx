import React from 'react';

import PadPrinting from '../../../utils/utils-functions/PadPrinting';
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
};

const pad = (value: number) => String(value).padStart(2, '0');
const toDateString = (year: number, monthIndex: number, day: number) => `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

const statusTotalValue = (code?: string) => {
  if (code === '✓' || code === '!' || code === '○' || code === 'L') return 1;
  if (code === '½') return 0.5;
  return 0;
};

const formatTotal = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

const statusClassName = (code?: string) => {
  switch (code) {
    case '✓':
      return 'status-cell status-present';
    case '!':
      return 'status-cell status-late';
    case '✕':
      return 'status-cell status-absent';
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
  ({ monthName, year, monthIndex, days, daysInMonth, reportRows, dayTotals, grandTotal }, ref) => (
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

          .attendance-monthly-print .status-late {
            background: #fff3d6;
            color: #b45309;
            box-shadow: inset 0 0 0 1px #f59e0b;
          }

          .attendance-monthly-print .status-absent {
            background: #ffe8e8;
            color: #b91c1c;
            box-shadow: inset 0 0 0 1px #ef4444;
          }

          .attendance-monthly-print .status-holiday {
            background: #eef4ff;
            color: #1d4ed8;
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
              background: #fff0bf !important;
              color: #000000 !important;
              box-shadow: inset 0 0 0 1px #000000 !important;
            }

            .attendance-monthly-print .status-absent {
              background: #ffdede !important;
              color: #000000 !important;
              box-shadow: inset 0 0 0 1px #000000 !important;
            }

            .attendance-monthly-print .status-holiday {
              background: #e8eef8 !important;
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
      <div className="print-page">
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
            {reportRows.map((employee, index) => {
              const employeeTotal = days.reduce((total, day) => {
                const dateKey = toDateString(year, monthIndex, day);
                return total + statusTotalValue(employee.dates[dateKey]);
              }, 0);

              return (
                <tr key={employee.employee_id || employee.employee_name}>
                  <td className="serial-cell border border-slate-900 px-1 py-1 text-center">{index + 1}</td>
                  <td className="name-cell border border-slate-900 px-1 py-1 text-left">{employee.employee_name || '-'}</td>
                  {days.map((day) => {
                    const dateKey = toDateString(year, monthIndex, day);
                    const code = employee.dates[dateKey] || '';
                    return (
                      <td key={dateKey} className={`day-cell border border-slate-900 px-1 py-1 text-center ${statusClassName(code)}`}>
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
          {reportRows.length > 0 && (
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

        <div className="print-legend mt-2 text-xs text-slate-600">
          <span className="legend-chip"><span className="legend-mark status-present">✓</span> Present</span>
          <span className="legend-chip"><span className="legend-mark status-late">!</span> Late</span>
          <span className="legend-chip"><span className="legend-mark status-holiday">○</span> Holiday</span>
          <span className="legend-chip"><span className="legend-mark status-absent">✕</span> Absent</span>
          <span className="legend-chip"><span className="legend-mark status-leave">L</span> Leave</span>
          <span className="legend-chip"><span className="legend-mark status-half-day">½</span> Half Day</span>
          <span className="legend-chip"><span className="legend-mark total-cell">T</span> Present days</span>
        </div>
      </div>
    </div>
  ),
);

AttendanceMonthlyMatrixPrint.displayName = 'AttendanceMonthlyMatrixPrint';
export default AttendanceMonthlyMatrixPrint;
