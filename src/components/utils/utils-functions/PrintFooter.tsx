import React from 'react';
import ReportFooter from './ReportFooter';
import { chartDateTime } from './formatDate';

type Props = {
  /** 1-based page number. Left out, the right-hand side stays empty. */
  page?: number;
  /** How many pages the document has. */
  total?: number;
  /**
   * The report's own type size. Capped at FOOT_SIZE on the way in -- see below.
   */
  fontSize?: number;
  /**
   * Pin it to the foot of every printed sheet.
   *
   * For a report that leaves the page breaks to the browser and so cannot say
   * which page it is on. position:fixed is repainted on each printed page, so
   * the line appears on all of them -- with the page count left off, because
   * nothing here can count pages the browser decided on.
   */
  fixed?: boolean;
  /** Added after the page count -- the challan's `continued`, for one. */
  note?: string;
  /**
   * Leave the print time off.
   *
   * For a sheet that already carries one of its own, so it is not stamped
   * twice with two readings a second apart.
   */
  hidePrintedAt?: boolean;
  className?: string;
};

/**
 * The line every printed report ends its pages with.
 *
 * One rule: the software's name and number on the left, when the sheet was
 * printed in the middle, the page count on the right. Reports used to say this
 * two ways -- a page number of their own and a centred ReportFooter pinned to
 * the bottom of the sheet -- which is two different feet on two different
 * reports filed side by side.
 *
 * The print time used to sit at the top right of the letterhead, level with
 * the order rate and the amount. A reader looking there for a figure met a
 * timestamp first. It belongs with the page count instead: both are facts
 * about the sheet rather than about the business on it, and a reader asking
 * "is this the latest copy?" knows to look at the foot.
 *
 * The wording of the left half is still ReportFooter's: it reads the software
 * name and number from Settings, so changing them there changes every report.
 * What this adds is the arrangement, in one place, so a change to that reaches
 * every report too.
 *
 * `mt-auto` pushes it to the foot of a page that is a flex column with a height
 * -- which is what the print stylesheets set up. On a page that is neither, it
 * simply follows the last thing above it.
 */
/**
 * The size the foot settles at, and the most it is ever allowed.
 *
 * Reports set their own type size -- 8px for the dense ones that fit a wide
 * table on a page, 14px for the roomy ones -- and the foot used to follow it
 * exactly. Two reports filed side by side then carried the same line at two
 * sizes.
 *
 * A ceiling rather than a fixed number, because the foot must never be the
 * biggest thing on a page. It says which page this is and when it was printed;
 * a report whose own figures are set at 8px would be shouted down by a 10px
 * line underneath them. So the roomy reports come down to 10 and settle there
 * together, and the dense few keep their own smaller size.
 */
const FOOT_SIZE = 10;

/**
 * The band held clear at the foot of every sheet for a pinned line.
 *
 * The line is at most 10px of type over a 1px rule and 4px of padding -- a
 * shade under 4mm, but only because of `leading-none` below. 6mm is that with
 * room to spare. Change one and the other has to follow.
 */
const FOOT_RESERVE = '6mm';

const footSize = (fontSize?: number) =>
  Number.isFinite(fontSize) ? Math.min(fontSize as number, FOOT_SIZE) : FOOT_SIZE;

