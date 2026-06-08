import React from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';

type OvertimeEmployeeRow = {
  employee_id?: string | number;
  employee_serial?: string | number;
  employee_name?: string;
  dates: Record<string, number>;
};

type Props = {
  title: string;
  dates: string[];
  rows: OvertimeEmployeeRow[];
  dayTotals: number[];
  grandTotal: number;
  screen?: boolean;
};

const formatValue = (value: number) => (value > 0 ? value.toFixed(2) : '-');

const OvertimeReportPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ title, dates, rows, dayTotals, grandTotal, screen = false }, ref) => {
    const renderTable = () => (
      <table className="overtime-print-table min-w-full border-collapse border border-slate-900 text-xs text-slate-950">
        <thead>
          <tr>
            <th className="serial-cell matrix-header-cell w-10 border border-slate-900 px-1 py-1 text-center font-semibold">Sl. No.</th>
            <th className="name-cell matrix-header-cell min-w-45 border border-slate-900 px-1 py-1 text-left font-semibold">Name</th>
            {dates.map((date) => (
              <th key={date} className="day-cell matrix-header-cell w-6 border border-slate-900 px-1 py-1 text-center font-semibold">
                {Number(date.slice(8, 10))}
              </th>
            ))}
            <th className="total-cell matrix-header-cell w-8 border border-slate-900 px-1 py-1 text-center font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((employee, index) => {
            const employeeTotal = dates.reduce((total, date) => total + Number(employee.dates[date] || 0), 0);

            return (
              <tr key={employee.employee_id || employee.employee_name}>
                <td className="serial-cell border border-slate-900 px-1 py-1 text-center">{index + 1}</td>
                <td className="name-cell border border-slate-900 px-1 py-1 text-left">{employee.employee_name || '-'}</td>
                {dates.map((date) => (
                  <td key={`${employee.employee_id}-${date}`} className="day-cell border border-slate-900 px-1 py-1 text-center">
                    {formatValue(Number(employee.dates[date] || 0))}
                  </td>
                ))}
                <td className="total-cell border border-slate-900 px-1 py-1 text-center font-semibold">
                  {formatValue(employeeTotal)}
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={dates.length + 3} className="border border-slate-900 px-2 py-4 text-center">
                No overtime data found.
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={2} className="border border-slate-900 px-1 py-1 text-center font-semibold">Total</td>
              {dayTotals.map((dayTotal, index) => (
                <td key={`${dates[index]}-total`} className="day-cell border border-slate-900 px-1 py-1 text-center font-semibold">
                  {formatValue(dayTotal)}
                </td>
              ))}
              <td className="total-cell border border-slate-900 px-1 py-1 text-center font-semibold">
                {formatValue(grandTotal)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    );

    return (
    <div
      ref={ref}
      className={`${screen ? 'overtime-monthly-screen rounded-sm bg-white shadow-sm dark:bg-boxdark' : 'overtime-monthly-print bg-white text-slate-950'}`}
    >
      <PrintStyles />
      <style>{`
        .overtime-monthly-screen .matrix-header-cell,
        .overtime-monthly-print .matrix-header-cell {
          background: #e8eef6;
          color: #0f172a;
        }

        .overtime-monthly-screen .total-cell,
        .overtime-monthly-print .total-cell {
          background: #f8fafc;
          color: #0f172a;
        }

        .overtime-monthly-print tfoot td {
          background: #eef2f7;
          color: #0f172a;
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

          .overtime-monthly-print {
            width: 100% !important;
            overflow: visible !important;
            color: #000000 !important;
            background: #ffffff !important;
            font-family: Arial, Helvetica, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .overtime-monthly-print table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 8px !important;
            line-height: 1.15 !important;
            color: #000000 !important;
          }

          .overtime-monthly-print th,
          .overtime-monthly-print td {
            border: 1px solid #000000 !important;
            padding: 2px 1px !important;
            overflow: hidden !important;
          }

          .overtime-monthly-print .matrix-header-cell {
            background: #e5e7eb !important;
            color: #000000 !important;
          }

          .overtime-monthly-print .serial-cell {
            width: 34px !important;
          }

          .overtime-monthly-print .name-cell {
            width: 128px !important;
            white-space: nowrap !important;
            text-overflow: ellipsis !important;
          }

          .overtime-monthly-print .day-cell {
            width: 18px !important;
            text-align: center !important;
          }

          .overtime-monthly-print .total-cell {
            width: 28px !important;
            text-align: center !important;
            font-weight: 700 !important;
            background: #eeeeee !important;
            color: #000000 !important;
          }

          .overtime-monthly-print .report-heading {
            display: flex !important;
            justify-content: center !important;
            gap: 12px !important;
            margin-bottom: 3px !important;
            font-size: 10px !important;
            font-weight: 400 !important;
            text-align: center !important;
            color: #000000 !important;
          }
        }
      `}</style>

      <div className="print-page">
        {!screen && <PadPrinting />}
        <div className="report-heading flex w-full items-center justify-center gap-3 border-b border-gray-200 px-3 py-2 text-center text-sm font-medium text-slate-800 dark:border-gray-700 dark:text-slate-100">
          <div>{title}</div>
        </div>
        {renderTable()}
      </div>
    </div>
    );
  },
);

OvertimeReportPrint.displayName = 'OvertimeReportPrint';
export default OvertimeReportPrint;
