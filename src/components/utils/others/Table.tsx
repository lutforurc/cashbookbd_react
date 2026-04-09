import React from "react";

export interface TableHeaderCell {
  label: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
  className?: string;
}

export interface TableFooterCell {
  label: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
  className?: string;
}

export interface Column {
  key: string;
  header: React.ReactNode;
  headerClass?: string;
  cellClass?: string;
  render?: (row: any) => JSX.Element;
}

interface TableProps {
  columns: Column[];
  data: any[];
  className?: string;
  tableClassName?: string;
  theadClassName?: string;
  tbodyClassName?: string;
  rowClassName?: string | ((row: any, index: number) => string);
  getRowKey?: (row: any, index: number) => React.Key;
  noDataMessage?: string;
  headerRows?: TableHeaderCell[][];
  footerRows?: TableFooterCell[][];
  tableStyle?: React.CSSProperties;
}

const Table: React.FC<TableProps> = ({
  columns,
  data,
  className,
  tableClassName,
  theadClassName,
  tbodyClassName,
  rowClassName,
  getRowKey,
  noDataMessage = "",
  headerRows,
  footerRows,
  tableStyle,
}) => {
  return (
    <div className={`overflow-x-auto rounded-sm shadow-sm ${className || ""}`}>
      <table
        className={`min-w-full table-fixed text-left text-sm text-gray-700 dark:text-gray-300 ${tableClassName || ""}`}
        style={tableStyle}
      >
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} className={col.cellClass} />
          ))}
        </colgroup>

        <thead className={`bg-gray-300 text-xs uppercase text-gray-800 dark:bg-gray-700 dark:text-gray-300 ${theadClassName || ""}`}>
          {headerRows && headerRows.length > 0 ? (
            headerRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <th
                    key={`${rowIndex}-${cellIndex}`}
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                    className={`px-3 py-3 font-semibold ${cell.className || ""}`}
                  >
                    {cell.label}
                  </th>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 py-3 font-semibold ${column.headerClass || ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          )}
        </thead>

        <tbody className={`divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800 ${tbodyClassName || ""}`}>
          {Array.isArray(data) && data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr
                key={getRowKey ? getRowKey(row, rowIndex) : rowIndex}
                className={`transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700 ${
                  typeof rowClassName === 'function'
                    ? rowClassName(row, rowIndex)
                    : rowClassName || ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`truncate px-3 py-2 ${col.cellClass || ""}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="py-4 text-center text-gray-500 dark:text-gray-400"
              >
                {noDataMessage || "No data found"}
              </td>
            </tr>
          )}
        </tbody>

        {footerRows && footerRows.length > 0 ? (
          <tfoot className="bg-slate-50 text-sm font-semibold text-slate-800 dark:bg-slate-900/40 dark:text-slate-100">
            {footerRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                    className={`px-3 py-3 ${cell.className || ""}`}
                  >
                    {cell.label}
                  </td>
                ))}
              </tr>
            ))}
          </tfoot>
        ) : null}
      </table>
    </div>
  );
};

export default Table;
