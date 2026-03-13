import React from "react";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { formatDate, formatPaymentMonth } from "../../../utils/utils-functions/formatDate";

type BonusHistory = {
  serial_no?: number;
  name?: string;
  designation_name?: string;
};

type BonusRow = {
  basic_salary?: number;
  bonus_percent?: number;
  bonus_amount?: number;
  payment_amount?: number;
  vr_no?: string | number;
  history?: string | BonusHistory;
};

type Props = {
  rows?: BonusRow[];
  meta?: any;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
  vr_no?: string | number;
  vr_date?: string;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (!Array.isArray(data) || size <= 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    chunks.push(data.slice(i, i + size));
  }
  return chunks;
};

const getHistory = (history?: string | BonusHistory): BonusHistory => {
  if (!history) return {};
  if (typeof history === "string") {
    try {
      return JSON.parse(history);
    } catch {
      return {};
    }
  }
  return history;
};

const getMeta = (meta?: string | any) => {
  if (!meta) return {};
  if (typeof meta === "string") {
    try {
      return JSON.parse(meta.trim().replace(/^meta\s*/i, ""));
    } catch {
      return {};
    }
  }
  return meta;
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

const FestivalBonusPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ rows, meta, title = "Festival Bonus Sheet", rowsPerPage = 8, fontSize = 10, vr_no, vr_date }, ref) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(safeRows, rowsPerPage);
    const fs = fontSize;
    const metaInfo = getMeta(meta);
    const grandBasic = sum(safeRows.map((row) => Number(row.basic_salary || 0)));
    const grandBonus = sum(safeRows.map((row) => Number(row.bonus_amount || 0)));
    const grandPaid = sum(safeRows.map((row) => Number(row.payment_amount || 0)));

    return (
      <div ref={ref} className="print-root text-gray-900">
        <PrintStyles />
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th, td {
              border: 1px solid #000;
              padding: 4px;
            }
          }
        `}</style>

        {pages.map((pageRows, pageIndex) => {
          const pageBasic = sum(pageRows.map((row) => Number(row.basic_salary || 0)));
          const pageBonus = sum(pageRows.map((row) => Number(row.bonus_amount || 0)));
          const pagePaid = sum(pageRows.map((row) => Number(row.payment_amount || 0)));
          return (
            <div key={pageIndex} className={pageIndex < pages.length - 1 ? "page-break" : ""}>
              <PadPrinting />
              <div className="grid grid-cols-3 items-center">
                <div className="text-xs">
                  <span className="font-semibold">Vr. No. & Date:</span> {vr_no || "-"},{" "}
                  {vr_date ? formatDate(vr_date) : "-"}
                </div>
                <h1 className="text-center text-xl font-bold">{title}</h1>
                <div />
              </div>

              <div className="mt-2 flex justify-between text-sm">
                <div>
                  <span className="font-semibold">Bonus Title:</span> {metaInfo.bonus_title || "-"}
                </div>
                <div>
                  <span className="font-semibold">Bonus Month:</span> {formatPaymentMonth(metaInfo.month_id)}
                </div>
              </div>

              <table className="mt-3">
                <thead>
                  <tr>
                    <th style={{ fontSize: fs }}>SL</th>
                    <th style={{ fontSize: fs }} className="text-left">Employee</th>
                    <th style={{ fontSize: fs }}>Basic Salary</th>
                    <th style={{ fontSize: fs }}>Bonus %</th>
                    <th style={{ fontSize: fs }}>Bonus Amount</th>
                    <th style={{ fontSize: fs }}>Paid</th>
                    <th style={{ fontSize: fs }}>Due</th>
                    <th style={{ fontSize: fs }}>Payment Vr.</th>
                    <th style={{ fontSize: fs }}>Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, idx) => {
                    const history = getHistory(row.history);
                    const dueAmount = Number(row.bonus_amount || 0) - Number(row.payment_amount || 0);
                    return (
                      <tr key={idx}>
                        <td style={{ fontSize: fs, textAlign: "center" }}>{history.serial_no ?? idx + 1}</td>
                        <td style={{ fontSize: fs }}>
                          <span className="block leading-tight">{history.name || "-"}</span>
                          <span className="block leading-tight">{history.designation_name || "-"}</span>
                        </td>
                        <td style={{ fontSize: fs, textAlign: "right" }}>
                          {thousandSeparator(Number(row.basic_salary || 0), 0)}
                        </td>
                        <td style={{ fontSize: fs, textAlign: "center" }}>
                          {Number(row.bonus_percent || 0).toFixed(2)}%
                        </td>
                        <td style={{ fontSize: fs, textAlign: "right", fontWeight: 600 }}>
                          {thousandSeparator(Number(row.bonus_amount || 0), 0)}
                        </td>
                        <td style={{ fontSize: fs, textAlign: "right" }}>
                          {thousandSeparator(Number(row.payment_amount || 0), 0)}
                        </td>
                        <td style={{ fontSize: fs, textAlign: "right" }}>
                          {thousandSeparator(Math.max(dueAmount, 0), 0)}
                        </td>
                        <td style={{ fontSize: fs, textAlign: "center" }}>
                          {String(row.vr_no || "")
                            .split(",")
                            .map((voucher) => voucher.trim())
                            .filter(Boolean)
                            .map((voucher, voucherIndex) => (
                              <span key={`${voucher}-${voucherIndex}`} className="block leading-tight">
                                {voucher}
                              </span>
                            ))}
                        </td>
                        <td />
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={2} style={{ fontSize: fs, textAlign: "right" }}>Page Total</th>
                    <th style={{ fontSize: fs, textAlign: "right" }}>{thousandSeparator(pageBasic, 0)}</th>
                    <th />
                    <th style={{ fontSize: fs, textAlign: "right" }}>{thousandSeparator(pageBonus, 0)}</th>
                    <th style={{ fontSize: fs, textAlign: "right" }}>{thousandSeparator(pagePaid, 0)}</th>
                    <th style={{ fontSize: fs, textAlign: "right" }}>
                      {thousandSeparator(pageBonus - pagePaid, 0)}
                    </th>
                    <th colSpan={2} />
                  </tr>
                  {pageIndex === pages.length - 1 && (
                    <tr>
                      <th colSpan={2} style={{ fontSize: fs, textAlign: "right" }}>Grand Total</th>
                      <th style={{ fontSize: fs, textAlign: "right" }}>{thousandSeparator(grandBasic, 0)}</th>
                      <th />
                      <th style={{ fontSize: fs, textAlign: "right" }}>{thousandSeparator(grandBonus, 0)}</th>
                      <th style={{ fontSize: fs, textAlign: "right" }}>{thousandSeparator(grandPaid, 0)}</th>
                      <th style={{ fontSize: fs, textAlign: "right" }}>
                        {thousandSeparator(grandBonus - grandPaid, 0)}
                      </th>
                      <th colSpan={2} />
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          );
        })}
      </div>
    );
  }
);

export default FestivalBonusPrint;
