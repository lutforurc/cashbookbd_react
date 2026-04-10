import React, { forwardRef, useMemo } from "react";
import dayjs from "dayjs";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import PurchaseLedgerCalculator from "../../../utils/calculators/PurchaseLedgerCalculator";
import { getRelevantCoaName } from "../utils/ledgerNameResolver";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import { useSelector } from "react-redux";

type Props = {
  rows: any[];
  branchName?: string;
  accountName?: string;
  productName?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;

  // same style controls like CashBookPrint
  title?: string; // default "Purchase Ledger"
  rowsPerPage?: number; // default 8
  fontSize?: number; // default 9
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (!Array.isArray(data)) return [[]];
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const PurchaseLedgerPrint = forwardRef<HTMLDivElement, Props>(
  (
    {
      rows = [],
      branchName,
      accountName,
      productName,
      startDate,
      endDate,
      title = "Purchase Ledger",
      rowsPerPage = 8,
      fontSize,
    },
    ref
  ) => {
    const settings = useSelector((state: any) => state.settings);
    const stockReportType = settings?.data?.branch?.stock_report_type;
    const rowsArr: any[] = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(rowsArr, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 9;

    const startText = startDate;
    const endText = endDate;

    const purchaseCalc = useMemo(
      () => new PurchaseLedgerCalculator(rowsArr || []),
      [rowsArr]
    );
    const totalQuantity = purchaseCalc.getTotalQuantity();
    const totalPayment = purchaseCalc.getTotalPayment();
    const discountTotal = purchaseCalc.getDiscountTotal();
    const grandTotal = purchaseCalc.getGrandTotal();


    const getProductFs = (name: string, baseFs: number) => {
      const len = (name || "").trim().length;
 
      if (len > 35) return Math.max(baseFs - 4, 7);
      if (len > 28) return Math.max(baseFs - 3, 7);
      if (len > 20) return Math.max(baseFs - 2, 7);
      if (len > 16) return Math.max(baseFs - 1, 7);

      return baseFs;
    };

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => {
          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />

              {/* Per-page header (prints on every page) */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-center">{title}</h1>

                <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                  <div>
                    <span className="font-semibold">Report Date:</span>{" "}
                    {startText || "-"} {endText ? `to ${endText}` : ""}
                  </div>
                </div>
              </div>
              <div className="w-full overflow-hidden">
                <table className="w-full table-fixed border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-10 text-center"
                      >
                        Sl
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-22 text-center"
                      >
                        Chal. & Date
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2"
                      >
                        Description
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-18 text-right"
                      >
                        Qty
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-20 text-right"
                      >
                        Rate
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-24 text-right"
                      >
                        Total
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-16 text-right"
                      >
                        Discount
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-18 text-right"
                      >
                        Payment
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageRows.length ? (
                      pageRows.map((row: any, idx: number) => {
                        // Discount (coa4_id === 40)
                        const discountTrx = row?.acc_transaction_master?.find(
                          (tm: any) =>
                            tm?.acc_transaction_details?.some(
                              (d: any) => d?.coa4_id === 40
                            )
                        );
                        const discountValue =
                          discountTrx?.acc_transaction_details?.find(
                            (d: any) => d?.coa4_id === 40
                          )?.credit;

                        // Payment (coa4_id === 17)
                        const paymentTrx = row?.acc_transaction_master?.find(
                          (tm: any) =>
                            tm?.acc_transaction_details?.some(
                              (d: any) => d?.coa4_id === 17
                            )
                        );
                        const paymentValue =
                          paymentTrx?.acc_transaction_details?.find(
                            (d: any) => d?.coa4_id === 17
                          )?.credit;

                        const coaName = getRelevantCoaName(row);
                        const details = row?.purchase_master?.details || [];

                        return (
                          <tr
                            key={row?.id ?? `${pIdx}-${idx}`}
                            className="avoid-break align-top"
                          >
                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-center"
                            >
                              {row?.sl_number ?? idx + 1 + pIdx * rowsPerPage}
                            </td>

                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-center leading-normal"
                            >
                              <div className={`text-[${fs - 2}px]`}>
                                {row?.challan_no || ""}
                              </div>
                              <div className={`text-[${fs}px]`}>
                                {row?.challan_date || ""}
                              </div>
                            </td>

                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1"
                            >
                              <div className="w-full max-w-4xl leading-normal">
                                {/* Product list */}
                                {Array.isArray(details) && details.length > 0 &&
                                  details.map((detail: any, i: number) => {
                                    const categoryName = detail?.product?.category?.name ?? "";
                                    const productName = detail?.product?.name ?? "";

                                    return (
                                      
                                        <div
                                          key={detail?.id ?? i}
                                          className="leading-normal whitespace-nowrap"
                                          style={{ fontSize: getProductFs(`${categoryName} ${productName}`.trim(), fs) }}
                                        >
                                          {String(stockReportType) === "1" && categoryName ? `${categoryName} ` : ""}
                                          {productName}
                                        </div>
                                     
                                    );
                                  })}
                                {/* COA Name */}
                                {coaName ? (
                                  <div className="font-semibold">
                                    {coaName}
                                  </div>
                                ) : null}
                                { row?.purchase_master?.notes ? (
                                  <div className="mt-1 text-xs">
                                    {row?.purchase_master?.notes}
                                  </div>
                                ) : null}
                              </div>
                            </td>
                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-right align-top"
                            >
                              {details.length
                                ? details.map((detail: any, i: number) => {
                                  const categoryName = detail?.product?.category?.name ?? "";
                                  const productName = detail?.product?.name ?? "";
                                  const label = `${categoryName} ${productName}`.trim();

                                  return (
                                    <div
                                      key={detail?.id ?? i}
                                      className="leading-normal"
                                      style={{ fontSize: getProductFs(label, fs) }}
                                    >
                                      {detail?.quantity ?? ""}
                                    </div>
                                  );
                                })
                                : "-"}
                            </td>
                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-right align-top"
                            >
                              {details.length
                                ? details.map((detail: any, i: number) => {
                                  const categoryName = detail?.product?.category?.name ?? "";
                                  const productName = detail?.product?.name ?? "";
                                  const label = `${categoryName} ${productName}`.trim();

                                  return (
                                    <div
                                      key={detail?.id ?? i}
                                      className="leading-normal"
                                      style={{ fontSize: getProductFs(label, fs) }}
                                    >
                                      {thousandSeparator(
                                        (detail?.purchase_price || 0) ,
                                        2
                                      )}
                                    </div>
                                  );
                                })
                                : "-"}
                            </td>

                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-right align-top"
                            >
                              {details.length
                                ? details.map((detail: any, i: number) => {
                                  const categoryName = detail?.product?.category?.name ?? "";
                                  const productName = detail?.product?.name ?? "";
                                  const label = `${categoryName} ${productName}`.trim();

                                  return (
                                    <div
                                      key={detail?.id ?? i}
                                      className="leading-normal"
                                      style={{ fontSize: getProductFs(label, fs) }}
                                    >
                                      {thousandSeparator(
                                        (detail?.purchase_price || 0) * (detail?.quantity || 0),
                                        0
                                      )}
                                    </div>
                                  );
                                })
                                : "-"}
                            </td>

                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-right"
                            >
                              {discountValue
                                ? thousandSeparator(discountValue, 0)
                                : "-"}
                            </td>

                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-right"
                            >
                              {paymentValue
                                ? thousandSeparator(paymentValue, 0)
                                : "-"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={9}
                          className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                        >
                          No data found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Summary only on LAST page (CashBook style compatible) */}
                {rowsArr?.length > 0 && pIdx === pages.length - 1 && (
                  <div className="mt-3 border-t border-gray-900 pt-2">
                    <div className="flex justify-end gap-6 font-bold text-xs">
                      <div>Quantity: {thousandSeparator(totalQuantity, 0)}</div>
                      <div>Total: {thousandSeparator(totalPayment, 0)}</div>
                      { discountTotal > 0 && <div>Discount: {thousandSeparator(discountTotal, 0)}</div>}
                      <div>Payment: {thousandSeparator(grandTotal, 0)}</div>
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{ fontSize: fs }}
                className="mt-auto text-right text-xs"
              >
                Page {pIdx + 1} of {pages.length}
              </div>

              {pIdx !== pages.length - 1 && <div className="page-break" />}

            </div>
          );
        })}

        <div className="mt-2 text-xs text-gray-900">
          * This document is system generated. Printed:{" "}
          {dayjs().format("DD-MMM-YYYY hh:mm A")}
        </div>
      </div>
    );
  }
);

PurchaseLedgerPrint.displayName = "PurchaseLedgerPrint";
export default PurchaseLedgerPrint;