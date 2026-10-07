/**
 * Branch > Invoice Setup > "Show Product Information in Ledger Details" is
 * wired end to end: saved from the branch form, read back into it, and honoured
 * on both ledgers -- on screen, on the bespoke paper, and through a saved print
 * layout. Unset is ON, so a branch that predates the switch is unchanged.
 *
 *   node _ledger_product_details_setting_check.mjs
 *
 * Exit 0 when it is.
 *
 * ⚠️ WHY THIS EXISTS. Every one of these joints fails silently. A screen that
 * stopped passing the flag prints the product lines; an adapter that ignored it
 * prints them inside a saved layout; the branch form that forgot to load it
 * shows the switch off and turns the column off on the next save. None of those
 * raises anything -- the report just quietly shows the wrong thing.
 *
 * Pure static reading of the files, so it runs on any node.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const BRANCH = 'src/components/modules/branch/AddBranch.tsx';
const PAIRS = [
  {
    name: 'Sales',
    screen: 'src/components/modules/reports/salesledger/SalesLedger.tsx',
    print: 'src/components/modules/reports/salesledger/SalesLedgerPrint.tsx',
    adapter: 'src/components/modules/reports/salesledger/salesLedgerDocumentData.ts',
  },
  {
    name: 'Purchase',
    screen: 'src/components/modules/reports/purchaseledger/PurchaseLedger.tsx',
    print: 'src/components/modules/reports/purchaseledger/PurchaseLedgerPrint.tsx',
    adapter: 'src/components/modules/reports/purchaseledger/purchaseLedgerDocumentData.ts',
  },
];

const KEY = 'ledger_show_product_details';

/* -- the branch form: the field exists, starts on, and is offered ---------- */

const branch = read(BRANCH);

assert.ok(
  new RegExp(`${KEY}:\\s*boolean`).test(branch),
  'the branch form has no typed field for the switch',
);
assert.ok(
  new RegExp(`${KEY}:\\s*true`).test(branch),
  'a new branch does not start with product information shown',
);
assert.ok(
  branch.includes('Show Product Information in Ledger Details'),
  'the switch is not labelled as asked',
);
assert.ok(
  new RegExp(`handleToggleFieldChange\\('${KEY}'`).test(branch),
  'the switch is not bound to the branch form state',
);
assert.ok(
  /ledger_show_product_details == null[\s\S]{0,80}toBooleanFlag\(b\.ledger_show_product_details\)/.test(branch),
  'reopening the branch does not load the saved switch (unset must read on)',
);

/* -- the screens read it, gate the product lines, and hand it to the paper - */

const readFlag = (source) =>
  new RegExp(
    `showProductDetails\\s*=[\\s\\S]{0,120}ledger_show_product_details \\?\\? '1'\\) !== '0'`,
  ).test(source);

for (const { name, screen, print, adapter } of PAIRS) {
  const screenSrc = read(screen);
  const printSrc = read(print);
  const adapterSrc = read(adapter);

  assert.ok(readFlag(screenSrc), `${name} Ledger screen does not read the branch switch (unset must read on)`);
  assert.ok(readFlag(printSrc), `${name} Ledger print does not read the branch switch`);

  // The product lines sit behind the flag; the account and the note do not.
  assert.ok(
    /showProductDetails &&[\s\S]{0,80}(details|purchase_master\?\.details|row\?\.sales_master)/.test(screenSrc),
    `${name} Ledger screen does not gate its product lines on the switch`,
  );
  assert.ok(
    /showProductDetails &&[\s\S]{0,80}details/.test(printSrc),
    `${name} Ledger print does not gate its product lines on the switch`,
  );

  // And the saved-layout path is told about it, so a designed print obeys too.
  assert.ok(
    /showProductDetails,\s*\}/.test(screenSrc),
    `${name} Ledger screen does not pass the switch to its document data`,
  );

  assert.ok(
    new RegExp(`${KEY}|showProductDetails`).test(adapterSrc) &&
      adapterSrc.includes('showProductDetails?: boolean'),
    `${name} document data has no switch option`,
  );
  assert.ok(
    /const productLines = showProductDetails === false \? \[\] : details\.map\(label\)/.test(adapterSrc),
    `${name} document data does not drop the product lines when the switch is off`,
  );
  assert.ok(
    /products: productLines,/.test(adapterSrc),
    `${name} document data still composes the products from every detail`,
  );
}

/* -- hiding the product information collapses the numbers onto one line ----- */

