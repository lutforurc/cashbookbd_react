/**
 * Branch > Product Setup > "Stock: Brand->Group->Category->Item"
 * (`stock_report_type`) now drives the Product Stock report's grouping:
 *
 *   - ENABLED  -> ProductStock.tsx nests Brand -> Group -> Category -> Item,
 *                 keyed by the server's ids, on screen, on the bespoke paper
 *                 (StockBookPrint.tsx) and through a saved print layout
 *                 (productStockDocumentData.ts).
 *   - DISABLED -> ProductStockNormal.tsx keeps its straight Category listing,
 *                 untouched.
 *
 *   node _product_stock_brand_group_category_check.mjs
 *
 * Exit 0 when both branches hold.
 *
 * ⚠️ WHY THIS EXISTS. Every one of these joints fails silently: a screen that
 * stopped reading the switch draws the old flat report; a grouping that keyed by
 * name merges two records that share one; a bespoke paper that was not taught
 * the group level drops it and prints brand -> category as if nothing changed; a
 * backend that does not select the group sends an empty one and every product
 * falls into a single "Ungrouped" band. None of those raises anything -- the
 * report just quietly shows the wrong thing.
 *
 * Pure static reading of the files, so it runs on any node.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const BRANCH = 'src/components/modules/branch/AddBranch.tsx';
const INDEX = 'src/components/modules/reports/productstock/ProductStockIndex.tsx';
const SCREEN = 'src/components/modules/reports/productstock/ProductStock.tsx';
const NORMAL = 'src/components/modules/reports/productstock/ProductStockNormal.tsx';
const PRINT = 'src/components/modules/reports/productstock/StockBookPrint.tsx';
const ADAPTER = 'src/components/modules/reports/productstock/productStockDocumentData.ts';
const BACKEND = 'temp/ReportsController.php';

const KEY = 'stock_report_type';

/* -- the branch form still owns the switch (no duplicate setting) ---------- */

const branch = read(BRANCH);

assert.ok(
  new RegExp(`${KEY}:\\s*boolean`).test(branch),
  `the branch form has no typed field for ${KEY}`,
);
assert.ok(
  branch.includes('Stock: Brand->Group->Category->Item'),
  'the switch is not labelled as asked',
);
assert.ok(
  new RegExp(`handleToggleFieldChange\\('${KEY}'`).test(branch),
  'the switch is not bound to the branch form state',
);
assert.ok(
  new RegExp(`${KEY}:\\s*toBooleanFlag\\(b\\.${KEY}\\)`).test(branch),
  'reopening the branch does not load the saved switch',
);

/* -- the setting decides which report is drawn ----------------------------- */

const index = read(INDEX);

assert.ok(
  new RegExp(`settings(?:\\.|\\?\\.)+data(?:\\.|\\?\\.)+branch(?:\\.|\\?\\.)+${KEY}`).test(index),
  'the Product Stock index does not read the branch switch',
);
assert.ok(
  /ProductStock\s+\/|return\s+<ProductStock\s/.test(index),
  'the Product Stock index does not draw the grouped report',
);
assert.ok(
  /return\s+<ProductStockNormal\s/.test(index),
  'the Product Stock index no longer falls back to the straight report',
);

/* -- enabled branch: Brand -> Group -> Category, keyed by ids --------------- */

const screen = read(SCREEN);

assert.ok(
  screen.includes('buildBrandGroupCategoryRows'),
  'the grouped report does not build the brand/group/category rows',
);
assert.ok(
  /const isGroupRow = \(row: any\) => row\?\.__type === 'GROUP';/.test(screen),
  'the grouped report has no GROUP heading sentinel',
);
assert.ok(
  /__type: 'BRAND'/.test(screen) &&
    /__type: 'GROUP'/.test(screen) &&
    /__type: 'CAT'/.test(screen),
  'the grouped report does not weave all three heading levels',
);

// Keyed by id where the server sent one, by name only as the fallback.
assert.ok(
  /hasId\(row\?\.brand_id\)/.test(screen) &&
    /hasId\(row\?\.group_id\)/.test(screen) &&
    /hasId\(row\?\.category_id\)/.test(screen),
  'the grouped report does not key its levels by the server ids',
);

// ⚠️ NO PLACEHOLDER GROUP. An item with no group has no Group level at all --
// its category hangs straight off the brand, and nothing is called "Ungrouped".
assert.ok(!/'Ungrouped'/.test(screen), 'the screen still draws a placeholder "Ungrouped" group');
assert.ok(
  /const groupLabelOf = \(row: any\) => String\(row\?\.group_name \?\? ''\)\.trim\(\);/.test(screen),
  'the group name still has a fallback instead of reading the server name',
);
// Rows with no group are collected on the brand, not under a made-up group.
assert.ok(
  /ungrouped/.test(screen) &&
    /__type: 'CAT',\s*brand_name: brand\.label,\s*cat_name: cat\.label,/.test(screen),
  'items without a group are not placed straight under the brand on screen',
);

