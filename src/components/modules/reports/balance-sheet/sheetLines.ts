import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

/**
 * The balance sheet's shape, and the one list of lines both views draw from.
 *
 * ⚠️ THE STATEMENT AND THE WORKSHEET READ THE SAME LINES. The worksheet lays
 * them out with six money columns and a serial; the statement with two and
 * none. Both take the list buildSheetLines() returns, so a group can never be
 * on one and off the other, and a total can never disagree between them.
 */

export type ReportItem = {
  coa4_id?: number | null;
  name?: string;
  opening?: number | string;
  movement?: number | string;
  closing?: number | string;
  balance?: number | string;
};

export type ReportGroup = {
  group_name?: string;
  /** Set by the server on a group that is deducted from the others beside it. */
  is_contra?: boolean;
  opening?: number | string;
  movement?: number | string;
  closing?: number | string;
  total?: number | string;
  items?: ReportItem[];
};

export type ColumnTotals = {
  opening: number;
  movement: number;
  closing: number;
};

/**
 * A level-2 group of the chart — Current Assets, Fixed Asset, Current
 * Liability, Capital Account — holding the level-3 groups under it.
 *
 * ⚠️ The structure is the CHART's, not this screen's. Every one of these names
 * is a row somebody set up in the chart of accounts, so what the balance sheet
 * shows and what the accountant filed agree by construction rather than by a
 * mapping kept in step by hand.
 */
export type ReportSection = {
  name?: string;
  groups?: ReportGroup[];
  columns?: ColumnTotals;
  total?: number | string;
  /** Set where the section carries a deduction — fixed assets and their depreciation. */
  has_contra?: boolean;
  cost?: number | string;
  cost_columns?: ColumnTotals;
  depreciation?: number | string;
  depreciation_columns?: ColumnTotals;
  net?: number | string;
};

export type ReportSections = {
  assets: ReportSection[];
  liabilities: ReportSection[];
  equity: ReportSection[];
};

/** Which side of the ledger a line's money stands on. */
export type SheetSide = "debit" | "credit";

/**
 * One line of the sheet as it reads top to bottom: a section announces itself,
 * its level-2 groups follow with their accounts, each closes on a subtotal,
 * and the section closes on a total. A row still opens its accounts.
 */
export type SheetLine =
  | { kind: "section"; label: string }
  | { kind: "subsection"; label: string }
  | { kind: "subtotal"; label: string; side: SheetSide; columns: ColumnTotals; indent?: boolean }
  | {
      kind: "item";
      key: string;
      serial: number;
      section: string;
      side: SheetSide;
      group: ReportGroup;
      label: string;
      itemCount: number;
      columns: ColumnTotals;
    }
  | {
      kind: "total";
      label: string;
      side: SheetSide;
      columns: ColumnTotals;
      strong?: boolean;
    };

