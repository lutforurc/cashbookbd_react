import type { TilesPurchaseLine } from './tilesPurchaseCalc';

/**
 * ⚠️ DEMO DATA. The report runs on this until the API serves it.
 *
 * Invoice ACR-30401 as krishibitandatabase holds it (voucher 9-261000323,
 * pieces and net price per piece exactly as stored), with the company
 * measurement and the four commissions copied from the shop's Excel, because
 * neither has anywhere to live yet. Line 7 is 12RK-704M, as the purchase has
 * it -- the Excel repeats 12RK-701M there by mistake.
 *
 * The second invoice is made up, to show what the report does with a product
 * whose settings are missing: it stops, and says which.
 */

export interface TilesPurchaseInvoice {
  mtmId: number;
  supplier: string;
  invoiceNo: string;
  invoiceDate: string; // YYYY-MM-DD
  lines: TilesPurchaseLine[];
}

const akij = (code: string, size: string, quantity: number, purchasePrice: number, packageSize: number, companyMeasurement: number, monthly: number, offer: number): TilesPurchaseLine => ({
  code, size, quantity, purchasePrice, packageSize, companyMeasurement, monthly, quarterly: 0.9, brokenPct: 0.75, offer,
});

export const DEMO_SUPPLIERS = [{ id: 7374, name: 'Akij Ceramics Ltd (Tiles)' }];

export const DEMO_INVOICES: TilesPurchaseInvoice[] = [
  {
    mtmId: 4157,
    supplier: 'Akij Ceramics Ltd (Tiles)',
    invoiceNo: 'ACR-30401',
    invoiceDate: '2026-10-24',
    lines: [
      akij('777LGR', '8*12', 800, 23.57, 25, 16.14, 1, 0.3),
      akij('777DGR', '8*12', 800, 23.57, 25, 16.14, 1, 0.3),
      akij('777HL', '8*12', 200, 23.57, 25, 16.14, 1, 0.3),
      akij('766DBE', '8*12', 800, 23.57, 25, 16.14, 1, 0.3),
      akij('6PGVT-CG111', '24*24', 448, 372.4, 4, 15.4945, 1, 4.1),
      akij('12RK-701M', '24*48', 70, 1428.3, 2, 15.4945, 5, 3.27),
      akij('12RK-704M', '24*48', 40, 1428.3, 2, 15.4945, 5, 3.27),
      akij('12PGVT-20', '24*48', 4, 1389.85, 2, 15.4945, 5, 3.27),
      akij('8PGVT-32', '32*32', 4, 852.74, 2, 13.7728, 1, 3.27),
      akij('3RT-30', '12*12', 52, 66.07, 13, 12.589, 1, 2.3),
      akij('30RK-PANORA-M104STP', '12*48', 100, 748.86, 4, 15.4945, 1, 3.27),
    ],
  },
  {
    mtmId: -1,
    supplier: 'Akij Ceramics Ltd (Tiles)',
    invoiceNo: 'DEMO-MISSING',
    invoiceDate: '2026-10-28',
    lines: [
      akij('777LGR', '8*12', 400, 23.57, 25, 16.14, 1, 0.3),
      { ...akij('12RK-704M', '24*48', 20, 1428.3, 2, 15.4945, 5, 3.27), companyMeasurement: null, offer: null },
    ],
  },
];
