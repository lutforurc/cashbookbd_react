import React, { useLayoutEffect, useRef, useState } from 'react';

import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import type { StatementInstallment, StatementPlan, StatementReceipt } from './installmentStatement';

type Props = {
  plans: StatementPlan[];
  /** Heading over the letterhead. */
  title?: string;
  /** Type size of the tables, in px. */
  fontSize?: number;
};

/**
 * A4 at 96dpi, and the vertical room a `.print-page` actually gives its rows.
 *
 * PrintStyles sets a 6mm top margin and a 5mm bottom margin on the paper, and
 * a `.print-page` stands 1mm short of the rest (so a rounding overflow cannot
 * spill onto a sheet of its own) with 8mm of its own top padding. What is left
 * is the number below -- the height any page's content may occupy before the
 * next row would have to go over the fold.
 *
 *  THE WIDTH IS THE PAPER LESS THE SIDES THE STATEMENT ASKS FOR (8mm each).
 * It is used only to measure rows on screen; the printed page gets the same
 * width because PrintStyles drops the gutter when `sideMargin` is set.
 */
const MM_PX = 96 / 25.4;
const SIDE_MARGIN_MM = 8;
const PAGE_CONTENT_PX = (297 - 6 - 5 - 1) * MM_PX - 8 * MM_PX;
const BLOCK_GAP = 8;
const SAFETY_PX = 4;

/**
 * The most installment rows one sheet may carry -- the two tables together.
 * 50 means twenty-five down the left and twenty-five down the right; the last
 * page keeps only the rows it has and is never padded out to fifty.
 */
const MAX_ROWS_PER_PAGE = 50;

const CELL = 'border border-black px-1 py-[2px] align-top text-black';

/**
 * A schedule body cell. The two tables sit side by side and share each row's
 * height, so a one-line Paid row next to a three-line Partial row is centred
 * in the taller box rather than hanging from its top edge.
 */
const CELL_MIDDLE = 'border border-black px-1 py-[2px] align-middle text-black';

const money = (value: number) => thousandSeparator(Number(value) || 0);

type ScheduleBlock = {
  rows: StatementInstallment[];
  /** Rows that go in the left table; the rest continue in the right one. */
  leftCount: number;
};

type Page = {
  schedule?: ScheduleBlock;
  totals?: boolean;
  receipts?: StatementReceipt[];
  receiptStart?: number;
  planIndex?: number;
};

type Metrics = {
  header: number;
  scheduleHead: number;
  /** A blank padding row -- the shortest a schedule row gets. */
  scheduleRow: number;
  /**
   * The rendered height of every installment row. A row that stacks three
   * receipt dates is far taller than a Due row, and the page has to be added
   * up from the rows it really carries.
   */
  scheduleRowHeights: number[];
  footer: number;
  totals: number;
  receiptTitle: number;
  receiptHead: number;
  receiptRows: number[];
};

const fallbackMetrics = (fs: number): Metrics => {
  const row = Math.max(Math.round(fs * 1.5) + 5, 12);
  return {
    header: 96,
    scheduleHead: row,
    scheduleRow: row,
    scheduleRowHeights: [],
    footer: 20,
    totals: row + Math.round(Math.max(fs, 8) * 1.5) + 16,
    receiptTitle: 28,
    receiptHead: row,
    receiptRows: [],
  };
};

const near = (a: number, b: number) => Math.abs(a - b) < 0.5;

/**
 * Cut the statement into sheets using the heights measured on screen.
 *
 * The schedule comes first and is read down the left table then down the
 * right, so a sheet takes `rowsPerTable * 2` rows -- as many as the measured
 * body height holds, not a fixed twenty. Totals and the receipt history are
 * then offered the space that is left on that sheet, and only start a new one
 * when they genuinely do not fit.
 */
