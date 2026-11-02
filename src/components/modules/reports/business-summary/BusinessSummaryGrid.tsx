import React from "react";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

/** One month of the report. `month` is its key, "YYYY-MM" -- a range may cross a year end. */
export type BusinessMonthInfo = {
  month: string;
  year: number;
  month_no: number;
  label: string;
  started: boolean;
};
export type BusinessMonthValue = { opening: number; closing: number };
export type BusinessGroupRow = {
  side: string;
  name: string;
  months: Record<string, BusinessMonthValue>;
};
export type BusinessSummaryData = {
  start_month: string;
  end_month: string;
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

/**
 * The report's lines, grouped the way a page may be cut: one block per section
 * (its heading, its groups and its total), with the closing totals riding in the
 * last block so they never stand alone on a sheet of their own.
 *
 * ⚠️ NO SECOND "TOTAL ASSETS". The Assets section already closes on it, and a
 * report states a figure once. Nor a "Total Liabilities + Equity": on a sheet
 * that balances it is the Total Assets figure again. What is added is only the
 * Difference, the one line that says whether the two sides agree.
 */
export const buildBlocks = (data: BusinessSummaryData): Line[][] => {
  const blocks: Line[][] = [];
  let sl = 0;

  SECTIONS.forEach(({ key, label }) => {
    const rows = data.sections?.[key] ?? [];
    if (!rows.length) return;

    const block: Line[] = [{ kind: "section", label }];
    rows.forEach((row) => block.push({ kind: "group", sl: ++sl, row }));
    block.push({ kind: "total", label: `Total ${label}`, values: sumTotals(data, [key]) });
    blocks.push(block);
  });

  const assets = sumTotals(data, ["assets"]);
  const liabEquity = sumTotals(data, ["liabilities", "equity"]);
  const closing: Line[] = [
    { kind: "total", label: "Difference", values: diffTotals(assets, liabEquity) },
  ];

  if (blocks.length) {
    blocks[blocks.length - 1].push(...closing);
  } else {
    blocks.push(closing);
  }

  return blocks;
};

export const buildLines = (data: BusinessSummaryData): Line[] => buildBlocks(data).flat();

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
    // Each column as wide as its own figures and no wider: the table is not
    // stretched to the page, so a month with small numbers stays narrow.
    <table className="w-auto border-collapse" style={style}>
      <thead className={head}>
        <tr>
          <th rowSpan={2} data-col="fixed" className={`${cell} w-10 text-center`}>SL</th>
          <th rowSpan={2} data-col="fixed" className={`${cell} text-left whitespace-nowrap`}>
            Description
          </th>
          {months.map((m) => (
            <th key={m.month} colSpan={2} data-col="month" className={`${cell} text-center`}>
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
                <td className={`${cell} whitespace-nowrap`}>
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
              <td colSpan={2} className={`${cell} text-left whitespace-nowrap`}>{line.label}</td>
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
