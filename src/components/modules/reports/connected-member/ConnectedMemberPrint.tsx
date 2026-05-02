import React, { forwardRef, useMemo } from 'react';

import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

export type ConnectedMemberRow = {
  area_code?: number | string;
  area_name_eng?: string;
  area_name_bng?: string;
  connected_member?: number | string;
  collection?: number | string;
  downpayment?: number | string | null;
  gt_member?: number | string;
  out_standing?: number | string;
  emp_id?: number | string;
  emp_name_eng?: string;
  emp_name_bng?: string;
};

export type ConnectedMemberGroup = {
  employeeName: string;
  rows: ConnectedMemberRow[];
};

type Props = {
  groups: ConnectedMemberGroup[];
  branchName: string;
  startDate: string;
  endDate: string;
  rowsPerPage: number;
  fontSize: number;
};

const toNumber = (value: unknown) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const percentage = (value: number, total: number) => {
  if (!total) return '0.00%';
  return `${((value / total) * 100).toFixed(2)}%`;
};

const summarizeRows = (rows: ConnectedMemberRow[]) => {
  const connectedMember = rows.reduce((sum, row) => sum + toNumber(row.connected_member), 0);
  const gtMember = rows.reduce((sum, row) => sum + toNumber(row.gt_member), 0);
  const collection = rows.reduce((sum, row) => sum + toNumber(row.collection), 0);
  const downpayment = rows.reduce((sum, row) => sum + toNumber(row.downpayment), 0);
  const outstanding = rows.reduce((sum, row) => sum + toNumber(row.out_standing), 0);
  const collectionWithDp = collection + downpayment;

  return {
    connectedMember,
    gtMember,
    collection,
    downpayment,
    collectionWithDp,
    salary: collectionWithDp * 0.05,
    outstanding,
    payMemberPct: percentage(connectedMember, gtMember),
    overview: percentage(collectionWithDp, outstanding),
  };
};

const chunkGroups = (groups: ConnectedMemberGroup[], size: number) => {
  const pageSize = Math.max(1, Number(size) || groups.length || 1);
  const pages: ConnectedMemberGroup[][] = [];

  for (let index = 0; index < groups.length; index += pageSize) {
    pages.push(groups.slice(index, index + pageSize));
  }

  return pages.length > 0 ? pages : [[]];
};

const ConnectedMemberPrint = forwardRef<HTMLDivElement, Props>(
  ({ groups, branchName, startDate, endDate, rowsPerPage, fontSize }, ref) => {
    const grandTotal = useMemo(
      () => summarizeRows(groups.flatMap((group) => group.rows)),
      [groups],
    );
    const pages = chunkGroups(groups, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? fontSize : 12;

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageGroups, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;

          return (
            <div key={`connected-member-print-page-${pageIndex}`} className="print-page">
              <PadPrinting />

              <div className="mb-2">
                <h1 className="text-2xl font-bold text-center">Total Collection and Salary Generate</h1>
                <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                  <div><span className="font-semibold">Project:</span> {branchName || '-'}</div>
                  <div><span className="font-semibold">Report Date:</span> {startDate || '-'} to {endDate || '-'}</div>
                </div>
              </div>

              <table className="w-full table-fixed border-collapse" style={{ fontSize: fs }}>
                <thead className="bg-gray-100">
                  <tr>
                    <th style={styles.centerHeader}>Sl. No.</th>
                    <th style={styles.leftHeader}>Area</th>
                    <th style={styles.centerHeader}>Pay Member</th>
                    <th style={styles.centerHeader}>GT Member</th>
                    <th style={styles.rightHeader}>Collection</th>
                    <th style={styles.rightHeader}>DP (Coll)</th>
                    <th style={styles.rightHeader}>DP + Coll</th>
                    <th style={styles.rightHeader}>Salary</th>
                    <th style={styles.rightHeader}>Outstanding</th>
                    <th style={styles.centerHeader}>Overview</th>
                  </tr>
                </thead>
                <tbody>
                  {pageGroups.length > 0 ? (
                    pageGroups.map((group, groupIndex) => {
                      const summary = summarizeRows(group.rows);
                      const serial = pageIndex * Math.max(1, Number(rowsPerPage) || groups.length || 1) + groupIndex + 1;

                      return (
                        <tr key={`${group.employeeName}-${groupIndex}`} className="avoid-break">
                          <td style={styles.centerCell}>{serial}</td>
                          <td style={styles.leftCell}>{group.employeeName}</td>
                          <td style={styles.centerCell}>{summary.connectedMember} ({summary.payMemberPct})</td>
                          <td style={styles.centerCell}>{summary.gtMember}</td>
                          <td style={styles.rightCell}>{thousandSeparator(summary.collection)}</td>
                          <td style={styles.rightCell}>{thousandSeparator(summary.downpayment)}</td>
                          <td style={styles.rightCell}>{thousandSeparator(summary.collectionWithDp)}</td>
                          <td style={styles.rightCell}>{thousandSeparator(summary.salary)}</td>
                          <td style={styles.rightCell}>{thousandSeparator(summary.outstanding)}</td>
                          <td style={styles.centerCell}>{summary.overview}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} style={styles.emptyCell}>No data found</td>
                    </tr>
                  )}
                </tbody>
                {isLastPage ? (
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={styles.footerLabel}>Grand Total</td>
                      <td style={styles.centerFooter}>{grandTotal.connectedMember}</td>
                      <td style={styles.centerFooter}>{grandTotal.gtMember}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(grandTotal.collection)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(grandTotal.downpayment)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(grandTotal.collectionWithDp)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(grandTotal.salary)}</td>
                      <td style={styles.footerAmount}>{thousandSeparator(grandTotal.outstanding)}</td>
                      <td style={styles.centerFooter}>{grandTotal.overview}</td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>

              <div style={{ fontSize: fs }} className="mt-auto text-right text-xs">
                Page {pageIndex + 1} of {pages.length}
              </div>
              {pageIndex !== pages.length - 1 && <div className="page-break" />}
            </div>
          );
        })}

        <div className="mt-2 text-xs text-gray-900">
          * This document is system generated.
        </div>
      </div>
    );
  },
);

const baseCell: React.CSSProperties = {
  border: '1px solid #111827',
  padding: '5px 6px',
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
  centerFooter: { ...baseCell, fontWeight: 700, textAlign: 'center' },
};

ConnectedMemberPrint.displayName = 'ConnectedMemberPrint';

export { summarizeRows, toNumber };
export default ConnectedMemberPrint;
