// components/PrintStyles.tsx
import React from 'react';

const PrintStyles = () => (
  <style>
    {`
      @media print {
        @page { size: A4 portrait; margin: 6mm 8mm 8mm 10mm; }
        .no-print { display: none !important; }
        .page-break { page-break-after: always; }
        .avoid-break { break-inside: avoid; }
        .print-root { padding: 0 !important; }
        .print-page { 
          padding: 8mm !important; 
          display: flex; 
          flex-direction: column; 
          min-height: calc(297mm - 6mm - 8mm - 8mm - 8mm); 
        }
        h1,h2,h3 { margin-top: 0; }
      }
    `}
  </style>
);

export default PrintStyles;
