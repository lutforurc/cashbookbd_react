/**
 * The foot under an invoice's Product Details table: the Quantity column and
 * the Total column added up, and nothing else.
 *
 *   node _invoice_product_totals_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. The request is narrow on purpose -- "sum only Quantity
 * and Total" -- and there are two places it has to hold and two ways it can
 * quietly go wrong.
 *
 *   On the paper, the Print Template Designer's table already knows how to
 *   foot itself; what it must not do is foot EVERY column of numbers. Its
 *   foot reads the totals map by name, so `qty` and `amount` come to something
 *   and the rate beside them (six identical prices) comes to nothing -- and
 *   that is the property being pinned here, together with the default being ON
 *   for the four invoice papers and the built-in default alone not reaching a
 *   layout a tenant has already saved.
 *
 *   On the screen, every invoice and return screen now draws the same row, so
 *   it is asserted to be on all of them, wired to the right two columns of each
 *   one's own table -- and the arithmetic is checked to be the screen's own
 *   `qty * price`, not a sum of its own that would disagree with the "Total Tk."
 *   figure printed on the same page.
 *
 * printTemplate.ts imports nothing at all, so node runs it as it stands (v24
 * strips the types). Nothing here touches React.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultTemplate, normalizeTemplate } from './src/components/utils/print-designer/printTemplate.ts';

const read = (path) => readFileSync(path, 'utf8');

/* ══════════════════════════════════════════════════════════════════════════ */
/* 1. The paper: four invoice papers foot by default, and only Quantity/Money  */
/* ══════════════════════════════════════════════════════════════════════════ */

const INVOICE_DOC_TYPES = ['sales_invoice', 'purchase_invoice', 'sales_return', 'purchase_return'];

for (const docType of INVOICE_DOC_TYPES) {
  const table = defaultTemplate(docType).bands.find((band) => band.type === 'table');

  assert.ok(table, `${docType} has no product table`);
  assert.equal(table.totalRow, true, `${docType}'s product table does not foot`);

  const fields = table.columns.map((column) => column.field);

  // The two columns the foot must fill. `qty` and `amount` are the keys the
  // totals map carries, so footOf() resolves them and leaves the rest blank.
  assert.ok(fields.includes('qty'), `${docType}'s table has no Quantity column to foot`);
  assert.ok(fields.includes('amount'), `${docType}'s table has no Total column to foot`);

  // ⚠️ The rate column is present and must NOT be footed -- it is not in the
  // totals map, which is the whole reason the foot says only what it should.
  assert.ok(fields.includes('price'), `${docType}'s table lost its rate column`);
}

/* ⚠️ A tenant's SAVED layout keeps its own answer. The change is to the
   built-in default, exactly as every other default on this designer is --
   switching the row on inside `normalizeTemplate` would add a line to every
   invoice already drawn in the system on its next print. */
const savedWithoutTotal = normalizeTemplate(
  {
    bands: [
      {
        id: 'table',
        type: 'table',
        columns: [{ field: 'qty' }, { field: 'amount' }],
      },
    ],
  },
  'sales_invoice',
);
assert.equal(
  savedWithoutTotal.bands.find((band) => band.type === 'table').totalRow,
  false,
  'a saved layout with no total row was given one -- history would change under the tenant',
);

const savedWithTotal = normalizeTemplate(
  {
    bands: [
      {
        id: 'table',
        type: 'table',
        totalRow: true,
        columns: [{ field: 'qty' }, { field: 'amount' }],
      },
    ],
  },
  'sales_invoice',
);
assert.equal(
  savedWithTotal.bands.find((band) => band.type === 'table').totalRow,
  true,
  "a saved layout that asked for the total row lost it",
);

/* ══════════════════════════════════════════════════════════════════════════ */
/* 2. The screen: the row is on every invoice and return screen                */
/* ══════════════════════════════════════════════════════════════════════════ */

/**
 * Every screen with a Product Details table, and the two columns of THE SAME
 * table the foot has to land on. `columnCount` is how many columns that table
 * draws, so the label and the blank cells fill it exactly -- `qtyColumn + 2`
 * is the Total (the rate sits between them) and two more columns follow it
 * (the rate's money column is not one; the Action column and, on the trading
 * screens, the weight variance are).
 */
