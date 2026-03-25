import React from "react";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
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
};

type TrialBalanceLevel4PrintProps = {
  branchName: string;
  startDate: string;
  endDate: string;
  fontSize?: number;
  rows: TrialBalancePrintRow[];
  rowsPerPage?: number;
  totals: {
    openingDebit: number;
    openingCredit: number;
    movementDebit: number;
    movementCredit: number;
    closingDebit: number;
    closingCredit: number;
  };
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (!Array.isArray(data)) return [[]];
  if (size <= 0) return [data];

  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }

  return out;
};

const sumBy = (rows: TrialBalancePrintRow[], field: keyof TrialBalancePrintRow) =>
  rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);

const TrialBalanceLevel4Print = React.forwardRef<
  HTMLDivElement,
  TrialBalanceLevel4PrintProps
>(({ branchName, startDate, endDate, fontSize, rows, rowsPerPage = 20, totals }, ref) => {
  const fs = Number.isFinite(fontSize) ? Number(fontSize) : 12;
  const pages = chunkRows(rows || [], rowsPerPage);
  const safePages = pages.length > 0 ? pages : [[]];

  return (
    <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 4mm 8mm 8mm;
          }
          .page-break { page-break-after: always; }
          .print-root { padding: 0 !important; }
          .print-page {
            padding: 8mm !important;
            min-height: calc(297mm - 5mm - 4mm - 8mm - 8mm);
            display: flex;
            flex-direction: column;
          }
        }
      `}</style>

      {safePages.map((pageRows, pageIndex) => {
        const pageTotals = {
          openingDebit: sumBy(pageRows, "openingDebit"),
          openingCredit: sumBy(pageRows, "openingCredit"),
          movementDebit: sumBy(pageRows, "movementDebit"),
          movementCredit: sumBy(pageRows, "movementCredit"),
          closingDebit: sumBy(pageRows, "closingDebit"),
          closingCredit: sumBy(pageRows, "closingCredit"),
        };

        const isLastPage = pageIndex === safePages.length - 1;

        return (
          <div key={pageIndex} className="print-page">
            <PadPrinting />

            <div className="mb-4" style={{ fontSize: `${fs}px` }}>
              <h1
                className="mt-3 text-center font-bold"
                style={{ fontSize: `${fs + 10}px` }}
              >
                Trial Balance Level 4
              </h1>
              <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
                <div>
                  <span className="block font-semibold">{branchName}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">Report Date:</span> {startDate} - {endDate}
                </div>
              </div>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full border-collapse">
                <colgroup>
                  <col style={{ width: "36px" }} />
                  <col />
                  <col style={{ width: "72px" }} />
                  <col style={{ width: "72px" }} />
                  <col style={{ width: "72px" }} />
                  <col style={{ width: "72px" }} />
                  <col style={{ width: "72px" }} />
                  <col style={{ width: "72px" }} />
                </colgroup>
                <thead className="bg-gray-100">
                  <tr>
                    <th
                      rowSpan={2}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-1 py-2 text-center"
                    >
                      Sl
                    </th>
                    <th
                      rowSpan={2}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-left"
                    >
                      COA L4 Name
                    </th>
                    <th
                      colSpan={2}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-center"
                    >
                      Opening
                    </th>
                    <th
                      colSpan={2}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-center"
                    >
                      Movement
                    </th>
                    <th
                      colSpan={2}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-2 text-center"
                    >
                      Closing
                    </th>
                  </tr>
                  <tr>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-1 py-2 text-right">
                      Dr
                    </th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-1 py-2 text-right">
                      Cr
                    </th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-1 py-2 text-right">
                      Dr
                    </th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-1 py-2 text-right">
                      Cr
                    </th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-1 py-2 text-right">
                      Dr
                    </th>
                    <th style={{ fontSize: fs }} className="border border-gray-900 px-1 py-2 text-right">
                      Cr
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length > 0 ? (
                    pageRows.map((row, idx) => (
                      <tr key={row.key}>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-1 py-1 text-center align-middle"
                        >
                          {pageIndex * rowsPerPage + idx + 1}
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-1 align-middle"
                        >
                          <div className="break-words whitespace-normal">{row.name}</div>
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">
                          {thousandSeparator(Number(row.openingDebit || 0), 0)}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">
                          {thousandSeparator(Number(row.openingCredit || 0), 0)}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">
                          {thousandSeparator(Number(row.movementDebit || 0), 0)}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">
                          {thousandSeparator(Number(row.movementCredit || 0), 0)}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">
                          {thousandSeparator(Number(row.closingDebit || 0), 0)}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-1 py-1 text-right">
                          {thousandSeparator(Number(row.closingCredit || 0), 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                      >
                        No data found
                      </td>
                    </tr>
                  )}

                  {pageRows.length > 0 && !isLastPage && (
                    <tr className="font-semibold">
                      <td
                        colSpan={2}
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-1 text-right"
                      >
                        Subtotal (Page {pageIndex + 1})
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator(pageTotals.openingDebit, 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator(pageTotals.openingCredit, 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator(pageTotals.movementDebit, 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator(pageTotals.movementCredit, 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator(pageTotals.closingDebit, 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator(pageTotals.closingCredit, 0)}
                      </td>
                    </tr>
                  )}
                </tbody>
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
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator(totals.openingDebit, 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator(totals.openingCredit, 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator(totals.movementDebit, 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator(totals.movementCredit, 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator(totals.closingDebit, 0)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right">
                        {thousandSeparator(totals.closingCredit, 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div style={{ fontSize: fs }} className="mt-2 text-right text-xs">
              Page {pageIndex + 1} of {safePages.length}
            </div>

            {!isLastPage && <div className="page-break" />}
          </div>
        );
      })}

      <div className="mt-2 text-xs text-gray-900">
        * This document is system generated.
      </div>
    </div>
  );
});

TrialBalanceLevel4Print.displayName = "TrialBalanceLevel4Print";

export default TrialBalanceLevel4Print;
