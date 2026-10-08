/**
 * Trading dashboard: are the four top-product cards ranked and totalled right?
 *
 *     npx vite build --config vite.check.config.js && node dist-check/_trading_top_products_check.js
 *
 * ⚠️ WHY THIS EXISTS
 *
 * The dashboard used to draw one Top Sales and one Top Purchase card, both in
 * units, with money as a second column. It now draws four: each window ranked
 * by quantity on one card and by value on another. The risk the split moves is
 * that the value card is just the unit list re-sorted -- which is the whole
 * mistake the split exists to avoid, because the highest-value product is
 * routinely not on the unit list at all. So the two pure rules the cards use --
 * rankProducts and listedValue -- are run here against the row shape the
 * endpoint sends, on a window whose unit leader and money leader differ.
 */
import { listedValue, rankProducts } from './src/components/modules/dashboard/topProducts';

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

// Server rows: { id, name, qty, amount }. top_sales is the top five by units;
// top_sales_value is the top five by money and is a different set -- "Glass
// Panel" is nowhere in the unit list.
const topSales = [
  { id: 1, name: 'Cement Bag', qty: 400, amount: 24000 },
  { id: 2, name: 'Rod 12mm', qty: 300, amount: 45000 },
  { id: 3, name: 'Paint', qty: 250, amount: 20000 },
  { id: 4, name: 'Tiles', qty: 120, amount: 60000 },
  { id: 5, name: 'Sand', qty: 100, amount: 5000 },
];

const topSalesValue = [
  { id: 6, name: 'Glass Panel', qty: 40, amount: 90000 },
  { id: 4, name: 'Tiles', qty: 120, amount: 60000 },
  { id: 2, name: 'Rod 12mm', qty: 300, amount: 45000 },
  { id: 1, name: 'Cement Bag', qty: 400, amount: 24000 },
  { id: 3, name: 'Paint', qty: 250, amount: 20000 },
];

const topPurchase = [
  { id: 7, name: 'Bricks', qty: 5000, amount: 50000 },
  { id: 1, name: 'Cement Bag', qty: 800, amount: 48000 },
  { id: 8, name: 'Steel', qty: 200, amount: 80000 },
  { id: 9, name: 'Wire', qty: 150, amount: 30000 },
  { id: 10, name: 'Nails', qty: 100, amount: 6000 },
];

const topPurchaseValue = [
  { id: 8, name: 'Steel', qty: 200, amount: 80000 },
  { id: 7, name: 'Bricks', qty: 5000, amount: 50000 },
  { id: 1, name: 'Cement Bag', qty: 800, amount: 48000 },
  { id: 9, name: 'Wire', qty: 150, amount: 30000 },
  { id: 11, name: 'Bitumen', qty: 30, amount: 25000 },
];

const ids = (rows: any[]) => rows.map((row) => row.id).join(',');

console.log('Trading dashboard: the four top-product cards\n');

// ── Sales: the quantity card ────────────────────────────────────────────────
const salesQty = rankProducts(topSales, 'qty');
check('sales-by-quantity leads with the fastest-moving line', salesQty[0].id === 1, ids(salesQty));
check('sales-by-quantity is in descending units', ids(salesQty) === '1,2,3,4,5', ids(salesQty));
check(
  'the sales quantity card totals the units on it, and no money',
  listedValue(salesQty, 'qty') === 1170,
  String(listedValue(salesQty, 'qty')),
);

// ── Sales: the value card ───────────────────────────────────────────────────
const salesValue = rankProducts(topSalesValue, 'amount');
check('sales-by-value leads with the highest-value line', salesValue[0].id === 6, ids(salesValue));
check('sales-by-value is in descending money', ids(salesValue) === '6,4,2,1,3', ids(salesValue));
check(
  'the sales value card totals the money on it, and no units',
  listedValue(salesValue, 'amount') === 239000,
  String(listedValue(salesValue, 'amount')),
);

// ── The point of the split ──────────────────────────────────────────────────
check('the two sales cards lead with different products', salesQty[0].id !== salesValue[0].id);
check(
  'the sales value card is not the unit list re-sorted -- it holds a product the unit list does not',
  salesValue.some((row: any) => !topSales.some((unit: any) => unit.id === row.id)),
);
check(
  're-sorting the unit list by money would have missed the true leader',
  rankProducts(topSales, 'amount')[0].id !== salesValue[0].id,
  String(rankProducts(topSales, 'amount')[0].id),
);

// ── Purchase: the two cards ─────────────────────────────────────────────────
const purchaseQty = rankProducts(topPurchase, 'qty');
const purchaseValue = rankProducts(topPurchaseValue, 'amount');
check('purchase-by-quantity leads with the most-bought line', purchaseQty[0].id === 7, ids(purchaseQty));
check('purchase-by-value leads with the highest-value line', purchaseValue[0].id === 8, ids(purchaseValue));
check('the two purchase cards lead with different products', purchaseQty[0].id !== purchaseValue[0].id);
check(
  'the purchase value card holds a product the unit list does not',
  purchaseValue.some((row: any) => !topPurchase.some((unit: any) => unit.id === row.id)),
);
check(
  'the purchase quantity card totals the units on it, and no money',
  listedValue(purchaseQty, 'qty') === 6250,
  String(listedValue(purchaseQty, 'qty')),
);
check(
  'the purchase value card totals the money on it, and no units',
  listedValue(purchaseValue, 'amount') === 233000,
  String(listedValue(purchaseValue, 'amount')),
);

// ── Nothing is mutated, and an empty window stays empty ─────────────────────
const before = ids(topSales);
rankProducts(topSales, 'amount');
check('ranking does not reorder the array it was given', ids(topSales) === before);
check('an empty window ranks to nothing', rankProducts([], 'qty').length === 0);
check('an empty window totals to nought', listedValue([], 'amount') === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