export const toNum = (value: any) => {
  const parsed = Number(typeof value === "string" ? value.replace(/,/g, "") : value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatAmount = (amount: number) => {
  const formatted = thousandSeparator(Math.abs(amount));
  return amount < 0 ? `(${formatted})` : formatted;
};

const ZERO: ColumnTotals = { opening: 0, movement: 0, closing: 0 };

export const buildSheetLines = ({
  assets,
  liabilities,
  equity,
  sections,
  hasSections,
  totals,
}: {
  assets: ReportGroup[];
  liabilities: ReportGroup[];
  equity: ReportGroup[];
  sections: ReportSections;
  hasSections: boolean;
  totals: {
    assetsColumns: ColumnTotals;
    liabilitiesColumns: ColumnTotals;
    equityColumns: ColumnTotals;
  };
}): SheetLine[] => {
  const out: SheetLine[] = [];
  let serial = 0;

  const pushSection = (
    title: string,
    groups: ReportGroup[],
    side: SheetSide,
    totalLabel: string,
    columns: ColumnTotals,
  ) => {
    if (groups.length === 0) return;

    out.push({ kind: "section", label: title });

    groups.forEach((group, index) => {
      serial += 1;
      out.push({
        kind: "item",
        key: `${title}-${group.group_name || "group"}-${index}`,
        serial,
        section: title,
        side,
        group,
        label: group.group_name || "-",
        itemCount: (group.items || []).length,
        columns: {
          opening: toNum(group.opening),
          movement: toNum(group.movement),
          closing: toNum(group.closing || group.total),
        },
      });
    });

    out.push({ kind: "total", label: totalLabel, side, columns });
  };

  /**
   * One level-2 group: its heading, the groups under it, and a subtotal.
   *
   * ⚠️ A SECTION THAT DEDUCTS PRINTS THE SUM, NOT TWO LINES. Fixed assets are
   * shown as cost, less accumulated depreciation, net — the contra group is
   * NOT also listed among the others, because two lines at the same level
   * invite a reader to add them, and adding depreciation to cost is the one
   * mistake this layout exists to prevent.
   */
  const pushSubSection = (parent: string, section: ReportSection, side: SheetSide) => {
    const groups = section.groups ?? [];
    const shown = section.has_contra ? groups.filter((g) => !g.is_contra) : groups;

    if (groups.length === 0) return;

    out.push({ kind: "subsection", label: section.name || "-" });

    shown.forEach((group, index) => {
      serial += 1;
      out.push({
        kind: "item",
        key: `${parent}-${section.name}-${group.group_name || "group"}-${index}`,
        serial,
        section: parent,
        side,
        group,
        label: group.group_name || "-",
        itemCount: (group.items || []).length,
        columns: {
          opening: toNum(group.opening),
          movement: toNum(group.movement),
          closing: toNum(group.closing ?? group.total),
        },
      });
    });

    if (section.has_contra) {
      // Printed positive under a heading that already says Less, because
      // a bracketed negative under "Less" reads as a double negative.
      const dep = section.depreciation_columns ?? ZERO;

      out.push({
        kind: "subtotal",
        label: "Less: Accumulated Depreciation",
        side,
        indent: true,
        columns: {
          opening: -1 * toNum(dep.opening),
          movement: -1 * toNum(dep.movement),
          closing: -1 * toNum(dep.closing),
        },
      });

      out.push({
        kind: "subtotal",
        label: `Net ${section.name}`,
        side,
        columns: section.columns ?? ZERO,
      });

      return;
    }

    out.push({
      kind: "subtotal",
      label: `Total ${section.name}`,
      side,
      columns: section.columns ?? ZERO,
    });
  };

  const pushSectioned = (
    title: string,
    list: ReportSection[],
    side: SheetSide,
    totalLabel: string,
    columns: ColumnTotals,
  ) => {
    if (list.length === 0) return;

    out.push({ kind: "section", label: title });
    list.forEach((section) => pushSubSection(title, section, side));
    out.push({ kind: "total", label: totalLabel, side, columns });
  };

  if (hasSections) {
    pushSectioned("Assets", sections.assets, "debit", "Total Assets", totals.assetsColumns);
    pushSectioned("Liabilities", sections.liabilities, "credit", "Total Liabilities", totals.liabilitiesColumns);
    pushSectioned("Equity", sections.equity, "credit", "Total Equity", totals.equityColumns);
  } else {
    pushSection("Assets", assets, "debit", "Total Assets", totals.assetsColumns);
    pushSection("Liabilities", liabilities, "credit", "Liabilities Total", totals.liabilitiesColumns);
    pushSection("Equity", equity, "credit", "Equity Total", totals.equityColumns);
  }

  out.push({
    kind: "total",
    label: "Total Liabilities & Equity",
    side: "credit",
    strong: true,
    columns: {
      opening: totals.liabilitiesColumns.opening + totals.equityColumns.opening,
      movement: totals.liabilitiesColumns.movement + totals.equityColumns.movement,
      closing: totals.liabilitiesColumns.closing + totals.equityColumns.closing,
    },
  });

  return out;
};
