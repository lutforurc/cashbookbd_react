import React from "react";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

type RowType = {
  sl_number?: number;
  vr_date?: string;
  debit?: number | string;
  credit?: number | string;
  cumulative_debit?: number | string;
  cumulative_credit?: number | string;
  balance?: number | string;
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
  // ⚠️ A size of nothing means ONE PAGE, not a step of nothing. Without this
  // the loop below advances by zero and never ends: the tab locks and the array
  // grows until the browser gives up. Zero is the ordinary way to ask for an
  // unbroken statement, so it reached here the moment anybody typed it.
  if (size <= 0) return [data];

  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const toNumber = (value: number | string | undefined) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
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
                      {toNumber(row.debit) > 0 ? thousandSeparator(toNumber(row.debit)) : "-"}
                    </td>
                    <td style={{ fontSize: fs }} className="border px-2 py-1 text-right align-middle">
                      {toNumber(row.credit) > 0 ? thousandSeparator(toNumber(row.credit)) : "-"}
                    </td>
                    <td style={{ fontSize: fs }} className="border px-2 py-1 text-right align-middle">
                      {toNumber(row.cumulative_debit) ? thousandSeparator(toNumber(row.cumulative_debit)) : "-"}
                    </td>
                    <td style={{ fontSize: fs }} className="border px-2 py-1 text-right align-middle">
                      {toNumber(row.cumulative_credit) ? thousandSeparator(toNumber(row.cumulative_credit)) : "-"}
                    </td>
                    <td style={{ fontSize: fs }} className="border px-2 py-1 text-right align-middle">
                      {thousandSeparator(toNumber(row.balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <PrintFooter page={pIdx + 1} total={pages.length} />

            {pIdx < pages.length - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  }
);

DateWisePrint.displayName = "DateWisePrint";
export default DateWisePrint;
