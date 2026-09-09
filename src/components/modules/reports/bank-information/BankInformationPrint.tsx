import React, { forwardRef, useMemo } from 'react';

import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';

export type BankInformationPrintRow = {
  coa4_id?: number | string;
  bank_name?: string;
  /** Signed, as the API sends them: negative is an overdraft. */
  opening?: number | string;
  movement?: number | string;
  movement_debit?: number | string;
  movement_credit?: number | string;
  closing?: number | string;
  dr_bal?: number | string;
  cr_bal?: number | string;
};

/**
 * The six money columns: each of Opening, Movement and Closing as a pair.
 *
 * Named for the side of the ledger rather than for the words in the header,
 * because the header words change with the report type and the sides do not.
 */
export type BankInformationColumns = {
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  closingDebit: number;
  closingCredit: number;
};

/** What the two balance columns are called under Opening and Closing. */
export type BalanceLabels = {
  debit: string;
  credit: string;
};

/**
 * ⚠️ A CREDIT BALANCE DOES NOT MEAN THE SAME THING IN BOTH REPORTS, so the
 * header cannot be one fixed word. On a bank account the branch is overdrawn;
 * on a bank loan it is what is still owed, and calling that an overdraft would
 * be wrong. Movement keeps Received / Payment either way -- money coming in and
 * money going out mean the same thing wherever the account sits.
 *
 * Matched on the report type id the screen already holds ('2' is Bank Loan),
 * not on the display name, so renaming the dropdown entry cannot silently
 * relabel the report.
 */
export const balanceLabels = (reportTypeId: string): BalanceLabels =>
  String(reportTypeId) === '2'
    ? { debit: 'Advance', credit: 'Outstanding' }
    : { debit: 'Balance', credit: 'Overdraft' };

type BankInformationPrintProps = {
  rows: BankInformationPrintRow[];
  reportType: string;
  balanceLabels: BalanceLabels;
  startDate: string;
  endDate: string;
  rowsPerPage: number;
  fontSize: number;
};

const toNumber = (value: unknown) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * The six columns, worked out from the signed figures the API answers with.
 *
 * ⚠️ OPENING AND CLOSING ARE BALANCES, so they fall to one side or the other by
 * their sign: a positive balance is money the branch is holding and sits on the
 * debit side, a negative one is what it owes -- an overdraft on a bank account,
 * the amount still outstanding on a loan -- and sits on the credit side.
 * MOVEMENT IS GROSS -- what actually came in and what actually went out over
 * the period -- so it is read off movement_debit and movement_credit rather
 * than split out of the net figure. An account that took 5,00,000 in and paid
 * 5,00,000 out has moved nothing on net, and a report that showed a dash there
 * would be hiding the month's whole activity.
 *
 * The screen and the print both call this, so the two can never disagree about
 * which side a figure belongs on.
 */
export const splitBankRow = (row: BankInformationPrintRow): BankInformationColumns => {
  const opening = toNumber(row.opening);
  const closing = toNumber(row.closing);

  return {
    openingDebit: opening > 0 ? opening : 0,
    openingCredit: opening < 0 ? -opening : 0,
    movementDebit: toNumber(row.movement_debit),
    movementCredit: toNumber(row.movement_credit),
    closingDebit: closing > 0 ? closing : 0,
    closingCredit: closing < 0 ? -closing : 0,
  };
};

/** The foot: every column added down the page it is printed under. */
export const sumBankColumns = (rows: BankInformationPrintRow[]): BankInformationColumns =>
  rows.reduce<BankInformationColumns>(
    (acc, row) => {
      const columns = splitBankRow(row);
      acc.openingDebit += columns.openingDebit;
      acc.openingCredit += columns.openingCredit;
      acc.movementDebit += columns.movementDebit;
      acc.movementCredit += columns.movementCredit;
      acc.closingDebit += columns.closingDebit;
      acc.closingCredit += columns.closingCredit;
      return acc;
    },
    {
      openingDebit: 0,
      openingCredit: 0,
      movementDebit: 0,
      movementCredit: 0,
      closingDebit: 0,
      closingCredit: 0,
    },
  );

