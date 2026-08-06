import React from "react";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import ReportFooter from "../../../utils/utils-functions/ReportFooter";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

/**
 * A level-3 expense head as the screen hands it over: already normalised, so
 * `key` carries the acc_coa_level3s id that the detail rows point back at.
 */
type ExpensePrintRow = {
  key: string;
  code: string;
  name: string;
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  closingDebit: number;
  closingCredit: number;
};

/**
 * A level-4 account beneath one of those heads. `coa3Id` is the only link back
 * to its group — the print view receives every group's details in one flat
 * array and sorts them into place itself.
 */
type ExpensePrintDetailRow = ExpensePrintRow & {
  coa3Id: number;
};

type ExpenseTotals = {
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  closingDebit: number;
  closingCredit: number;
};

type ExpenseReportPrintProps = {
  /** Accepted and ignored: PadPrinting already heads every page with it. */
  branchName?: string;
  startDate?: string;
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
  rows: ExpensePrintRow[];
  detailRows: ExpensePrintDetailRow[];
  totals: ExpenseTotals;
  /**
   * Follows the Report Type on screen. The printout used to carry the accounts
   * under every head whatever was selected, so asking for the group report and
   * pressing Print produced the detailed one.
   */
  showDetails?: boolean;
};

/**
 * One printed line. A group and the accounts beneath it are the same kind of
 * thing once the page has to be measured, so they are flattened into a single
 * stream before anything is cut -- see the note on pagination below.
 */
type PrintLine =
  | { kind: "group"; serial: number; row: ExpensePrintRow }
  | { kind: "detail"; row: ExpensePrintDetailRow };

