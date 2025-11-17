import React from "react";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

type DueRow = {
  sl_number?: number | string;
  coa4_name?: string;
  mobile?: string;
  manual_address?: string;
  ledger_page?: string | number;
  area_id?: string | number;
  debit?: number;
  credit?: number;
};

type Props = {
  rows: DueRow[];
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const DueListPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ rows, endDate, title = "Due List", rowsPerPage = 20, fontSize = 10 }, ref) => {
    const rowsArr = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(rowsArr, rowsPerPage);
    const fs = fontSize;

    return (
      <div ref={ref} className="p-8 text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">

            {/* Optional pad print header */}
            <PadPrinting />

            {/* Header */}
            <div className="mb-4 text-center">
              <h1 className="text-2xl font-bold">{title}</h1>
              <div className="text-xs mt-1">
                <span className="font-semibold">As On:</span> {endDate || "-"}
              </div>
            </div>

            {/* Table */}
            <table className="w-full table-fixed border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th style={{ fontSize: fs }} className="border border-gray-900 py-2 px-2 w-12 text-center">Sl</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 py-2 px-2">Member Info</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 py-2 px-2 w-20 text-center">Area</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 py-2 px-2 w-24 text-right">Debit</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 py-2 px-2 w-24 text-right">Credit</th>
                </tr>
              </thead>

              <tbody>
                {pageRows.length ? (
                  pageRows.map((row, idx) => (
                    <tr key={idx} className="align-top avoid-break">
                      {/* Sl Number */}
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                        {row.sl_number}
                      </td>

                      {/* Member Info */}
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                        <div className="font-semibold">{row.coa4_name}</div>
                        <div className="text-xs">{row.mobile}</div>
                        <div className="text-xs">{row.manual_address}</div>
                        <div className="text-xs">{row.ledger_page}</div>
                      </td>
                      {/* Area */}
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                        {row.area_id || "-"}
                      </td>

                      {/* Debit */}
                      <td
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-1 text-right align-middle"
                      >
                        { Number(row?.debit) > 0 ? thousandSeparator(Number(row?.debit), 0) : "-"}
                      </td>

                      {/* Credit */}
                      <td
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-1 text-right align-middle"
                      >
                        { Number(row.credit) > 0 ? thousandSeparator( Number(row.credit), 0) : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                    >
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-2 text-right text-xs" style={{ fontSize: fs }}>
              Page {pIdx + 1} of {pages.length}
            </div>

            {pIdx !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}

        <div className="mt-2 text-xs text-gray-900">
          * This document is system generated.
        </div>
      </div>
    );
  }
);

DueListPrint.displayName = "DueListPrint";
export default DueListPrint;
