import React from 'react';
import ReportFooter from './ReportFooter';

type Props = {
  /** 1-based page number. Left out, the right-hand side stays empty. */
  page?: number;
  /** How many pages the document has. */
  total?: number;
  /** Matches the report's own type size. */
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
  className?: string;
};

/**
 * The line every printed report ends its pages with.
 *
 * One rule, the software's name and number on the left, the page count on the
 * right. Reports used to say this two ways -- a page number of their own and a
 * centred ReportFooter pinned to the bottom of the sheet -- which is two
 * different feet on two different reports filed side by side.
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
const PrintFooter: React.FC<Props> = ({ page, total, fontSize, fixed, note, className = '' }) => (
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
      style={fontSize ? { fontSize } : undefined}
      className={
        'mt-auto flex shrink-0 items-end justify-between gap-4 border-t border-gray-400 pt-1 text-gray-600 ' +
        (fixed ? 'print-footer-fixed ' : '') +
        className
      }
    >
      <span className="text-left">
        <ReportFooter inline />
      </span>
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
