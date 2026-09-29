/**
 * A Description (own format) column on the plain Ledger must write the parts
 * the adapter actually puts on the row.
 *
 *   node _ledger_description_format_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. The composed column resolves its tokens off the ROW by
 * key, and the keys it offers (DESCRIPTION_TOKENS) are the adapter's -- written
 * in a different file, spelled the same only because someone typed them twice.
 * A rename on either side is a column that prints an empty cell on every row
 * with nothing on screen to say why, which is the exact trap the ledger's
 * catalogue was trimmed for. The last two checks read both files and say so.
 *
 * printTemplate.ts imports nothing at all, so node runs it as it stands (v24
 * strips the types). Nothing here touches React.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COMPOSED_DEFAULTS,
  DEFAULT_DESCRIPTION_PATTERN,
  DESCRIPTION_TOKENS,
  LEDGER_REPORT_LINE_FIELDS,
  composedPattern,
  composeProduct,
  isComposedField,
  isStackedComposed,
} from './src/components/utils/print-designer/printTemplate.ts';

/* -- it is offered on the ledger at all ---------------------------------- */

const offered = LEDGER_REPORT_LINE_FIELDS.map((field) => field.key);
assert.ok(offered.includes('description_format'), 'the ledger offers no own-format description');
assert.ok(isComposedField('description_format'), 'it is not read as a composed column');

/* -- its default is the description, and it stacks ------------------------ */

const blank = { field: 'description_format' };
assert.equal(composedPattern(blank), DEFAULT_DESCRIPTION_PATTERN);
assert.ok(
  isStackedComposed(blank),
  'a column left blank would print the three parts on one line',
);

/* -- the parts, as the adapter writes them -------------------------------- */

const full = { name: 'Payment to Supplier', remarks: 'Against PO-2071', branch_name: 'Head Office' };
const bare = { name: 'Bank Charge', remarks: '', branch_name: '' };

assert.deepEqual(composeProduct(full, blank), ['Payment to Supplier', 'Against PO-2071', 'Head Office']);
assert.deepEqual(
  composeProduct(bare, blank),
  ['Bank Charge'],
  'a part a row has not got left a blank line behind',
);

/* -- written to order: one line, and an optional stretch ------------------ */

// The stretch is the brackets' own doing, not the resolver's: `[ ... ]` keeps
// what it holds and drops its own brackets, so "(...)" inside it still prints.
const own = { field: 'description_format', pattern: '{name} [({remarks})]' };
assert.ok(!isStackedComposed(own), 'a one-line pattern was read as a stack');
assert.deepEqual(composeProduct(full, own), ['Payment to Supplier (Against PO-2071)']);
assert.deepEqual(
  composeProduct(bare, own),
  ['Bank Charge'],
  'the stretch printed empty brackets instead of dropping whole',
);

/* -- every composed column has a default, and it is a real one ------------ */

for (const key of Object.keys(COMPOSED_DEFAULTS)) {
  assert.ok(isComposedField(key), `${key} carries a default but is not a composed column`);
}

/* -- the two files agree on the token names ------------------------------- */

const adapter = readFileSync(
  'src/components/modules/reports/ledger/ledgerDocumentData.ts',
  'utf8',
);
for (const token of DESCRIPTION_TOKENS) {
  assert.ok(
    new RegExp(`(^|[\\s{,])${token.key}[,:]`, 'm').test(adapter),
    `the ledger adapter never fills "${token.key}" -- the pattern would print blank`,
  );
}

/* -- nothing in the row is JSX -------------------------------------------- */

/**
 * ⚠️ THE RENDERER STRINGIFIES EVERY CELL (`String(raw)`), so a value that is a
 * React element prints the literal "[object Object]" -- not a crash, not a
 * blank, a wrong word in a column, which is how a date under every voucher
 * number read the first time this sheet was printed. `formatDate` is the JSX
 * one; `formatDayMonthYear` is the string, and it is what every other adapter
 * already calls. Checked by name because only one of the two is safe here.
 */
assert.ok(
  !/\bformatDate\s*\(/.test(adapter),
  'the ledger adapter calls formatDate, which returns JSX -- String() prints [object Object]',
);

console.log(
  `ok -- ${DESCRIPTION_TOKENS.length} tokens, all filled; dates are strings; default ${JSON.stringify(DEFAULT_DESCRIPTION_PATTERN)}`,
);
