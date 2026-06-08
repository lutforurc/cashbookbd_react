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
  ({ title, dates, rows, dayTotals, grandTotal, screen = false }, ref) => (
    <div
      ref={ref}
      className={`${screen ? 'overflow-x-auto rounded-sm bg-white shadow-sm dark:bg-boxdark' : 'p-8 text-sm text-gray-900 print-root'}`}
    >
      <PrintStyles />
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          .overtime-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 9px !important;
          }
          .overtime-print-table th,
          .overtime-print-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 4px 5px !important;
            color: #000 !important;
          }
          .overtime-print-table thead tr {
            background: #cbd5e1 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .overtime-print-table tfoot tr {
            background: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {!screen && <PadPrinting />}

      <div className="border-b border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
        {title}
      </div>

      <table className="overtime-print-table min-w-full border-collapse text-sm text-slate-900 dark:text-slate-100">
        <thead>
          <tr className="bg-slate-300 text-left text-xs font-semibold uppercase text-slate-900 dark:bg-slate-700 dark:text-slate-100">
            <th className="whitespace-nowrap border border-slate-200 px-3 py-3 text-center dark:border-slate-600">Sl. No.</th>
            <th className="min-w-52 whitespace-nowrap border border-slate-200 px-3 py-3 dark:border-slate-600">Name</th>
            {dates.map((date) => (
              <th key={date} className="min-w-10 border border-slate-200 px-2 py-3 text-center dark:border-slate-600">
                {Number(date.slice(8, 10))}
              </th>
            ))}
            <th className="min-w-16 border border-slate-200 px-3 py-3 text-center dark:border-slate-600">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((employee, index) => {
            const employeeTotal = dates.reduce((total, date) => total + Number(employee.dates[date] || 0), 0);

            return (
              <tr key={employee.employee_id || employee.employee_name} className="border-b border-slate-100 dark:border-slate-700">
                <td className="border border-slate-100 px-3 py-3 text-center dark:border-slate-700">{index + 1}</td>
                <td className="border border-slate-100 px-3 py-3 dark:border-slate-700">{employee.employee_name || '-'}</td>
                {dates.map((date) => (
                  <td key={`${employee.employee_id}-${date}`} className="border border-slate-100 px-2 py-3 text-center font-medium dark:border-slate-700">
                    {formatValue(Number(employee.dates[date] || 0))}
                  </td>
                ))}
                <td className="border border-slate-100 px-3 py-3 text-center font-bold dark:border-slate-700">
                  {formatValue(employeeTotal)}
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={dates.length + 3} className="border border-slate-100 px-3 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                No overtime data found.
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="bg-slate-50 font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
              <td colSpan={2} className="border border-slate-200 px-3 py-3 text-center dark:border-slate-600">Total</td>
              {dayTotals.map((dayTotal, index) => (
                <td key={`${dates[index]}-total`} className="border border-slate-200 px-2 py-3 text-center dark:border-slate-600">
                  {formatValue(dayTotal)}
                </td>
              ))}
              <td className="border border-slate-200 px-3 py-3 text-center dark:border-slate-600">
                {formatValue(grandTotal)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  ),
);

OvertimeReportPrint.displayName = 'OvertimeReportPrint';
export default OvertimeReportPrint;
