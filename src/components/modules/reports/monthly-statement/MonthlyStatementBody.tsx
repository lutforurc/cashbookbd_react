import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { MonthlyStatementData, StatementLine } from "./monthlyStatementSlice";

type Props = {
  data: MonthlyStatementData;
  fontSize?: number;
};

const fmt = (n: number) => thousandSeparator(Number(n) || 0);

/** A loss in brackets -- the accounting convention. */
const fmtSigned = (n: number) => (Number(n) < 0 ? `(${fmt(Math.abs(n))})` : fmt(n));

/**
 * The statement as the screen shows it. The printed sheet has a layout of its
 * own -- see MonthlyStatementPrint -- and reads the same figures.
 */
const MonthlyStatementBody = ({ data, fontSize }: Props) => {
  const fs = fontSize ? { fontSize } : undefined;

  const border = "border-[rgb(var(--c-border))]";
  const text = "text-[rgb(var(--c-text))]";
  const band = `border ${border} bg-[rgb(var(--c-table-head))]`;

  const Band = ({ label, value, className = "" }: { label: string; value?: string; className?: string }) => (
    <div style={fs} className={`${band} ${className} flex justify-center gap-3 px-3 py-1.5 font-semibold`}>
      <span>{label}</span>
      {value !== undefined ? <span className="tabular-nums">{value}</span> : null}
    </div>
  );

  const Side = ({ title, lines, totalLabel, total }: {
    title: string;
    lines: StatementLine[];
    totalLabel: string;
    total: number;
  }) => (
    <div className="flex flex-col">
      <Band label={title} />
      <div className="flex-1 py-1.5">
        {lines.map((line) => (
          <div key={line.key} style={fs} className="flex justify-between gap-3 py-0.5">
            <span>{line.title}</span>
            <span className="font-semibold tabular-nums">{fmt(line.amount)}</span>
          </div>
        ))}
      </div>
      <div style={fs} className={`${band} flex justify-between px-3 py-1.5 font-bold`}>
        <span>{totalLabel}</span>
        <span className="tabular-nums">{fmt(total)}</span>
      </div>
    </div>
  );

  const { cash, memo, bank, profit } = data;
  const hasMemo = memo.some((m) => Number(m.amount) !== 0);
  const net = Number(profit.net_profit);

  return (
    <div className={`${text} space-y-3`}>
      <Band label="Cash in Hand (Opening)" value={fmtSigned(cash.opening)} />

      {/* ⚠️ CASH IN HAND ONLY, so the two sides close the till:
          Opening + Total Receipts - Total Payments = Closing. */}
      <div className="grid gap-6 md:grid-cols-2">
        <Side title="Cash Receipts" lines={cash.credit} totalLabel="Total Receipts" total={cash.total_credit} />
        <Side title="Cash Payments" lines={cash.debit} totalLabel="Total Payments" total={cash.total_debit} />
      </div>

      <Band label="Cash in Hand (Closing)" value={fmtSigned(cash.closing)} />

      {/* Business that moved no cash: shown so the period is seen whole, and
          added to neither side -- counted, the closing would miss the till by
          exactly the credit business of the period. */}
      {hasMemo ? (
        <div>
          <Band label="Credit Transactions (No Cash Movement)" />
          <div className="grid gap-x-6 py-1.5 md:grid-cols-2">
            {memo.map((line) => (
              <div key={line.key} style={fs} className="flex justify-between gap-3 py-0.5">
                <span>{line.title}</span>
                <span className="font-semibold tabular-nums">{fmt(line.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* The bank beside the till, never inside it. */}
      {bank.rows.length > 0 ? (
        <div>
          <Band label="Bank Accounts" />
          <table className="w-full border-collapse" style={fs}>
            <thead>
              <tr className="font-semibold">
                <th className={`border ${border} px-2 py-1 text-left`}>Bank Account</th>
                <th className={`border ${border} px-2 py-1 text-right`}>Opening</th>
                <th className={`border ${border} px-2 py-1 text-right`}>Deposit</th>
                <th className={`border ${border} px-2 py-1 text-right`}>Withdraw</th>
                <th className={`border ${border} px-2 py-1 text-right`}>Closing</th>
              </tr>
            </thead>
            <tbody>
              {bank.rows.map((row) => (
                <tr key={row.name}>
                  <td className={`border ${border} px-2 py-1`}>{row.name}</td>
                  <td className={`border ${border} px-2 py-1 text-right tabular-nums`}>{fmtSigned(row.opening)}</td>
                  <td className={`border ${border} px-2 py-1 text-right tabular-nums`}>{fmt(row.deposit)}</td>
                  <td className={`border ${border} px-2 py-1 text-right tabular-nums`}>{fmt(row.withdraw)}</td>
                  <td className={`border ${border} px-2 py-1 text-right tabular-nums`}>{fmtSigned(row.closing)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className={`border ${border} px-2 py-1 text-right`}>Total</td>
                <td className={`border ${border} px-2 py-1 text-right tabular-nums`}>{fmtSigned(bank.totals.opening)}</td>
                <td className={`border ${border} px-2 py-1 text-right tabular-nums`}>{fmt(bank.totals.deposit)}</td>
                <td className={`border ${border} px-2 py-1 text-right tabular-nums`}>{fmt(bank.totals.withdraw)}</td>
                <td className={`border ${border} px-2 py-1 text-right tabular-nums`}>{fmtSigned(bank.totals.closing)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}

      {/* ⚠️ THE PROFIT & LOSS ACCOUNT FOR THE SAME RANGE, read, not re-derived:
          Total Sales Profit is its Gross Profit, Net Profit/Loss its Net. */}
      <Band
        label="Gross Profit"
        value={fmtSigned(profit.gross_profit)}
        className="bg-gray-300! dark:bg-gray-600!"
      />
      {Number(profit.other_income) !== 0 ? (
        <Band label="Other Income" value={fmt(profit.other_income)} />
      ) : null}
      <Band
        label="Expenses"
        value={fmt(profit.expenses)}
        className="bg-red-300! dark:bg-red-900/60!"
      />
      <Band
        label={net < 0 ? "Net Loss" : "Net Profit"}
        value={fmtSigned(net)}
        className={net < 0 ? "bg-red-300! dark:bg-red-900/60!" : "bg-green-300! dark:bg-green-900/60!"}
      />
    </div>
  );
};

export default MonthlyStatementBody;
