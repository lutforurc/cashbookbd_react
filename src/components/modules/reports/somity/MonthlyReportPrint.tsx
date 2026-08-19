import React, { forwardRef, useMemo } from 'react';

import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { formatDate } from '../../../utils/utils-functions/formatDate';

export type MonthlyReportRow = {
  selected_date?: string;
  sales?: number | string | null;
  downpayment?: number | string | null;
  kistyaday?: number | string | null;
  cashsales?: number | string | null;
  expenditure?: number | string | null;
  comments?: string | null;
  remarks?: string | null;
};

type Props = {
  rows: MonthlyReportRow[];
  branchName?: string;
  startDate?: string;
  endDate?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const toNumber = (value: unknown) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getMonthlyReportRows = (response: any): MonthlyReportRow[] => {
  const raw = response?.data?.data || response?.data || response;
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];

  return Object.entries(raw)
    .map(([date, item]: [string, any]) => ({
      selected_date: item?.selected_date || date,
      sales: item?.sales || 0,
      downpayment: item?.downpayment || 0,
      kistyaday: item?.kistyaday || 0,
      cashsales: item?.cashsales || 0,
      expenditure: item?.expenditure || 0,
      comments: item?.comments || item?.remarks || '',
    }))
    .sort((a, b) => String(a.selected_date || '').localeCompare(String(b.selected_date || '')));
};

const summarizeMonthlyRows = (rows: MonthlyReportRow[]) =>
  rows.reduce(
    (acc, row) => {
      acc.sales += toNumber(row.sales);
      acc.downpayment += toNumber(row.downpayment);
      acc.kistyaday += toNumber(row.kistyaday);
      acc.cashsales += toNumber(row.cashsales);
      acc.expenditure += toNumber(row.expenditure);
      return acc;
    },
    { sales: 0, downpayment: 0, kistyaday: 0, cashsales: 0, expenditure: 0 },
  );

const chunkRows = <T,>(rows: T[], size: number): T[][] => {
  const pageSize = Math.max(1, Number(size) || rows.length || 1);
  const pages: T[][] = [];
  for (let index = 0; index < rows.length; index += pageSize) {
    pages.push(rows.slice(index, index + pageSize));
  }
  return pages.length > 0 ? pages : [[]];
};

const MonthlyReportPrint = forwardRef<HTMLDivElement, Props>(
  ({ rows, branchName, startDate, endDate, rowsPerPage = 30, fontSize = 12 }, ref) => {
    const totals = useMemo(() => summarizeMonthlyRows(rows), [rows]);
    const pages = chunkRows(rows, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? fontSize : 12;
    const printedAt = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return (
      <div ref={ref} className="p-8 text-gray-900 print-root">
        <PrintStyles />
        <style>
          {`
            @media print {
              .print-page { min-height: var(--print-page-height); }
            }
          `}
        </style>

        {pages.map((pageRows, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;

          return (
            <div key={`monthly-report-print-${pageIndex}`} className="print-page">
              <PadPrinting />
              <div className="mb-2 text-center">
                <div className="text-lg font-semibold">Monthly Report</div>
                <div className="mt-1 text-xs">
                  <span className="font-semibold">Report Date:</span> {startDate || '-'} to {endDate || '-'}
                </div> 
              </div>

              <table className="w-full table-fixed border-collapse" style={{ fontSize: fs }}>
                <thead>
                  <tr className="bg-gray-100">
                    <th style={styles.centerHeader} className="w-14">Sl No.</th>
                    <th style={styles.centerHeader} className="w-24">Date</th>
                    <th style={styles.rightHeader}>Sales</th>
                    <th style={styles.rightHeader}>Down Payment</th>
                    <th style={styles.rightHeader}>Kisty Aday</th>
                    <th style={styles.rightHeader}>Cash Sales</th>
                    <th style={styles.rightHeader}>Expenditure</th>
                    <th style={styles.leftHeader}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length > 0 ? (
                    pageRows.map((row, index) => {
                      const serial = pageIndex * Math.max(1, Number(rowsPerPage) || rows.length || 1) + index + 1;
                      return (
                        <tr key={`${row.selected_date}-${serial}`}>
                          <td style={styles.centerCell}>{serial}</td>
                          <td style={styles.centerCell}>{formatDate(row.selected_date) || '-'}</td>
                          <td style={styles.rightCell}>{thousandSeparator(toNumber(row.sales))}</td>
                          <td style={styles.rightCell}>{thousandSeparator(toNumber(row.downpayment))}</td>
                          <td style={styles.rightCell}>{thousandSeparator(toNumber(row.kistyaday))}</td>
                          <td style={styles.rightCell}>{thousandSeparator(toNumber(row.cashsales))}</td>
                          <td style={styles.rightCell}>{thousandSeparator(toNumber(row.expenditure))}</td>
                          <td style={styles.leftCell}>{row.comments || row.remarks || ''}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} style={styles.emptyCell}>No data found</td>
                    </tr>
                  )}
                </tbody>
                {isLastPage && rows.length > 0 ? (
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={styles.footerLabel}>Grand Total</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.sales)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.downpayment)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.kistyaday)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.cashsales)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.expenditure)}</td>
                      <td style={styles.leftFooter}></td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>

              <PrintFooter page={pageIndex + 1} total={pages.length || 1} />
              {pageIndex !== pages.length - 1 && <div className="page-break" />}
            </div>
          );
        })}
      </div>
    );
  },
);

const baseCell: React.CSSProperties = {
  border: '1px solid #111827',
  padding: '3px 5px',
  verticalAlign: 'middle',
};

const baseHeader: React.CSSProperties = {
  ...baseCell,
  background: '#f3f4f6',
  fontWeight: 700,
};

const styles: Record<string, React.CSSProperties> = {
  centerHeader: { ...baseHeader, textAlign: 'center' },
  leftHeader: { ...baseHeader, textAlign: 'left' },
  rightHeader: { ...baseHeader, textAlign: 'right' },
  centerCell: { ...baseCell, textAlign: 'center' },
  leftCell: { ...baseCell, textAlign: 'left' },
  rightCell: { ...baseCell, textAlign: 'right' },
  emptyCell: { ...baseCell, padding: 18, textAlign: 'center' },
  footerLabel: { ...baseCell, fontWeight: 700, textAlign: 'right' },
  footerAmount: { ...baseCell, fontWeight: 700, textAlign: 'right' },
  leftFooter: { ...baseCell, fontWeight: 700, textAlign: 'left' },
};

MonthlyReportPrint.displayName = 'MonthlyReportPrint';

export { getMonthlyReportRows, summarizeMonthlyRows, toNumber };
export default MonthlyReportPrint;
