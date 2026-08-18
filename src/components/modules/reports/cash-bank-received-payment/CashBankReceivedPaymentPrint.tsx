import { forwardRef, useMemo } from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import ReportFooter from '../../../utils/utils-functions/ReportFooter';
import type { PrintBranch } from '../../../utils/utils-functions/printBranch';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import type { BankDetailRow, CashBankSummaryRow } from './CashBankReceivedPayment';

type Props = {
  rows: CashBankSummaryRow[];
  bankDetails: BankDetailRow[];
  projectName: string;
  startDate: string;
  endDate: string;
  rowsPerPage?: number;
  fontSize?: number;
  /**
   * The branch the report was pulled for. Head office reads any branch's cash
   * and bank, and the pad has to name the branch the figures belong to rather
   * than the branch of whoever pressed Print. Left out, the pad falls back to
   * the logged-in user's own branch, which is right only when the two match.
   */
  branch?: PrintBranch;
};

const num = (value: unknown) => Number(String(value ?? 0).replace(/,/g, '')) || 0;
const chunkRows = <T,>(rows: T[], size: number) => {
  const pageSize = Math.max(1, Number(size) || 12);
  const pages: T[][] = [];
  for (let index = 0; index < rows.length; index += pageSize) pages.push(rows.slice(index, index + pageSize));
  return pages.length ? pages : [[]];
};