const chunkLines = (data: PrintLine[], size: number): PrintLine[][] => {
  if (size <= 0) return [data];
  const out: PrintLine[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

/**
 * The printed Expense Report, laid out the way the Cash Book is.
 *
 * It prints what the Report Type on screen asks for: the level-3 heads alone,
 * or each head with its level-4 accounts indented beneath it. The two used to
 * disagree -- the printout always carried the accounts, so choosing the group
 * report and pressing Print handed back the detailed one.
 *
 * The paper is cut here rather than by the browser. Rendered as one block the
 * letterhead, the title and the dates appeared once and the rest was broken
 * wherever the page ran out, so page two onward carried no heading and nothing
 * said which page you were holding. Every page is now built the way the Cash
 * Book builds one -- letterhead, title, date line, table, page number.
 *
 * Heads and their accounts are flattened into one stream before anything is
 * cut. Cutting the nested structure directly would mean either treating a head
 * and all its accounts as one unsplittable row, which overruns the page on a
 * long head, or cutting inside the loop that renders them, which cannot be
 * done from where that loop sits.
 */
const ExpenseReportPrint = React.forwardRef<
  HTMLDivElement,
  ExpenseReportPrintProps
>(
  (
    {
      startDate,
      endDate,
      title = "Expense Report",
      rowsPerPage = 20,
      fontSize,
      rows,
      detailRows,
      totals,
      showDetails = false,
    },
    ref,
  ) => {
    const fs = Number.isFinite(fontSize) ? Number(fontSize) : 9;
    const totalFs = Math.max(fs - 1, 8);

    // SAFETY: ensure arrays, so a report that arrived empty still prints a page
    // rather than throwing on map/filter.
    const rowsArr = Array.isArray(rows) ? rows : [];
    const detailArr = Array.isArray(detailRows) ? detailRows : [];

    const lines: PrintLine[] = [];
    rowsArr.forEach((row, index) => {
      lines.push({ kind: "group", serial: index + 1, row });

      if (!showDetails) {
        return;
      }

      // `key` holds the level-3 id, `code` is the same value as a fallback --
      // the screen matches the drill-down on both.
      const groupId = Number(row.key || row.code);
      detailArr
        .filter((detail) => Number(detail.coa3Id) === groupId)
        .forEach((detail) => lines.push({ kind: "detail", row: detail }));
    });

    const pages = chunkLines(lines, rowsPerPage);
    const cell = "border border-gray-900 px-1 py-1 text-right";

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageLines, pIdx) => {
          const isLastPage = pIdx === pages.length - 1;

          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />

              {/* Per-page header (prints on every page) */}
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-center">{title}</h1>
                <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                  <div>
                    <span className="font-semibold">Report Date:</span>{" "}
                    {startDate || "-"} to {endDate || "-"}
                  </div>
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <table className="w-full border-collapse leading-tight">
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
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-1 py-2 text-center font-semibold"
                      >
                        Serial
                      </th>
                      <th
                        rowSpan={2}
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 text-left font-semibold whitespace-nowrap"
                      >
                        Description
                      </th>
                      <th
                        colSpan={2}
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 text-center font-semibold"
                      >
                        Opening
                      </th>
                      <th
                        colSpan={2}
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 text-center font-semibold"
                      >
                        Movement
                      </th>
                      <th
                        colSpan={2}
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 text-center font-semibold"
                      >
                        Closing
                      </th>
                    </tr>
                    <tr>
                      {["Dr", "Cr", "Dr", "Cr", "Dr", "Cr"].map(
                        (label, index) => (
                          <th
                            key={`${label}-${index}`}
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-1 py-1 text-center font-semibold"
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {pageLines.length ? (
                      pageLines.map((line, idx) => {
                        const row = line.row;
                        const isGroup = line.kind === "group";

                        return (
                          <tr
                            key={`${pIdx}-${idx}-${row.key}`}
                            className={`avoid-break ${
                              isGroup ? "font-semibold" : ""
                            }`}
                          >
                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-1 py-1 text-center align-middle"
                            >
                              {isGroup ? line.serial : ""}
                            </td>
                            <td
                              style={{
                                fontSize: fs,
                                // The serial belongs to the group; its accounts
                                // sit under it unnumbered, so the indent is the
                                // only thing saying where they belong.
                                paddingLeft: isGroup ? undefined : 14,
                              }}
                              className="border border-gray-900 px-2 py-1 align-middle whitespace-nowrap"
                            >
                              {row.name}
                            </td>
                            <td style={{ fontSize: fs }} className={cell}>
                              {thousandSeparator(row.openingDebit)}
                            </td>
                            <td style={{ fontSize: fs }} className={cell}>
                              {thousandSeparator(row.openingCredit)}
                            </td>
                            <td style={{ fontSize: fs }} className={cell}>
                              {thousandSeparator(row.movementDebit)}
                            </td>
                            <td style={{ fontSize: fs }} className={cell}>
                              {thousandSeparator(row.movementCredit)}
                            </td>
                            <td style={{ fontSize: fs }} className={cell}>
                              {thousandSeparator(row.closingDebit)}
                            </td>
                            <td style={{ fontSize: fs }} className={cell}>
                              {thousandSeparator(row.closingCredit)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                        >
                          No data found
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* The total closes the report, so it belongs on the sheet
                      that ends it -- repeating it per page would read as a
                      running subtotal, which it is not. */}
                  {isLastPage && (
                    <tfoot>
                      <tr className="bg-gray-100 font-semibold">
                        <td
                          colSpan={2}
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-1 text-right"
                        >
                          Grand Total
                        </td>
                        <td style={{ fontSize: totalFs }} className={cell}>
                          {thousandSeparator(totals.openingDebit)}
                        </td>
                        <td style={{ fontSize: totalFs }} className={cell}>
                          {thousandSeparator(totals.openingCredit)}
                        </td>
                        <td style={{ fontSize: totalFs }} className={cell}>
                          {thousandSeparator(totals.movementDebit)}
                        </td>
                        <td style={{ fontSize: totalFs }} className={cell}>
                          {thousandSeparator(totals.movementCredit)}
                        </td>
                        <td style={{ fontSize: totalFs }} className={cell}>
                          {thousandSeparator(totals.closingDebit)}
                        </td>
                        <td style={{ fontSize: totalFs }} className={cell}>
                          {thousandSeparator(totals.closingCredit)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div
                style={{ fontSize: fs }}
                className="mt-auto text-right text-xs"
              >
                Page {pIdx + 1} of {pages.length}
              </div>

              {/* Page break between pages */}
              {!isLastPage && <div className="page-break" />}
            </div>
          );
        })}

        {/* Note */}
        <ReportFooter />
      </div>
    );
  },
);

ExpenseReportPrint.displayName = "ExpenseReportPrint";
export default ExpenseReportPrint;
