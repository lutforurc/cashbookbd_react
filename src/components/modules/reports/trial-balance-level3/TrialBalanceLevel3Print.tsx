import React from "react";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

type TrialBalancePrintRow = {
  key: string;
  code: string;
  name: string;
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  closingDebit: number;
  closingCredit: number;
  /**
   * A ledger printed under its group, in Detailed mode. Carries no serial of
   * its own -- the serials count groups -- and is indented, indented being the
   * whole of how a reader tells the two apart on paper.
   */
  child?: boolean;
};

type TrialBalanceLevel3PrintProps = {
  branchName?: string;
  startDate: string;
  endDate: string;
  fontSize?: number;
  rowsPerPage?: number;
  rows: TrialBalancePrintRow[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    movementDebit: number;
    movementCredit: number;
    closingDebit: number;
    closingCredit: number;
  };
};

/**
 * What this report is, said once and used by both surfaces.
 *
 * A trial balance is read for what it does NOT contain as much as for what it
 * does, and this one is three things a reader would otherwise have to guess:
 * it is unadjusted (posted vouchers only, no closing entries), its movement
 * columns are gross turnover rather than net movement, and stock is not in the
 * ledger at all -- the closing stock on the balance sheet is valued outside it
 * and is not on this report. Left unsaid, an accountant reconciles this sheet
 * against the balance sheet, comes up short by the stock, and concludes the
 * report is broken.
 *
 * Lives here, beside the print that shows it, and the screen imports it from
 * here rather than repeating the sentence -- one wording, so the screen and the
 * paper can never describe the same report two ways.
 */
export const TRIAL_BALANCE_BASIS =
  "Unadjusted trial balance: posted vouchers only, no closing entries. " +
  "Movement columns are the period's gross debits and credits; opening and " +
  "closing are balances. Stock is valued outside the ledger, so the closing " +
  "stock on the balance sheet is not part of this report.";

/**
 * Cut the rows into pages of at most `size`, and never leave a group heading
 * alone at the foot of one.
 *
 * A page ends when the next row will not fit. That much is plain slicing. What
 * is not plain is the row that would START the next page: in Detailed mode the
 * list is groups with their ledgers under them, so if that row is a ledger, the
 * heading it belongs to is already the last line of the page behind it -- and
 * the sheet reads as a group with nothing in it. So the heading moves down onto
 * the next page with its ledgers.
 *
 * A group with more ledgers than fit on a page still splits -- there is nowhere
 * else for them to go -- and the page header repeats on the sheet that carries
 * the rest, so the columns are never in doubt.
 */
const cutPages = (rows: TrialBalancePrintRow[], size: number): TrialBalancePrintRow[][] => {
  if (size <= 0) return [rows];

  const pages: TrialBalancePrintRow[][] = [];
  let page: TrialBalancePrintRow[] = [];

  rows.forEach((row) => {
    if (page.length >= size) {
      // A ledger about to start a page whose group heading closed the last one:
      // take the heading back and start the new page with both.
      if (row.child && !page[page.length - 1].child) {
        pages.push(page.slice(0, -1));
        page = [page[page.length - 1]];
      } else {
        pages.push(page);
        page = [];
      }
    }

    page.push(row);
  });

  if (page.length) pages.push(page);

  return pages.length ? pages : [[]];
};

/**
 * The printed Trial Balance (Group).
 *
 * Pages are cut here rather than left to the browser. Rendered as one block the
 * letterhead and the heading appeared once and the rest was broken wherever the
 * paper ran out, so a sheet from the middle of the stack said nothing about
 * what it was or where it came in the run. Every page now carries the
 * letterhead, the title, the period and its own number.
 */
const TrialBalanceLevel3Print = React.forwardRef<
  HTMLDivElement,
  TrialBalanceLevel3PrintProps
