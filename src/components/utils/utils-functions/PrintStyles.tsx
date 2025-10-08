// components/PrintStyles.tsx
import React from 'react';

const PrintStyles = () => (
         <style>
          {`
            @media print {
                @page {
                size: A4 portrait;
                margin: 6mm 8mm 8mm 10mm; /* you already have this */
                }

                /* You already have these: */
                .no-print { display: none !important; }
                .page-break { page-break-after: always; }
                .avoid-break { break-inside: avoid; }
                .print-root { padding: 0 !important; }
                .print-page { padding: 8mm !important; }

                /* NEW: make each printed page a flex column, and ensure it fills the printable area */
                .print-page {
                display: flex;
                flex-direction: column;

                /* Page content height = 297mm (A4 height) 
                    - top margin (6mm) - bottom margin (8mm)
                    - top padding (8mm) - bottom padding (8mm) */
                min-height: calc(297mm - 6mm - 8mm - 8mm - 8mm);
                }

                /* Optional: remove default top margins from headings */
                h1, h2, h3 { margin-top: 0; }
            }
        `}
        </style>
);

export default PrintStyles;
