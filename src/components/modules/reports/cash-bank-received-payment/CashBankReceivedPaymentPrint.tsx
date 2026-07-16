import { forwardRef, useMemo } from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import ReportFooter from '../../../utils/utils-functions/ReportFooter';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import type { CashBankSummaryRow } from './CashBankReceivedPayment';

const num = (value: unknown) => Number(String(value ?? 0).replace(/,/g, '')) || 0;
const cell = { border: '1px solid #444', padding: '6px', textAlign: 'right' as const };

const CashBankReceivedPaymentPrint = forwardRef<HTMLDivElement, { rows: CashBankSummaryRow[]; projectName: string; startDate: string; endDate: string }>(
  ({ rows, projectName, startDate, endDate }, ref) => {
    const totals = useMemo(() => rows.reduce((sum, row) => [sum[0] + num(row.cash_debit), sum[1] + num(row.cash_credit), sum[2] + num(row.bank_debit), sum[3] + num(row.bank_credit)], [0, 0, 0, 0]), [rows]);
    const balances = [Math.max(totals[0] - totals[1], 0), Math.max(totals[1] - totals[0], 0), Math.max(totals[2] - totals[3], 0), Math.max(totals[3] - totals[2], 0)];
    return <div ref={ref} className="print-root p-8 text-gray-900"><PrintStyles /><div className="print-page"><PadPrinting />
      <div className="mb-3 text-sm"><h1 className="text-center text-xl font-bold">CASH &amp; BANK (RECEIVED &amp; PAYMENT)</h1><div><b>Project:</b> {projectName || '-'}</div><div><b>Period:</b> {startDate} to {endDate}</div></div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr><th rowSpan={2} style={{ ...cell, textAlign: 'center' }}>Sl. No.</th><th rowSpan={2} style={{ ...cell, textAlign: 'left' }}>Account Name</th><th colSpan={2} style={{ ...cell, textAlign: 'center' }}>Cash Details</th><th colSpan={2} style={{ ...cell, textAlign: 'center' }}>Bank Details</th></tr><tr>{['Received (Tk.)', 'Payment (Tk.)', 'Received (Tk.)', 'Payment (Tk.)'].map((title, index) => <th key={index} style={{ ...cell, textAlign: 'center' }}>{title}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={`${row.name}-${index}`}><td style={{ ...cell, textAlign: 'center' }}>{index + 1}</td><td style={{ ...cell, textAlign: 'left' }}>{row.name}</td>{[row.cash_debit, row.cash_credit, row.bank_debit, row.bank_credit].map((value, i) => <td key={i} style={cell}>{thousandSeparator(num(value))}</td>)}</tr>)}</tbody>
      <tfoot>{[['Total', totals], ['Balance', balances]].map(([label, values]: any) => <tr key={label}><td colSpan={2} style={{ ...cell, fontWeight: 700 }}>{label}</td>{values.map((value: number, index: number) => <td key={index} style={{ ...cell, fontWeight: 700 }}>{thousandSeparator(value)}</td>)}</tr>)}</tfoot></table>
      <div className="mt-auto"><ReportFooter /></div></div></div>;
  },
);
CashBankReceivedPaymentPrint.displayName = 'CashBankReceivedPaymentPrint';
export default CashBankReceivedPaymentPrint;
