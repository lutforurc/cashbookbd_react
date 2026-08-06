import React from 'react';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import { PrintBranch } from '../../../utils/utils-functions/printBranch';
import ReportFooter from '../../../utils/utils-functions/ReportFooter';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { formatDate, formatPaymentMonth } from '../../../utils/utils-functions/formatDate';

/* =======================
   Types
======================= */

type EmployeeHistory = {
  serial_no?: number;
  name?: string;
  designation_name?: string;
  month_days?: number | string;
  working_days?: number | string;
  monthly_basic_salary?: number | string;
  basic_salary?: number | string;
};

type EmployeeRow = {
  month_days?: number | string;
  payment_month?: string;
  monthly_basic_salary?: number | string;
  basic_salary?: number;
  others_allowance?: number;
  gross_salary?: number;
  loan_deduction?: number;
  attendance_deduction_amount?: number;
  attendance_absent_days?: number;
  attendance_unpaid_leave_days?: number;
  attendance_half_days?: number;
  attendance_late_deduction_days?: number;
  attendance_early_out_deduction_days?: number;
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
  /** The branch this sheet belongs to, which may not be the printer's own. */
  printBranch?: PrintBranch;
  vr_no?: string | number;
  vr_date?: string;
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

const parseMonthYear = (value?: string | number | null) => {
  if (!value) return null;

  const raw = String(value).trim();
  let month: number | undefined;
  let year: number | undefined;

  if (/^\d{6}$/.test(raw)) {
    month = Number(raw.substring(0, 2));
    year = Number(raw.substring(2));
  } else if (/^\d{2}[-/]\d{4}$/.test(raw)) {
    const parts = raw.split(/[-/]/);
    month = Number(parts[0]);
    year = Number(parts[1]);
  } else if (/^\d{4}[-/]\d{2}$/.test(raw)) {
    const parts = raw.split(/[-/]/);
    year = Number(parts[0]);
    month = Number(parts[1]);
  }

  if (!month || !year || month < 1 || month > 12) return null;
  return { month, year };
};

const getMonthDays = (value?: string | number | null) => {
  const parsed = parseMonthYear(value);
  if (!parsed) return "";
  return new Date(parsed.year, parsed.month, 0).getDate();
};

const resolveMonthDays = (row: EmployeeRow, history: EmployeeHistory, fallbackMonth?: string) => {
  const savedMonthDays = Number(row.month_days || history.month_days || 0);
  if (savedMonthDays > 0) return savedMonthDays;

  return getMonthDays(row.payment_month || fallbackMonth);
};

const resolveMonthlyBasicSalary = (row: EmployeeRow, history: EmployeeHistory, monthDays: number | string) => {
  const savedMonthlyBasic = Number(row.monthly_basic_salary || history.monthly_basic_salary || 0);
  if (savedMonthlyBasic > 0) return savedMonthlyBasic;

  const paidBasic = Number(row.basic_salary || history.basic_salary || 0);
  const workingDays = Number(history.working_days || 0);
  const totalMonthDays = Number(monthDays || 0);

  if (paidBasic <= 0 || workingDays <= 0 || totalMonthDays <= 0) return paidBasic;
  if (workingDays >= totalMonthDays) return paidBasic;

  return Math.ceil((paidBasic / workingDays) * totalMonthDays);
};

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
      printBranch,
      vr_no,
      vr_date,
    },
    ref
  ) => {
    const safeRows: EmployeeRow[] = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(safeRows, rowsPerPage);
    const fs = fontSize;
    const lastPageIndex = pages.length - 1;
    const hasMultiplePages = pages.length > 1;
    const metaInfo = getMeta(meta);

    // Head the page with the branch the sheet was generated for. The sheet's own
    // meta is the most reliable source; the selected branch is the fallback.
    const headerBranch: PrintBranch = {
      ...(printBranch ?? {}),
      name: metaInfo.branch_name || printBranch?.name || branchName,
    };

    /* Grand totals */
    const grandMonthlyBasic = sum(safeRows.map((r) => {
      const history = getHistory(r.history);
      return resolveMonthlyBasicSalary(r, history, resolveMonthDays(r, history, metaInfo.month_id));
    }));
    const grandBasic = sum(safeRows.map(r => Number(r.basic_salary || 0)));
    const grandAllowance = sum(safeRows.map(r => Number(r.others_allowance || 0)));
    const grandGross = sum(safeRows.map(r => Number(r.gross_salary || 0)));
    const grandLoan = sum(safeRows.map(r => Number(r.loan_deduction || 0)));
    const grandAttendanceDeduction = sum(safeRows.map(r => Number(r.attendance_deduction_amount || 0)));
    const grandNet = sum(safeRows.map(r => Number(r.net_salary || 0)));
    const grandPayment = sum(safeRows.map(r => Number(r.payment_amount || 0)));

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

          const pageMonthlyBasic = sum(pageRows.map((r) => {
            const history = getHistory(r.history);
            return resolveMonthlyBasicSalary(r, history, resolveMonthDays(r, history, metaInfo.month_id));
          }));
          const pageBasic = sum(pageRows.map(r => Number(r.basic_salary || 0)));
          const pageAllowance = sum(pageRows.map(r => Number(r.others_allowance || 0)));
          const pageGross = sum(pageRows.map(r => Number(r.gross_salary || 0)));
          const pageLoan = sum(pageRows.map(r => Number(r.loan_deduction || 0)));
          const pageAttendanceDeduction = sum(pageRows.map(r => Number(r.attendance_deduction_amount || 0)));
          const pageNet = sum(pageRows.map(r => Number(r.net_salary || 0)));
          const pagePayment = sum(pageRows.map(r => Number(r.payment_amount || 0)));
          return (
            <React.Fragment key={pageIndex}>
              {/* ===== Page Header ===== */}
              <PadPrinting branch={headerBranch} />
              {/* <div className="text-center">
                    <span>{ vr_no } {vr_date}</span>
                   <h1 className="text-xl font-bold">{title}</h1>
                </div> */}
              <div className="grid grid-cols-3 items-center w-full"> 
                <span className="justify-self-start text-sm ">
                  <span className='font-semibold !text-xs'>Vr. No. & Date:</span> <span className='!text-xs'> {vr_no}, { formatDate(vr_date)}</span>
                </span>

                <h1 className="justify-self-center text-xl font-bold text-center">
                  {title}
                </h1>

                <div /> {/* right side empty, to keep title perfectly centered */}
              </div>
              <div className='flex justify-between'>
                <div className="text-sm text-right">
                  <span>Salary for</span> <span className="font-semibold">{metaInfo.level_name}</span>
                </div>
                <div className="text-sm text-right">
                  <span>Salary for the Month of <span className="font-semibold">{formatPaymentMonth(metaInfo.month_id)}</span></span>
                </div>
              </div>

              {/* ===== Table ===== */}
              <table>
                <thead>
                  <tr>
                    <th style={{ fontSize: fs }}>SL</th>
                    <th className='text-left' style={{ fontSize: fs }}>Employee Name</th>
                    <th style={{ fontSize: fs, textAlign: 'center', width: 60, maxWidth: 60, lineHeight: 1.1 }}>M. Days</th>
                    <th style={{ fontSize: fs, textAlign: 'center', width: 60, maxWidth: 60, lineHeight: 1.1 }}>W. Days</th>
                    <th style={{ fontSize: fs, textAlign: 'center' }}>M. Basic</th>
                    <th style={{ fontSize: fs, textAlign: 'center' }}>Salary</th>
                    <th style={{ fontSize: fs, textAlign: 'center' }}>Mobile</th>
                    <th style={{ fontSize: fs, textAlign: 'center' }}>Total</th>
                    <th style={{ fontSize: fs, textAlign: 'center' }}>Loan</th>
                    <th style={{ fontSize: fs, textAlign: 'center' }}>Att. Ded</th>
                    <th style={{ fontSize: fs, textAlign: 'center' }}>Net Salary</th>
                    <th style={{ fontSize: fs, textAlign: 'center' }}>Payment</th>
                    <th style={{ fontSize: fs }}>Signature</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.map((row, idx) => {
                    const h = getHistory(row.history);
                    const monthDays = resolveMonthDays(row, h, metaInfo.month_id);
                    const monthlyBasicSalary = resolveMonthlyBasicSalary(row, h, monthDays);
                    return (
                      <tr key={idx}>
                        <td style={{ fontSize: fs, textAlign: 'center' }}>
                          {h.serial_no ?? idx + 1}
                        </td>
                        <td style={{ fontSize: fs }}>
                          <span className='block m-0 leading-tight'>{h.name || '-'}</span>
                          <span className='block m-0 leading-tight'>{h.designation_name || '-'}</span>
                        </td>
                        <td style={{ fontSize: fs, textAlign: 'center', width: 60, maxWidth: 60 }}>{monthDays}</td>
                        <td style={{ fontSize: fs, textAlign: 'center', width: 60, maxWidth: 60 }}>{h.working_days || ''}</td>
                        <td style={{ fontSize: fs, textAlign: 'right' }}>
                          {thousandSeparator(monthlyBasicSalary)}
                        </td>
                        <td style={{ fontSize: fs, textAlign: 'right' }}>
                          {thousandSeparator(row.basic_salary ?? 0)}
                        </td>
                        <td style={{ fontSize: fs, textAlign: 'right' }}>
                          {thousandSeparator(row.others_allowance ?? 0)}
                        </td>
                        <td style={{ fontSize: fs, textAlign: 'right' }}>
                          {thousandSeparator(row.gross_salary ?? 0)}
                        </td>
                        <td style={{ fontSize: fs, textAlign: 'right' }}>
                          {thousandSeparator(row.loan_deduction ?? 0)}
                        </td>
                        <td
                          style={{ fontSize: fs, textAlign: 'right' }}
                          title={`Absent: ${row.attendance_absent_days || 0}, Unpaid: ${row.attendance_unpaid_leave_days || 0}, Half: ${row.attendance_half_days || 0}, Late: ${row.attendance_late_deduction_days || 0}, Early: ${row.attendance_early_out_deduction_days || 0}`}
                        >
                          {thousandSeparator(row.attendance_deduction_amount ?? 0)}
                        </td>
                        <td style={{ fontSize: fs, textAlign: 'right', fontWeight: 600 }}>
                          {thousandSeparator(row.net_salary ?? 0)}
                        </td>
                        <td style={{ fontSize: fs, textAlign: 'right', fontWeight: 600 }}>
                          {thousandSeparator(row.payment_amount ?? 0)}
                        </td>
	                        <td style={{ fontSize: fs, textAlign: 'center' }}>
	                          {String(row.vr_no || '')
	                            .split(',')
	                            .map((voucher: string) => voucher.trim())
	                            .filter(Boolean)
	                            .map((voucher: string, index: number) => (
	                              <span key={`${voucher}-${index}`} className="block m-0 leading-tight">
	                                {voucher}
	                              </span>
	                            ))}
	                        </td>
                      </tr>
                    );
                  })}

                  {/* ===== Totals ===== */}
                  {!isLastPage && (
                    <tr style={{ fontSize: fs, fontWeight: 600, background: '#f3f3f3' }}>
                      <td colSpan={4}>Subtotal (Page {pageIndex + 1})</td>
                      <td style={{ textAlign: 'right' }}>{thousandSeparator(pageMonthlyBasic)}</td>
                      <td style={{ textAlign: 'right' }}>{thousandSeparator(pageBasic)}</td>
                      <td style={{ textAlign: 'right' }}>{thousandSeparator(pageAllowance)}</td>
                      <td style={{ textAlign: 'right' }}>{thousandSeparator(pageGross)}</td>
                      <td style={{ textAlign: 'right' }}>{thousandSeparator(pageLoan)}</td>
                      <td style={{ textAlign: 'right' }}>{thousandSeparator(pageAttendanceDeduction)}</td>
                      <td style={{ textAlign: 'right' }}>{thousandSeparator(pageNet)}</td>
                      <td style={{ textAlign: 'right' }}>{thousandSeparator(pagePayment)}</td>
                      <td />
                    </tr>
                  )}

                  {isLastPage && (
                    <>
                      {/* ✅ Page Total শুধু multiple pages হলে */}
                      {hasMultiplePages && (
                        <tr style={{ fontSize: fs, fontWeight: 600, background: '#f3f3f3' }}>
                          <td colSpan={4}>Page Total</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pageMonthlyBasic)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pageBasic)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pageAllowance)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pageGross)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pageLoan)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pageAttendanceDeduction)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pageNet)}</td>
                          <td style={{ textAlign: 'right' }}>{thousandSeparator(pagePayment)}</td>
                          <td></td>
                        </tr>
                      )}
                      <tr style={{ fontSize: fs, fontWeight: 700, background: '#e5e5e5' }}>
                        <td colSpan={4}>Grand Total</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(grandMonthlyBasic)}</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(grandBasic)}</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(grandAllowance)}</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(grandGross)}</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(grandLoan)}</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(grandAttendanceDeduction)}</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(grandNet)}</td>
                        <td style={{ textAlign: 'right' }}>{thousandSeparator(grandPayment)}</td>
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
        <ReportFooter />
      </div>
    );
  }
);

SalarySheetPrint.displayName = 'SalarySheetPrint';
export default SalarySheetPrint;