const chunkRows = <T,>(rows: T[], size: number) => {
  const pageSize = Math.max(1, Number(size) || rows.length || 1);
  const pages: T[][] = [];

  for (let index = 0; index < rows.length; index += pageSize) {
    pages.push(rows.slice(index, index + pageSize));
  }

  return pages.length > 0 ? pages : [[]];
};

const BankInformationPrint = forwardRef<HTMLDivElement, BankInformationPrintProps>(
  ({ rows, reportType, balanceLabels: balanceHeads, startDate, endDate, rowsPerPage, fontSize }, ref) => {
    const totals = useMemo(() => sumBankColumns(rows), [rows]);

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
                {/* Two header rows: the period each pair belongs to on top,
                    the side of the money underneath. Sl. No. and Bank Name are
                    one question rather than two, so they span both. */}
                <thead>
                  <tr>
                    <th rowSpan={2} style={styles.slHeader}>Sl. No.</th>
                    <th rowSpan={2} style={styles.nameHeader}>Bank Name</th>
                    <th colSpan={2} style={styles.groupHeader}>Opening</th>
                    <th colSpan={2} style={styles.groupHeader}>Movement</th>
                    <th colSpan={2} style={styles.groupHeader}>Closing</th>
                  </tr>
                  <tr>
                    <th style={styles.subHeader}>{balanceHeads.debit}</th>
                    <th style={styles.subHeader}>{balanceHeads.credit}</th>
                    <th style={styles.subHeader}>Received</th>
                    <th style={styles.subHeader}>Payment</th>
                    <th style={styles.subHeader}>{balanceHeads.debit}</th>
                    <th style={styles.subHeader}>{balanceHeads.credit}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length > 0 ? (
                    pageRows.map((row, rowIndex) => {
                      const columns = splitBankRow(row);

                      return (
                        <tr key={`${row.coa4_id ?? row.bank_name ?? rowIndex}-print`}>
                          <td style={styles.centerCell}>{pageOffset + rowIndex + 1}</td>
                          <td style={styles.leftCell}>{row.bank_name || '-'}</td>
                          <td style={styles.rightCell}>{thousandSeparator(columns.openingDebit)}</td>
                          <td style={styles.rightCell}>{thousandSeparator(columns.openingCredit)}</td>
                          <td style={styles.rightCell}>{thousandSeparator(columns.movementDebit)}</td>
                          <td style={styles.rightCell}>{thousandSeparator(columns.movementCredit)}</td>
                          <td style={styles.rightCell}>{thousandSeparator(columns.closingDebit)}</td>
                          <td style={styles.rightCell}>{thousandSeparator(columns.closingCredit)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} style={styles.emptyCell}>
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>

                {isLastPage ? (
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={styles.footerLabel}>Total</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.openingDebit)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.openingCredit)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.movementDebit)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.movementCredit)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.closingDebit)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(totals.closingCredit)}</td>
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
  // The two spanning cells sit against a header two rows tall, so they are
  // centred down as well as across -- left at the default `top` they would
  // ride up level with Opening / Movement / Closing and read as a third row.
  slHeader: {
    ...baseHeader,
    width: 44,
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  nameHeader: {
    ...baseHeader,
    textAlign: 'left',
    verticalAlign: 'middle',
  },
  groupHeader: {
    ...baseHeader,
    textAlign: 'center',
  },
  // Wide enough for "Outstanding", the longest word any of these six can carry.
  subHeader: {
    ...baseHeader,
    width: 82,
    textAlign: 'center',
  },
  centerCell: {
    ...baseCell,
    textAlign: 'center',
  },
  leftCell: {
    ...baseCell,
    textAlign: 'left',
    verticalAlign: 'middle',
  },
  rightCell: {
    ...baseCell,
    textAlign: 'right',
    verticalAlign: 'middle',
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
