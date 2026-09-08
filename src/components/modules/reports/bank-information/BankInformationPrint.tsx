import React, { forwardRef, useMemo } from 'react';

import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';

export type BankInformationPrintRow = {
  coa4_id?: number | string;
  bank_name?: string;
  /** Signed, as the screen shows them: negative is an overdraft. */
  opening?: number | string;
  movement?: number | string;
  closing?: number | string;
  dr_bal?: number | string;
  cr_bal?: number | string;
};

type BankInformationPrintProps = {
  rows: BankInformationPrintRow[];
  reportType: string;
  startDate: string;
  endDate: string;
  rowsPerPage: number;
  fontSize: number;
};

const toNumber = (value: unknown) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const chunkRows = <T,>(rows: T[], size: number) => {
  const pageSize = Math.max(1, Number(size) || rows.length || 1);
  const pages: T[][] = [];

  for (let index = 0; index < rows.length; index += pageSize) {
    pages.push(rows.slice(index, index + pageSize));
  }

  return pages.length > 0 ? pages : [[]];
};

const BankInformationPrint = forwardRef<HTMLDivElement, BankInformationPrintProps>(
  ({ rows, reportType, startDate, endDate, rowsPerPage, fontSize }, ref) => {
    const totals = useMemo(
      () =>
        rows.reduce(
          (acc, row) => {
            acc.opening += toNumber(row.opening);
            acc.movement += toNumber(row.movement);
            acc.closing += toNumber(row.closing);
            return acc;
          },
          { opening: 0, movement: 0, closing: 0 },
        ),
      [rows],
    );

    const pages = chunkRows(rows, rowsPerPage);

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root bank-information-print">
        <PrintStyles />

        {pages.map((pageRows, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;
          const pageOffset = pageIndex * Math.max(1, Number(rowsPerPage) || rows.length || 1);

          return (
            <div
              key={`bank-information-print-page-${pageIndex}`}
              className="print-page bank-information-print-page"
            >
              <PadPrinting />

              <div className="mb-2">
                <h1 className="text-xl font-bold text-center">Bank Information</h1>
                <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                  <div>
                    <span className="font-semibold">Report Type:</span> {reportType || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Period:</span> {startDate || '-'} to {endDate || '-'}
                  </div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize }}>
                <thead>
                  <tr>
                    <th style={styles.centerHeader}>Sl. No.</th>
                    <th style={styles.leftHeader}>Bank Name</th>
                    <th style={styles.centerHeader}>Opening</th>
                    <th style={styles.centerHeader}>Movement</th>
                    <th style={styles.centerHeader}>Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length > 0 ? (
                    pageRows.map((row, rowIndex) => (
                      <tr key={`${row.coa4_id ?? row.bank_name ?? rowIndex}-print`}>
                        <td style={styles.centerCell}>{pageOffset + rowIndex + 1}</td>
                        <td style={styles.leftCell}>{row.bank_name || '-'}</td>
                        <td style={styles.rightCell}>{thousandSeparator(toNumber(row.opening))}</td>
                        <td style={styles.rightCell}>{thousandSeparator(toNumber(row.movement))}</td>
                        <td style={styles.rightCell}>{thousandSeparator(toNumber(row.closing))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={styles.emptyCell}>
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>

                {isLastPage ? (
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={styles.footerLabel}>Total</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.opening)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.movement)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.closing)}</td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>

              <PrintFooter page={pageIndex + 1} total={pages.length} />

              {pageIndex !== pages.length - 1 && <div className="page-break" />}
            </div>
          );
        })}
      </div>
    );
  },
);

BankInformationPrint.displayName = 'BankInformationPrint';

const baseCell: React.CSSProperties = {
  border: '1px solid #111827',
  padding: '5px 6px',
  verticalAlign: 'top',
};

const baseHeader: React.CSSProperties = {
  ...baseCell,
  borderColor: '#111827',
  background: '#f3f4f6',
  fontWeight: 700,
};

const styles: Record<string, React.CSSProperties> = {
  centerHeader: {
    ...baseHeader,
    width: 54,
    textAlign: 'center',
  },
  leftHeader: {
    ...baseHeader,
    textAlign: 'left',
  },
  rightHeader: {
    ...baseHeader,
    width: 118,
    textAlign: 'right',
  },
  centerCell: {
    ...baseCell,
    textAlign: 'center',
  },
  leftCell: {
    ...baseCell,
    textAlign: 'left',
  },
  rightCell: {
    ...baseCell,
    textAlign: 'right',
  },
  emptyCell: {
    ...baseCell,
    padding: 18,
    textAlign: 'center',
  },
  footerLabel: {
    ...baseCell,
    fontWeight: 700,
    textAlign: 'right',
  },
  footerAmount: {
    ...baseCell,
    fontWeight: 700,
    textAlign: 'right',
  },
};

export default BankInformationPrint;