const buildPages = (plans: StatementPlan[], metrics: Metrics): Page[] => {
  const pages: Page[] = [];
  const rowH = Math.max(metrics.scheduleRow, 1);
  const headH = Math.max(metrics.scheduleHead, 1);
  const base = PAGE_CONTENT_PX - metrics.header - metrics.footer - SAFETY_PX;

  const startPage = (planIndex: number): Page => {
    const page: Page = { planIndex };
    pages.push(page);
    return page;
  };

  plans.forEach((plan, planIndex) => {
    let page = startPage(planIndex);
    let remaining = base;

    const installments = Array.isArray(plan.installments) ? plan.installments : [];

    // Each row's measured height, with a prefix sum so any page's slice can be
    // added up in one subtraction. A row carrying three receipt dates is much
    // taller than a Due row, and the page must be counted from what it holds.
    const heights = installments.map((_, index) =>
      Math.max(metrics.scheduleRowHeights[index] ?? rowH, 1),
    );
    const prefix = [0];
    heights.forEach((height) => prefix.push(prefix[prefix.length - 1] + height));

    const heightBetween = (start: number, count: number) => {
      const from = Math.max(0, Math.min(start, heights.length));
      const to = Math.max(from, Math.min(start + count, heights.length));
      return prefix[to] - prefix[from];
    };

    /**
     * How tall a page of `count` rows starting at `start` would stand. The two
     * tables are measured separately and the taller one decides the sheet;
     * blank padding rows are one line each.
     */
    const pageHeightFor = (start: number, count: number) => {
      const leftCount = Math.ceil(count / 2);
      const rightCount = count - leftCount;
      const renderedRows = Math.max(leftCount, rightCount, 1);

      const leftHeight = heightBetween(start, leftCount) + (renderedRows - leftCount) * rowH;
      const rightHeight =
        heightBetween(start + leftCount, rightCount) + (renderedRows - rightCount) * rowH;

      return BLOCK_GAP + headH + Math.max(leftHeight, rightHeight);
    };

    if (installments.length === 0) {
      page.schedule = { rows: [], leftCount: 0 };
      remaining -= BLOCK_GAP + headH + rowH;
    } else {
      let index = 0;

      while (index < installments.length) {
        if (index > 0) {
          page = startPage(planIndex);
          remaining = base;
        }

        const pageStart = index;

        // 50 rows a sheet at most -- and fewer only when those particular rows
        // genuinely stand taller than the paper. The cap is checked against
        // the rows' own measured heights, not against the tallest one.
        let take = Math.min(installments.length - index, MAX_ROWS_PER_PAGE);
        while (take > 1 && pageHeightFor(pageStart, take) > base) take -= 1;

        const rows = installments.slice(index, index + take);
        // Split the page's rows as evenly as they go: the left table takes the
        // extra one when the page's count is odd, and the right table is padded
        // by at most that single row so both tables end level.
        const leftCount = Math.ceil(rows.length / 2);

        page.schedule = { rows, leftCount };
        index += take;

        remaining -= pageHeightFor(pageStart, take);
      }
    }

    const totalsCost = BLOCK_GAP + metrics.totals;
    if (remaining >= totalsCost) {
      page.totals = true;
      remaining -= totalsCost;
    } else {
      page = startPage(planIndex);
      page.totals = true;
      remaining = base - totalsCost;
    }

    const receipts = Array.isArray(plan.receipts) ? plan.receipts : [];

    // The heading and the table below it are separated by their own mt-2, on
    // top of the block's own gap -- counted here so a tight page does not push
    // the last receipt row over the fold.
    const receiptBase = BLOCK_GAP + 8 + metrics.receiptTitle + metrics.receiptHead;

    if (receipts.length === 0) {
      const cost = receiptBase + rowH;

      if (remaining < cost) {
        page = startPage(planIndex);
        remaining = base;
      }

      page.receipts = [];
      page.receiptStart = 0;
      remaining -= cost;
      return;
    }

    let receiptIndex = 0;

    while (receiptIndex < receipts.length) {
      let cost = receiptBase;
      const firstRowHeight = metrics.receiptRows[receiptIndex] ?? Math.max(rowH * 2, 24);

      if (remaining < cost + firstRowHeight) {
        page = startPage(planIndex);
        remaining = base;
      }

      const rows: StatementReceipt[] = [];
      const start = receiptIndex;

      while (receiptIndex < receipts.length) {
        const height = metrics.receiptRows[receiptIndex] ?? Math.max(rowH * 2, 24);

        // Always take the first row of a sheet, even if it is taller than the
        // space: a row that does not fit anywhere has to print somewhere, and
        // taking it prevents a loop that never advances.
        if (rows.length > 0 && cost + height > remaining) break;

        rows.push(receipts[receiptIndex]);
        cost += height;
        receiptIndex += 1;

        if (cost > remaining) break;
      }

      page.receipts = rows;
      page.receiptStart = start;
      remaining -= cost;

      if (receiptIndex < receipts.length) {
        page = startPage(planIndex);
        remaining = base;
      }
    }
  });

  if (pages.length === 0) {
    pages.push({ planIndex: 0, schedule: { rows: [], leftCount: 0 }, totals: true, receipts: [], receiptStart: 0 });
  }

  return pages;
};

const InstallmentStatementPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ plans, title = 'Installment Statement', fontSize = 8 }, ref) => {
    const list = Array.isArray(plans) ? plans : [];
    const firstPlan = list[0];
    const fs = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 8;
    const headSize = Math.max(fs - 1, 6);

    const [metrics, setMetrics] = useState<Metrics>(() => fallbackMetrics(fs));
    const metricsRef = useRef(metrics);

    const headerProbe = useRef<HTMLDivElement>(null);
    const scheduleHeadProbe = useRef<HTMLTableSectionElement>(null);
    const scheduleRowProbes = useRef<(HTMLTableRowElement | null)[]>([]);
    const footerProbe = useRef<HTMLDivElement>(null);
    const totalsProbe = useRef<HTMLDivElement>(null);
    const receiptTitleProbe = useRef<HTMLDivElement>(null);
    const receiptHeadProbe = useRef<HTMLTableSectionElement>(null);
    const receiptRowProbes = useRef<(HTMLTableRowElement | null)[]>([]);

    receiptRowProbes.current = [];
    scheduleRowProbes.current = [];

    useLayoutEffect(() => {
      const height = (element: Element | null) => (element ? element.getBoundingClientRect().height : 0);
      const fallback = fallbackMetrics(fs);

      const scheduleRowHeights = (firstPlan?.installments ?? []).map(
        (_, index) =>
          height(scheduleRowProbes.current[index]) ||
          metricsRef.current.scheduleRowHeights[index] ||
          fallback.scheduleRow,
      );

      // The blank padding row is the shortest shape the schedule takes; the
      // tallest measured row is the worst case for the page-capacity guard.
      const measured = scheduleRowHeights.filter((value) => value > 0);
      const shortest = measured.reduce((min, value) => Math.min(min, value), fallback.scheduleRow);

      const next: Metrics = {
        header: height(headerProbe.current) || fallback.header,
        scheduleHead: height(scheduleHeadProbe.current) || fallback.scheduleHead,
        scheduleRow: shortest,
        scheduleRowHeights,
        footer: height(footerProbe.current) || fallback.footer,
        totals: height(totalsProbe.current) || fallback.totals,
        receiptTitle: height(receiptTitleProbe.current) || fallback.receiptTitle,
        receiptHead: height(receiptHeadProbe.current) || fallback.receiptHead,
        receiptRows: receiptRowProbes.current.map(
          (probe, index) => height(probe) || metricsRef.current.receiptRows[index] || fallback.scheduleRow,
        ),
      };

      const prev = metricsRef.current;
      const changed =
        !near(prev.header, next.header) ||
        !near(prev.scheduleHead, next.scheduleHead) ||
        !near(prev.scheduleRow, next.scheduleRow) ||
        !near(prev.footer, next.footer) ||
        !near(prev.totals, next.totals) ||
        !near(prev.receiptTitle, next.receiptTitle) ||
        !near(prev.receiptHead, next.receiptHead) ||
        prev.scheduleRowHeights.length !== next.scheduleRowHeights.length ||
        next.scheduleRowHeights.some(
          (value, index) => !near(prev.scheduleRowHeights[index] ?? 0, value),
        ) ||
        prev.receiptRows.length !== next.receiptRows.length ||
        next.receiptRows.some((value, index) => !near(prev.receiptRows[index] ?? 0, value));

      if (changed) {
        metricsRef.current = next;
        setMetrics(next);
      }
    });

    const planLine = (plan: StatementPlan, planIndex: number, planCount: number) => (
      <div className="mt-1 text-center text-black" style={{ fontSize: Math.max(fs, 8) }}>
        <span className="font-semibold">Customer:</span> {plan.customerName || '-'}
        {plan.customerId ? ` (${plan.customerId})` : ''}
        <span className="mx-2">|</span>
        <span className="font-semibold">Plan / Unit:</span> {plan.planRef || '-'}
        {plan.unitRef ? ` - ${plan.unitRef}` : ''}
        <span className="mx-2">|</span>
        <span className="font-semibold">Sale Date:</span> {plan.saleDate}
        {planCount > 1 ? ` | Plan ${planIndex + 1} of ${planCount}` : ''}
      </div>
    );

    const headerBlock = (plan: StatementPlan, planIndex: number, planCount: number) => (
      <>
        <PadPrinting />
        <div className="text-center">
          <h1 className="text-xl font-bold text-black">{title}</h1>
          {planLine(plan, planIndex, planCount)}
        </div>
      </>
    );

    const totalsBlock = (plan: StatementPlan) => (
      <div className="text-black" style={{ fontSize: Math.max(fs, 8) }}>
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td className={`${CELL} font-semibold`}>Schedule Total</td>
              <td className={CELL} style={{ textAlign: 'right' }}>
                <span className="mr-1 font-semibold">Scheduled:</span> {money(plan.totals.scheduled)}
              </td>
              <td className={CELL} style={{ textAlign: 'right' }}>
                <span className="mr-1 font-semibold">Received:</span> {money(plan.totals.received)}
              </td>
              <td className={CELL} style={{ textAlign: 'right' }}>
                <span className="mr-1 font-semibold">Outstanding:</span> {money(plan.totals.remaining)}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mt-1 text-right">
          Paid: {plan.totals.paidCount} | Partial: {plan.totals.partialCount} | Due: {plan.totals.dueCount}
        </div>
      </div>
    );

    const receiptHeading = (plan: StatementPlan, planIndex: number, planCount: number) => (
      <div className="text-center">
        <h1 className="text-xl font-bold text-black">Receipt History</h1>
        {planLine(plan, planIndex, planCount)}
      </div>
    );

    const scheduleTable = (
      rows: StatementInstallment[],
      minRows: number,
      probe = false,
      onProbeRow?: (index: number, element: HTMLTableRowElement | null) => void,
    ) => {
      const rowCount = Math.max(rows.length, minRows, 1);

      // Two tables and one 6px gutter add up to the full width exactly, so
      // neither sheet can overflow into the printer's dead margin. The
      // Remaining column is a touch narrower than before, and the room it gave
      // up is shared by the figures either side of it.
      return (
        <table
          className="border-collapse text-black"
          style={{ width: 'calc(50% - 3px)', tableLayout: 'fixed' }}
        >
          <colgroup>
            <col style={{ width: '9%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '19%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '26%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead ref={probe ? scheduleHeadProbe : undefined}>
            <tr>
              <th className={CELL} style={{ fontSize: headSize }}>Inst</th>
              <th className={CELL} style={{ fontSize: headSize }}>Due Date</th>
              <th className={CELL} style={{ fontSize: headSize, textAlign: 'right' }}>Scheduled</th>
              <th className={CELL} style={{ fontSize: headSize, textAlign: 'right' }}>Received</th>
              <th className={CELL} style={{ fontSize: headSize, textAlign: 'right' }}>Remaining</th>
              <th className={CELL} style={{ fontSize: headSize, textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, index) => {
              const row = rows[index];

              if (!row) {
                return (
                  <tr
                    key={`blank-${index}`}
                    ref={onProbeRow ? (element) => onProbeRow(index, element) : undefined}
                  >
                    {Array.from({ length: 6 }).map((__, cell) => (
                      <td key={cell} className={CELL_MIDDLE} style={{ fontSize: fs }}>&nbsp;</td>
                    ))}
                  </tr>
                );
              }

              return (
                <tr
                  key={`${row.installmentNo}-${index}`}
                  ref={onProbeRow ? (element) => onProbeRow(index, element) : undefined}
                >
                  <td className={CELL_MIDDLE} style={{ fontSize: fs, textAlign: 'center' }}>{row.installmentNo}</td>
                  <td className={CELL_MIDDLE} style={{ fontSize: fs, textAlign: 'center' }}>{row.dueDate}</td>
                  <td className={CELL_MIDDLE} style={{ fontSize: fs, textAlign: 'right' }}>{money(row.scheduled)}</td>
                  <td className={CELL_MIDDLE} style={{ fontSize: fs, textAlign: 'right' }}>{money(row.received)}</td>
                  {/* Paid shows when it was paid; Due keeps the plain amount.
                      A Partial row stacks the receipt date, a hairline rule and
                      what is still owed as three separate elements, so the
                      breaks are the same in the preview and on paper. */}
                  <td className={CELL_MIDDLE} style={{ fontSize: fs, textAlign: 'right' }}>
                    {row.receiptDates.length ? (
                      <>
                        {row.receiptDates.map((date, dateIndex) => (
                          <React.Fragment key={date}>
                            {dateIndex > 0 ? (
                              <span className="my-[1px] block border-t border-black" />
                            ) : null}
                            <span className="block leading-tight">{date}</span>
                          </React.Fragment>
                        ))}
                        {row.status === 'Partial' ? (
                          <>
                            <span className="my-[1px] block border-t border-black" />
                            <span className="block leading-tight">Due: {money(row.remaining)}</span>
                          </>
                        ) : null}
                      </>
                    ) : (
                      money(row.remaining)
                    )}
                  </td>
                  <td className={CELL_MIDDLE} style={{ fontSize: fs, textAlign: 'center' }}>{row.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    };

    const receiptTable = (
      rows: StatementReceipt[],
      startIndex: number,
      onProbeRow?: (index: number, element: HTMLTableRowElement | null) => void,
    ) => (
      <table className="w-full border-collapse text-black" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '4%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '8%' }} />
          {/* Installments Covered is a quarter narrower than it was (24% ->
              18%) and the whole of that 6% now belongs to Allocations, which
              carries the longer text. The heading and the lists wrap inside
              their cell rather than widening it. */}
          <col style={{ width: '18%' }} />
          <col style={{ width: '36%' }} />
        </colgroup>
        <thead ref={onProbeRow ? receiptHeadProbe : undefined}>
          <tr>
            <th className={CELL} style={{ fontSize: headSize }}>#</th>
            <th className={CELL} style={{ fontSize: headSize }}>Date</th>
            <th className={CELL} style={{ fontSize: headSize }}>Receipt No</th>
            <th className={CELL} style={{ fontSize: headSize, textAlign: 'right' }}>Amount</th>
            <th className={CELL} style={{ fontSize: headSize }}>Mode</th>
            <th
              className={`${CELL} whitespace-normal break-words`}
              style={{ fontSize: headSize, width: '18%' }}
            >
              Installments Covered
            </th>
            <th
              className={`${CELL} whitespace-normal break-words`}
              style={{ fontSize: headSize, width: '36%' }}
            >
              Allocations
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((receipt, index) => (
              <tr
                key={receipt.key || `${receipt.receiptNo}-${startIndex + index}`}
                ref={onProbeRow ? (element) => onProbeRow(index, element) : undefined}
              >
                <td className={CELL} style={{ fontSize: fs, textAlign: 'center' }}>{startIndex + index + 1}</td>
                <td className={CELL} style={{ fontSize: fs, textAlign: 'center' }}>{receipt.date}</td>
                <td className={CELL} style={{ fontSize: fs, textAlign: 'center' }}>{receipt.receiptNo}</td>
                <td className={CELL} style={{ fontSize: fs, textAlign: 'right' }}>{money(receipt.amount)}</td>
                <td className={CELL} style={{ fontSize: fs }}>{receipt.mode || '-'}</td>
                <td
                  className={`${CELL} whitespace-normal break-words`}
                  style={{ fontSize: fs, width: '18%' }}
                >
                  {receipt.covers || '-'}
                </td>
                <td
                  className={`${CELL} whitespace-normal break-words`}
                  style={{ fontSize: fs, width: '36%' }}
                >
                  {receipt.allocations
                    .map((allocation) => `Inst ${allocation.installmentNo}: ${money(allocation.applied)}`)
                    .join('; ')}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className={CELL} colSpan={7} style={{ fontSize: fs, textAlign: 'center' }}>
                No receipts recorded against this plan.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );

    const pages = buildPages(list, metrics);

    return (
      <div ref={ref} className="relative p-8 text-black print-root" style={{ color: '#000' }}>
        <PrintStyles accent="black" sideMargin={SIDE_MARGIN_MM} />

        {/* Measurements, taken on screen and never printed. The schedule row,
            table head, heading and receipt rows are the real markup at the real
            width, so the paginator works from heights rather than guesses. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: '2rem',
            right: '2rem',
            height: 0,
            overflow: 'hidden',
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {firstPlan ? (
            <>
              <div ref={headerProbe}>{headerBlock(firstPlan, 0, list.length)}</div>

              <div className="flex items-start justify-between gap-[6px]">
                {/* Every row is measured, not a sample: an installment with
                    three receipt dates is three lines tall, and only its own
                    height tells the paginator how much of the sheet it takes.
                    The same column widths as the printed table are used. */}
                {scheduleTable(
                  firstPlan.installments,
                  firstPlan.installments.length,
                  true,
                  (index, element) => {
                    scheduleRowProbes.current[index] = element;
                  },
                )}
              </div>

              <div ref={totalsProbe}>{totalsBlock(firstPlan)}</div>

              <div ref={receiptTitleProbe}>{receiptHeading(firstPlan, 0, list.length)}</div>
              {receiptTable(firstPlan.receipts, 0, (index, element) => {
                receiptRowProbes.current[index] = element;
              })}
            </>
          ) : null}

          <div ref={footerProbe}>
            <PrintFooter page={1} total={1} />
          </div>
        </div>

        {pages.map((page, pageIndex) => {
          const isLast = pageIndex === pages.length - 1;
          const pagePlan = list[page.planIndex ?? 0] ?? firstPlan;
          const planIndex = page.planIndex ?? 0;
          const renderedRows = page.schedule
            ? Math.max(page.schedule.leftCount, page.schedule.rows.length - page.schedule.leftCount, 1)
            : 0;

          return (
            <div
              key={`page-${pageIndex}`}
              className={`print-page ${!isLast ? 'page-break' : ''}`}
            >
              {pagePlan ? headerBlock(pagePlan, planIndex, list.length) : null}

              {page.schedule ? (
                <div className="mt-2 flex items-start justify-between gap-[6px] text-black">
                  {scheduleTable(page.schedule.rows.slice(0, page.schedule.leftCount), renderedRows)}
                  {scheduleTable(page.schedule.rows.slice(page.schedule.leftCount), renderedRows)}
                </div>
              ) : null}

              {page.totals && pagePlan ? <div className="mt-2">{totalsBlock(pagePlan)}</div> : null}

              {page.receipts && pagePlan ? (
                <div className="mt-2 text-black">
                  {receiptHeading(pagePlan, planIndex, list.length)}
                  <div className="mt-2">{receiptTable(page.receipts, page.receiptStart ?? 0)}</div>
                </div>
              ) : null}

              <PrintFooter page={pageIndex + 1} total={pages.length} />
            </div>
          );
        })}
      </div>
    );
  },
);

InstallmentStatementPrint.displayName = 'InstallmentStatementPrint';
export default InstallmentStatementPrint;
