import React from "react";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import BusinessSummaryGrid, { buildBlocks } from "./BusinessSummaryGrid";
import type { BusinessSummaryData, Line } from "./BusinessSummaryGrid";

type Props = {
  data: BusinessSummaryData | null;
  branchName?: string;
  /** The months asked for, as the screen shows them: "Jan-26 to Dec-26". */
  period?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
  /** The column widths measured at this font size, from the screen. */
  measured?: ColumnMeasure | null;
};

// A4 landscape with PrintStyles' narrow margins, in CSS pixels (96 per inch).
// Content width: 297mm less 5mm + 4mm margins and 4mm + 4mm gutters.
export const PAGE_CONTENT_WIDTH_PX = 1050;
// Content height: 210mm less 6mm + 5mm margins and 1mm slack, less the 8mm
// padding above a page -- 190mm.
const PAGE_CONTENT_HEIGHT_PX = 718;
// What sits on a page besides the table, set high on purpose: the letterhead
// (its height depends on the branch's pad), the title block and the footer. A
// page that leaves a little empty is only untidy; one that runs over is wrong.
const RESERVED_PX = 130 + 70 + 34;

/**
 * The width one month (Opening + Closing) and the fixed columns need at this
 * type size, from the widest figures in the report.
 */
export const columnWidths = (lines: Line[], fs: number) => {
  let widest = 0;
  let longestName = 0;

  lines.forEach((line) => {
    if (line.kind === "section") return;
    const values =
      line.kind === "group"
        ? Object.values(line.row.months ?? {})
        : Object.values(line.values ?? {});
    const name = line.kind === "group" ? line.row.name : line.label;
    longestName = Math.max(longestName, name.length);
    values.forEach((v) => {
      widest = Math.max(
        widest,
        thousandSeparator(v.opening).length,
        thousandSeparator(v.closing).length
      );
    });
  });

  // Measured on the printed sheet: a figure such as 12,54,21,763 sets at about
  // 0.41em a character (the commas are narrow). Half an em leaves room to spare.
  const charPx = fs * 0.5;
  const numberCell = Math.max(widest, 7) * charPx + 15;
  const nameCell = Math.max(longestName * charPx + 15, 120);

  return { fixed: 40 + nameCell, perMonth: 2 * numberCell };
};

/**
 * How many months fit one sheet's width at this type size, and so how many
 * sheets the months are dealt out across.
 */
export type ColumnMeasure = { fixed: number; perMonth: number };

export const sheetPlan = (
  data: BusinessSummaryData | null,
  fs: number,
  measured?: ColumnMeasure | null
) => {
  const months = data?.months.length ?? 0;
  // The widths the table really takes, measured off a copy set at this size,
  // when the screen has one; the estimate otherwise.
  const { fixed, perMonth } =
    measured && measured.perMonth > 0
      ? measured
      : columnWidths(data ? buildBlocks(data).flat() : [], fs);
  const perSheet = Math.max(1, Math.floor((PAGE_CONTENT_WIDTH_PX * 0.98 - fixed) / perMonth));
  const sheets = Math.max(1, Math.ceil(months / perSheet));

  return { perSheet: Math.ceil(months / sheets) || perSheet, sheets };
};

/**
 * Cut the report into pages without splitting a section when it can be helped:
 * a section that does not fit what is left of a page starts the next one whole,
 * and only a section longer than a page is cut across pages.
 */
const paginate = (blocks: Line[][], capacity: number): Line[][] => {
  if (capacity <= 0) return [blocks.flat()];

  const pages: Line[][] = [];
  let current: Line[] = [];

  blocks.forEach((block) => {
    if (current.length + block.length <= capacity) {
      current = current.concat(block);
      return;
    }

    if (current.length) {
      pages.push(current);
      current = [];
    }

    if (block.length <= capacity) {
      current = block;
      return;
    }

    for (let i = 0; i < block.length; i += capacity) {
      const slice = block.slice(i, i + capacity);
      if (i + capacity >= block.length) {
        current = slice;
      } else {
        pages.push(slice);
      }
    }
  });

  if (current.length) pages.push(current);

  return pages;
};

const BusinessSummaryPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ data, branchName, period, title = "Business Summary", rowsPerPage = 0, fontSize, measured }, ref) => {
    // Twenty-six columns on one landscape sheet, so the type starts small.
    const wantedFs = Number.isFinite(fontSize) && Number(fontSize) > 0 ? Number(fontSize) : 8;

    // ⚠️ THE OPERATOR'S TYPE SIZE IS THE TYPE SIZE. It is never lowered to make
    // the months fit -- a bigger number has to print bigger. Months that do not
    // fit one sheet's width at this size are dealt out across further sheets
    // instead (Description repeated on each), the same count on every sheet.
    //
    // ⚠️ A TABLE WIDER THAN THE SHEET MAY NOT REACH THE BROWSER either: Chrome
    // answers a page that overflows sideways by shrinking the WHOLE page, and
    // the footer, pinned to the foot of a page box that has just been scaled
    // down, rises with it (139.7mm of a 210mm sheet, measured with twelve
    // months). The table is clipped to its box below, so that cannot start.
    const fs = wantedFs;
    const rowPx = fs * 1.5 + 9;
    const autoCapacity = Math.max(
      5,
      Math.floor(((PAGE_CONTENT_HEIGHT_PX - RESERVED_PX - 2 * rowPx) / rowPx) * 0.95)
    );
    const capacity = Number(rowsPerPage) > 0 ? Number(rowsPerPage) : autoCapacity;

    const allMonths = data?.months ?? [];
    const { perSheet: sheetSize, sheets: sheetCount } = sheetPlan(data, fs, measured);

    const pages: Array<{ lines: Line[]; data: BusinessSummaryData; monthRange: string }> = [];
    if (data) {
      for (let i = 0; i < sheetCount; i++) {
        const slice = allMonths.slice(i * sheetSize, (i + 1) * sheetSize);
        if (!slice.length) continue;
        const sliceData: BusinessSummaryData = { ...data, months: slice };
        const monthRange = sheetCount > 1 ? `${slice[0].label} to ${slice[slice.length - 1].label}` : "";
        paginate(buildBlocks(sliceData), capacity).forEach((lines) =>
          pages.push({ lines, data: sliceData, monthRange })
        );
      }
    }

    return (
      <div ref={ref} className="p-4 text-gray-900 print-root">
        <PrintStyles orientation="landscape" narrowMargins />

        {pages.map((page, pageIndex) => (
          // ⚠️ A FIXED HEIGHT AND THE FOOT PINNED TO IT. The page is exactly one
          // sheet tall and its footer is positioned against the bottom of that
          // box, so the software line sits at the foot of every sheet whatever
          // the rows above it do -- never in the middle of one.
          <div
            key={pageIndex}
            className="print-page"
            style={{
              position: "relative",
              height: "var(--print-page-height)",
              breakAfter: pageIndex !== pages.length - 1 ? "page" : undefined,
            }}
          >
            <PadPrinting />

            <div className="mb-3">
              <h1 className="text-center text-xl font-bold">{title}</h1>
              <div className="mt-1 text-xs">
                {branchName ? <span className="mr-4"><span className="font-semibold">Branch:</span> {branchName}</span> : null}
                <span><span className="font-semibold">Period:</span> {period ?? "-"}</span>
                {page.monthRange ? <span className="ml-4"><span className="font-semibold">Months:</span> {page.monthRange}</span> : null}
              </div>
            </div>

            <div style={{ overflow: "hidden", width: "100%" }}>
              <BusinessSummaryGrid data={page.data} lines={page.lines} print fontSize={fs} />
            </div>

            <div style={{ position: "absolute", left: "4mm", right: "4mm", bottom: 0 }}>
              <PrintFooter page={pageIndex + 1} total={pages.length} fontSize={fs} />
            </div>
          </div>
        ))}
      </div>
    );
  }
);

BusinessSummaryPrint.displayName = "BusinessSummaryPrint";

export default BusinessSummaryPrint;
