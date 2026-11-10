import React from "react";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { formatDayMonthYear } from "../../../utils/utils-functions/formatDate";

export type InvoiceWiseProfitPrintRow = {
  sl?: number;
  vr_no?: string | null;
  vr_date?: string | null;
  customer_name?: string | null;
  invoice_amount?: number | null;
  received_amount?: number | null;
  discount?: number | null;
  profit?: number | null;
};

type Props = {
  rows: InvoiceWiseProfitPrintRow[];
  branchName?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }
  return out;
};

const InvoiceWiseProfitPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      branchName,
      search,
      startDate,
      endDate,
      rowsPerPage = 12,
      fontSize,
    },
    ref
  ) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const fs = Number.isFinite(fontSize) ? Number(fontSize) : 10;
    const pages = chunkRows(safeRows, rowsPerPage);
    const totals = safeRows.reduce(
      (sum, row) => ({
        invoiceAmount: sum.invoiceAmount + toNumber(row?.invoice_amount),
        received: sum.received + toNumber(row?.received_amount),
        discount: sum.discount + toNumber(row?.discount),
        profit: sum.profit + toNumber(row?.profit),
      }),
      { invoiceAmount: 0, received: 0, discount: 0, profit: 0 }
    );

    return (
      <div ref={ref} className="p-8 text-sm text-black print-root">
        <PrintStyles accent="black" />

        {pages.map((pageRows, pageIndex) => (
          <div key={pageIndex} className="print-page">
            <PadPrinting />

            <div className="mb-4">
              <h1 className="text-center text-2xl font-bold text-black">
                Invoice Wise Profit
              </h1>
              <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-black">
                <div>
                  <span className="font-semibold">Branch:</span> {branchName || "-"}
                </div>
                <div className="text-right">
                  <span className="font-semibold">Period:</span> {startDate || "-"} -{" "}
                  {endDate || "-"}
                </div>
                {search ? (
                  <div>
                    <span className="font-semibold">Invoice:</span> {search}
                  </div>
                ) : null}
              </div>
            </div>

            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "4%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "21%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-center text-black">
                    #
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-left text-black">
                    Inv. No.
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-left text-black">
                    Date
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-left text-black">
                    Customer
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right text-black">
                    Inv. Amount
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right text-black">
                    Received Amt
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right text-black">
                    Discount
                  </th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 px-2 py-2 text-right text-black">
                    Profit
                  </th>
                </tr>
              </thead>

              <tbody>
                {pageRows.length ? (
                  pageRows.map((row, idx) => (
                    <tr key={`${row?.vr_no || "row"}-${idx}`} className="avoid-break">
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center text-black">
                        {row?.sl ?? pageIndex * rowsPerPage + idx + 1}
                      </td>
                      <td style={{ fontSize: (fs - 1), lineHeight: 1.35 }} className="border border-gray-900 px-2 py-1 text-black">
                        {row?.vr_no || "-"}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-black">
                        {formatDayMonthYear(row?.vr_date)}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-black">
                        {row?.customer_name || "-"}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right text-black">
                        {thousandSeparator(toNumber(row?.invoice_amount))}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right text-black">
                        {thousandSeparator(toNumber(row?.received_amount))}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right text-black">
                        {thousandSeparator(toNumber(row?.discount))}
                      </td>
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-right text-black">
                        {thousandSeparator(toNumber(row?.profit))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="border border-gray-900 px-3 py-6 text-center text-black">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {pageIndex === pages.length - 1 ? (
              <div className="mt-3 border border-gray-900 px-3 py-3">
                <div className="flex flex-nowrap items-center justify-between gap-4 overflow-hidden text-sm text-black">
                  <div style={{ fontSize: fs }} className="whitespace-nowrap font-bold">
                    Total
                  </div>
                  <div style={{ fontSize: fs }} className="whitespace-nowrap text-right font-bold">
                    Inv. Amount: {thousandSeparator(totals.invoiceAmount)}
                  </div>
                  <div style={{ fontSize: fs }} className="whitespace-nowrap text-right font-bold">
                    Received: {thousandSeparator(totals.received)}
                  </div>
                  <div style={{ fontSize: fs }} className="whitespace-nowrap text-right font-bold">
                    Discount: {thousandSeparator(totals.discount)}
                  </div>
                  <div style={{ fontSize: fs }} className="whitespace-nowrap text-right font-bold">
                    Profit: {thousandSeparator(totals.profit)}
                  </div>
                </div>
              </div>
            ) : null}

            {/* ⚠️ AN UNBROKEN RUN IS PINNED TO THE PAPER.
                Rows left blank (the default) puts every invoice in one block
                and lets the browser decide where the sheets fall -- and a
                footer in the flow prints once, at the end of the run, so the
                sheets before it carry no software line at all. The pinned form
                is repainted on every sheet the document runs to. It carries no
                page count for the same reason: nothing here knows how many
                sheets the browser made. Set Rows and the report cuts its own
                pages, and then the foot says which one this is. */}
            {rowsPerPage > 0 ? (
              <PrintFooter page={pageIndex + 1} total={pages.length} fontSize={fs} />
            ) : (
              <PrintFooter fixed fontSize={fs} />
            )}

            {pageIndex !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  }
);

InvoiceWiseProfitPrint.displayName = "InvoiceWiseProfitPrint";

export default InvoiceWiseProfitPrint;
