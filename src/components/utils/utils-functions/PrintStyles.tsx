// components/PrintStyles.tsx
import React from 'react';

const PrintStyles = () => (
         <style>
          {`
            @media print {
                @page {
                size: A4 portrait;
                /* small bottom margin so the footer can sit close to the paper edge */
                margin: 6mm 8mm 5mm 10mm;
                }

                /* You already have these: */
                .no-print { display: none !important; }
                .page-break { page-break-after: always; }
                .avoid-break { break-inside: avoid; }
                .print-root { padding: 0 !important; }
                /* top/side padding 8mm, small 2mm bottom padding so the footer sits low */
                .print-page { padding: 8mm 8mm 2mm 8mm !important; }

                /* NEW: make each printed page a flex column, and ensure it fills the printable area */
                .print-page {
                display: flex;
                flex-direction: column;

                /* Page content height = 297mm (A4 height)
                    - top margin (6mm) - bottom margin (5mm)
                    - top padding (8mm) - bottom padding (2mm)
                    - 1mm safety buffer.
                    The page fills almost the whole printable area so a footer placed
                    inside (via mt-auto) sits right at the bottom; the tiny buffer keeps a
                    sub-millimetre overflow from spilling onto a second page. */
                min-height: calc(297mm - 6mm - 5mm - 8mm - 2mm - 1mm);
                }

                /* Optional: remove default top margins from headings */
                h1, h2, h3 { margin-top: 0; }
            }
        `}
        </style>
);

export default PrintStyles;
