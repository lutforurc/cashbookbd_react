import React from 'react';

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
};

const formatValue = (value: number) => (value > 0 ? value.toFixed(2) : '-');

const OvertimeReportMatrix: React.FC<Props> = ({ title, dates, rows, dayTotals, grandTotal }) => (
  <div className="overtime-monthly-screen rounded-sm bg-white shadow-sm dark:bg-boxdark">
    <style>{`
      .overtime-monthly-screen .matrix-header-cell {
        background: #e8eef6;
        color: #0f172a;
      }

      .overtime-monthly-screen .total-cell {
        background: #f8fafc;
        color: #0f172a;
      }
    `}</style>

    <div className="report-heading flex w-full items-center justify-center gap-3 border-b border-gray-200 px-3 py-2 text-center text-sm font-medium text-slate-800 dark:border-gray-700 dark:text-slate-100">
      <div>{title}</div>
    </div>
    <table className="min-w-full border-collapse border border-slate-900 text-xs text-slate-950">
      <thead>
        <tr>
          <th className="matrix-header-cell w-10 border border-slate-900 px-1 py-1 text-center font-semibold">#</th>
          <th className="matrix-header-cell min-w-35 border border-slate-900 px-1 py-1 text-left font-semibold">Name</th>
          {dates.map((date) => (
            <th key={date} className="matrix-header-cell  border border-slate-900 px-1 py-1 text-center font-semibold">
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
              <td className="border border-slate-900 px-1 py-1 text-center">{index + 1}</td>
              <td className="border border-slate-900 px-1 py-1 text-left">{employee.employee_name || '-'}</td>
              {dates.map((date) => (
                <td key={`${employee.employee_id}-${date}`} className="border border-slate-900 px-1 py-1 text-center">
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
              <td key={`${dates[index]}-total`} className="border border-slate-900 px-1 py-1 text-center font-semibold">
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
  </div>
);

export default OvertimeReportMatrix;