// The category heading spells out the whole path it hangs from.
assert.ok(
  /isCatRow\(row\)[\s\S]{0,400}row\.brand_name[\s\S]{0,200}row\.group_name[\s\S]{0,200}row\.cat_name/.test(
    screen,
  ),
  'the category heading does not print Brand -> Group -> Category',
);
assert.ok(
  /isGroupRow\(row\)[\s\S]{0,400}row\.brand_name[\s\S]{0,200}row\.group_name/.test(screen),
  'the group heading does not print Brand -> Group',
);

// The bespoke paper is handed the item rows only -- every heading is dropped.
assert.ok(
  /!isHeadingRow\(r\)\s*&&\s*!isGrandTotalRow\(r\)/.test(screen),
  'the grouped report does not keep the heading rows off the bespoke paper',
);

/* -- disabled branch: the straight report is untouched ---------------------- */

const normal = read(NORMAL);

assert.ok(
  normal.includes('buildCategoryWiseRows'),
  'the straight report lost its category-wise grouping',
);
assert.ok(
  !normal.includes('buildBrandGroupCategoryRows'),
  'the straight report was dragged into the brand/group/category grouping',
);
assert.ok(
  normal.includes('StockBookPrintNormal'),
  'the straight report no longer prints through its own paper',
);

/* -- the bespoke paper carries the group level ------------------------------ */

const print = read(PRINT);

assert.ok(
  print.includes("'GROUP_HEADER'"),
  'the bespoke paper has no group heading of its own',
);
assert.ok(
  /groupKeyOf\(/.test(print) &&
    /a\.group_name, b\.group_name/.test(print),
  'the bespoke paper does not group or sort its rows by group',
);
assert.ok(
  /const groupNameOf = \(row: StockRow\) => String\(row\.group_name \|\| ''\)\.trim\(\);/.test(print) &&
    /ungrouped/.test(print),
  'the bespoke paper has no "no group" path for the category to fall back to',
);
assert.ok(!/'Ungrouped'/.test(print), 'the bespoke paper still prints a placeholder "Ungrouped" group');
assert.ok(
  /row\.__type === 'GROUP_HEADER'[\s\S]{0,900}row\.brand_name[\s\S]{0,200}row\.group_name/.test(print),
  'the bespoke paper group heading does not print Brand -> Group',
);
assert.ok(
  /row\.__type === 'CAT_HEADER'[\s\S]{0,900}row\.brand_name[\s\S]{0,200}row\.group_name[\s\S]{0,200}row\.cat_name/.test(
    print,
  ),
  'the bespoke paper category heading does not print Brand -> Group -> Category',
);

/* -- a saved print layout nests the same way -------------------------------- */

const adapter = read(ADAPTER);

assert.ok(
  /row\.__type === 'GROUP'/.test(adapter),
  'the document adapter does not recognise a group heading',
);
assert.ok(
  /ancestors\.length - 1/.test(adapter),
  'the document adapter does not step a heading in by how deep it really is',
);
assert.ok(
  /group:\s*text\(row\?\.group_name\)/.test(adapter),
  'the document adapter does not carry the product row',
);
assert.ok(
  /row\.brand_name[\s\S]{0,200}row\.group_name[\s\S]{0,200}cat_name/.test(adapter),
  'the document adapter does not spell the group heading out of brand and group',
);
assert.ok(!/'Ungrouped'/.test(adapter), 'the document adapter still emits a placeholder "Ungrouped" group');

/* -- the server sends the group, so the nesting has something to stand on --- */

const backend = read(BACKEND);

assert.ok(
  /\$request->filled\('branch_id'\)/.test(backend) && /public function productStockData/.test(backend),
  'the product-stock query is no longer where it was',
);
// ⚠️ GUARDED, like `code`: `group_id` and the table arrive with a patch, and an
// unguarded join would stop the whole report on a database that has one but not
// the other.
assert.ok(
  /\$hasGroup = Schema::hasTable\('product_groups'\) && Schema::hasColumn\('product_items', 'group_id'\)/.test(backend),
  'the product-stock query does not guard the group join',
);
assert.ok(
  (backend.match(/->when\(\$hasGroup, fn\(\$q\) => \$q->leftJoin\('product_groups', 'product_groups\.id', '=', 'product_items\.group_id'\)\)/g) || []).length >= 2,
  'both halves of the union do not join the product groups',
);
assert.ok(
  /product_items\.group_id\)[^;]{0,40}as group_id/.test(backend) &&
    /product_groups\.name[^;]{0,40}as group_name/.test(backend) &&
    /product_items\.manufacture_id\)[^;]{0,40}as brand_id/.test(backend),
  'the product-stock query does not answer with the group and brand ids and the group name',
);
assert.ok(
  /'group_id'\s*=>\s*\$firstItem->group_id/.test(backend) &&
    /'group_name'\s*=>\s*\$firstItem->group_name/.test(backend) &&
    /'brand_id'\s*=>\s*\$firstItem->brand_id/.test(backend),
  'the product-stock query drops the group and brand ids before answering',
);

console.log(
  'ok -- the stock switch is stored and read; enabled branches nest Brand -> Group -> Category on screen, on the bespoke paper and through a saved layout, and disabled branches are unchanged',
);
