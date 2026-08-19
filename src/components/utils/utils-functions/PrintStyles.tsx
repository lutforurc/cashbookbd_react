import React from 'react';

type Props = {
  /** A4 the tall way unless a report says otherwise. */
  orientation?: 'portrait' | 'landscape';
};

/**
 * The printed page, described once.
 *
 * Every report used to declare its own `@page` -- twenty-eight of them, with
 * bottom margins from 5mm to 10mm -- so the same footer ended up a different
 * distance from the paper edge on each, and moving it meant finding it
 * twenty-eight times. This is that declaration, and a report should now import
 * it rather than write its own.
 *
 * The numbers below are the whole arrangement:
 *
 *   margin      6mm top, 5mm bottom, 10mm left and 8mm right. The left edge is
 *               the wider one because that is the edge that gets punched.
 *   padding     8mm around a page's content, and nothing at the bottom -- the
 *               5mm page margin is the gap under the footer, which is where the
 *               old fixed-position footer sat.
 *   min-height  the sheet less those margins and the top padding, less 1mm.
 *               The page fills the printable area, so a footer with `mt-auto`
 *               falls to the bottom of it; the millimetre keeps a rounding
 *               overflow from spilling onto a page of its own.
 */
const PrintStyles: React.FC<Props> = ({ orientation = 'portrait' }) => {
  const sheet = orientation === 'landscape' ? '210mm' : '297mm';

  return (
    <style>
      {`
        @media print {
          /* The last number is the gap under the footer -- the only thing
             below it is the edge of the paper. Change it here and every report
             moves together; nothing else in the app states it. */
          @page {
            size: A4 ${orientation};
            margin: 6mm 8mm 5mm 10mm;
          }

          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          .avoid-break { break-inside: avoid; }
          .print-root { padding: 0 !important; }

          /* The height a full page of content comes to, published as a
             variable so a report with a page class of its own -- a challan
             page, a landscape cash-and-bank page -- can stand exactly as tall
             without doing the arithmetic again. */
          :root {
            --print-page-height: calc(${sheet} - 6mm - 5mm - 8mm - 1mm);
          }

          .print-page {
            padding: 8mm 8mm 0 8mm !important;
            display: flex;
            flex-direction: column;
            min-height: var(--print-page-height);
          }

          h1, h2, h3 { margin-top: 0; }
        }
      `}
    </style>
  );
};

export default PrintStyles;
