import React from 'react';

interface Column {
  key: string;
  header: string;
  width?: string;
  headerClass?: string;
  cellClass?: string;
  render?: (data: any) => JSX.Element;
}

interface TableProps {
  columns: Column[];
  data: any[];
  className?: string;
}

const Table: React.FC<TableProps> = ({ columns, data, className }) => {

  return (
    <div className={`overflow-x-auto rounded-sm shadow-sm   ${className}`}>
      <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
        <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className={`px-4 py-3 font-semibold ${column.headerClass || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {data && data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors" >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2 whitespace-nowrap ${col.cellClass || ''}`}
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
                No data found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
