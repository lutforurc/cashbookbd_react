import React from 'react';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import { employeeGroup } from '../../../utils/fields/DataConstant';

type EmployeeRow = {
  serial?: number | string;
  employee_serial?: string | number;
  employee_group?: string;
  name?: string;
  designation_name?: string;
  mobile?: string;
  branch_name?: string;
};

type Props = {
  rows: EmployeeRow[];
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
  branchName?: string;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }
  return out;
};

const employeeGroupMap = Object.fromEntries(
  employeeGroup
    .filter(g => g.id !== '') // "Select All" বাদ
    .map(g => [g.id.toString(), g.name])
);

const EmployeePrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      title = 'Employee List',
      rowsPerPage = 20,
      fontSize = 10,
      branchName,
    },
    ref,
  ) => {
    const pages = chunkRows(rows || [], rowsPerPage);
    const fs = fontSize;

    return (
      <div ref={ref} className="p-8 text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />

            {/* Header */}
            <div className="mb-4 text-center">
              <h1 className="text-xl font-bold">{title}</h1>
            </div>

            {/* Table */}
            <table className="w-full border-collapse table-fixed">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-900 p-2 w-10 text-center" style={{ fontSize: fs }}>SL</th>
                  <th className="border border-gray-900 p-2 w-20 text-center" style={{ fontSize: fs }}>Sal SL</th>
                  <th className="border border-gray-900 p-2" style={{ fontSize: fs }}>Employee Name</th>
                  <th className="border border-gray-900 p-2" style={{ fontSize: fs }}>Section</th>
                  <th className="border border-gray-900 p-2" style={{ fontSize: fs }}>Designation</th>
                  <th className="border border-gray-900 p-2 w-24" style={{ fontSize: fs }}>Mobile</th>
                  <th className="border border-gray-900 p-2" style={{ fontSize: fs }}>Project</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length ? (
                  pageRows.map((row, idx) => (
                    <tr key={idx} className="avoid-break">
                      <td className="border border-gray-900 p-1 text-center" style={{ fontSize: fs }}>
                        {row.serial ?? idx + 1}
                      </td>
                      <td className="border border-gray-900 p-1 text-center" style={{ fontSize: fs }}>
                        {row.employee_serial || '-'}
                      </td>
                      <td className="border border-gray-900 p-1" style={{ fontSize: fs }}>
                        {row.name}
                      </td>
                      <td className="border border-gray-900 p-1" style={{ fontSize: fs }}>
                        {/* {row.employee_group || '-'} */}
                        {employeeGroupMap[row.employee_group?.toString()] || '-'}
                      </td>
                      <td className="border border-gray-900 p-1" style={{ fontSize: fs }}>
                        {row.designation_name || '-'}
                      </td>
                      <td className="border border-gray-900 p-1 text-center" style={{ fontSize: fs }}>
                        {row.mobile || '-'}
                      </td>
                      <td className="border border-gray-900 p-1" style={{ fontSize: fs }}>
                        {row.branch_name || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="border border-gray-900 py-6 text-center">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-2 text-right text-xs">
              Page {pIdx + 1} of {pages.length}
            </div>

            {pIdx !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}

        <div className="mt-2 text-xs">
          * This document is system generated
        </div>
      </div>
    );
  },
);

EmployeePrint.displayName = 'EmployeePrint';
export default EmployeePrint;