const PrintFooter: React.FC<Props> = ({ page, total, fontSize, fixed, note, hidePrintedAt, className = '' }) => (
  <>
    {fixed ? (
      <style>{`
        @media print {
          /*
            ⚠️ THIS LINE IS POSITIONED AGAINST THE SHEET ACROSS, NOT DOWN.
            position:fixed is measured from the edge of the PAPER for left and
            right, so left:0 would run the line off the report's own left edge
            and into the strip the printer cannot reach. The margins come from
            PrintStyles, which is the only thing that still knows them.

            ⚠️ BUT bottom:0 IS THE CONTENT AREA'S EDGE, NOT THE PAPER'S, and
            this file used to claim the opposite. Measured in Chrome on
            2026-10-10: with a 5mm @page bottom margin the line's baseline lands
            7.03mm up from the paper -- which is a box sitting on the content
            edge at 5mm, exactly where the rows also stop. So the pinned line
            does NOT get a band of its own, and a full page of rows prints
            through it. That was the fault on Closing Stock Details.

            So the band is reserved HERE, once, for every report that pins the
            line -- see the body rule below. Reports used to do it themselves
            with a repeating <tfoot> spacer, and only the ones that had already
            been caught out had one: Cash Book and Cash & Bank Book printed
            their last row through the line. Keep this box short as well (see
            leading-none on the div, without which a 10px line carries a 20px
            box and eats 6.6mm instead of 4mm, more than the reserve).

            What is still true, and the reason it stays fixed: it is REPAINTED
            ON EVERY SHEET the document runs to, which is what a report that
            leaves its page breaks to the browser needs -- an in-flow footer is
            printed once, on the last sheet, because that is where the flow ends.
          */
          .print-footer-fixed {
            position: fixed;
            left: var(--print-page-left, 10mm);
            right: var(--print-page-right, 8mm);
            bottom: 0;
            margin-top: 0;
          }

          /*
            ⚠️ THE BAND THE PINNED LINE SITS IN, TAKEN OUT OF EVERY SHEET.
            A bottom padding on the body, with box-decoration-break: clone, is
            repeated at the foot of EACH printed fragment rather than once at
            the end -- so the rows stop ${FOOT_RESERVE} short of the content
            edge on every sheet, and the line sits in that gap. Measured in
            Chromium on 2026-11-17: without it the last row ran into the line;
            with it, clear on every sheet.

            The page block's min-height gives the same amount back
            (--print-footer-reserve, read by PrintStyles), so a one-sheet report
            stands exactly as tall as before and is not pushed onto a blank
            second sheet.

            Moving the line down into the @page margin instead does not work:
            Chromium clips it there and repaints it at the top of the next
            sheet. Measured, same day.
          */
          :root { --print-footer-reserve: ${FOOT_RESERVE}; }
          body {
            padding-bottom: ${FOOT_RESERVE} !important;
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
          }
        }
      `}</style>
    ) : null}
    <div
      style={{ fontSize: footSize(fontSize) }}
      className={
        // ⚠️ `leading-none` IS WHAT KEEPS THE PINNED LINE INSIDE ITS BAND.
        // PrintStyles reserves the bottom 5mm of the sheet as the @page margin,
        // and the footer is placed at bottom:0 -- the paper's own edge -- which
        // puts it inside that band. Left to inherit, though, it took the
        // report's own line-height (text-sm means 20px), so a 10px line was
        // carrying a 20px-tall box: 6.6mm of footer in a 5mm band, and the last
        // row printed through it. Seen on Closing Stock Details, 2026-10-10.
        // Measured in Chrome: 6.61mm inheriting, 3.97mm at leading-none.
        'leading-none mt-auto flex shrink-0 items-end justify-between gap-4 border-t border-gray-400 pt-1 text-black ' +
        (fixed ? 'print-footer-fixed ' : '') +
        className
      }
    >
      {/* ⚠️ The software line never wraps. Pinned to the sheet, the footer
          grows UPWARD when it wraps, straight into the band the @page margin
          left for content -- and it would do it on every sheet at once. */}
      <span className="whitespace-nowrap text-left">
        <ReportFooter inline />
      </span>
      {hidePrintedAt ? null : (
        // Read at render, which for a print is the moment the sheet is made.
        <span className="whitespace-nowrap text-center">
          Printed: {chartDateTime(new Date().toISOString())}
        </span>
      )}
      {/* ⚠️ A PINNED LINE CARRIES NO PAGE COUNT, even when it is handed one.
          The browser repaints it on every sheet, so it does not know which
          sheet it is standing on -- and a report that renders a copy per page
          block it cut itself would have those copies disagree, printing
          "Page 1 of 3" straight through "Page 2 of 3" on every sheet. A report
          that wants the count has to keep the line in the flow, where it
          belongs to one page block and knows which. */}
      {page && !fixed ? (
        <span className="whitespace-nowrap text-right">
          Page {page}
          {total ? ` of ${total}` : ''}
          {note ? ` ${note}` : ''}
        </span>
      ) : null}
    </div>
  </>
);

export default PrintFooter;
