import React from "react";
import { FiEye } from "react-icons/fi";
import Pagination from "../utils-functions/Pagination";
import ToggleSwitch from "../fields/ToggleSwitch";

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
  /**
   * The column's share of the table, e.g. '80px' or '12%'. A bare number is
   * read as pixels.
   *
   * Landed on the `<col>` rather than on the cells: the table is
   * `table-fixed`, so one width per column is what decides the layout, and
   * ninety-odd screens were already passing this before it was read.
   */
  width?: string | number;
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

/* ------------------------------------------------------------------ */
/* Columns the reader has put away                                     */
/* ------------------------------------------------------------------ */

/**
 * Which columns a reader has hidden, kept in their own browser.
 *
 * ⚠️ EVERY TABLE IN THE APP GETS THIS WITHOUT BEING TOLD, and that is the whole
 * reason it lives here rather than in a prop: ninety-odd reports build their
 * columns through this one component, so a screen does not have to know the
 * feature exists. Nothing is stored on a screen that passes no `columns` array,
 * and nothing changes on any screen until somebody opens the menu and unticks a
 * column -- with nothing hidden, every branch below is the code that was there
 * before.
 *
 * The key is the route plus the column KEYS, not the route alone: a page that
 * shows two tables would otherwise hide a column in both when the reader meant
 * one. ⚠️ The cost of that choice is that a report whose columns change -- a
 * developer adding one, a screen building its columns from a filter -- is a
 * different key, so the reader's choice is quietly back to the default rather
 * than hiding a column that moved.
 */
const STORAGE_PREFIX = 'table-cols:';

const readHidden = (key: string): string[] => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : [];
  } catch {
    // A browser that refuses storage -- private mode, or storage full. A
    // reader who cannot keep the choice still gets to make it.
    return [];
  }
};

const writeHidden = (key: string, hidden: string[]) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(hidden));
  } catch {
    /* as above: the menu still works, it just does not remember. */
  }
};

/**
 * A column nobody may put away.
 *
 * The Action column holds the buttons for the row, so hiding it leaves a report
 * whose rows cannot be opened, edited or paid -- a mistake somebody makes once
 * and then has to be talked through undoing. It never reaches the menu.
 */
