import React from 'react';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { formatPaymentMonth } from '../../../utils/utils-functions/formatDate';

/* =======================
   Types
======================= */

type EmployeeHistory = {
  serial_no?: number;
  name?: string;
  designation_name?: string;
};

type EmployeeRow = {
  basic_salary?: number;
  others_allowance?: number;
  gross_salary?: number;
  loan_deduction?: number;
  net_salary?: number;
  history?: string | EmployeeHistory;

  // ✅ শুধু এই দুইটা যোগ করুন
  payment_amount?: number;
  vr_no?: string | number;
};

type Props = {
  rows?: EmployeeRow[];
  meta?: any;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
  branchName?: string;
};

/* =======================
   Helpers
======================= */

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (!Array.isArray(data) || size <= 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    chunks.push(data.slice(i, i + size));
  }
  return chunks;
};

const getHistory = (history?: string | EmployeeHistory): EmployeeHistory => {
  if (!history) return {};
  if (typeof history === 'string') {
    try {
      return JSON.parse(history);
    } catch {
      return {};
    }
  }
  return history;
};

type Meta = {
  branch_id?: number;
  branch_name?: string;
  level_id?: number;
  month_id?: string;
  level_name?: string;
  generated_by?: number;
};

const getMeta = (meta?: string | Meta): Meta => {
  if (!meta) return {};

  if (typeof meta === "string") {
    const raw = meta.trim();

    // যদি "meta {...}" ফরম্যাটে আসে, তাহলে "meta" অংশটা বাদ দেই
    const jsonPart = raw.startsWith("meta")
      ? raw.replace(/^meta\s*/i, "")
      : raw;

    try {
      return JSON.parse(jsonPart);
    } catch {
      return {};
    }
  }
  return meta;;
}

  const sum = (arr: number[]) =>
    arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

  /* =======================
     Component
  ======================= */

  const SalarySheetPrint = React.forwardRef<HTMLDivElement, Props>(
    (
      {
        rows,
        meta,
        title = 'Salary Sheet',
        rowsPerPage = 5,
        fontSize = 10,
        branchName,
      },
      ref
    ) => {
      const safeRows: EmployeeRow[] = Array.isArray(rows) ? rows : [];
      const pages = chunkRows(safeRows, rowsPerPage);
      const fs = fontSize;
      const lastPageIndex = pages.length - 1;

      /* Grand totals */
      const grandBasic = sum(safeRows.map(r => Number(r.basic_salary || 0)));
      const grandAllowance = sum(safeRows.map(r => Number(r.others_allowance || 0)));
      const grandGross = sum(safeRows.map(r => Number(r.gross_salary || 0)));
      const grandLoan = sum(safeRows.map(r => Number(r.loan_deduction || 0)));
      const grandNet = sum(safeRows.map(r => Number(r.net_salary || 0)));
      const grandPayment = sum(safeRows.map(r => Number(r.payment_amount || 0)));

      const metaInfo = getMeta(meta);

      return (
        <div ref={ref} className="print-root text-gray-900">
          <PrintStyles />

          {/* ========= PRINT CSS ========= */}
          <style>{`
          @media print {
            @page {
              size: A4 landscape;
              margin: 8mm 18mm 8mm 18mm;
            }

            .print-root {
              padding: 0 !important;
            }

            .page-break {
              page-break-after: always;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              break-inside: avoid;
            }

            th, td {
              border: 1px solid #000;
              padding: 4px;
            }

            thead {
              background: #f3f3f3;
            }
          }
        `}</style>

          {pages.map((pageRows, pageIndex) => {
            const isLastPage = pageIndex === lastPageIndex;

            const pageBasic = sum(pageRows.map(r => Number(r.basic_salary || 0)));
            const pageAllowance = sum(pageRows.map(r => Number(r.others_allowance || 0)));
            const pageGross = sum(pageRows.map(r => Number(r.gross_salary || 0)));
            const pageLoan = sum(pageRows.map(r => Number(r.loan_deduction || 0)));
            const pageNet = sum(pageRows.map(r => Number(r.net_salary || 0)));
            const pagePayment = sum(pageRows.map(r => Number(r.payment_amount || 0)));
            return (
              <React.Fragment key={pageIndex}>
                {/* ===== Page Header ===== */}
                <PadPrinting />
                <div className="text-center mb-2">
                  <h1 className="text-xl font-bold">{title}</h1>
                </div>
                <div className='flex justify-between'>
                  <div className="text-sm text-right">
                    <span>Salary for</span> <span className="font-semibold">{ metaInfo.level_name}</span>
                  </div>
                  <div className="text-sm text-right">
                    <span>Salary for the Month of <span className="font-semibold">{ formatPaymentMonth(metaInfo.month_id)}</span></span>
                  </div>
                </div>

                {/* ===== Table ===== */}
                <table>
                  <thead>
                    <tr>
                      <th style={{ fontSize: fs }}>SL</th>
                      <th className='text-left' style={{ fontSize: fs }}>Employee Name</th>
                      <th className='text-left' style={{ fontSize: fs }}>Designation</th>
                      <th style={{ fontSize: fs, textAlign: 'right' }}>Salary</th>
                      <th style={{ fontSize: fs, textAlign: 'right' }}>Mobile</th>
                      <th style={{ fontSize: fs, textAlign: 'right' }}>Total</th>
                      <th style={{ fontSize: fs, textAlign: 'right' }}>Loan</th>
                      <th style={{ fontSize: fs, textAlign: 'right' }}>Net Salary</th>
                      <th style={{ fontSize: fs, textAlign: 'right' }}>Payment</th>
                      <th style={{ fontSize: fs }}>Signature</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageRows.map((row, idx) => {
                      const h = getHistory(row.history);
                      return (
                        <tr key={idx}>
                          <td style={{ fontSize: fs, textAlign: 'center' }}>
                            {h.serial_no ?? idx + 1}
                          </td>
                          <td style={{ fontSize: fs }}>{h.name || '-'}</td>
                          <td style={{ fontSize: fs }}>{h.designation_name || ''}</td>
                          <td style={{ fontSize: fs, textAlign: 'right' }}>
                            {thousandSeparator(row.basic_salary ?? 0, 0)}
                          </td>
                          <td style={{ fontSize: fs, textAlign: 'right' }}>
                            {thousandSeparator(row.others_allowance ?? 0, 0)}
                          </td>
                          <td style={{ fontSize: fs, textAlign: 'right' }}>
                            {thousandSeparator(row.gross_salary ?? 0, 0)}
                          </td>
                          <td style={{ fontSize: fs, textAlign: 'right' }}>
                            {thousandSeparator(row.loan_deduction ?? 0, 0)}
                          </td>
                          <td style={{ fontSize: fs, textAlign: 'right', fontWeight: 600 }}>
                            {thousandSeparator(row.net_salary ?? 0, 0)}
                          </td>
                          <td style={{ fontSize: fs, textAlign: 'right', fontWeight: 600 }}>
                            {thousandSeparator(row.payment_amount ?? 0, 0)}
                          </td>
                          <td style={{ fontSize: fs }}>
                            { row.vr_no }</td>
                        </tr>
                      );
                    })}

                    {/* ===== Totals ===== */}
                    {!isLastPage && (
                      <tr style={{ fontSize: fs, fontWeight: 600, background: '#f3f3f3' }}>
                        <td colSpan={3}>Subtotal (Page {pageIndex + 1})</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(pageBasic, 0)}</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(pageAllowance, 0)}</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(pageGross, 0)}</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(pageLoan, 0)}</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(pageNet, 0)}</td>
                       <td style={{ textAlign: 'right' }}>{thousandSeparator(pagePayment, 0)}</td>
                        <td />
                      </tr>
                    )}

                    {isLastPage && (
                      <>
                        <tr style={{ fontSize: fs, fontWeight: 600, background: '#f3f3f3' }}>
                          <td colSpan={3}>Page Total</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pageBasic, 0)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pageAllowance, 0)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pageGross, 0)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pageLoan, 0)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pageNet, 0)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pagePayment, 0)}</td>
                          <td></td>
                        </tr>
                        <tr style={{ fontSize: fs, fontWeight: 700, background: '#e5e5e5' }}>
                          <td colSpan={3}>Grand Total</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(grandBasic, 0)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(grandAllowance, 0)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(grandGross, 0)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(grandLoan, 0)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(grandNet, 0)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(grandPayment, 0)}</td>
                          <td></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>

                {!isLastPage && <div className="page-break" />}
              </React.Fragment>
            );
          })}

          <div className="text-xs mt-2">
            * This document is system generated
          </div>
        </div>
      );
    }
  );

  SalarySheetPrint.displayName = 'SalarySheetPrint';
  export default SalarySheetPrint;
