import React from "react";
import Pagination from "../utils-functions/Pagination";

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
  render?: (row: any, index: number) => React.ReactNode;
}

interface TableProps {
  columns: Column[];
  data: any[];
  perPage?: number;
  className?: string;
  tableClassName?: string;
  theadClassName?: string;
  tbodyClassName?: string;
  rowClassName?: string | ((row: any, index: number) => string);
  onRowClick?: (row: any, index: number) => void;
  getRowKey?: (row: any, index: number) => React.Key;
  getRowProps?: (row: any, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  noDataMessage?: string;
  headerRows?: TableHeaderCell[][];
  footerRows?: TableFooterCell[][];
  tableStyle?: React.CSSProperties;
  /**
   * Extra content shown directly beneath a row, spanning every column.
   *
   * Return null for rows with nothing to add. Used for a row that opens to
   * reveal detail — a company's users under their owner — where putting the
   * detail at the foot of the table would lose which row it belonged to.
   */
  renderRowExpansion?: (row: any, index: number) => React.ReactNode;
  /**
   * Rule every cell, heading and footing included.
   *
   * ⚠️ ON BY DEFAULT, which is a decision about 108 screens rather than about
   * this file. A table of figures is read across as well as down -- a reader
   * coming down a column of rates and back along a row needs the grid to land
   * on, and the app's tables carry money on nearly every screen. It was one
   * horizontal hairline between rows, and nothing at all between columns.
   *
   * Where it is too heavy -- a two-column list, a panel that is a table only
   * by accident -- a screen turns it off with `bordered={false}` rather than
   * unpicking classes. Nothing passed cell borders through this component
   * before it existed, so nothing doubles up.
   */
  bordered?: boolean;
}

const Table: React.FC<TableProps> = ({
  columns,
  data,
  perPage,
  className,
  tableClassName,
  theadClassName,
  tbodyClassName,
  rowClassName,
  onRowClick,
  getRowKey,
  getRowProps,
  noDataMessage = "",
  headerRows,
  footerRows,
  tableStyle,
  renderRowExpansion,
  bordered = true,
}) => {
  /**
   * ⚠️ --c-border, THE TABLE'S OWN EDGE COLOUR, and it is deliberately quiet.
   * It is the token the rest of the grid and every card in the app already
   * uses, so a ruled table reads as part of the page rather than as a wireframe
   * over it. It follows the theme, and a user who changes the border colour
   * changes this with it. A heading with too little behind it to show against
   * is accepted: the rules are there to guide the eye down the figures, and the
   * figures are in the body.
   */
  const cell = bordered ? "border border-[rgb(var(--c-border))]" : "";

  const [page, setPage] = React.useState(1);
  const rows = Array.isArray(data) ? data : [];
  const totalRows = rows.length;
  const pageSize = Number(perPage || 0);
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1;
  const startIndex = pageSize > 0 ? (page - 1) * pageSize : 0;
  const visibleData = pageSize > 0
    ? rows.slice(startIndex, page * pageSize)
    : rows;

  React.useEffect(() => {
    setPage(1);
  }, [totalRows, pageSize]);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handlePageChange = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

  return (
    <div className={`rounded-sm shadow-sm ${className || ""}`}>
      <div className="overflow-x-auto">
        <table
          className={`min-w-full table-fixed text-left text-sm text-gray-700 dark:text-gray-300 ${tableClassName || ""}`}
          style={tableStyle}
        >
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} className={col.cellClass} />
            ))}
          </colgroup>

        <thead className={`bg-[rgb(var(--c-table-head))] text-xs uppercase text-gray-800 dark:text-gray-300 ${theadClassName || ""}`}>
          {headerRows && headerRows.length > 0 ? (
            headerRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((headerCell, cellIndex) => (
                  <th
                    key={`${rowIndex}-${cellIndex}`}
                    colSpan={headerCell.colSpan}
                    rowSpan={headerCell.rowSpan}
                    className={`px-3 py-3 font-semibold align-middle ${cell} ${headerCell.className || ""}`}
                  >
                    {headerCell.label}
                  </th>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 py-3 font-semibold align-middle ${cell} ${column.headerClass || ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          )}
        </thead>

        <tbody className={`divide-y divide-gray-200 bg-[rgb(var(--c-table-body))] dark:divide-gray-700 ${tbodyClassName || ""}`}>
          {Array.isArray(visibleData) && visibleData.length > 0 ? (
            visibleData.map((row, rowIndex) => {
              const absoluteIndex = startIndex + rowIndex;
              const expansion = renderRowExpansion?.(row, absoluteIndex);
              const rowKey = getRowKey ? getRowKey(row, absoluteIndex) : absoluteIndex;

              return (
                <React.Fragment key={rowKey}>
                  <tr
                    {...(getRowProps ? getRowProps(row, absoluteIndex) : {})}
                    onClick={() => onRowClick?.(row, absoluteIndex)}
                    className={`transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700 ${
                      onRowClick ? "cursor-pointer " : ""
                    }${
                      typeof rowClassName === 'function'
                        ? rowClassName(row, absoluteIndex)
                        : rowClassName || ''
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`truncate px-3 py-2 align-middle ${cell} ${col.cellClass || ""}`}
                      >
                        {col.render ? col.render(row, absoluteIndex) : row[col.key]}
                      </td>
                    ))}
                  </tr>

                  {/* No hover tint and no row click: this is a panel that happens
                      to live in a table, not another record to act on. */}
                  {expansion ? (
                    <tr>
                      <td colSpan={columns.length} className="p-0">
                        {expansion}
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })
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
                {row.map((footerCell, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    colSpan={footerCell.colSpan}
                    rowSpan={footerCell.rowSpan}
                    className={`px-3 py-3 ${cell} ${footerCell.className || ""}`}
                  >
                    {footerCell.label}
                  </td>
                ))}
              </tr>
            ))}
          </tfoot>
        ) : null}
        </table>
      </div>
      {pageSize > 0 && totalRows > pageSize ? (
        <div className="border-t border-[rgb(var(--c-border))] bg-white px-3 py-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {/* <span>
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalRows)} of {totalRows}
          </span> */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        </div>
      ) : null}
    </div>
  );
};

export default Table;
