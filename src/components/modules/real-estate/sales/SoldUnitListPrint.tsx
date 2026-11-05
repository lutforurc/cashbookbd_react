import React from "react";
import dayjs from "dayjs";

import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import { SoldUnitCustomer, SoldUnitTotals } from "./types";
import { formatMobile, useMobileFormat } from "../../../utils/utils-functions/mobileFormat";
import {
  customerColor,
  edgeStyle,
  money,
  saleLines,
  saleReceipts,
} from "./soldUnitReport";

type Props = {
  customers: SoldUnitCustomer[];
  totals?: SoldUnitTotals;
  period?: string;
  title?: string;
  fontSize?: number;
};

const SoldUnitListPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      customers,
      totals,
      period,
      title = "Customer Wise Sold Unit List",
      fontSize = 10,
    },
    ref
  ) => {
    const rows = Array.isArray(customers) ? customers : [];
    const mobileFormat = useMobileFormat();
    const fs = fontSize;
    const cell = "border border-gray-900 px-2 py-1";

    return (
      <div ref={ref} className="sold-unit-print p-8 text-gray-900 print-root">
        <PrintStyles />
        {/* Browsers drop background/border colours when printing unless the page
            opts in, and the customer outlines are the point of this layout. */}
        <style>
          {`@media print {
              .sold-unit-print, .sold-unit-print * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              /* A customer's box is never split across a fold. */
              .sold-unit-print tbody { break-inside: avoid; }
            }`}
        </style>

        <div className="print-page">
          <PadPrinting />

          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold">{title}</h1>
            <div className="mt-1 text-xs">
              <span className="font-semibold">Period:</span> {period || "All dates"}
            </div>
          </div>

          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th style={{ fontSize: fs }} className={`${cell} w-10 text-center`}>Sl</th>
                <th style={{ fontSize: fs }} className={`${cell} w-56`}>Customer</th>
                <th style={{ fontSize: fs }} className={cell}>Unit / Parking</th>
                <th style={{ fontSize: fs }} className={`${cell} w-28 text-right`}>Amount</th>
                <th style={{ fontSize: fs }} className={`${cell} w-28 text-right`}>Total</th>
                <th style={{ fontSize: fs }} className={`${cell} w-28 text-right`}>Received</th>
                <th style={{ fontSize: fs }} className={`${cell} w-28 text-right`}>Due</th>
              </tr>
            </thead>

              {/* One <tbody> per customer: break-inside:avoid on it keeps the
                  customer's box on one sheet, and the <thead> above repeats on
                  every sheet the browser starts. */}
              {rows.length ? (
                rows.map((customer, customerIndex) => {
                  const color = customerColor(customerIndex).border;
                  const tint = customerColor(customerIndex).tint;
                  const sales = customer.units.map((unit) => ({
                    unit,
                    lines: saleLines(unit),
                  }));
                  const customerRowSpan = sales.reduce(
                    (sum, sale) => sum + sale.lines.length,
                    0
                  );
                  let rowCursor = 0;

                  return (
                    <tbody key={customer.customer_id}>
                      {sales.map(({ unit, lines }) =>
                        lines.map((line, lineIndex) => {
                          const rowIndex = rowCursor++;
                          const isFirstRow = rowIndex === 0;
                          const isLastRow = rowIndex === customerRowSpan - 1;
                          const saleEndsBlock =
                            rowIndex + lines.length === customerRowSpan;

                          return (
                            <tr
                              key={`${unit.sale_id}-${lineIndex}`}
                              className="avoid-break align-top"
                            >
                              {isFirstRow && (
                                <>
                                  <td
                                    rowSpan={customerRowSpan}
                                    style={{
                                      fontSize: fs,
                                      ...edgeStyle(color, {
                                        top: true,
                                        bottom: true,
                                        left: true,
                                      }),
                                      backgroundColor: tint,
                                      color,
                                    }}
                                    className={`${cell} text-center align-middle font-semibold`}
                                  >
                                    {customerIndex + 1}
                                  </td>
                                  <td
                                    rowSpan={customerRowSpan}
                                    style={{
                                      fontSize: fs,
                                      ...edgeStyle(color, {
                                        top: true,
                                        bottom: true,
                                      }),
                                      backgroundColor: tint,
                                    }}
                                    className={`${cell} align-middle`}
                                  >
                                    <div className="font-semibold">
                                      {customer.customer_name}
                                    </div>
                                    {customer.customer_address ? (
                                      <div>{customer.customer_address}</div>
                                    ) : null}
                                    {customer.customer_mobile ? (
                                      <div>Cell: {formatMobile(customer.customer_mobile, mobileFormat)}</div>
                                    ) : null}
                                  </td>
                                </>
                              )}

                              <td
                                style={{
                                  fontSize: fs,
                                  ...edgeStyle(color, {
                                    top: isFirstRow,
                                    bottom: isLastRow,
                                  }),
                                }}
                                className={cell}
                              >
                                <div>{line.caption || "-"}</div>
                                {line.place ? <div>{line.place}</div> : null}
                              </td>

                              <td
                                style={{
                                  fontSize: fs,
                                  ...edgeStyle(color, {
                                    top: isFirstRow,
                                    bottom: isLastRow,
                                  }),
                                }}
                                className={`${cell} text-right align-middle`}
                              >
                                {money(line.amount)}
                              </td>

                              {lineIndex === 0 && (
                                <>
                                  <td
                                    rowSpan={lines.length}
                                    style={{
                                      fontSize: fs,
                                      ...edgeStyle(color, {
                                        top: isFirstRow,
                                        bottom: saleEndsBlock,
                                      }),
                                    }}
                                    className={`${cell} text-right align-middle`}
                                  >
                                    <div>{money(unit.total_amount)}</div>
                                    <div className="text-[8px]">
                                      {unit.sale_date
                                        ? dayjs(unit.sale_date).format("DD/MM/YYYY")
                                        : ""}
                                    </div>
                                  </td>
                                  <td
                                    rowSpan={lines.length}
                                    style={{
                                      fontSize: fs,
                                      ...edgeStyle(color, {
                                        top: isFirstRow,
                                        bottom: saleEndsBlock,
                                      }),
                                    }}
                                    className={`${cell} text-right align-middle`}
                                  >
                                    <div>{money(unit.received_amount)}</div>
                                    {saleReceipts(unit).map((receipt, index) => (
                                      <div
                                        key={`${receipt.receipt_no ?? "mr"}-${index}`}
                                        className="text-[8px]"
                                      >
                                        {receipt.payment_date
                                          ? dayjs(receipt.payment_date).format("DD/MM/YYYY")
                                          : ""}
                                        {receipt.receipt_no ? ` | ${receipt.receipt_no}` : ""}
                                      </div>
                                    ))}
                                    {/* Installment money, apart from the booking lines above: a
                                        receipt here is an allocation, not a booking receipt. */}
                                    {Number(unit.installment_received || 0) > 0 ? (
                                      <div className="mt-1">
                                        <div>Installment</div>
                                        <div className="border-t border-gray-500">{money(unit.installment_received)}</div>
                                      </div>
                                    ) : null}
                                  </td>
                                  <td
                                    rowSpan={lines.length}
                                    style={{
                                      fontSize: fs,
                                      ...edgeStyle(color, {
                                        top: isFirstRow,
                                        bottom: saleEndsBlock,
                                        right: true,
                                      }),
                                    }}
                                    className={`${cell} text-right align-middle font-semibold`}
                                  >
                                    {money(unit.due_amount)}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  );
                })
              ) : (
                <tbody>
                  <tr>
                    <td colSpan={7} className={`${cell} py-6 text-center text-gray-500`}>
                      No sold unit found
                    </td>
                  </tr>
                </tbody>
              )}

            {/* The report's total, once, after the last customer. ⚠️ Not a
                <tfoot>: the browser repeats a <tfoot> on every sheet. */}
            {rows.length ? (
              <tbody>
                <tr className="bg-gray-100 font-bold">
                  <td style={{ fontSize: fs }} className={`${cell} text-right`} colSpan={4}>
                    Grand Total ({totals?.customer_count ?? 0} customer, {totals?.unit_count ?? 0} unit, {totals?.parking_count ?? 0} parking)
                  </td>
                  <td style={{ fontSize: fs }} className={`${cell} text-right`}>
                    {money(totals?.total_amount)}
                  </td>
                  <td style={{ fontSize: fs }} className={`${cell} text-right`}>
                    {money(totals?.received_amount)}
                  </td>
                  <td style={{ fontSize: fs }} className={`${cell} text-right`}>
                    {money(totals?.due_amount)}
                  </td>
                </tr>
              </tbody>
            ) : null}

            {/* The pinned footer's band, held back at the foot of every sheet:
                a <tfoot> is the one part of a table the browser repeats there.
                Without it a full sheet's last rows print through the footer.
                Same 6mm as ItemDetailsPrint. */}
            <tfoot>
              <tr>
                <td colSpan={7} style={{ height: "6mm", border: "none" }} />
              </tr>
            </tfoot>
          </table>

          {/* ⚠️ PINNED, as Cash Book pins its own when the report is one block.
              This report used to be cut into blocks of eight customers, each
              ending in an in-flow footer -- but a customer runs to four lines,
              so a block outgrew its sheet and its footer landed halfway down the
              next one. The browser breaks the pages now, and a fixed footer is
              repainted at the foot of every sheet. It carries no page count:
              nothing pinned can tell which sheet it stands on. */}
          <PrintFooter fixed fontSize={fs} />
        </div>
      </div>
    );
  }
);

SoldUnitListPrint.displayName = "SoldUnitListPrint";
export default SoldUnitListPrint;
