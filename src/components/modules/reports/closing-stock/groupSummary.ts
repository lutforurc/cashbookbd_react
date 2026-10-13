/**
 * A group's summary figures for Stock Details: its total stock quantity and its
 * average rate.
 *
 * ⚠️ THE AVERAGE IS QUANTITY-WEIGHTED, not a plain mean of the rows' rates. It
 * is the group's value over its quantity -- total value ÷ total quantity -- so a
 * row brings its own size to the average: a group holding a thousand at 10 and
 * one at 500 reads about 10, not 255. (Owner's choice, 2026-10-12; there was no
 * established group-average formula in the report to reuse.)
 *
 * ⚠️ SUMMED, THEN DIVIDED. No figure is rounded before the division, so a
 * summary is never the sum of already-rounded lines; the caller rounds once, for
 * display. A group with no quantity has no average -- nought, not a division by
 * zero.
 */
export type StockGroupRow = { qty: number; value: number };

export const summariseStockGroup = (
  rows: StockGroupRow[],
): { qty: number; value: number; avgRate: number } => {
  let qty = 0;
  let value = 0;

  rows.forEach((row) => {
    const rowQty = Number(row?.qty);
    const rowValue = Number(row?.value);

    // A row missing either figure is left out whole: half a row would pull the
    // average with a quantity, or a value, that never existed.
    if (!Number.isFinite(rowQty) || !Number.isFinite(rowValue)) return;

    qty += rowQty;
    value += rowValue;
  });

  return { qty, value, avgRate: qty > 0 ? value / qty : 0 };
};
