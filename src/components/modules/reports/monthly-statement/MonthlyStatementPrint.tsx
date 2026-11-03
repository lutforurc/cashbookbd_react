import React from "react";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { MonthlyStatementData, StatementLine } from "./monthlyStatementSlice";

type Props = {
  data: MonthlyStatementData | null;
  startDate?: string;
  endDate?: string;
  fontSize?: number;
};

const fmt = (n: number) => thousandSeparator(Number(n) || 0);

/** A loss in brackets -- the accounting convention. */
const fmtSigned = (n: number) => (Number(n) < 0 ? `(${fmt(Math.abs(n))})` : fmt(n));

/**
 * ⚠️ DRAWN LIKE A BOOK OF ACCOUNT, NOT A GRID (owner, 2026-11-03). A box round
 * every heading and a line round every cell made the sheet heavy, so the paper
 * keeps only the rules an accountant would draw: one under each heading, one
 * above each total, and a double rule under the figure the page ends on. No
 * fill anywhere; every line is black so it survives the printer.
 */
const Heading = ({ children, note }: { children: React.ReactNode; note?: string }) => (
  <div className="mb-1 flex items-baseline justify-between border-b border-black pb-0.5">
    <span className="font-bold uppercase tracking-wide">{children}</span>
    {note ? <span className="text-[0.85em] italic">{note}</span> : null}
  </div>
);

const Row = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex justify-between gap-4 py-[2px] ${strong ? "font-bold" : ""}`}>
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

const Side = ({ title, lines, totalLabel, total }: {
  title: string;
  lines: StatementLine[];
  totalLabel: string;
  total: number;
}) => (
  <div className="flex flex-col">
    <Heading>{title}</Heading>
    <div className="flex-1">
      {lines.map((line) => (
        <Row key={line.key} label={line.title} value={fmt(line.amount)} />
      ))}
    </div>
    <div className="mt-1 border-t border-black pt-0.5">
      <Row label={totalLabel} value={fmt(total)} strong />
    </div>
  </div>
);

const MonthlyStatementPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ data, startDate, endDate, fontSize = 12 }, ref) => {
    const fs = { fontSize };

    return (
      <div ref={ref} className="p-8 text-black print-root">
        <PrintStyles />

        <div className="print-page">
          <PadPrinting />

          <div className="mb-5 text-center">
            <h1 className="text-lg font-bold tracking-wide">MONTHLY STATEMENT</h1>
            <div className="text-sm">
              {startDate || "-"} to {endDate || "-"}
            </div>
          </div>

          {data ? <Paper data={data} fs={fs} /> : null}

          <PrintFooter page={1} total={1} />
        </div>
      </div>
    );
  }
);

const Paper = ({ data, fs }: { data: MonthlyStatementData; fs: React.CSSProperties }) => {
  const { cash, memo, bank, profit } = data;
  const memoLines = memo.filter((m) => Number(m.amount) !== 0);
  const net = Number(profit.net_profit);

  // The till's whole story on one line: Opening + Receipts - Payments = Closing.
  const summary = [
    { label: "Opening Cash", value: fmtSigned(cash.opening) },
    { label: "(+) Receipts", value: fmt(cash.total_credit) },
    { label: "(−) Payments", value: fmt(cash.total_debit) },
    { label: "Closing Cash", value: fmtSigned(cash.closing) },
  ];

  return (
    <div style={fs} className="space-y-5">
      <div className="grid grid-cols-4 border-y border-black py-1.5 text-center">
        {summary.map((cell) => (
          <div key={cell.label}>
            <div className="text-[0.85em] uppercase tracking-wide">{cell.label}</div>
            <div className="text-[1.1em] font-bold tabular-nums">{cell.value}</div>
          </div>
        ))}
      </div>

      {/* ⚠️ CASH IN HAND ONLY, so the two sides close the till. */}
      <div className="grid grid-cols-2 gap-10">
        <Side title="Cash Receipts" lines={cash.credit} totalLabel="Total Receipts" total={cash.total_credit} />
        <Side title="Cash Payments" lines={cash.debit} totalLabel="Total Payments" total={cash.total_debit} />
      </div>

      {/* Business that moved no cash, added to neither side. */}
      {memoLines.length > 0 ? (
        <div>
          <Heading note="Not included in cash">Credit Transactions</Heading>
          <div className="grid grid-cols-2 gap-x-10">
            {memoLines.map((line) => (
              <Row key={line.key} label={line.title} value={fmt(line.amount)} />
            ))}
          </div>
        </div>
      ) : null}

      {/* The bank beside the till, never inside it. */}
      {bank.rows.length > 0 ? (
        <div>
          <Heading>Bank Accounts</Heading>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black text-[0.9em] uppercase tracking-wide">
                <th className="py-0.5 pr-2 text-left font-semibold">Account</th>
                <th className="py-0.5 px-2 text-right font-semibold">Opening</th>
                <th className="py-0.5 px-2 text-right font-semibold">Deposit</th>
                <th className="py-0.5 px-2 text-right font-semibold">Withdraw</th>
                <th className="py-0.5 pl-2 text-right font-semibold">Closing</th>
              </tr>
            </thead>
            <tbody>
              {bank.rows.map((row) => (
                <tr key={row.name}>
                  <td className="py-[2px] pr-2">{row.name}</td>
                  <td className="py-[2px] px-2 text-right tabular-nums">{fmtSigned(row.opening)}</td>
                  <td className="py-[2px] px-2 text-right tabular-nums">{fmt(row.deposit)}</td>
                  <td className="py-[2px] px-2 text-right tabular-nums">{fmt(row.withdraw)}</td>
                  <td className="py-[2px] pl-2 text-right tabular-nums">{fmtSigned(row.closing)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black font-bold">
                <td className="py-0.5 pr-2">Total</td>
                <td className="py-0.5 px-2 text-right tabular-nums">{fmtSigned(bank.totals.opening)}</td>
                <td className="py-0.5 px-2 text-right tabular-nums">{fmt(bank.totals.deposit)}</td>
                <td className="py-0.5 px-2 text-right tabular-nums">{fmt(bank.totals.withdraw)}</td>
                <td className="py-0.5 pl-2 text-right tabular-nums">{fmtSigned(bank.totals.closing)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}

      {/* ⚠️ THE PROFIT & LOSS ACCOUNT FOR THE SAME RANGE, read, not re-derived,
          and set out the way that account reaches its bottom line. */}
      <div className="ml-auto w-1/2">
        <Heading>Profit Summary</Heading>
        <Row label="Gross Profit" value={fmtSigned(profit.gross_profit)} />
        {Number(profit.other_income) !== 0 ? (
          <Row label="Add: Other Income" value={fmt(profit.other_income)} />
        ) : null}
        <Row
          label="Less: Expenses"
          value={Number(profit.expenses) ? `(${fmt(profit.expenses)})` : fmt(0)}
        />
        {/* The accountant's double rule under the figure the page ends on. */}
        <div
          className="mt-1 border-t border-black py-0.5"
          style={{ borderBottom: "3px double #000" }}
        >
          <Row label={net < 0 ? "Net Loss" : "Net Profit"} value={fmtSigned(net)} strong />
        </div>
      </div>
    </div>
  );
};

MonthlyStatementPrint.displayName = "MonthlyStatementPrint";
export default MonthlyStatementPrint;
