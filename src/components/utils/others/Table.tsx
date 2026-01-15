import React from "react";

/* ================= TYPES ================= */

export interface Column {
  key: string;
  header: string;        // 🔥 controls column width (responsive)
  headerClass?: string;     // th class
  cellClass?: string;       // td class
  render?: (row: any) => JSX.Element;
}

interface TableProps {
  columns: Column[];
  data: any[];
  className?: string;
  noDataMessage ?: string;
}

/* ================= COMPONENT ================= */

const Table: React.FC<TableProps> = ({ columns, data, className, noDataMessage=""  }) => {
  return (
    <div className={`overflow-x-auto rounded-sm shadow-sm ${className || ""}`}>
      <table className="min-w-full table-fixed text-sm text-left text-gray-700 dark:text-gray-300">

        {/* 🔥 COLGROUP → WIDTH CONTROL */}
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} className={col.cellClass} />
          ))}
        </colgroup>

        {/* ===== HEADER ===== */}
        <thead className="text-xs uppercase bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
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
        </thead>

        {/* ===== BODY ===== */}
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {Array.isArray(data) && data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2 truncate ${col.cellClass || ""}`}
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
                className="text-center py-4 text-gray-500 dark:text-gray-400"
              >
                {noDataMessage   || "No data found"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
