import { formatAmount, type ReportGroup, type SheetLine } from "./sheetLines";

/**
 * The balance sheet as a statement: the way it goes to a bank, an auditor or
 * the owner. No serial, no Dr / Cr, no grid -- the sections, the indents and
 * the rules under the totals carry the structure, the way a filed statement
 * does.
 *
 * Two money columns, Opening and Closing, so the sheet reads as a comparative
 * one: what the business stood at when the period opened beside what it
 * stands at now. Both figures are in the lines already; the worksheet shows
 * them as well, split by side. Movement is left to the worksheet -- it is a
 * reconciliation figure, and this page is not the one for reconciling on.
 *
 * ⚠️ A FIGURE IS PRINTED AS IT STANDS, NOT BY ITS SIDE. Assets are debits and
 * liabilities credits, so every line is normally positive and the column it
 * sits in says nothing about direction. A bracketed figure is the exception
 * the reader is meant to notice: a bank overdrawn under Assets, a debit
 * balance sitting under Liabilities, the "Less" line under fixed assets.
 */
type BalanceSheetStatementProps = {
  lines: SheetLine[];
  /** Under the column heads: the day the period opened, and the day it closed. */
  openingDate: string;
  closingDate: string;
  fontSize: number;
  onGroupClick: (title: string, group: ReportGroup) => void;
};

const BalanceSheetStatement = ({
  lines,
  openingDate,
  closingDate,
  fontSize,
  onGroupClick,
}: BalanceSheetStatementProps) => {
  const text = "text-slate-900 dark:text-[rgb(var(--c-text))]";
  const muted = "text-slate-500 dark:text-slate-400";
  const amount = `whitespace-nowrap text-right tabular-nums ${text}`;

  // A rule above a subtotal, and a double rule under a total, the way the
  // hand-ruled sheet does it. Drawn on the money cells only: a rule run under
  // the label as well would read as a row divider rather than a sum line.
  const subtotalRule = "border-t border-slate-400 dark:border-slate-500";
  const totalRule = "border-t border-b-4 border-double border-slate-800 dark:border-slate-300";

  return (
    <div className="mx-auto max-w-4xl overflow-x-auto" style={{ fontSize: `${fontSize}px` }}>
      <table className="w-full border-collapse">
        <colgroup>
          <col />
          <col className="w-36" />
          <col className="w-36" />
        </colgroup>
        <thead>
          <tr>
            <th className="pb-2" />
            <th className={`pb-2 pl-3 text-right align-bottom font-semibold ${text}`}>
              Opening
              <span className={`block text-xs font-normal ${muted}`}>{openingDate}</span>
            </th>
            <th className={`pb-2 pl-3 text-right align-bottom font-semibold ${text}`}>
              Closing
              <span className={`block text-xs font-normal ${muted}`}>{closingDate}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            if (line.kind === "section") {
              return (
                <tr key={`${line.label}-${index}`}>
                  <td colSpan={3} className={`pt-6 pb-1 text-lg font-bold ${text}`}>
                    {line.label}
                  </td>
                </tr>
              );
            }

            if (line.kind === "subsection") {
              return (
                <tr key={`${line.label}-${index}`}>
                  <td colSpan={3} className={`pt-3 pb-0.5 font-semibold ${text}`}>
                    {line.label}
                  </td>
                </tr>
              );
            }

            /* The level-2 subtotal, and the "Less:" line above it. The Less
               line is a deduction rather than a sum, so it sits with the
               accounts -- indented, plain weight, no rule -- and only the Net
               line that follows it is ruled. */
            if (line.kind === "subtotal") {
              const cellClass = line.indent
                ? `py-0.5 pl-3 ${amount}`
                : `${subtotalRule} pt-1.5 pb-2 pl-3 font-semibold ${amount}`;

              return (
                <tr key={`${line.label}-${index}`}>
                  <td
                    className={
                      line.indent
                        ? `py-0.5 pl-4 ${text}`
                        : `pt-1.5 pb-2 pl-2 font-semibold ${text}`
                    }
                  >
                    {line.label}
                  </td>
                  <td className={cellClass}>{formatAmount(line.columns.opening)}</td>
                  <td className={cellClass}>{formatAmount(line.columns.closing)}</td>
                </tr>
              );
            }

            if (line.kind === "total") {
              const cellClass = `${totalRule} pt-2 pb-1 pl-3 font-bold ${amount}`;

              return (
                <tr key={`${line.label}-${index}`}>
                  <td className={`pt-2 pb-1 font-bold ${text} ${line.strong ? "text-base" : ""}`}>
                    {line.label}
                  </td>
                  <td className={cellClass}>{formatAmount(line.columns.opening)}</td>
                  <td className={cellClass}>{formatAmount(line.columns.closing)}</td>
                </tr>
              );
            }

            return (
              <tr
                key={line.key}
                onClick={() => onGroupClick(line.section, line.group)}
                title={`${line.itemCount} account${line.itemCount === 1 ? "" : "s"} — click to open`}
                className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <td className={`py-0.5 pl-4 ${text}`}>{line.label}</td>
                <td className={`py-0.5 pl-3 ${amount}`}>{formatAmount(line.columns.opening)}</td>
                <td className={`py-0.5 pl-3 ${amount}`}>{formatAmount(line.columns.closing)}</td>
              </tr>
            );
          })}

          {lines.length === 0 && (
            <tr>
              <td colSpan={3} className={`py-6 text-center ${muted}`}>
                No balance sheet data found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BalanceSheetStatement;
