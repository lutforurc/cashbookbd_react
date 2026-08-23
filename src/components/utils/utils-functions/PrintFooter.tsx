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

const footSize = (fontSize?: number) =>
  Number.isFinite(fontSize) ? Math.min(fontSize as number, FOOT_SIZE) : FOOT_SIZE;

const PrintFooter: React.FC<Props> = ({ page, total, fontSize, fixed, note, hidePrintedAt, className = '' }) => (
  <>
    {fixed ? (
      <style>{`
        @media print {
          .print-footer-fixed {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            margin-top: 0;
          }
        }
      `}</style>
    ) : null}
    <div
      style={{ fontSize: footSize(fontSize) }}
      className={
        'mt-auto flex shrink-0 items-end justify-between gap-4 border-t border-gray-400 pt-1 text-black ' +
        (fixed ? 'print-footer-fixed ' : '') +
        className
      }
    >
      <span className="text-left">
        <ReportFooter inline />
      </span>
      {hidePrintedAt ? null : (
        // Read at render, which for a print is the moment the sheet is made.
        <span className="whitespace-nowrap text-center">
          Printed: {chartDateTime(new Date().toISOString())}
        </span>
      )}
      {page ? (
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
