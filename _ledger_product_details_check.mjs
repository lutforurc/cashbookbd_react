/**
 * A Sales / Purchase Ledger's Product & Details cell must print the row's own
 * block -- the account, a product per line, the note -- and stay the tenant's to
 * arrange.
 *
 *   node _ledger_product_details_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. The ledger's column was once the invoice's COMPOSED
 * `product_lines`: a pattern over `{brand} {category} ...`, facts a ledger row
 * does not carry, so the cell composed to nothing and printed blank on every
 * row. The fix gives the ledger its own composed column over the adapter's own
 * keys (`{coa_name}` / `{products}` / `{notes}`), and this reads printTemplate.ts,
 * both adapters, the default layout and the preview sample to say so -- a rename
 * on either side, or the invoice key creeping back, fails here rather than on a
 * customer's paper.
 *
 * printTemplate.ts imports nothing at all, so node runs it as it stands (v24
 * strips the types). Nothing here touches React.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COMPOSED_DEFAULTS,
  DEFAULT_LEDGER_PRODUCT_PATTERN,
  LEDGER_PRODUCT_TOKENS,
  LEDGER_LINE_FIELDS,
  SALES_LEDGER_PRESETS,
  PURCHASE_LEDGER_PRESETS,
  PRODUCT_TOKENS,
  composedPattern,
  composeProduct,
  isComposedField,
  isStackedComposed,
} from './src/components/utils/print-designer/printTemplate.ts';

/* -- the column is offered, and it is not the invoice's composed key -------- */

const offered = LEDGER_LINE_FIELDS.map((field) => field.key);

assert.ok(offered.includes('product_details_lines'), 'no ready-made lines column');
assert.ok(offered.includes('product_details_flat'), 'no one-line column');
assert.ok(offered.includes('product_details_format'), 'no own-format column');
assert.ok(
  !offered.includes('product_lines'),
  'the invoice composed product key is still on the ledger -- it composes to nothing',
);

/* -- the own-format column is composed, stacks, and names the ledger's parts - */

assert.ok(isComposedField('product_details_format'), 'it is not read as a composed column');
assert.equal(
  composedPattern({ field: 'product_details_format' }),
  DEFAULT_LEDGER_PRODUCT_PATTERN,
);
assert.ok(
  isStackedComposed({ field: 'product_details_format' }),
  'a column left blank would print the block on one line',
);

/* -- its tokens are the adapter's keys, not the invoice's product facts ------ */

const tokens = LEDGER_PRODUCT_TOKENS.map((token) => token.key);
assert.deepEqual(tokens, ['coa_name', 'products', 'notes']);
for (const token of tokens) {
  assert.ok(
    !PRODUCT_TOKENS.some((entry) => entry.key === token),
    `the ledger shares "${token}" with the invoice's product facts`,
  );
}

/* -- the block, one entry per line ------------------------------------------ */

const row = {
  coa_name: 'MNS Enterprise',
  products: ['DORB', 'Western Agro Products Ltd.'],
  notes: 'Delivered by hand.',
};

assert.deepEqual(composeProduct(row, { field: 'product_details_format' }), [
  'MNS Enterprise',
  'DORB',
  'Western Agro Products Ltd.',
  'Delivered by hand.',
]);

// A part a row has not got leaves no blank line behind.
assert.deepEqual(
  composeProduct({ coa_name: '', products: ['DORB'], notes: '' }, { field: 'product_details_format' }),
  ['DORB'],
);

/* -- written inline, the same list closes onto one line ---------------------- */

const inline = { field: 'product_details_format', pattern: '{coa_name}: {products} [({notes})]' };
assert.ok(!isStackedComposed(inline), 'a one-line pattern was read as a stack');
assert.deepEqual(composeProduct(row, inline), [
  'MNS Enterprise: DORB Western Agro Products Ltd. (Delivered by hand.)',
]);

/* -- every composed column carries a default, and every default is composed -- */

for (const key of Object.keys(COMPOSED_DEFAULTS)) {
  assert.ok(isComposedField(key), `${key} carries a default but is not a composed column`);
}

/* -- both built-in layouts print the editable Product & Details column ------- */

const builtIn = [
  SALES_LEDGER_PRESETS[0].build(),
  PURCHASE_LEDGER_PRESETS[0].build(),
].map((template) => template.bands.find((band) => band.type === 'table'));

for (const table of builtIn) {
  const column = table.columns.find((entry) => entry.label === 'Product & Details');
  assert.ok(column, 'the default layout has no Product & Details column');
  assert.equal(column.field, 'product_details_format', 'the default column is not the editable one');
  assert.ok(isComposedField(column.field), 'the default column has no pattern box to edit');
}

/* -- a layout saved against the old composed key is retargeted --------------- */

const saved = {
  bands: [
    {
      type: 'table',
      columns: [
        { field: 'sl', width: 5 },
        { field: 'product_lines', label: 'Product & Details', width: 33, pattern: '{brand}' },
      ],
    },
  ],
};

// Imported here rather than at the top so the file reads in the order it runs.
const { normalizeTemplate } = await import(
  './src/components/utils/print-designer/printTemplate.ts'
);
const migrated = normalizeTemplate(saved, 'sales_ledger');
const migratedColumn = migrated.bands
  .find((band) => band.type === 'table')
  .columns.find((column) => column.label === 'Product & Details');
assert.equal(migratedColumn.field, 'product_details_format');
assert.equal(migratedColumn.pattern, undefined, 'the old key\'s pattern was carried over');

for (const docType of ['sales_ledger', 'purchase_ledger']) {
  const done = normalizeTemplate(saved, docType);
  const column = done.bands
    .find((band) => band.type === 'table')
    .columns.find((entry) => entry.label === 'Product & Details');
  assert.equal(column.field, 'product_details_format', `${docType} was not retargeted`);
}

/* -- the adapters fill the keys the pattern and the columns read ------------- */

const adapters = [
  'src/components/modules/reports/salesledger/salesLedgerDocumentData.ts',
  'src/components/modules/reports/purchaseledger/purchaseLedgerDocumentData.ts',
];

for (const path of adapters) {
  const source = readFileSync(path, 'utf8');

  // `product_lines` is the LEGACY name, still filled on purpose: a saved
  // layout that was never migrated keeps pointing at it, and DocumentPrint
  // draws these lines for a composed column whose pattern wrote nothing.
  for (const key of ['coa_name', 'products', 'product_details_lines', 'product_details_flat', 'product_lines']) {
    assert.ok(
      new RegExp(`(^|[\\s{,])${key}:`, 'm').test(source),
      `${path} never fills "${key}"`,
    );
  }
}

/* -- the designer's preview sample carries the same three keys --------------- */

const sample = readFileSync(
  'src/components/modules/settings/print-designer/sampleDocument.ts',
  'utf8',
);

for (const key of ['products', 'product_details_lines', 'product_details_flat']) {
  assert.ok(new RegExp(`(^|[\\s{,])${key}:`, 'm').test(sample), `the sample never fills "${key}"`);
}

assert.ok(
  !/(^|[\s{,])product_lines:/.test(sample),
  'the preview sample still fills the composed product_lines key',
);

console.log(
  `ok -- ${LEDGER_PRODUCT_TOKENS.length} tokens, default ${JSON.stringify(DEFAULT_LEDGER_PRODUCT_PATTERN)}`,
);
