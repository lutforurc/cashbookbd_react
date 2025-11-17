import React from "react";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

type RowType = {
  sl_number?: number;
  vr_date?: string;
  debit?: number;
  credit?: number;
  cumulative_debit?: number;
  cumulative_credit?: number;
  balance?: number;
};

type Props = {
  rows: RowType[];
  startDate?: string;
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const DateWisePrint = React.forwardRef<HTMLDivElement, Props>(
  ({ rows, startDate, endDate, title = "Date-wise Report", rowsPerPage = 25, fontSize = 10 }, ref) => {
    const pages = chunkRows(rows, rowsPerPage);
    const fs = fontSize;

    return (
      <div ref={ref} className="p-8 text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />

            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold">{title}</h1>
              <div className="text-xs">
                <strong>From:</strong> {startDate || "-"}  
                <strong className="ml-4">To:</strong> {endDate || "-"}
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse table-fixed">
              <thead className="bg-gray-100">
                <tr>
                  <th style={{ fontSize: fs }} className="border px-2 py-2">Sl</th>
                  <th style={{ fontSize: fs }} className="border px-2 py-2">Vr Date</th>
                  <th style={{ fontSize: fs }} className="border px-2 py-2 text-right">Debit</th>
                  <th style={{ fontSize: fs }} className="border px-2 py-2 text-right">Credit</th>
                  <th style={{ fontSize: fs }} className="border px-2 py-2 text-right">Cum. Debit</th>
                  <th style={{ fontSize: fs }} className="border px-2 py-2 text-right">Cum. Credit</th>
                  <th style={{ fontSize: fs }} className="border px-2 py-2 text-right">Balance</th>
                </tr>
              </thead>

              <tbody>
                {pageRows.map((row, idx) => (
                  <tr key={idx} className="align-middle">
                    <td style={{ fontSize: fs }} className="border px-2 py-1 text-center align-middle">
                      {row.sl_number}
                    </td>
                    <td style={{ fontSize: fs }} className="border px-2 py-1 text-center align-middle">
                      {row.vr_date}
                    </td>
                    <td style={{ fontSize: fs }} className="border px-2 py-1 text-right align-middle">
                      {row.debit > 0 ? thousandSeparator(row.debit, 0) : "-"}
                    </td>
                    <td style={{ fontSize: fs }} className="border px-2 py-1 text-right align-middle">
                      {row.credit > 0 ? thousandSeparator(row.credit, 0) : "-"}
                    </td>
                    <td style={{ fontSize: fs }} className="border px-2 py-1 text-right align-middle">
                      {row.cumulative_debit ? thousandSeparator(row.cumulative_debit, 0) : "-"}
                    </td>
                    <td style={{ fontSize: fs }} className="border px-2 py-1 text-right align-middle">
                      {row.cumulative_credit ? thousandSeparator(row.cumulative_credit, 0) : "-"}
                    </td>
                    <td style={{ fontSize: fs }} className="border px-2 py-1 text-right align-middle">
                      {thousandSeparator(row.balance, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-2 text-right text-xs">
              Page {pIdx + 1} of {pages.length}
            </div>

            {pIdx < pages.length - 1 && <div className="page-break" />}
          </div>
        ))}

        <div className="mt-2 text-xs">* This report is system generated.</div>
      </div>
    );
  }
);

DateWisePrint.displayName = "DateWisePrint";
export default DateWisePrint;
