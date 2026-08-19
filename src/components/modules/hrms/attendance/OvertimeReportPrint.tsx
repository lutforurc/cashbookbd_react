import React from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
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
  rowsPerPage?: number;
  fontSize?: number;
};

const formatValue = (value: number) => (value > 0 ? value.toFixed(2) : '-');
const chunkRows = (rows: OvertimeEmployeeRow[], perPage: number) => {
  const size = Math.max(1, perPage || rows.length || 1);
  const pages: OvertimeEmployeeRow[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    pages.push(rows.slice(index, index + size));
  }
  return pages.length ? pages : [[]];
};

const OvertimeReportPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ title, dates, rows, dayTotals, grandTotal, rowsPerPage = 12, fontSize = 12 }, ref) => {
    const pages = chunkRows(rows, rowsPerPage);
    const fs = Math.max(6, fontSize || 12);
    const longestNameLength = rows.reduce((max, row) => Math.max(max, String(row.employee_name || '').length), 4);
    const nameWidth = Math.min(220, Math.max(70, Math.ceil(longestNameLength * fs * 0.52)));
    const renderTable = (pageRows: OvertimeEmployeeRow[], pageIndex: number, showFooter: boolean) => (
      <table className="overtime-print-table">
        <colgroup>
          <col style={{ width: 28 }} />
          <col style={{ width: nameWidth }} />
          {dates.map((date) => <col key={`${date}-col`} />)}
          <col style={{ width: 38 }} />
        </colgroup>
        <thead>
          <tr>
            <th className="serial-cell matrix-header-cell">#</th>
            <th className="name-cell matrix-header-cell">Name</th>
            {dates.map((date) => (
              <th key={date} className="day-cell matrix-header-cell">
                {Number(date.slice(8, 10))}
              </th>
            ))}
            <th className="total-cell matrix-header-cell">Total</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((employee, index) => {
            const employeeTotal = dates.reduce((total, date) => total + Number(employee.dates[date] || 0), 0);

            return (
              <tr key={employee.employee_id || employee.employee_name}>
                <td className="serial-cell">{(pageIndex * rowsPerPage) + index + 1}</td>
                <td className="name-cell">{employee.employee_name || '-'}</td>
                {dates.map((date) => (
                  <td key={`${employee.employee_id}-${date}`} className="day-cell">
                    {formatValue(Number(employee.dates[date] || 0))}
                  </td>
                ))}
                <td className="total-cell">
                  {formatValue(employeeTotal)}
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={dates.length + 3} className="empty-cell">
                No overtime data found.
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && showFooter && (
          <tfoot>
            <tr>
              <td colSpan={2} className="total-label-cell">Total</td>
              {dayTotals.map((dayTotal, index) => (
                <td key={`${dates[index]}-total`} className="day-cell total-row-cell">
                  {formatValue(dayTotal)}
                </td>
              ))}
              <td className="total-cell">
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
	      className="overtime-monthly-print bg-white text-slate-950"
    >
      <PrintStyles orientation="landscape" />
      <style>{`
	        .overtime-monthly-print .matrix-header-cell {
	          background: #e8eef6;
	          color: #0f172a;
	        }
	
	        .overtime-monthly-print .total-cell {
	          background: #f8fafc;
	          color: #0f172a;
	        }

        .overtime-monthly-print tbody tr:nth-child(even) .serial-cell,
        .overtime-monthly-print tbody tr:nth-child(even) .name-cell,
        .overtime-monthly-print tbody tr:nth-child(even) .day-cell {
          background: #f4f6f9;
        }

        .overtime-monthly-print tfoot td {
          background: #eef2f7;
          color: #0f172a;
        }

	        .overtime-pad {
	          display: block;
	        }

        @media print {

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

          .overtime-monthly-print .print-page {
            display: block !important;
            min-height: auto !important;
            height: auto !important;
            padding: 0 !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }

	          .overtime-monthly-print table,
	          .overtime-monthly-print .overtime-print-table {
	            width: 100% !important;
	            min-width: 0 !important;
	            table-layout: fixed !important;
	            border-collapse: collapse !important;
	            font-size: ${fs}px !important;
	            line-height: 1.15 !important;
	            color: #000000 !important;
	          }
	
	          .overtime-monthly-print th,
	          .overtime-monthly-print td,
	          .overtime-monthly-print .empty-cell,
	          .overtime-monthly-print .total-label-cell {
	            border: 1px solid #000000 !important;
	            padding: 3px 2px !important;
	            overflow: hidden !important;
	          }

          .overtime-monthly-print .matrix-header-cell {
            background: #e5e7eb !important;
            color: #000000 !important;
          }

	          .overtime-monthly-print .serial-cell {
	            text-align: center !important;
	          }
	
	          .overtime-monthly-print .name-cell {
	            white-space: nowrap !important;
	            text-overflow: ellipsis !important;
	            text-align: left !important;
	          }
	
	          .overtime-monthly-print .day-cell {
	            text-align: center !important;
	          }
	
	          .overtime-monthly-print .total-cell {
	            text-align: center !important;
	            font-weight: 700 !important;
	            background: #eeeeee !important;
	            color: #000000 !important;
	          }

	          .overtime-monthly-print .total-label-cell,
	          .overtime-monthly-print .total-row-cell {
	            text-align: center !important;
	            font-weight: 700 !important;
	          }

          .overtime-monthly-print tbody tr:nth-child(even) .serial-cell,
          .overtime-monthly-print tbody tr:nth-child(even) .name-cell,
          .overtime-monthly-print tbody tr:nth-child(even) .day-cell {
            background: #f4f6f9 !important;
          }

          .overtime-monthly-print .report-heading {
            display: flex !important;
            justify-content: center !important;
            gap: 12px !important;
            margin-bottom: 5px !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            text-align: center !important;
            color: #000000 !important;
          }

          .overtime-pad {
            display: block !important;
          }
        }
      `}</style>

		      {pages.map((pageRows, pageIndex) => (
		        <div key={`page-${pageIndex}`} className="print-page">
		          <div className="overtime-pad">
		            <PadPrinting />
		          </div>
		          <div className="report-heading flex w-full items-center justify-center gap-3 border-b border-gray-200 px-3 py-2 text-center text-sm font-medium text-slate-800 dark:border-gray-700 dark:text-slate-100">
		            <div>{title}</div>
		          </div>
		          {renderTable(pageRows, pageIndex, pageIndex === pages.length - 1)}
		          <PrintFooter page={pageIndex + 1} total={pages.length} />
		        </div>
		      ))}
	    </div>
    );
  },
);

OvertimeReportPrint.displayName = 'OvertimeReportPrint';
export default OvertimeReportPrint;