const CashBankReceivedPaymentPrint = forwardRef<HTMLDivElement, Props>(
  ({ rows, bankDetails, projectName, startDate, endDate, rowsPerPage = 12, fontSize = 12, branch }, ref) => {
    const pages = chunkRows(rows, Math.min(Math.max(1, rowsPerPage), 12));
    const bankPages = bankDetails.length ? chunkRows(bankDetails, Math.min(Math.max(1, rowsPerPage), 12)) : [];
    const totalPages = pages.length + bankPages.length;
    const totals = useMemo(() => rows.reduce((sum, row) => [
      sum[0] + num(row.cash_debit), sum[1] + num(row.cash_credit),
      sum[2] + num(row.bank_debit), sum[3] + num(row.bank_credit),
    ], [0, 0, 0, 0]), [rows]);
    const balances = [Math.max(totals[0] - totals[1], 0), Math.max(totals[1] - totals[0], 0), Math.max(totals[2] - totals[3], 0), Math.max(totals[3] - totals[2], 0)];
    const fs = Number(fontSize) || 12;
    const cell = { border: '1px solid #444', padding: '5px 6px', fontSize: fs, textAlign: 'right' as const };

    return <div ref={ref} className="print-root p-8 text-gray-900"><PrintStyles />
      <style>{`@media print { @page { size: A4 landscape; margin: 6mm 8mm 5mm 10mm; } .cash-bank-print-page { box-sizing: border-box; height: calc(210mm - 6mm - 5mm - 1mm); min-height: 0; max-height: calc(210mm - 6mm - 5mm - 1mm); break-inside: avoid; page-break-inside: avoid; overflow: hidden; } .cash-bank-print-page.break-after { break-after: page; page-break-after: always; } }`}</style>
      {pages.map((pageRows, pageIndex) => {
        const lastPage = pageIndex === pages.length - 1;
        const offset = pageIndex * Math.max(1, Number(rowsPerPage) || 12);
        return <div key={pageIndex} className={`print-page cash-bank-print-page ${(pageIndex + 1) < totalPages ? 'break-after' : ''}`}>
          <PadPrinting branch={branch} />
          <div className="mb-2" style={{ fontSize: fs }}><h1 className="text-center text-xl font-bold">Cash &amp; Bank (Received &amp; Payment)</h1><div className="flex justify-between"><span><b>Branch:</b> {projectName || '-'}</span><span><b>Period:</b> {startDate} to {endDate}</span></div></div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th rowSpan={2} style={{ ...cell, textAlign: 'center' }}>Sl. No.</th><th rowSpan={2} style={{ ...cell, textAlign: 'left' }}>Account Name</th><th colSpan={2} style={{ ...cell, textAlign: 'center' }}>Cash Details</th><th colSpan={2} style={{ ...cell, textAlign: 'center' }}>Bank Details</th></tr><tr>{['Received (Tk.)', 'Payment (Tk.)', 'Received (Tk.)', 'Payment (Tk.)'].map((title, index) => <th key={index} style={{ ...cell, textAlign: 'center' }}>{title}</th>)}</tr></thead>
            <tbody>{pageRows.map((row, index) => <tr key={`${row.name}-${index}`}><td style={{ ...cell, textAlign: 'center' }}>{offset + index + 1}</td><td style={{ ...cell, textAlign: 'left' }}>{row.name}</td>{[row.cash_debit, row.cash_credit, row.bank_debit, row.bank_credit].map((value, i) => <td key={i} style={cell}>{num(value) ? thousandSeparator(num(value)) : '-'}</td>)}</tr>)}</tbody>
            {lastPage && <tfoot>{[['Total', totals], ['Balance', balances]].map(([label, values]: any) => <tr key={label}><td colSpan={2} style={{ ...cell, fontWeight: 700 }}>{label}</td>{values.map((value: number, index: number) => <td key={index} style={{ ...cell, fontWeight: 700 }}>{value ? thousandSeparator(value) : '-'}</td>)}</tr>)}</tfoot>}
          </table>
          <div style={{ fontSize: fs }} className="mt-auto flex shrink-0 items-end justify-between gap-4 border-t border-gray-400 pt-1 text-gray-600"><span className="text-left"><ReportFooter inline /></span><span className="whitespace-nowrap text-right">Page {pageIndex + 1} of {totalPages}</span></div>
        </div>;
      })}
      {bankPages.map((pageBanks, bankPageIndex) => {
        const pageNumber = pages.length + bankPageIndex + 1;
        const offset = bankPageIndex * Math.min(Math.max(1, rowsPerPage), 12);
        return <div key={`bank-${bankPageIndex}`} className={`print-page cash-bank-print-page ${pageNumber < totalPages ? 'break-after' : ''}`}>
          <PadPrinting branch={branch} />
          <div className="mb-2" style={{ fontSize: fs }}><h1 className="text-center text-xl font-bold">Bank-wise Details</h1><div className="flex justify-between"><span><b>Branch:</b> {projectName || '-'}</span><span><b>Period:</b> {startDate} to {endDate}</span></div></div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Sl. No.', 'Bank Account', 'Received (Tk.)', 'Payment (Tk.)', 'Balance (Tk.)'].map((title, index) => <th key={title} style={{ ...cell, textAlign: index === 1 ? 'left' : index === 0 ? 'center' : 'right' }}>{title}</th>)}</tr></thead><tbody>{pageBanks.map((bank, index) => { const received = num(bank.received); const payment = num(bank.payment); return <tr key={`${bank.bank_account_id ?? bank.bank_name}-${index}`}><td style={{ ...cell, textAlign: 'center' }}>{offset + index + 1}</td><td style={{ ...cell, textAlign: 'left' }}>{bank.bank_name}</td><td style={cell}>{received ? thousandSeparator(received) : '-'}</td><td style={cell}>{payment ? thousandSeparator(payment) : '-'}</td><td style={cell}>{thousandSeparator(received - payment)}</td></tr>; })}</tbody></table>
          <div style={{ fontSize: fs }} className="mt-auto flex shrink-0 items-end justify-between gap-4 border-t border-gray-400 pt-1 text-gray-600"><span className="text-left"><ReportFooter inline /></span><span className="whitespace-nowrap text-right">Page {pageNumber} of {totalPages}</span></div>
        </div>;
      })}
    </div>;
  },
);
CashBankReceivedPaymentPrint.displayName = 'CashBankReceivedPaymentPrint';
export default CashBankReceivedPaymentPrint;