for (const { name, print } of PAIRS) {
  const src = read(print);

  // The Quantity, Rate and Total cells are gated on the switch too, beside the
  // product cell.
  const gated = src.match(/showProductDetails && details/g) || [];
  assert.ok(
    gated.length >= 3,
    `${name} Ledger print does not gate its numeric cells on the switch`,
  );

  // The per-detail maps stay for the switched-on case, so the three columns
  // still line up product by product.
  const maps = src.match(/details(?:\?)?\.map\(/g) || [];
  assert.ok(maps.length >= 4, `${name} Ledger print lost its numeric detail columns`);

  // With it off, the Total cell reads the invoice total once -- the gross
  // figure, with the discount left to its own column.
  assert.ok(
    /invoiceTotal \? thousandSeparator\(invoiceTotal\)|total \? thousandSeparator\(total\)/.test(src),
    `${name} Ledger print's Total cell does not fall back to the invoice total`,
  );
}

// A saved print layout draws its cells from the adapter's lines, so those
// collapse the same way: quantity and rate to a dash, the total to the invoice.
for (const { name, adapter } of PAIRS) {
  const src = read(adapter);

  assert.ok(
    /qty_lines: showProductDetails === false[\s\S]{0,40}\['-'\]/.test(src),
    `${name} document data does not collapse qty_lines to a dash`,
  );
  assert.ok(
    /rate_lines: showProductDetails === false[\s\S]{0,40}\['-'\]/.test(src),
    `${name} document data does not collapse rate_lines to a dash`,
  );
  assert.ok(
    /amount_lines: showProductDetails === false[\s\S]{0,80}thousandSeparator\(amount\)/.test(src),
    `${name} document data does not print the invoice total once`,
  );
}

/* -- the plain Ledger's own description tail obeys the same switch ---------- */

/**
 * ⚠️ THE API FILE IS READ LIVE, ACROSS THE REPO BOUNDARY, never from a copy
 * under `temp/`: a stale copy would let this pass while the server that answers
 * the screen did the opposite. The plain Ledger's Description carries the sold
 * items as text the SERVER composes into the row's name, so there is nothing on
 * the client to gate -- an unguarded append here prints the product list on a
 * branch that switched it off, and nothing raises.
 */
const api = read('../www/cashbook_api/app/Http/Controllers/Reports/ReportsController.php');

const ledgerStart = api.indexOf('public function checkEloquentQuery');
const ledgerBody = api.slice(ledgerStart, api.indexOf('public function', ledgerStart + 10));

assert.ok(ledgerBody.length > 0, 'checkEloquentQuery is gone from the API');

// The same meta key as the two ledgers -- one switch, three reports.
assert.ok(
  ledgerBody.includes(`'${KEY}'`),
  'the plain Ledger does not read the branch switch',
);
assert.ok(
  new RegExp(
    `hideItemBranches\\[\\(int\\) \\$setting->branch_id\\] = true`,
  ).test(ledgerBody),
  'the switch is not read per branch',
);
assert.ok(
  /trim\(\(string\) \$setting->meta_value\) !== ''[\s\S]{0,60}=== 0/.test(ledgerBody),
  'a branch nobody has asked would be read as switched off',
);

// The tail is still appended -- so the guard below cannot pass by deletion.
assert.ok(
  /salesItems\(\$mtmId\)/.test(ledgerBody),
  "the sale's own items are no longer appended at all",
);
// ⚠️ THE GUARD MUST RETURN, not merely mention the set: `false && isset(...)`
// reads as present to a looser pattern and appends the items anyway.
assert.ok(
  /if \(isset\(\$hideItemBranches\[\(int\) \$record->branch_id\]\)\) \{\s*return \$record;[\s\S]{0,400}salesItems\(\$mtmId\)/.test(
    ledgerBody,
  ),
  'the items are appended before the switch is looked at, or the switch does not stop them',
);

/* -- the product label no longer repeats a category the name already carries - */

const labelHelper = read('src/components/modules/reports/utils/ledgerProductLabel.ts');
assert.ok(
  /alreadyCarried/.test(labelHelper) && /toLowerCase\(\)/.test(labelHelper),
  'the shared ledger product label helper lost its "do not repeat the category" rule',
);

for (const { name, screen, print, adapter } of PAIRS) {
  assert.ok(
    read(screen).includes('ledgerProductLabel'),
    `${name} Ledger screen does not compose its product line through the shared label`,
  );
  assert.ok(
    read(print).includes('ledgerProductLabel'),
    `${name} Ledger print does not compose its product line through the shared label`,
  );
  assert.ok(
    read(adapter).includes('ledgerProductLabel'),
    `${name} document data does not compose its product line through the shared label`,
  );
}

console.log('ok -- the ledger product-details switch is stored, loaded, and honoured on both ledgers, their paper, and the plain Ledger\'s description');
