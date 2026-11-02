import React from "react";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

export type BusinessMonthInfo = { month: number; label: string; started: boolean };
export type BusinessMonthValue = { opening: number; closing: number };
export type BusinessGroupRow = {
  side: string;
  name: string;
  months: Record<string, BusinessMonthValue>;
};
export type BusinessSummaryData = {
  year: number;
  months: BusinessMonthInfo[];
  sections: {
    assets: BusinessGroupRow[];
    liabilities: BusinessGroupRow[];
    equity: BusinessGroupRow[];
  };
  totals: Record<string, Record<string, BusinessMonthValue>>;
};

type Props = {
  data: BusinessSummaryData | null;
  /** A slice of the report's lines, for one printed page. Everything when omitted. */
  lines?: Line[];
  /** Print draws plain bordered cells in black and white; the screen follows the theme. */
  print?: boolean;
  fontSize?: number;
  /** Screen only: makes a group's name a link that opens its accounts. */
  onGroupClick?: (row: BusinessGroupRow) => void;
};

export type Line =
  | { kind: "section"; label: string }
  | { kind: "group"; sl: number; row: BusinessGroupRow }
  | { kind: "total"; label: string; values: Record<string, BusinessMonthValue>; strong?: boolean };

const SECTIONS: Array<{ key: "assets" | "liabilities" | "equity"; label: string }> = [
  { key: "assets", label: "Assets" },
  { key: "liabilities", label: "Liabilities" },
  { key: "equity", label: "Equity" },
];

const sumTotals = (
  data: BusinessSummaryData,
  sides: string[],
  sign: number = 1
): Record<string, BusinessMonthValue> => {
  const out: Record<string, BusinessMonthValue> = {};
  data.months.forEach(({ month, started }) => {
    if (!started) return;
    out[month] = { opening: 0, closing: 0 };
    sides.forEach((side) => {
      const v = data.totals?.[side]?.[month];
      out[month].opening += sign * Number(v?.opening || 0);
      out[month].closing += sign * Number(v?.closing || 0);
    });
  });
  return out;
};

const diffTotals = (
  a: Record<string, BusinessMonthValue>,
  b: Record<string, BusinessMonthValue>
) => {
  const out: Record<string, BusinessMonthValue> = {};
  Object.keys(a).forEach((m) => {
    out[m] = {
      opening: Math.round((a[m].opening - (b[m]?.opening || 0)) * 100) / 100,
      closing: Math.round((a[m].closing - (b[m]?.closing || 0)) * 100) / 100,
    };
  });
  return out;
};

export const buildLines = (data: BusinessSummaryData): Line[] => {
  const lines: Line[] = [];
  let sl = 0;

  SECTIONS.forEach(({ key, label }) => {
    const rows = data.sections?.[key] ?? [];
    if (!rows.length) return;
    lines.push({ kind: "section", label });
    rows.forEach((row) => lines.push({ kind: "group", sl: ++sl, row }));
    lines.push({ kind: "total", label: `Total ${label}`, values: sumTotals(data, [key]) });
  });

  const assets = sumTotals(data, ["assets"]);
  const liabEquity = sumTotals(data, ["liabilities", "equity"]);
  lines.push({ kind: "total", label: "Total Assets", values: assets, strong: true });
  lines.push({ kind: "total", label: "Total Liabilities + Equity", values: liabEquity, strong: true });
  lines.push({ kind: "total", label: "Difference", values: diffTotals(assets, liabEquity) });

  return lines;
};

const BusinessSummaryGrid: React.FC<Props> = ({ data, lines: given, print = false, fontSize = 11, onGroupClick }) => {
  if (!data) return null;

  const lines = given ?? buildLines(data);
  const months = data.months;

  const border = print
    ? "border border-gray-900"
    : "border border-[rgb(var(--c-border))]";
  const head = print ? "bg-gray-100" : "bg-[rgb(var(--c-surface))]";
  const cell = `${border} px-1.5 py-1`;
  const num = `${cell} text-right whitespace-nowrap`;
  const style = { fontSize };

  const value = (v: BusinessMonthValue | undefined, field: "opening" | "closing", started: boolean) =>
    started && v ? thousandSeparator(v[field]) : "";

  return (
    <table className="w-full border-collapse" style={{ ...style, minWidth: print ? undefined : 2200 }}>
      <thead className={head}>
        <tr>
          <th rowSpan={2} className={`${cell} w-10 text-center`}>SL</th>
          <th rowSpan={2} className={`${cell} text-left`} style={{ minWidth: print ? undefined : 200 }}>
            Description
          </th>
          {months.map((m) => (
            <th key={m.month} colSpan={2} className={`${cell} text-center`}>
              {m.label}
            </th>
          ))}
        </tr>
        <tr>
          {months.map((m) => (
            <React.Fragment key={m.month}>
              <th className={`${cell} text-right`}>Opening</th>
              <th className={`${cell} text-right`}>Closing</th>
            </React.Fragment>
          ))}
        </tr>
      </thead>

      <tbody>
        {lines.map((line, idx) => {
          if (line.kind === "section") {
            return (
              <tr key={`s-${idx}`} className={head}>
                <td colSpan={2 + months.length * 2} className={`${cell} font-bold`}>
                  {line.label}
                </td>
              </tr>
            );
          }

          if (line.kind === "group") {
            return (
              <tr key={`g-${idx}`} className="avoid-break">
                <td className={`${cell} text-center`}>{line.sl}</td>
                <td className={cell}>
                  {onGroupClick ? (
                    <button
                      type="button"
                      className="text-left text-blue-600 hover:underline dark:text-blue-300"
                      onClick={() => onGroupClick(line.row)}
                      title="Show accounts"
                    >
                      {line.row.name}
                    </button>
                  ) : (
                    line.row.name
                  )}
                </td>
                {months.map((m) => (
                  <React.Fragment key={m.month}>
                    <td className={num}>{value(line.row.months?.[m.month], "opening", m.started)}</td>
                    <td className={num}>{value(line.row.months?.[m.month], "closing", m.started)}</td>
                  </React.Fragment>
                ))}
              </tr>
            );
          }

          return (
            <tr key={`t-${idx}`} className={`avoid-break font-bold ${line.strong ? head : ""}`}>
              <td colSpan={2} className={`${cell} text-left`}>{line.label}</td>
              {months.map((m) => (
                <React.Fragment key={m.month}>
                  <td className={num}>{value(line.values[m.month], "opening", m.started)}</td>
                  <td className={num}>{value(line.values[m.month], "closing", m.started)}</td>
                </React.Fragment>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default BusinessSummaryGrid;
