import React, { forwardRef, useMemo } from "react";
import dayjs from "dayjs";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import PurchaseLedgerCalculator from "../../../utils/calculators/PurchaseLedgerCalculator";
import { getRelevantCoaName } from "../utils/ledgerNameResolver";

type Props = {
  rows: any[];
  branchName?: string;
  accountName?: string;
  productName?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
};

const cellStyle: React.CSSProperties = {
  border: "1px solid #111",
  padding: "4px 6px",
  verticalAlign: "top",
};

const thStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 700,
  textAlign: "center",
};

const PurchaseLedgerPrint = forwardRef<HTMLDivElement, Props>(
  ({ rows = [], branchName, accountName, productName, startDate, endDate }, ref) => {
    const startText = startDate ? dayjs(startDate).format("DD-MMM-YYYY") : "";
    const endText = endDate ? dayjs(endDate).format("DD-MMM-YYYY") : "";

    const purchaseCalc = useMemo(() => new PurchaseLedgerCalculator(rows || []), [rows]);
    const totalQuantity = purchaseCalc.getTotalQuantity();
    const totalPayment = purchaseCalc.getTotalPayment();
    const discountTotal = purchaseCalc.getDiscountTotal();
    const grandTotal = purchaseCalc.getGrandTotal();

    return (
      <div ref={ref} style={{ padding: 12, fontSize: 11, color: "#000" }}>
        {/* Print-only CSS */}
        <style>
          {`
            @media print {
              .no-print { display: none !important; }
              @page { size: auto; margin: 12mm; }
            }
          `}
        </style>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Purchase Ledger</div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontWeight: 700 }}>Branch:</span> {branchName || "-"}
            {"  |  "}
            <span style={{ fontWeight: 700 }}>Date:</span> {startText} {endText ? `to ${endText}` : ""}
          </div>

          <div style={{ marginTop: 2 }}>
            <span style={{ fontWeight: 700 }}>Account:</span> {accountName || "-"}
            {"  |  "}
            <span style={{ fontWeight: 700 }}>Product:</span> {productName || "All"}
          </div>
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 60 }}>Sl</th>
              <th style={{ ...thStyle, width: 130 }}>Chal. No. & Date</th>
              <th style={{ ...thStyle, width: 120 }}>Vehicle Number</th>
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, width: 110, textAlign: "right" }}>Quantity</th>
              <th style={{ ...thStyle, width: 90, textAlign: "right" }}>Rate</th>
              <th style={{ ...thStyle, width: 110, textAlign: "right" }}>Total</th>
              <th style={{ ...thStyle, width: 110, textAlign: "right" }}>Discount</th>
              <th style={{ ...thStyle, width: 110, textAlign: "right" }}>Payment</th>
            </tr>
          </thead>

          <tbody>
            {(rows || []).map((row: any, idx: number) => {
              // Discount (coa4_id === 40)
              const discountTrx = row?.acc_transaction_master?.find((tm: any) =>
                tm?.acc_transaction_details?.some((d: any) => d?.coa4_id === 40)
              );
              const discountValue =
                discountTrx?.acc_transaction_details?.find((d: any) => d?.coa4_id === 40)?.credit;

              // Payment (coa4_id === 17)
              const paymentTrx = row?.acc_transaction_master?.find((tm: any) =>
                tm?.acc_transaction_details?.some((d: any) => d?.coa4_id === 17)
              );
              const paymentValue =
                paymentTrx?.acc_transaction_details?.find((d: any) => d?.coa4_id === 17)?.credit;

              const coaName = getRelevantCoaName(row);

              return (
                <tr key={row?.id ?? idx}>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    {row?.sl_number ?? idx + 1}
                  </td>

                  <td style={cellStyle}>
                    <div>{row?.challan_no || ""}</div>
                    <div>{row?.challan_date || ""}</div>
                  </td>

                  <td style={cellStyle}>
                    {row?.purchase_master?.vehicle_no || ""}
                  </td>

                  <td style={cellStyle}>
                    {/* Product list */}
                    {(row?.purchase_master?.details || []).map((detail: any, i: number) => (
                      <div key={i}>{detail?.product?.name || ""}</div>
                    ))}

                    {/* COA Name */}
                    {coaName ? (
                      <div style={{ marginTop: 4, fontWeight: 700 }}>{coaName}</div>
                    ) : null}

                    {/* Notes */}
                    {row?.purchase_master?.notes ? (
                      <div style={{ marginTop: 4 }}>{row?.purchase_master?.notes}</div>
                    ) : null}
                  </td>

                  <td style={{ ...cellStyle, textAlign: "right" }}>
                    {(row?.purchase_master?.details || []).map((detail: any, i: number) => (
                      <div key={i}>
                        {thousandSeparator(detail?.quantity, 0)} {detail?.product?.unit?.name || ""}
                      </div>
                    ))}
                  </td>

                  <td style={{ ...cellStyle, textAlign: "right" }}>
                    {(row?.purchase_master?.details || []).map((detail: any, i: number) => (
                      <div key={i}>{thousandSeparator(detail?.purchase_price, 2)}</div>
                    ))}
                  </td>

                  <td style={{ ...cellStyle, textAlign: "right" }}>
                    {(row?.purchase_master?.details || []).map((detail: any, i: number) => (
                      <div key={i}>
                        {thousandSeparator((detail?.purchase_price || 0) * (detail?.quantity || 0), 0)}
                      </div>
                    ))}
                  </td>

                  <td style={{ ...cellStyle, textAlign: "right" }}>
                    {discountValue ? thousandSeparator(discountValue, 0) : "-"}
                  </td>

                  <td style={{ ...cellStyle, textAlign: "right" }}>
                    {paymentValue ? thousandSeparator(paymentValue, 0) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary */}
        {rows?.length > 0 && (
          <div style={{ marginTop: 10, borderTop: "1px solid #111", paddingTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 18, fontWeight: 800 }}>
              <div>Quantity: {thousandSeparator(totalQuantity, 0)}</div>
              <div>Total: {thousandSeparator(totalPayment, 0)}</div>
              <div>Discount: {thousandSeparator(discountTotal, 0)}</div>
              <div>Payment: {thousandSeparator(grandTotal, 0)}</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 10, fontSize: 10 }}>
          Printed: {dayjs().format("DD-MMM-YYYY hh:mm A")}
        </div>
      </div>
    );
  }
);

export default PurchaseLedgerPrint;