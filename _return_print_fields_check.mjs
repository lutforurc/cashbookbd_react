/**
 * Every money field a RETURN paper asks for must be one the adapter answers.
 *
 *   node _return_print_fields_check.mjs
 *
 * Exit 0 when the two agree.
 *
 * ⚠️ WHY THIS EXISTS. A return paper is DERIVED from its invoice, so it asks for
 * the fields its invoice's totals band names -- and the two invoices name the
 * same money differently (sales: `grand_total` / `received_amount`, purchase:
 * `total_amount` / `paid_amount`). The adapter sent one of each pair, and each
 * omission reached the owner as a blank line on a real paper: first the money
 * line, then "Total Tk.". Three reports of one mistake is enough -- this reads
 * both files and says which fields would come out blank, before anyone prints.
 *
 * A field marked `hideIfEmpty` is skipped: it is absent on purpose and the band
 * drops it.
 */
import { readFileSync } from 'node:fs';

const DIR = 'src/components';
const TEMPLATE = `${DIR}/utils/print-designer/printTemplate.ts`;
const ADAPTER = `${DIR}/modules/vouchers/print_items/returnDocumentData.ts`;

/** The body of `const name = ... => ({ ... })`, up to the closing `});`. */
const fnBody = (source, name) => {
  const start = source.indexOf(`const ${name} = `);
  if (start < 0) throw new Error(`${name} not found`);
  const end = source.indexOf('\n});', start);
  if (end < 0) throw new Error(`${name} has no closing });`);
  return source.slice(start, end);
};

/**
 * The totals band's items: every `field: '...'` between `type: 'totals'` and the
 * end of that band's `items: [ ... ]`. `hideIfEmpty` is read per item, so the
 * items are split on the `{ field:` that opens each one.
 */
const totalsFields = (body) => {
  const bandStart = body.indexOf("type: 'totals'");
  if (bandStart < 0) return [];
  const itemsStart = body.indexOf('items: [', bandStart);
  const itemsEnd = body.indexOf(']', itemsStart);
  const items = body.slice(itemsStart, itemsEnd);

  return items
    .split('{ field:')
    .slice(1)
    .map((item) => {
      const field = item.match(/'([a-z0-9_]+)'/)?.[1];
      return field && !item.includes('hideIfEmpty') ? field : null;
    })
    .filter(Boolean);
};

/** The keys the adapter puts on `basic:`. */
const adapterKeys = (source) => {
  const basicStart = source.indexOf('basic: {');
  const basicEnd = source.indexOf('\n    },', basicStart);
  const body = source.slice(basicStart, basicEnd);

  return new Set(
    body
      .split('\n')
      .map((line) => line.match(/^\s{6}([a-z0-9_]+):/)?.[1])
      .filter(Boolean),
  );
};

const template = readFileSync(TEMPLATE, 'utf8');
const keys = adapterKeys(readFileSync(ADAPTER, 'utf8'));

let failed = 0;

for (const [docType, invoice] of [
  ['sales_return', 'salesInvoice'],
  ['purchase_return', 'purchaseInvoice'],
]) {
  const wanted = totalsFields(fnBody(template, invoice));
  const missing = wanted.filter((field) => !keys.has(field));

  console.log(`${docType}  (from ${invoice}())`);
  console.log(`  asks for : ${wanted.join(', ')}`);

  if (missing.length) {
    failed++;
    console.log(`  [FAIL] the adapter never sends: ${missing.join(', ')}`);
  } else {
    console.log('  [ OK ] every money line has a value to print');
  }
}

process.exit(failed ? 1 : 0);
