/**
 * The tiles purchase report's arithmetic, column for column with the paper
 * the shop keeps in Excel (docs/tiles_original_excel_report.xlsx).
 *
 * Nothing on the report is typed in. A purchase line holds only the pieces
 * bought and the net price paid per piece; everything else comes from the
 * product or its commission settings:
 *
 *   Box             pieces ÷ package_size (product_items.package_size)
 *   Co. Measurement SFT per box (product_items' new company measurement)
 *   SFT             Box × Co. Measurement
 *   Rate            worked BACK from the net price per piece:
 *                   (net/pc ÷ SFT per pc + Monthly + Quarterly + Offer) ÷ (1 − Broken%)
 *                   rounded to 2 decimals
 *   Broken          Rate × Broken% (0.75% on the paper)
 *   Monthly, Quarterly, Offer   Tk per SFT, from the product's settings
 *   Actual Price/SFT  Rate − Monthly − Broken − Quarterly − Offer
 *   Actual Price/pcs  Actual Price/SFT × SFT per piece
 *   Total           Actual Price/pcs × pieces
 *
 * A line missing any of those settings is not guessed at: missingFields()
 * names what is absent and the invoice is not shown.
 */

/** The paper's "Without Measurement" divisor. Kept as the shop's sheet has it. */
export const WITHOUT_MEASUREMENT_DIVISOR = 11.667;

export interface TilesPurchaseLine {
  code: string;
  size: string;
  /** Pieces bought (inventory_purchase_details.quantity). */
  quantity: number;
  /** Net price paid per piece (inventory_purchase_details.purchase_price). */
  purchasePrice: number;
  /** Pieces to a box (product_items.package_size). */
  packageSize: number | null;
  /** Company measurement, SFT per box. */
  companyMeasurement: number | null;
  /** Tk per SFT. */
  monthly: number | null;
  /** Tk per SFT. */
  quarterly: number | null;
  /** Percent of Rate, e.g. 0.75. */
  brokenPct: number | null;
  /** Tk per SFT. */
  offer: number | null;
}

export interface TilesPurchaseRow {
  code: string;
  size: string;
  box: number;
  companyMeasurement: number;
  sft: number;
  rate: number;
  withoutMeasurement: number;
  monthly: number;
  monthlyTotal: number;
  broken: number;
  brokenTotal: number;
  quarterly: number;
  quarterlyTotal: number;
  offer: number;
  offerTotal: number;
  invoice: number;
  actualPerSft: number;
  actualPerPcs: number;
  quantity: number;
  total: number;
}

const FIELD_NAMES: Record<string, string> = {
  packageSize: 'Package size (pcs per box)',
  companyMeasurement: 'Company measurement',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  brokenPct: 'Broken %',
  offer: 'Offer',
};

/** What a line lacks, by the name the shop knows it by. Empty when complete. */
export const missingFields = (line: TilesPurchaseLine): string[] =>
  Object.keys(FIELD_NAMES)
    .filter((key) => {
      const value = (line as any)[key];
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return true;
      // Both are divisors: a zero would put Infinity on the paper.
      return (key === 'packageSize' || key === 'companyMeasurement') && Number(value) <= 0;
    })
    .map((key) => FIELD_NAMES[key]);

const round2 = (n: number) => Math.round(n * 100) / 100;

/** One report row. Call only on a line missingFields() passed. */
export const computeRow = (line: TilesPurchaseLine): TilesPurchaseRow => {
  const pack = Number(line.packageSize);
  const perBox = Number(line.companyMeasurement);
  const monthly = Number(line.monthly);
  const quarterly = Number(line.quarterly);
  const offer = Number(line.offer);
  const brokenShare = Number(line.brokenPct) / 100;

  const box = line.quantity / pack;
  const sftPerPcs = perBox / pack;
  const sft = box * perBox;
  const rate = round2((line.purchasePrice / sftPerPcs + monthly + quarterly + offer) / (1 - brokenShare));
  const broken = rate * brokenShare;
  const actualPerSft = rate - monthly - broken - quarterly - offer;
  const actualPerPcs = actualPerSft * sftPerPcs;

  return {
    code: line.code,
    size: line.size,
    box,
    companyMeasurement: perBox,
    sft,
    rate,
    withoutMeasurement: (rate * perBox) / WITHOUT_MEASUREMENT_DIVISOR,
    monthly,
    monthlyTotal: sft * monthly,
    broken,
    brokenTotal: sft * broken,
    quarterly,
    quarterlyTotal: sft * quarterly,
    offer,
    offerTotal: sft * offer,
    invoice: sft * rate,
    actualPerSft,
    actualPerPcs,
    quantity: line.quantity,
    total: actualPerPcs * line.quantity,
  };
};

/** Column totals the paper carries: Box, SFT, the four commissions, Invoice, Quaty, Total. */
export const totalsOf = (rows: TilesPurchaseRow[]) =>
  rows.reduce(
    (t, r) => ({
      box: t.box + r.box,
      sft: t.sft + r.sft,
      monthlyTotal: t.monthlyTotal + r.monthlyTotal,
      brokenTotal: t.brokenTotal + r.brokenTotal,
      quarterlyTotal: t.quarterlyTotal + r.quarterlyTotal,
      offerTotal: t.offerTotal + r.offerTotal,
      invoice: t.invoice + r.invoice,
      quantity: t.quantity + r.quantity,
      total: t.total + r.total,
    }),
    { box: 0, sft: 0, monthlyTotal: 0, brokenTotal: 0, quarterlyTotal: 0, offerTotal: 0, invoice: 0, quantity: 0, total: 0 }
  );
