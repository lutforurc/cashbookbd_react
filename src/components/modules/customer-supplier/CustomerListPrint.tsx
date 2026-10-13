import React from 'react';

import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { formatMobile, useMobileFormat } from '../../utils/utils-functions/mobileFormat';

type Props = {
  rows: any[];
  /** "Client Type: All Types | Search: karim" -- what the sheet is showing. */
  filterLine?: string;
  title?: string;
  fontSize?: number;
  /** Rows per sheet; 0 means one unbroken page. */
  rowsPerPage?: number;
  /** The three columns the screen itself stands down: see `columns` there. */
  showNationalId?: boolean;
  showLedgerPage?: boolean;
  showOpening?: boolean;
};

/** One column of the sheet: the heading, the width, the cell it prints, and --
 *  for a money column -- how its total is arrived at. A column without `sum` is
 *  never totalled, which is what keeps a name or a mobile number out of the
 *  figures: there is nothing in this list to declare a column as money, so the
 *  column itself says so. */
type SheetColumn = {
  key: string;
  header: string;
  width: string;
  align?: 'text-center' | 'text-right';
  value: (row: any) => string | number;
  sum?: (rows: any[]) => number;
};

/**
 * The Customer list on paper.
 *
 * ⚠️ A COMPONENT OF ITS OWN, AND THAT IS WHAT MAKES IT PRINT. The caller points
 * its ref at this node while hiding a WRAPPER, never this node: react-to-print
 * clones what the ref points at, so a `hidden` on the node itself is cloned too
 * and the sheet comes out blank.
 *
 * ⚠️ THE ROWS ARE FETCHED FOR THE PRINT, NOT READ OFF THE SCREEN. The list is
 * paged ten at a time by the server, so the screen holds one page and the print
 * would carry ten customers out of four hundred. The caller asks for every row
 * under the filters on screen and hands them here.
 *
 * The columns are the screen's own, minus the actions: a sheet is read, not
 * clicked. The three the screen stands down -- the National ID when the branch
 * never asks for it, and the ledger page and the opening figure, which make way
 * for each other while the branch is in opening -- are stood down here by the
 * same three flags, so paper and screen can never disagree about the columns.
 */
const CustomerListPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      filterLine,
      title = 'Customer List',
      fontSize = 10,
      rowsPerPage = 30,
      showNationalId = true,
      showLedgerPage = true,
      showOpening = false,
    },
    ref,
  ) => {
    const fs = fontSize;
    const mobileFormat = useMobileFormat();
    const cell = 'border border-gray-900 px-2 py-1';
    const allRows = Array.isArray(rows) ? rows : [];

    /**
     * ⚠️ ONE LIST, TWO USES: the heading row and every cell are drawn from it,
     * and the "No data found" row spans its length. Counting the columns by hand
     * beside it is how the span ends up covering a column the table no longer
     * has -- and it fails quietly, as a rule drawn short of the edge.
     */
    const sheetColumns: SheetColumn[] = [
      {
        key: 'serial',
        header: 'SL',
        width: 'w-10',
        align: 'text-center',
        value: (row) => row?.serial ?? '',
      },
      { key: 'name', header: 'Name', width: 'w-36', value: (row) => row?.name || '-' },
      ...(showNationalId
        ? [
            {
              key: 'national_id',
              header: 'National ID',
              width: 'w-24',
              value: (row: any) =>
                row?.national_id && row.national_id !== '0' ? row.national_id : '',
            },
          ]
        : []),
      {
        key: 'manual_address',
        header: 'Address',
        width: '',
        value: (row) => row?.manual_address || '',
      },
      ...(showLedgerPage
        ? [
            {
              key: 'ledger_page',
              header: 'Ledger Page',
              width: 'w-20',
              align: 'text-center' as const,
              value: (row: any) => row?.ledger_page || '',
            },
          ]
        : []),
      {
        key: 'mobile',
        header: 'Mobile',
        width: 'w-28',
        align: 'text-center',
        value: (row) => formatMobile(row?.mobile, mobileFormat),
      },
      ...(showOpening
        ? [
            {
              key: 'openingbalance',
              header: 'Opening',
              width: 'w-20',
              align: 'text-right' as const,
              value: (row: any) => thousandSeparator(Number(row?.openingbalance ?? 0)),
              sum: (rows: any[]) =>
                rows.reduce((total, row) => total + Number(row?.openingbalance ?? 0), 0),
            },
          ]
        : []),
      {
        key: 'balance',
        header: 'Balance',
        width: 'w-24',
        align: 'text-right',
        value: (row) => thousandSeparator(Number(row?.balance ?? 0)),
        sum: (rows) => rows.reduce((total, row) => total + Number(row?.balance ?? 0), 0),
      },
    ];

    /**
     * Where the totals row's label goes: across every column that carries no
     * figure, up to the first that does. Derived from the same list as the
     * heading and the cells, so adding a column moves it rather than printing
     * the total under the wrong one.
     */
    const totalLabelSpan = Math.max(
      sheetColumns.findIndex((column) => column.sum),
      1,
    );

    /**
     * A sheet's own total, and -- on the sheet that ends the report -- the
     * report's. The two rows are the same shape; only what they add up differs,
     * so a page total can never be the whole list by accident.
     */
    const totalsRow = (label: string, source: any[], key: string) => (
      <tr key={key} className="bg-gray-100 font-bold">
        <td
          style={{ fontSize: fs }}
          colSpan={totalLabelSpan}
          className={`${cell} text-right`}
        >
          {label}
        </td>
        {sheetColumns.slice(totalLabelSpan).map((column) => (
          <td
            key={column.key}
            style={{ fontSize: fs }}
            className={`${cell} ${column.align ?? ''}`}
          >
            {column.sum ? thousandSeparator(column.sum(source)) : ''}
          </td>
        ))}
      </tr>
    );

    // Sheets of a fixed number of rows rather than one long flow: a heading and
    // a footer per sheet is what makes the second page readable on its own.
    const pages: any[][] = [];

    if (rowsPerPage > 0) {
      for (let i = 0; i < allRows.length; i += rowsPerPage) {
        pages.push(allRows.slice(i, i + rowsPerPage));
      }
    } else {
      pages.push(allRows);
    }

    const pageCount = pages.length || 1;

    return (
      <div ref={ref} className="print-root p-8 text-gray-900">
        <PrintStyles />

        {(pages.length ? pages : [[]]).map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />

            <div className="mb-4 mt-2 text-center">
              <h2 className="text-xl font-bold">{title}</h2>
              {filterLine ? <div className="mt-1 text-xs">{filterLine}</div> : null}
            </div>

            <table className="w-full table-fixed border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  {sheetColumns.map((column) => (
                    <th
                      key={column.key}
                      style={{ fontSize: fs }}
                      className={`${cell} ${column.width} ${column.align ?? ''}`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {pageRows.length ? (
                  pageRows.map((row, index) => (
                    <tr key={row?.id ?? index} className="avoid-break align-top">
                      {sheetColumns.map((column) => (
                        <td
                          key={column.key}
                          style={{ fontSize: fs }}
                          className={`${cell} ${column.align ?? ''}`}
                        >
                          {column.value(row)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      style={{ fontSize: fs }}
                      colSpan={sheetColumns.length}
                      className={`${cell} py-6 text-center text-gray-500`}
                    >
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>

              {pageRows.length ? (
                <tfoot>
                  {/* Every sheet closes with its own figure, so a sheet read on
                      its own still adds up. The last sheet of a run, and a list
                      that fits on one, also close with the whole list's. */}
                  {totalsRow(pageCount > 1 ? 'Page Total' : 'Grand Total', pageRows, 'page')}
                  {pageCount > 1 && pIdx === pageCount - 1
                    ? totalsRow('Grand Total', allRows, 'grand')
                    : null}
                </tfoot>
              ) : null}
            </table>

            <PrintFooter page={pIdx + 1} total={pageCount} fontSize={fs} />

            {pIdx !== pageCount - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  },
);

CustomerListPrint.displayName = 'CustomerListPrint';
export default CustomerListPrint;