const isActionColumn = (column: Column) => /^action/i.test(String(column.key || ''));

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

  /* ---------------------------------------------------------------- */
  /* Hiding a column                                                   */
  /* ---------------------------------------------------------------- */

  const allColumns = Array.isArray(columns) ? columns : [];
  const menuColumns = allColumns.filter((column) => !isActionColumn(column));
  // One column is not a table, so the menu is not offered for it either.
  const canHide = menuColumns.length > 1;

  const storageKey = `${STORAGE_PREFIX}${window.location.pathname}#${allColumns
    .map((column) => column.key)
    .join('|')}`;

  const [hiddenColumns, setHiddenColumns] = React.useState<string[]>(() => readHidden(storageKey));
  const [menuOpen, setMenuOpen] = React.useState(false);
  /**
   * Where the panel hangs, measured off the button when it opens.
   *
   * `fixed`, not `absolute`, and that is the point rather than a detail: half
   * these tables live in an `overflow-hidden` card, which clips an absolutely
   * positioned panel to nothing. The same reason InlineConfirm is fixed.
   *
   * Hung below the button, or above it when the button is near the foot of the
   * window -- the panel is up to 18rem tall and would otherwise open off-screen
   * on the last report of a long page.
   */
  const [menuPos, setMenuPos] = React.useState<React.CSSProperties | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  // An id per table, because two tables on one page offer two menus and a
  // switch's id has to reach its own label and no other.
  const menuId = React.useId();

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const GAP = 4;
    const below = window.innerHeight - rect.bottom - GAP - 8;
    const flip = below < 160;

    setMenuPos({
      position: 'fixed',
      right: Math.max(8, window.innerWidth - rect.right),
      maxHeight: Math.max(120, flip ? rect.top - GAP - 8 : below),
      ...(flip
        ? { bottom: window.innerHeight - rect.top + GAP }
        : { top: rect.bottom + GAP }),
    });
    setMenuOpen(true);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuPos(null);
  };

  // Never nothing: an empty table reads as a broken report rather than as a
  // choice somebody made, and the last column cannot be put away.
  const keptColumns = allColumns.filter((column) => !hiddenColumns.includes(column.key));
  const visibleColumns = keptColumns.length ? keptColumns : allColumns;

  /**
   * The one menu column nobody may put away.
   *
   * Counted over `menuColumns` and not over every column: the Action column is
   * never in the menu, so counting it would let a reader put away everything
   * they were offered and leave a table of buttons with nothing to read.
   */
  const shownMenuColumns = menuColumns.filter((column) => !hiddenColumns.includes(column.key));
  const lastShownMenuKey =
    shownMenuColumns.length === 1 ? String(shownMenuColumns[0].key) : null;

  /**
   * How many columns the reader has actually put away.
   *
   * ⚠️ Derived from what is on the screen rather than from the stored list, so
   * it cannot claim a count the table is not honouring. It is also the only
   * signal anywhere that a report is short a column on purpose: the choice is
   * kept in this browser, and a reader who hid Balance last week comes back to
   * a report that looks like it never had one.
   */
  const hiddenCount = allColumns.length - visibleColumns.length;

  // ⚠️ Re-read rather than left to the initial state. A screen that builds its
  // columns from a filter changes this table's key without remounting it, and a
  // stale list would go on hiding columns by a name the table no longer has.
  React.useEffect(() => {
    setHiddenColumns(readHidden(storageKey));
  }, [storageKey]);

  React.useEffect(() => {
    if (!menuOpen) return undefined;

    // ⚠️ The panel is no longer inside `menuRef` -- it is fixed, so it is still
    // a child in the DOM but it is no longer the same box on the screen. Both
    // have to be asked, or every click inside the panel counts as a click
    // outside it and shuts it.
    const inside = (target: Node) =>
      Boolean(menuRef.current?.contains(target) || panelRef.current?.contains(target));

    const onPointerDown = (event: MouseEvent) => {
      if (!inside(event.target as Node)) closeMenu();
    };

    // Escape returns the reader to the button they opened it from, so the
    // keyboard is where it was rather than at the top of the document.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeMenu();
      buttonRef.current?.focus();
    };

    /**
     * ⚠️ CAPTURE PHASE, and it is the whole reason this works.
     *
     * The app does not scroll the window: DefaultLayout puts the content in a
     * `flex h-screen overflow-hidden` shell with an `overflow-y-auto` column
     * inside it, so a listener on `window` never fires and the button would
     * slide up the screen with the panel left hanging where it was. A scroll
     * event does not bubble, but the capture phase still runs from the window
     * down to whatever scrolled, which is what reaches it.
     *
     * Its own list is exempt: the panel is `overflow-y-auto` too, and scrolling
     * through ten columns must not shut the panel being read.
     */
    const onScroll = (event: Event) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      closeMenu();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', closeMenu);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [menuOpen]);

  const toggleColumn = (key: string) => {
    // The last one stays: a table with no columns in it reads as a broken
    // report, not as a choice somebody made.
    if (String(key) === lastShownMenuKey) return;

    const next = hiddenColumns.includes(key)
      ? hiddenColumns.filter((entry) => entry !== key)
      : [...hiddenColumns, key];

    setHiddenColumns(next);
    writeHidden(storageKey, next);
  };

  const showAllColumns = () => {
    setHiddenColumns([]);
    writeHidden(storageKey, []);
  };

  /**
   * A heading or footing row, with the cells of hidden columns taken out.
   *
   * ⚠️ THESE ROWS ARE NOT BUILT FROM `columns` THE WAY THE BODY IS. A screen
   * hands over its own headerRows/footerRows, positioned the way HTML positions
   * any row: each cell covers as many columns as its colSpan says, counted from
   * the left. So a cell is dropped when the one column it covers is hidden, and
   * a spanning cell keeps its place with its colSpan cut by however many hidden
   * columns it covered.
   *
   * Without it a table keeps a heading or a totals bar one cell wider than its
   * own body -- the browser widens the table to fit and every figure slides a
   * column to the left of its heading.
   */
  const withoutHidden = <T extends { colSpan?: number }>(cells: T[]): T[] => {
    if (!hiddenColumns.length) return cells;

    const out: T[] = [];
    let index = 0;

    for (const cell of cells) {
      const span = Math.max(1, Number(cell.colSpan) || 1);
      const covered = allColumns.slice(index, index + span);
      const kept = covered.filter((column) => !hiddenColumns.includes(column.key)).length;

      index += span;

      if (kept === span) out.push(cell);
      else if (kept > 0) out.push({ ...cell, colSpan: kept });
    }

    return out;
  };

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
      {/* The button sits ABOVE the table rather than floating over it: the
          column list is a setting for the table, and a panel over the headings
          would cover the very columns it was offering.

          The PANEL, though, is fixed-positioned rather than laid into the flow
          as it used to be. In the flow it pushed the table down the page every
          time it opened, and on a long report it opened above the fold and then
          scrolled away with the page it was setting up. */}
      {canHide ? (
        <div ref={menuRef} className="flex justify-end px-2 pt-2">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => (menuOpen ? closeMenu() : openMenu())}
            title="Show / hide columns"
            aria-label="Show or hide columns"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="flex items-center gap-1 rounded-sm border border-[rgb(var(--c-border))] px-2 py-1 text-xs text-gray-600 hover:bg-indigo-50 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <FiEye size={14} />
            Columns{hiddenCount ? ` (${hiddenCount})` : ''}
          </button>
        </div>
      ) : null}

      {menuOpen && menuPos ? (
        <div
          ref={panelRef}
          style={menuPos}
          className="z-50 w-64 overflow-y-auto rounded-sm border border-[rgb(var(--c-border))] bg-white p-2 shadow-lg dark:bg-[rgb(var(--c-boxdark))]"
        >
          <div className="mb-1 flex items-center justify-between border-b border-[rgb(var(--c-border))] pb-1">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Columns
            </span>
            <button
              type="button"
              onClick={showAllColumns}
              disabled={!hiddenCount}
              className="text-xs text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline dark:text-indigo-400 dark:disabled:text-gray-500"
            >
              Show all
            </button>
          </div>

          {menuColumns.map((column) => (
            <div
              key={column.key}
              className="py-0.5"
              // The one switch that will not move, and why. Without this the
              // reader clicks it, nothing happens, and there is no way to find
              // out that the table is refusing rather than broken.
              title={
                String(column.key) === lastShownMenuKey
                  ? 'A table needs at least one column'
                  : undefined
              }
            >
              <ToggleSwitch
                id={`${menuId}-${column.key}`}
                name={String(column.key)}
                label={column.header}
                // ⚠️ ON MEANS SHOWN. The switch is drawn left-to-right like any
                // other switch in the app, so the reader reads it as "this
                // column is on" -- not as "this column is hidden", which is
                // what the stored list actually holds.
                checked={!hiddenColumns.includes(column.key)}
                onChange={() => toggleColumn(String(column.key))}
                disabled={String(column.key) === lastShownMenuKey}
                className="w-full"
                labelClassName="min-w-0 truncate text-xs text-gray-700 dark:text-gray-300"
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table
          className={`min-w-full table-fixed text-left text-sm text-gray-700 dark:text-gray-300 ${tableClassName || ""}`}
          style={tableStyle}
        >
          <colgroup>
            {visibleColumns.map((col) => (
              <col
                key={col.key}
                className={col.cellClass}
                style={col.width ? { width: col.width } : undefined}
              />
            ))}
          </colgroup>

        <thead className={`bg-[rgb(var(--c-table-head))] text-xs uppercase text-gray-800 dark:text-gray-300 ${theadClassName || ""}`}>
          {headerRows && headerRows.length > 0 ? (
            headerRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {withoutHidden(row).map((headerCell, cellIndex) => (
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
              {visibleColumns.map((column) => (
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
                    {visibleColumns.map((col) => (
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
                      <td colSpan={visibleColumns.length} className="p-0">
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
                colSpan={visibleColumns.length}
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
                {withoutHidden(row).map((footerCell, cellIndex) => (
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