const screens = [
  // Sales -- 6 columns: Sl. No. | Product | Quantity | Rate | Total | Action
  ['src/components/modules/invoices/sales/ElectronicsBusinessSales.tsx', 6, 2, 4],
  ['src/components/modules/invoices/sales/GeneralBusinessSales.tsx', 6, 2, 4],
  ['src/components/modules/invoices/sales/TilesBusinessSales.tsx', 6, 2, 4],
  ['src/components/modules/invoices/sales/CompanySchemeSales.tsx', 6, 2, 4],
  // Trading sales carries the weight variance: 7 columns, Quantity at 3.
  ['src/components/modules/invoices/sales/TradingBusinessSales.tsx', 7, 3, 5],
  // Sales return
  ['src/components/modules/invoices/sales/GeneralBusinessSalesReturn.tsx', 6, 2, 4],
  ['src/components/modules/invoices/sales/TilesBusinessSalesReturn.tsx', 6, 2, 4],
  // Purchase
  ['src/components/modules/invoices/purchase/ElectronicsBusinessPurchase.tsx', 6, 2, 4],
  ['src/components/modules/invoices/purchase/ConstructionBusinessPurchase.tsx', 6, 2, 4],
  ['src/components/modules/invoices/purchase/TilesBusinessPurchase.tsx', 6, 2, 4],
  ['src/components/modules/invoices/purchase/TradingBusinessPurchase.tsx', 7, 3, 5],
  // Purchase return
  ['src/components/modules/invoices/purchase/ConstructionBusinessPurchaseReturn.tsx', 6, 2, 4],
  ['src/components/modules/invoices/purchase/TilesBusinessPurchaseReturn.tsx', 6, 2, 4],
];

for (const [path, columnCount, qtyColumn, totalColumn] of screens) {
  const source = read(path);
  const name = path.split('/').pop();

  // The geometrical sanity the prop list cannot be trusted without.
  assert.equal(
    totalColumn,
    qtyColumn + 2,
    `${name}: the Total column is not the one after the rate`,
  );
  assert.equal(
    columnCount,
    totalColumn + 2,
    `${name}: the foot cannot fill a table it has not counted right`,
  );

  assert.ok(
    /import ProductTotalsRow from '\.\.\/\.\.\/\.\.\/utils\/utils-functions\/ProductTotalsRow';/.test(source),
    `${name} does not use the shared totals row`,
  );

  assert.ok(
    /<\/tbody>\s*<tfoot>\s*<ProductTotalsRow/.test(source),
    `${name} has no tfoot foot on its product table`,
  );

  for (const prop of [`columnCount={${columnCount}}`, `qtyColumn={${qtyColumn}}`, `totalColumn={${totalColumn}}`]) {
    assert.ok(
      source.includes(prop),
      `${name} does not pass ${prop} to the totals row`,
    );
  }

  // ⚠️ And it is fed the SAME list the screen draws -- a foot over a stale or
  // partial list is a wrong figure under a right one.
  assert.ok(
    /<ProductTotalsRow\s+products=\{formData\.products\}/.test(source),
    `${name} does not sum the products the table draws`,
  );

  // The row is worth nothing if the screen's own total came out somewhere else.
  // Every screen sums its lines the same way (Company Scheme's own figure is
  // this sum plus its charges, less its discount -- the line half is the same).
  assert.ok(
    /formData\.products\.reduce\(\s*\(sum, row\) => sum \+ Number\(row\.qty\) \* Number\(row\.price\),\s*0,?\s*\)/.test(
      source,
    ),
    `${name}'s own total is not the sum of qty * price over its lines`,
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* 3. The row itself: two columns, the screen's arithmetic, nothing when empty */
/* ══════════════════════════════════════════════════════════════════════════ */

const totalsRow = read('src/components/utils/utils-functions/ProductTotalsRow.tsx');

// The quantity and the money -- the two, and no third.
assert.ok(
  /products\.reduce\(\(sum, row\) => sum \+ \(Number\(row\?\.qty\) \|\| 0\), 0\)/.test(totalsRow),
  'the foot does not add the quantity column up',
);
assert.ok(
  /products\.reduce\(\s*\(sum, row\) => sum \+ Number\(row\?\.qty\) \* Number\(row\?\.price\),\s*0,\s*\)/.test(
    totalsRow,
  ),
  'the foot does not add the money up as the screens do',
);

// Rendered through the app's own number format, both of them.
assert.equal(
  (totalsRow.match(/thousandSeparator\(/g) || []).length,
  2,
  'the two figures are not both rendered through the app number format',
);

// Every other column is left empty rather than filled with a figure.
assert.ok(/blank-\$\{index\}/.test(totalsRow), 'the foot fills columns it has no total for');

// An empty table draws no foot at all.
assert.ok(
  /if \(!products\?\.length\) return null;/.test(totalsRow),
  'an empty product list would print a total of nothing',
);

// The label takes the columns before the first figure, so the figures land
// under the columns they foot.
assert.ok(
  /const labelSpan = Math\.max\(1, qtyColumn\);/.test(totalsRow),
  'the label does not take the columns before the quantity',
);

console.log(`ok -- ${INVOICE_DOC_TYPES.length} papers, ${screens.length} screens foot Quantity and Total`);
