import React from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { businessBlocks, businessSections, sectionTotals } from './businessSummaryData';
import type { BusinessLine, BusinessMonthValue, BusinessSummaryData } from './businessSummaryData';
import { rl } from '../../../../i18n/reportLabel';
import { toLocalMonth } from '../../../../i18n/mapper';
import i18n from '../../../../i18n';

type Props = {
  title?: string;
  /** The months asked for, as the screen shows them: "Jan-26 to Dec-26". */
  period?: string;
  data: BusinessSummaryData | null;
  rowsPerPage?: number;
  fontSize?: number;
};

/**
 * Cut the running list into pages of `capacity` lines without splitting a
 * section when it can be helped: a section that does not fit what is left of a
 * page starts the next one whole, and only a section longer than a page is cut.
 * No capacity keeps the whole report on one page, as Group Report does.
 */
const paginate = (blocks: BusinessLine[][], capacity: number): BusinessLine[][] => {
  if (capacity <= 0) return [blocks.flat()];

  const pages: BusinessLine[][] = [];
  let current: BusinessLine[] = [];

  blocks.forEach((block) => {
    if (current.length + block.length <= capacity) {
      current = current.concat(block);
      return;
    }
    if (current.length) {
      pages.push(current);
      current = [];
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
  return pages.length ? pages : [[]];
};

// The printable width of an A4 landscape sheet under PrintStyles' margins and
// the page's own gutters, in CSS px: 297mm less 10mm + 8mm margins and 8mm +
// 8mm gutters.
const SHEET_WIDTH_PX = 994;
const DESCRIPTION_WIDTH_PX = 180;

// A figure's column: wide enough for the longest figure the report holds at
// this type size (about 0.46em a character, the commas being narrow) plus the
// cell's padding and rules. Group Report's own floor of 44px is kept while the
// months fit with it; twelve months of 24 columns do not, and then it goes.
const valueColumnWidth = (widestChars: number, fontSize: number, floor = 44) =>
  Math.max(floor, widestChars * fontSize * 0.46 + 10);

// Value columns on the sheet: Opening and Closing under the first month, then
// Closing alone -- each later month opens at the one before's closing.
const valueColumns = (months: number) => (months > 0 ? months + 1 : 0);

const columnFloor = (months: number) =>
  DESCRIPTION_WIDTH_PX + valueColumns(months) * 44 <= SHEET_WIDTH_PX * 0.98 ? 44 : 0;

const widestFigure = (data: BusinessSummaryData | null) =>
  businessSections(data).reduce((widest, section) => {
    const values = [
      ...section.rows.flatMap((row) => Object.values(row.months ?? {})),
      ...Object.values(data ? sectionTotals(data, section.key) : {}),
    ];
    return values.reduce(
      (w, v) => Math.max(w, thousandSeparator(v.opening).length, thousandSeparator(v.closing).length),
      widest,
    );
  }, 7);

/**
 * ⚠️ EVERY MONTH ON ONE LINE, the owner's rule: whatever run of months is asked
 * for prints across one sheet's width, never carried onto a second sheet. The
 * chosen type size is kept when they fit at it and lowered only as far as they
 * need when they do not. The table is laid out fixed and full width, so any
 * room left over is shared out across the columns and no strip is left blank
 * on the right.
 */
export const printFontSize = (data: BusinessSummaryData | null, wanted: number) => {
  const months = data?.months.length ?? 0;
  const widestChars = widestFigure(data);
  const floor = columnFloor(months);
  const available = SHEET_WIDTH_PX * 0.98;
  let fs = wanted;
  while (fs > 3 && DESCRIPTION_WIDTH_PX + valueColumns(months) * valueColumnWidth(widestChars, fs, floor) > available) {
    fs = Math.round((fs - 0.1) * 10) / 10;
  }
  return fs;
};

const BusinessSummaryPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ title = rl("Business Summary"), period, data, rowsPerPage = 0, fontSize }, ref) => {
    const wanted = Number.isFinite(fontSize) && Number(fontSize) > 0 ? Number(fontSize) : 9;
    const months = data?.months ?? [];
    const fs = printFontSize(data, wanted);
    const valueWidth = `${valueColumnWidth(widestFigure(data), fs, columnFloor(months.length))}px`;

    // Assets, Liabilities and Equity run on in one table, as on the screen.
    const pages = data ? paginate(businessBlocks(data), rowsPerPage) : [];

    const cell = 'border border-gray-900 px-1 py-1';
    const figure = (v: BusinessMonthValue | undefined, field: 'opening' | 'closing') =>
      v ? thousandSeparator(v[field]) : '-';

    const drawLine = (line: BusinessLine, index: number) => {
      if (line.kind === 'section') {
        return (
          <tr key={`section-${rl(line.title)}-${index}`} className="avoid-break bg-gray-100">
            <td colSpan={1 + valueColumns(months.length)} style={{ fontSize: fs }} className={`${cell} font-bold`}>
              {rl(line.title)}
            </td>
          </tr>
        );
      }

      if (line.kind === 'group') {
        const row = line.row;
        return (
          <tr key={`${row.side}-${row.name}`} className="avoid-break align-top">
            <td style={{ fontSize: fs }} className={cell}>{row.name}</td>
            {months.map((month, mi) => (
              <React.Fragment key={`${row.name}-${month.month}`}>
                {mi === 0 && <td style={{ fontSize: fs }} className={`${cell} text-right`}>{figure(row.months?.[month.month], 'opening')}</td>}
                <td style={{ fontSize: fs }} className={`${cell} text-right`}>{figure(row.months?.[month.month], 'closing')}</td>
              </React.Fragment>
            ))}
          </tr>
        );
      }

      return (
        <tr key={`total-${rl(line.label)}-${index}`} className="avoid-break font-bold">
          <td style={{ fontSize: fs }} className={`${cell} text-right`}>{rl(line.label)}</td>
          {months.map((month, mi) => (
            <React.Fragment key={`${rl(line.label)}-${month.month}`}>
              {mi === 0 && <td style={{ fontSize: fs }} className={`${cell} text-right`}>{figure(line.values[month.month], 'opening')}</td>}
              <td style={{ fontSize: fs }} className={`${cell} text-right`}>{figure(line.values[month.month], 'closing')}</td>
            </React.Fragment>
          ))}
        </tr>
      );
    };

    return (
      <div ref={ref} className="print-root p-8 text-sm text-gray-900">
        <PrintStyles orientation="landscape" />
        <style>
          {`
            @media print {
              .business-summary-print-page {
                min-height: var(--print-page-height) !important;
              }
            }
          `}
        </style>

        {data && pages.length && pages[0].length ? pages.map((pageLines, pageNumber) => (
          <div key={pageNumber} className="print-page business-summary-print-page">
            <PadPrinting />
            <div className="">
              <h1 className="text-center text-2xl font-bold">{rl(title)}</h1>
              <div className="flex items-center justify-end gap-4 text-xs">
                <div className="text-right">
                  <span className="font-semibold">{rl("Period:")}</span> {period || '-'}
                </div>
              </div>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: `${DESCRIPTION_WIDTH_PX}px` }} />
                  {months.map((month, mi) => (
                    <React.Fragment key={`${month.month}-cols`}>
                      {mi === 0 && <col style={{ width: valueWidth }} />}
                      <col style={{ width: valueWidth }} />
                    </React.Fragment>
                  ))}
                </colgroup>
                <thead className="bg-gray-100">
                  <tr>
                    <th rowSpan={2} style={{ fontSize: fs }} className={`${cell} text-left align-middle`}>
                      {rl("Description")}
                    </th>
                    {months.map((month, mi) => (
                      <th key={month.month} colSpan={mi === 0 ? 2 : 1} rowSpan={mi === 0 ? 1 : 2} style={{ fontSize: fs }} className={`${cell} text-center align-middle`}>
                        {i18n.language !== 'en' ? toLocalMonth(month.month, i18n.language) : month.label}
                        {mi > 0 && <div>{rl("Closing")}</div>}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {months.map((month, mi) => (
                      <React.Fragment key={`${month.month}-head`}>
                        {mi === 0 && <th style={{ fontSize: fs }} className={`${cell} text-center`}>{rl("Opening")}</th>}
                        {mi === 0 && <th style={{ fontSize: fs }} className={`${cell} text-center`}>{rl("Closing")}</th>}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>{pageLines.map(drawLine)}</tbody>
              </table>
            </div>

            <PrintFooter page={pageNumber + 1} total={pages.length} fontSize={fs} />

            {pageNumber !== pages.length - 1 && <div className="page-break" />}
          </div>
        )) : (
          <div className="print-page business-summary-print-page">
            <PadPrinting />
            <h1 className="text-center text-2xl font-bold">{rl(title)}</h1>
            <div className="mt-6 text-center text-sm text-gray-500">{rl("No data found")}</div>
          </div>
        )}
      </div>
    );
  },
);

BusinessSummaryPrint.displayName = 'BusinessSummaryPrint';
export default BusinessSummaryPrint;