>(({
  startDate,
  endDate,
  fontSize,
  rowsPerPage = 20,
  rows,
  totals,
}, ref) => {
  const fs = Number.isFinite(fontSize) ? Number(fontSize) : 12;
  const totalFs = Math.max(fs - 1, 8);

  const rowsArr = Array.isArray(rows) ? rows : [];
  const pages = cutPages(rowsArr, rowsPerPage);
  const pageCount = pages.length;

  // Numbered over the whole list, once, so the serial a row carries does not
  // depend on which page it landed on. Ledgers take no number -- they belong to
  // the group above them, and numbering them would read as another group.
  const serialByKey = new Map<string, number>();
  rowsArr.forEach((row) => {
    if (!row.child) serialByKey.set(row.key, serialByKey.size + 1);
  });

  return (
    <div ref={ref} className="bg-white p-6 text-slate-900 print-root">
      <PrintStyles />
      {pages.map((pageRows, pIdx) => {
        const isLastPage = pIdx === pageCount - 1;

        return (
      <div key={pIdx} className="print-page">
        <PadPrinting />

        <div className="mb-4 text-center" style={{ fontSize: `${fs}px` }}>
          <h1 className="mt-1 font-bold" style={{ fontSize: `${fs + 10}px` }}>
            Trial Balance Group
          </h1>
          <p>
            Period: {startDate} to {endDate}
          </p>
        </div>

        <table
          className="w-full border-collapse leading-tight"
          style={{ fontSize: `${fs}px` }}
        >
          <colgroup>
            <col style={{ width: "36px" }} />
            <col style={{ width: "140px" }} />
            <col />
            <col />
            <col />
            <col />
            <col />
            <col />
          </colgroup>
          <thead className="bg-gray-100">
            <tr>
              <th
                rowSpan={2}
                className="border border-gray-900 px-1 py-1 text-center font-semibold"
              >
                Serial
              </th>
              <th
                rowSpan={2}
                className="border border-gray-900 px-2 py-1 text-left font-semibold whitespace-nowrap"
              >
                Description
              </th>
              <th colSpan={2} className="border border-gray-900 px-2 py-1 text-center font-semibold">
                Opening
              </th>
              <th colSpan={2} className="border border-gray-900 px-2 py-1 text-center font-semibold">
                Movement
              </th>
              <th colSpan={2} className="border border-gray-900 px-2 py-1 text-center font-semibold">
                Closing
              </th>
            </tr>
            <tr>
              <th className="border border-gray-900 px-1 py-1 text-center font-semibold">
                Dr
              </th>
              <th className="border border-gray-900 px-1 py-1 text-center font-semibold">
                Cr
              </th>
              <th className="border border-gray-900 px-1 py-1 text-center font-semibold">
                Dr
              </th>
              <th className="border border-gray-900 px-1 py-1 text-center font-semibold">
                Cr
              </th>
              <th className="border border-gray-900 px-1 py-1 text-center font-semibold">
                Dr
              </th>
              <th className="border border-gray-900 px-1 py-1 text-center font-semibold">
                Cr
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.key} className={row.child ? "text-gray-800" : ""}>
                <td className="border border-gray-900 px-1 py-0.5 text-center align-middle">
                  {serialByKey.get(row.key) ?? ""}
                </td>
                {/* The indent is the whole difference on paper: a ledger sits
                    under the group it was summed into, and nothing else on the
                    row says which of the two it is. */}
                <td className={`border border-gray-900 px-2 py-0.5 align-middle whitespace-nowrap ${row.child ? "pl-6" : ""}`}>
                  {row.name}
                </td>
                <td className="border border-gray-900 px-1 py-0.5 text-right">
                  {thousandSeparator(row.openingDebit)}
                </td>
                <td className="border border-gray-900 px-1 py-0.5 text-right">
                  {thousandSeparator(row.openingCredit)}
                </td>
                <td className="border border-gray-900 px-1 py-0.5 text-right">
                  {thousandSeparator(row.movementDebit)}
                </td>
                <td className="border border-gray-900 px-1 py-0.5 text-right">
                  {thousandSeparator(row.movementCredit)}
                </td>
                <td className="border border-gray-900 px-1 py-0.5 text-right">
                  {thousandSeparator(row.closingDebit)}
                </td>
                <td className="border border-gray-900 px-1 py-0.5 text-right">
                  {thousandSeparator(row.closingCredit)}
                </td>
              </tr>
            ))}
          </tbody>
          {/* The total closes the report, so it belongs on the sheet that ends
              it -- repeated per page it would read as a running subtotal. */}
          {isLastPage && (
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td colSpan={2}
                className="border border-gray-900 px-2 py-0.5 text-right"
              >
                Grand Total
              </td>
              {/* <td className="border border-gray-900 px-2 py-0.5"></td> */}
              <td
                style={{ fontSize: `${totalFs}px` }}
                className="border border-gray-900 px-1 py-0.5 text-right"
              >
                {thousandSeparator(totals.openingDebit)}
              </td>
              <td
                style={{ fontSize: `${totalFs}px` }}
                className="border border-gray-900 px-1 py-0.5 text-right"
              >
                {thousandSeparator(totals.openingCredit)}
              </td>
              <td
                style={{ fontSize: `${totalFs}px` }}
                className="border border-gray-900 px-1 py-0.5 text-right"
              >
                {thousandSeparator(totals.movementDebit)}
              </td>
              <td
                style={{ fontSize: `${totalFs}px` }}
                className="border border-gray-900 px-1 py-0.5 text-right"
              >
                {thousandSeparator(totals.movementCredit)}
              </td>
              <td
                style={{ fontSize: `${totalFs}px` }}
                className="border border-gray-900 px-1 py-0.5 text-right"
              >
                {thousandSeparator(totals.closingDebit)}
              </td>
              <td
                style={{ fontSize: `${totalFs}px` }}
                className="border border-gray-900 px-1 py-0.5 text-right"
              >
                {thousandSeparator(totals.closingCredit)}
              </td>
            </tr>
          </tfoot>
          )}
        </table>

        {/* The note belongs AFTER the figures, not before them. It says why this
            total and the balance sheet's do not meet, and nobody asks that
            question until the Grand Total is in front of them -- above the
            table it was boilerplate a reader skipped. Left-aligned with the
            table's own left edge, and only on the sheet carrying the Grand
            Total: repeated per page it would read as part of the page
            furniture, which is what the footer below it is for. */}
        {isLastPage && (
          <p
            className="mt-4 mb-2 text-left leading-snug text-gray-700"
            style={{ fontSize: `${Math.max(fs - 2, 9)}px` }}
          >
            {TRIAL_BALANCE_BASIS}
          </p>
        )}

        <PrintFooter page={pIdx + 1} total={pageCount} />

        {!isLastPage && <div className="page-break" />}
      </div>
        );
      })}
    </div>
  );
});

TrialBalanceLevel3Print.displayName = "TrialBalanceLevel3Print";
export default TrialBalanceLevel3Print;
