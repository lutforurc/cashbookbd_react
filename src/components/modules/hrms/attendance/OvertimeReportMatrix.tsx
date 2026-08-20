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

const cellBase =
  'border border-slate-200 px-1.5 py-1 dark:border-slate-700';
const headBase =
  'border border-slate-200 bg-slate-100 px-1.5 py-1.5 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

const renderValue = (value: number) => {
  const num = Number(value || 0);
  return num > 0 ? (
    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{num.toFixed(2)}</span>
  ) : (
    <span className="text-slate-300 dark:text-slate-600">-</span>
  );
};

const OvertimeReportMatrix: React.FC<Props> = ({ title, dates, rows, dayTotals, grandTotal }) => (
  <div className="border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-sm">
    <div className="border-b border-[rgb(var(--c-border))] bg-slate-50 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
      {title}
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={`${headBase} w-10 text-center`}>#</th>
            <th className={`${headBase} min-w-35 text-left`}>Name</th>
            {dates.map((date) => (
              <th key={date} className={`${headBase} text-center`}>
                {Number(date.slice(8, 10))}
              </th>
            ))}
            <th className={`${headBase} w-12 bg-slate-200 text-center dark:bg-slate-700`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((employee, index) => {
            const employeeTotal = dates.reduce((total, date) => total + Number(employee.dates[date] || 0), 0);

            return (
              <tr
                key={employee.employee_id || employee.employee_name}
                className="text-slate-700 transition hover:bg-sky-50 dark:text-slate-200 dark:hover:bg-slate-800/50"
              >
                <td className={`${cellBase} text-center text-slate-500 dark:text-slate-400`}>{index + 1}</td>
                <td className={`${cellBase} text-left font-medium`}>{employee.employee_name || '-'}</td>
                {dates.map((date) => (
                  <td key={`${employee.employee_id}-${date}`} className={`${cellBase} text-center`}>
                    {renderValue(Number(employee.dates[date] || 0))}
                  </td>
                ))}
                <td className={`${cellBase} bg-slate-50 text-center font-bold dark:bg-slate-800/60`}>
                  {renderValue(employeeTotal)}
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td
                colSpan={dates.length + 3}
                className={`${cellBase} px-2 py-6 text-center text-slate-400 dark:text-slate-500`}
              >
                No overtime data found.
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="bg-slate-100 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <td colSpan={2} className={`${cellBase} text-center`}>Total</td>
              {dayTotals.map((dayTotal, index) => (
                <td key={`${dates[index]}-total`} className={`${cellBase} text-center`}>
                  {renderValue(dayTotal)}
                </td>
              ))}
              <td className={`${cellBase} bg-slate-200 text-center font-bold dark:bg-slate-700`}>
                {renderValue(grandTotal)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  </div>
);

export default OvertimeReportMatrix;
