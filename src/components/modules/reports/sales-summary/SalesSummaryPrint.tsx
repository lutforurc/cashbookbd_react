import React from "react";

import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import { formatMobile, useMobileFormat } from "../../../utils/utils-functions/mobileFormat";
import { money } from "../../real-estate/sales/soldUnitReport";
import { SalesSummaryCustomer } from "./salesSummarySlice";
import { placeOf, unitOf } from "./salesSummaryLines";

type Totals = {
  total: number;
  received: number;
  due: number;
};

type Props = {
  customers: SalesSummaryCustomer[];
  totals: Totals;
  /** "Location: All Locations | Project: Baganbari | Building: All Buildings" */
  filterLine?: string;
  fontSize?: number;
  /**
   * Buyers per sheet, not rows -- a buyer with three flats is four lines tall,
   * and the count is set for the tallest rather than the average so a sheet
   * never runs past its fold.
   */
  customersPerPage?: number;
};

const chunk = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

/**
 * The sales summary on paper.
 *
 * ⚠️ IT IS A COMPONENT OF ITS OWN, AND THAT IS WHAT MAKES IT PRINT. The report
 * used to hold its printable markup inline, in the div that carried `printRef`,
 * and that div carried `hidden` as well -- so react-to-print cloned a node
 * whose own class said `display: none` and the sheet came out blank. Every
 * other report in the app hides a WRAPPER and points the ref at the visible
 * node inside it, which is the shape here: the caller writes
 *
 *     <div className="hidden"><SalesSummaryPrint ref={printRef} ... /></div>
 *
 * so the thing being cloned is never the thing being hidden.
 *
 * What it also gains by being a real print view: the letterhead, the shared
 * @page rules, the footer with a page count, and headings repeated on every
 * sheet -- none of which the inline block had.
 */
const SalesSummaryPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ customers, totals, filterLine, fontSize = 10, customersPerPage = 14 }, ref) => {
    const rows = Array.isArray(customers) ? customers : [];
    const mobileFormat = useMobileFormat();
    const fs = fontSize;
    const cell = "border border-gray-900 px-2 py-1";

    // Cut into sheets here. Left to the browser, the second page onward carried
    // no column headings and nothing saying which sheet it was.
    const pages = chunk(rows, customersPerPage);
    const pageCount = pages.length || 1;

    return (
      <div ref={ref} className="print-root p-8 text-gray-900">
        <PrintStyles />

        {(pages.length ? pages : [[]]).map((pageRows, pIdx) => {
          const isLastPage = pIdx === pageCount - 1;
          const serialOffset = pIdx * customersPerPage;

          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />

              <div className="mb-4 text-center">
                <h1 className="text-xl font-bold">Sales Summary Report</h1>
                {filterLine ? <div className="mt-1 text-xs">{filterLine}</div> : null}
              </div>

              <table className="w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th style={{ fontSize: fs }} className={`${cell} w-10 text-center`}>Sl</th>
                    <th style={{ fontSize: fs }} className={cell}>Customer Name</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-28 text-right`}>Sales Amount</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-28 text-right`}>Received Amt</th>
                    <th style={{ fontSize: fs }} className={`${cell} w-28 text-right`}>Due Amt</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length ? (
                    pageRows.map((customer, pageIndex) => {
                      // The serial follows the buyer's place in the whole
                      // report, not on this sheet, so it does not restart at a
                      // fold.
                      const serial = serialOffset + pageIndex + 1;

                      return (
                        <tr key={customer.customer_id} className="avoid-break align-top">
                          <td style={{ fontSize: fs }} className={`${cell} text-center`}>
                            {serial}
                          </td>
                          <td style={{ fontSize: fs }} className={cell}>
                            <div className="font-semibold">{customer.customer_name || "-"}</div>
                            {customer.customer_mobile ? (
                              <div>{formatMobile(customer.customer_mobile, mobileFormat)}</div>
                            ) : null}
                            {customer.units.map((unit) => (
                              <div key={unit.sale_id} className="mt-0.5">
                                {placeOf(unit) ? <div>{placeOf(unit)}</div> : null}
                                {unitOf(unit) ? <div>{unitOf(unit)}</div> : null}
                              </div>
                            ))}
                          </td>
                          {/* One figure against a cell four lines tall. Sitting
                              at the top it reads as belonging to the buyer's
                              name rather than to the block of flats under it,
                              which is how the screen has always shown them. */}
                          <td style={{ fontSize: fs }} className={`${cell} text-right align-middle`}>
                            {money(customer.total_amount)}
                          </td>
                          <td style={{ fontSize: fs }} className={`${cell} text-right align-middle`}>
                            {money(customer.received_amount)}
                          </td>
                          <td
                            style={{ fontSize: fs }}
                            className={`${cell} text-right align-middle font-semibold`}
                          >
                            {money(customer.due_amount)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        style={{ fontSize: fs }}
                        colSpan={5}
                        className={`${cell} py-6 text-center text-gray-500`}
                      >
                        No sales summary found
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* The report's total, so it goes on the sheet that ends it. */}
                {rows.length && isLastPage ? (
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td style={{ fontSize: fs }} className={`${cell} text-right`} colSpan={2}>
                        Grand Total ({rows.length} customer)
                      </td>
                      <td style={{ fontSize: fs }} className={`${cell} text-right`}>
                        {money(totals.total)}
                      </td>
                      <td style={{ fontSize: fs }} className={`${cell} text-right`}>
                        {money(totals.received)}
                      </td>
                      <td style={{ fontSize: fs }} className={`${cell} text-right`}>
                        {money(totals.due)}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>

              <PrintFooter page={pIdx + 1} total={pageCount} fontSize={fs} />

              {!isLastPage && <div className="page-break" />}
            </div>
          );
        })}
      </div>
    );
  }
);

SalesSummaryPrint.displayName = "SalesSummaryPrint";
export default SalesSummaryPrint;
