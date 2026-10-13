/**
 * Stock Details: the group summary row's quantity and average rate.
 *
 *     set CHECK_ENTRY=_stock_details_group_summary_check.ts
 *     npx vite build --config vite.check.config.js && node dist-check/_stock_details_group_summary_check.js
 *
 * ⚠️ WHY THIS EXISTS
 *
 * Each group gets a summary line under its product rows: the total Stock Qty and
 * the group's average Rate. The average is QUANTITY-WEIGHTED (the owner's
 * choice) -- the group's value over its quantity -- so a row's size decides how
 * much it pulls the average. The arithmetic is done on unrounded totals and
 * rounded once for display, and a group with no quantity must read nought rather
 * than divide by zero. Run here against the same real function the screen uses.
 */
import { summariseStockGroup } from './src/components/modules/reports/closing-stock/groupSummary';

let pass = 0;
let fail = 0;

const check = (label: string, ok: boolean, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  ok    ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
  }
};

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

console.log('Stock Details — group summary\n');

// ── Quantity total ─────────────────────────────────────────────────────────
const plain = summariseStockGroup([
  { qty: 10, value: 100 },
  { qty: 90, value: 900 },
]);
check('the group quantity is the sum of its rows', plain.qty === 100, String(plain.qty));
check('the group value is the sum of its rows', plain.value === 1000, String(plain.value));
check('value 1000 over quantity 100 reads a rate of 10', close(plain.avgRate, 10), String(plain.avgRate));

// ── Weighted, not a plain mean of the rates ────────────────────────────────
// Rows: 1000 @ 10 and 1 @ 500. A simple mean would read 255; the size of each
// row must decide its pull.
const skewed = summariseStockGroup([
  { qty: 1000, value: 10000 },
  { qty: 1, value: 500 },
]);
check('the group value is carried through', skewed.value === 10500, String(skewed.value));
check('the average is the value over the quantity', close(skewed.avgRate, 10500 / 1001), String(skewed.avgRate));
check('it is not the plain mean of the row rates (255)', Math.round(skewed.avgRate) !== 255, String(skewed.avgRate));

// ── Unrounded, then rounded for display ────────────────────────────────────
const thirds = summariseStockGroup([
  { qty: 1, value: 10 / 3 },
  { qty: 1, value: 10 / 3 },
  { qty: 1, value: 10 / 3 },
]);
check('the division is done on unrounded totals', close(thirds.avgRate, 10 / 3), String(thirds.avgRate));
check('only the shown figure is rounded', Math.round(thirds.avgRate) === 3, String(thirds.avgRate));

// ── Empty groups never divide by zero ──────────────────────────────────────
const empty = summariseStockGroup([]);
check('an empty group has quantity 0', empty.qty === 0, String(empty.qty));
check('an empty group has value 0', empty.value === 0, String(empty.value));
check('an empty group has rate 0, not NaN', empty.avgRate === 0, String(empty.avgRate));

const noQty = summariseStockGroup([{ qty: 0, value: 100 }]);
check('a group with value but no quantity reads rate 0, not Infinity', noQty.avgRate === 0, String(noQty.avgRate));

// ── Part-consumed layers (fractional quantities) ───────────────────────────
const halves = summariseStockGroup([
  { qty: 0.5, value: 5 },
  { qty: 1.5, value: 12 },
]);
check('fractional quantities still total', halves.qty === 2, String(halves.qty));
check('and average on the real value', close(halves.avgRate, 8.5), String(halves.avgRate));

// ── A missing figure is treated as nothing, not NaN ────────────────────────
const dirty = summariseStockGroup([
  { qty: NaN, value: 10 },
  { qty: 2, value: 4 },
]);
check('a non-finite quantity is skipped', dirty.qty === 2, String(dirty.qty));
check('and the average stays a number', close(dirty.avgRate, 2), String(dirty.avgRate));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
