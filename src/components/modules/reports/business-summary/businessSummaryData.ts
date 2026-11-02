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

export type BusinessSectionKey = "assets" | "liabilities" | "equity";

export type BusinessSummaryData = {
  start_month: string;
  end_month: string;
  months: BusinessMonthInfo[];
  sections: Record<BusinessSectionKey, BusinessGroupRow[]>;
  totals: Record<string, Record<string, BusinessMonthValue>>;
};

export type BusinessSection = {
  key: BusinessSectionKey;
  title: string;
  rows: BusinessGroupRow[];
};

const SECTION_TITLES: Array<{ key: BusinessSectionKey; title: string }> = [
  { key: "assets", title: "Assets" },
  { key: "liabilities", title: "Liabilities" },
  { key: "equity", title: "Equity" },
];

/** The sections that have rows, in the order a balance sheet reads them. */
export const businessSections = (data: BusinessSummaryData | null): BusinessSection[] =>
  data
    ? SECTION_TITLES.map(({ key, title }) => ({ key, title, rows: data.sections?.[key] ?? [] })).filter(
        (section) => section.rows.length > 0
      )
    : [];

/** A month's figures added up over some rows. */
export const sumRows = (rows: BusinessGroupRow[], months: BusinessMonthInfo[]) => {
  const out: Record<string, BusinessMonthValue> = {};
  months.forEach(({ month }) => {
    out[month] = rows.reduce(
      (sum, row) => ({
        opening: sum.opening + Number(row.months?.[month]?.opening || 0),
        closing: sum.closing + Number(row.months?.[month]?.closing || 0),
      }),
      { opening: 0, closing: 0 }
    );
  });
  return out;
};

/** A section's total for each month, as the server worked it out. */
export const sectionTotals = (data: BusinessSummaryData, key: BusinessSectionKey) => {
  const out: Record<string, BusinessMonthValue> = {};
  data.months.forEach(({ month }) => {
    const v = data.totals?.[key]?.[month];
    out[month] = { opening: Number(v?.opening || 0), closing: Number(v?.closing || 0) };
  });
  return out;
};

/**
 * Assets less liabilities and equity, month by month: nil on a sheet that
 * balances. The one line the report adds to its sections -- a second "Total
 * Assets" or a "Total Liabilities + Equity" would only state a figure again.
 */
export const differenceTotals = (data: BusinessSummaryData) => {
  const assets = sectionTotals(data, "assets");
  const liabilities = sectionTotals(data, "liabilities");
  const equity = sectionTotals(data, "equity");
  const out: Record<string, BusinessMonthValue> = {};
  data.months.forEach(({ month }) => {
    out[month] = {
      opening: Math.round((assets[month].opening - liabilities[month].opening - equity[month].opening) * 100) / 100,
      closing: Math.round((assets[month].closing - liabilities[month].closing - equity[month].closing) * 100) / 100,
    };
  });
  return out;
};

/** One row of the report as it is drawn: a section heading, a group, or a total. */
export type BusinessLine =
  | { kind: 'section'; title: string }
  | { kind: 'group'; row: BusinessGroupRow }
  | { kind: 'total'; label: string; values: Record<string, BusinessMonthValue> };

/**
 * The report as one running list -- Assets, Liabilities and Equity one after
 * the other in a single table, each under its heading and closing on its total,
 * with the Difference after the last. One block per section, so a printed page
 * can be cut between sections rather than through one.
 */
export const businessBlocks = (data: BusinessSummaryData | null): BusinessLine[][] => {
  if (!data) return [];
  const sections = businessSections(data);
  const blocks: BusinessLine[][] = sections.map((section) => [
    { kind: 'section', title: section.title },
    ...section.rows.map((row) => ({ kind: 'group' as const, row })),
    { kind: 'total', label: `Total ${section.title}`, values: sectionTotals(data, section.key) },
  ]);
  if (blocks.length) {
    blocks[blocks.length - 1].push({ kind: 'total', label: 'Difference', values: differenceTotals(data) });
  }
  return blocks;
};
