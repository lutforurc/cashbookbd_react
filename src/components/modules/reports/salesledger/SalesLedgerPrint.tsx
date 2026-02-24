import React, { forwardRef, useMemo } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import SalesLedgerCalculator from "../../../utils/calculators/SalesLedgerCalculator";
import { getRelevantCoaName } from "../utils/ledgerNameResolver";

type Props = {
  rows: any[];
  branchName?: string;
  accountName?: string;
  productName?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;

  title?: string; // default "Sales Ledger"
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

const SalesLedgerPrint = forwardRef<HTMLDivElement, Props>(
  (
    {
      rows = [],
      branchName,
      accountName,
      productName,
      startDate,
      endDate,
      title = "Sales Ledger",
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

    const startText = startDate || "-";
    const endText = endDate || "";

    const ledgerCalc = useMemo(
      () => new SalesLedgerCalculator(rowsArr || []),
      [rowsArr]
    );

    const totalQuantity = ledgerCalc.getTotalQuantity();
    const totalPayment = ledgerCalc.getTotalPayment(); // Total (sales total)
    const grandTotal = ledgerCalc.getGrandTotal(); // Received
    const totalDiscount = ledgerCalc.getDiscountTotal();
    const totalBalance = ledgerCalc.getTotalBalance(); // Due

    const parseNumber = (v: any) => {
      if (v == null) return NaN;
      if (typeof v === "number") return v;
      const cleaned = String(v).replace(/[^\d.-]/g, "");
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : NaN;
    };

    const getAllAccDetails = (row: any) => {
      const masters = Array.isArray(row?.acc_transaction_master)
        ? row.acc_transaction_master
        : row?.acc_transaction_master
        ? [row.acc_transaction_master]
        : [];

      return masters.reduce((acc: any[], m: any) => {
        if (Array.isArray(m?.acc_transaction_details))
          acc.push(...m.acc_transaction_details);
        return acc;
      }, []);
    };

    const getDiscountValue = (row: any) => {
      // discount coa4_id = 23 (debit)
      const allDetails = getAllAccDetails(row);
      const discount = allDetails
        .filter((d: any) => d?.coa4_id === 23)
        .reduce((s: number, d: any) => {
          const n = parseNumber(d?.debit);
          return s + (Number.isFinite(n) ? n : 0);
        }, 0);

      return discount;
    };

    const getReceivedValue = (row: any) => {
      // received coa4_id = 17 (debit)
      const allDetails = getAllAccDetails(row);
      const received = allDetails
        .filter((d: any) => d?.coa4_id === 17)
        .reduce((s: number, d: any) => {
          const n = parseNumber(d?.debit);
          return s + (Number.isFinite(n) ? n : 0);
        }, 0);

      return received;
    };

    // ✅ Dynamic font for long product names (no ellipsis, no cut)
    const getProductFs = (name: string, baseFs: number) => {
      const len = (name || "").trim().length;

      if (len > 35) return Math.max(baseFs - 4, 7);
      if (len > 28) return Math.max(baseFs - 3, 7);
      if (len > 20) return Math.max(baseFs - 2, 7);
      if (len > 16) return Math.max(baseFs - 1, 7);

      return baseFs;
    };

    const makeLabel = (detail: any) => {
      const categoryName = detail?.product?.category?.name ?? "";
      const productName2 = detail?.product?.name ?? "";
      return `${String(stockReportType) === "1" ? categoryName : ""} ${productName2}`.trim();
    };

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => {
          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />

              {/* header */}
              <div className="mb-2">
                <h1
                  style={{ fontSize: fs + 2 }}
                  className="font-bold text-center"
                >
                  {title}
                </h1>
                <div className="mt-2 grid grid-cols-1 gap-1 text-xs">
                  <div>
                    <span className="font-semibold">Report Date:</span>{" "}
                    {startText?.toString()} {endText ? `to ${endText}` : ""}
                  </div>

                  {(branchName || accountName || productName) && (
                    <div className="grid grid-cols-1 gap-1">
                      {branchName ? (
                        <div>
                          <span className="font-semibold">Branch:</span>{" "}
                          {branchName}
                        </div>
                      ) : null}
                      {accountName ? (
                        <div>
                          <span className="font-semibold">Account:</span>{" "}
                          {accountName}
                        </div>
                      ) : null}
                      {productName ? (
                        <div>
                          <span className="font-semibold">Product:</span>{" "}
                          {productName}
                        </div>
                      ) : null}
                    </div>
                  )}
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
                        className="border border-gray-900 px-2 py-2 w-22 text-left"
                      >
                        Chal. & Date
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 text-left"
                      >
                        Product & Details
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-16 text-right"
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
                        className="border border-gray-900 px-2 py-2 w-20 text-right"
                      >
                        Total
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-10 text-right"
                      >
                        Disc.
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-18 text-right"
                      >
                        Received
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-2 w-14 text-right"
                      >
                        Due
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageRows.length ? (
                      pageRows.map((row: any, idx: number) => {
                        const details = row?.sales_master?.details || [];
                        const coaName = getRelevantCoaName(row);

                        const discountValue = getDiscountValue(row);
                        const receivedValue = getReceivedValue(row);

                        const total = parseNumber(row?.sales_master?.total);
                        const due =
                          (Number.isFinite(total) ? (total as number) : 0) -
                          (Number.isFinite(receivedValue) ? receivedValue : 0) -
                          (Number.isFinite(discountValue) ? discountValue : 0);

                        const remarks =
                          row?.acc_transaction_master?.[0]
                            ?.acc_transaction_details?.[0]?.remarks ?? "";

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
                              style={{ fontSize: fs - 1 }}
                              className="border border-gray-900 px-2 py-1 text-left leading-normal"
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
                              className="border border-gray-900 px-2 py-1 align-top"
                            >
                              <div className="w-full max-w-4xl leading-normal">
                                {Array.isArray(details) &&
                                  details.length > 0 &&
                                  details.map((detail: any, i: number) => {
                                    const categoryName =
                                      detail?.product?.category?.name ?? "";
                                    const productName2 =
                                      detail?.product?.name ?? "";
                                    const label = makeLabel(detail);

                                    return (
                                      <div
                                        key={detail?.id ?? i}
                                        className="leading-normal whitespace-nowrap"
                                        style={{
                                          fontSize: getProductFs(label, fs),
                                        }}
                                      >
                                        {String(stockReportType) === "1" &&
                                        categoryName
                                          ? `${categoryName} `
                                          : ""}
                                        {productName2}
                                      </div>
                                    );
                                  })}

                                {coaName ? (
                                  <div className="font-semibold">{coaName}</div>
                                ) : null}

                                {remarks ? (
                                  <div className="mt-1 text-xs">{remarks}</div>
                                ) : null}
                              </div>
                            </td>

                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-right align-top"
                            >
                              {details?.length
                                ? details.map((detail: any, i: number) => {
                                    const label = makeLabel(detail);
                                    return (
                                      <div
                                        key={detail?.id ?? i}
                                        className="leading-normal"
                                        style={{
                                          fontSize: getProductFs(label, fs),
                                        }}
                                      >
                                        {thousandSeparator(detail?.quantity, 0)}{" "}
                                        {detail?.product?.unit?.name ?? ""}
                                      </div>
                                    );
                                  })
                                : "-"}
                            </td>

                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-right align-top"
                            >
                              {details?.length
                                ? details.map((detail: any, i: number) => {
                                    const label = makeLabel(detail);
                                    return (
                                      <div
                                        key={detail?.id ?? i}
                                        className="leading-normal"
                                        style={{
                                          fontSize: getProductFs(label, fs),
                                        }}
                                      >
                                        {thousandSeparator(
                                          detail?.sales_price,
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
                              {details?.length
                                ? details.map((detail: any, i: number) => {
                                    const label = makeLabel(detail);
                                    return (
                                      <div
                                        key={detail?.id ?? i}
                                        className="leading-normal"
                                        style={{
                                          fontSize: getProductFs(label, fs),
                                        }}
                                      >
                                        {thousandSeparator(
                                          Math.floor(
                                            (detail?.quantity || 0) *
                                              (detail?.sales_price || 0)
                                          ),
                                          0
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
                              {discountValue
                                ? thousandSeparator(discountValue, 0)
                                : "-"}
                            </td>

                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-right align-top"
                            >
                              {receivedValue
                                ? thousandSeparator(receivedValue, 0)
                                : "-"}
                            </td>

                            <td
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-right align-top"
                            >
                              {thousandSeparator(due, 0)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={10}
                          className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                        >
                          No data found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Summary only last page */}
                {rowsArr?.length > 0 && pIdx === pages.length - 1 && (
                  <div className="mt-3 border-t border-gray-900 pt-2">
                    <div className="flex justify-end gap-6 font-bold text-xs">
                      <div>
                        Quantity: {thousandSeparator(totalQuantity, 0)}
                      </div>
                      <div>Total: {thousandSeparator(totalPayment, 0)}</div>
                      <div>Received: {thousandSeparator(grandTotal, 0)}</div>
                      {totalDiscount > 0 && (
                        <div>
                          Discount: {thousandSeparator(totalDiscount, 0)}
                        </div>
                      )}
                      {totalBalance > 0 && (
                        <div>Due: {thousandSeparator(totalBalance, 0)}</div>
                      )}
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

SalesLedgerPrint.displayName = "SalesLedgerPrint";
export default SalesLedgerPrint;