/**
 * Product Out: is the Reason field filled on a new slip, and left alone on one
 * that is already answered?
 *
 *     CHECK_ENTRY=_product_out_default_reason_check.ts npx vite build --config vite.check.config.js \
 *       && node dist-check/_product_out_default_reason_check.js
 *
 * Exit 0 when everything below holds.
 *
 * ⚠️ WHY THIS EXISTS. A new write-off used to open with the Reason picker blank
 * -- the placeholder "Why did it go?" -- and the clerk could not always tell
 * that it had to be answered. The fix opens the slip on the shop's own default
 * reason. The danger is the other direction: a default that overwrites a reason
 * already chosen, turning a slip the clerk meant as "Damage" into the first item
 * on the list. So both halves are pinned here -- the field fills when it is
 * empty, and only when it is empty.
 *
 * The two functions below are the whole decision. They are run against the
 * reason rows the API sends (`id`, `name`, `needs_party`, `sort`, `is_active`),
 * and ProductOut.tsx is read back to insist it still routes through them and
 * still sends the chosen reason to the server.
 */
import { readFileSync } from 'node:fs';
import { pickDefaultReasonId, resolveReasonId } from './src/components/modules/product-out/productOutSlice';

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

const read = (path: string) => readFileSync(path, 'utf8');

// The shop's list, in its own order. "Surface crack" is retired -- it explains
// the older slips, so it must never be the reason a new one opens on.
const REASONS = [
  { id: 3, name: 'Damaged', needs_party: 0, sort: 1, is_active: 1 },
  { id: 7, name: 'Lost in transit', needs_party: 0, sort: 2, is_active: 1 },
  { id: 9, name: 'Swapped back to a customer', needs_party: 1, sort: 3, is_active: 1 },
  { id: 2, name: 'Surface crack', needs_party: 0, sort: 4, is_active: 0 },
];

/* ══════════════════════════════════════════════════════════════════════════ */
/* 1. Creating -- the empty field gets the shop's default                      */
/* ══════════════════════════════════════════════════════════════════════════ */

console.log('Creating a new slip\n');

check(
  'a blank reason on a new slip is filled from the shop list',
  resolveReasonId('', REASONS) === '3',
  resolveReasonId('', REASONS),
);
check(
  'the default is the first reason still offered, not the retired one',
  pickDefaultReasonId(REASONS) === '3',
  pickDefaultReasonId(REASONS),
);
check(
  "the field is a real reason id the backend will accept -- never 'Product Out'",
  resolveReasonId('', REASONS) !== '' && resolveReasonId('', REASONS) !== 'Product Out',
);

// The shop's order is what decides the default, not the order the rows happen
// to arrive in -- a reordered list still defaults to the first offered row.
const reordered = [...REASONS].reverse();
check(
  'a reordered list still defaults to its first offered row',
  pickDefaultReasonId(reordered) === '9',
  pickDefaultReasonId(reordered),
);

// A list where the flag is absent (older rows) must not blank the field.
const noFlag = [{ id: 11, name: 'Damaged' }];
check(
  'a list with no is_active flag still defaults to its first row',
  pickDefaultReasonId(noFlag) === '11',
  pickDefaultReasonId(noFlag),
);

/* ══════════════════════════════════════════════════════════════════════════ */
/* 2. Editing -- a reason already on the form is never overwritten            */
/* ══════════════════════════════════════════════════════════════════════════ */

console.log('\nEditing an existing slip\n');

check(
  'a saved reason is preserved, whatever the default would be',
  resolveReasonId('9', REASONS) === '9',
  resolveReasonId('9', REASONS),
);
check(
  'a reason that is retired keeps its place on the old slip',
  resolveReasonId('2', REASONS) === '2',
  resolveReasonId('2', REASONS),
);
check(
  'a reason the list no longer carries is still left alone',
  resolveReasonId('99', REASONS) === '99',
  resolveReasonId('99', REASONS),
);
check(
  'the clerk changing the reason is what holds -- the default does not snap back',
  resolveReasonId('7', REASONS) === '7',
);

/* ══════════════════════════════════════════════════════════════════════════ */
/* 3. Nothing to default from -- the form stays blank, never throws           */
/* ══════════════════════════════════════════════════════════════════════════ */

console.log('\nNo reasons yet\n');

check('an empty list leaves the field blank', resolveReasonId('', []) === '');
check('a missing list leaves the field blank', resolveReasonId('', undefined as any) === '');
check(
  'a saved reason survives even when the list is missing',
  resolveReasonId('3', undefined as any) === '3',
);
check('pickDefaultReasonId tolerates a non-array', pickDefaultReasonId(null as any) === '');

/* ══════════════════════════════════════════════════════════════════════════ */
/* 4. The form is wired to this decision, and still sends the reason          */
/* ══════════════════════════════════════════════════════════════════════════ */

console.log('\nThe Product Out form\n');

const form = read('src/components/modules/product-out/ProductOut.tsx');
check(
  'the form uses the shared decision, not its own copy',
  /import \{[^}]*resolveReasonId[^}]*\} from '\.\/productOutSlice';/.test(form),
);
check(
  'the new-slip effect fills the reason only while it is empty',
  /resolveReasonId\(prev\.reasonId, reasons\)/.test(form) &&
    /next === prev\.reasonId \? prev : \{ \.\.\.prev, reasonId: next \}/.test(form),
);
check(
  'Reset All brings the default back, rather than a bare empty string',
  /reasonId: resolveReasonId\('', reasons\),/.test(form),
);
check(
  'the reason is submitted to the server in the payload',
  /reason_id:\s*Number\(formData\.reasonId\)/.test(form),
);
check(
  'the picker still lets the clerk change the chosen reason',
  /onChange=\{\(e: React\.ChangeEvent<HTMLSelectElement>\) =>[\s\S]{0,120}reasonId: e\.target\.value/.test(
    form,
  ),
);

/* ══════════════════════════════════════════════════════════════════════════ */
/* 5. The field is really on the screen -- labelled, drawn, reachable          */
/* ══════════════════════════════════════════════════════════════════════════ */

console.log('\nThe field on the screen\n');

check(
  'the form draws a Reason label',
  />Reason<\/label>/.test(form),
);
check(
  'the label is wired to a select named reasonId',
  /<Select[\s\S]{0,160}id="reasonId"[\s\S]{0,80}name="reasonId"/.test(form),
);
check(
  'the picker (not a hidden input) is what carries the value',
  /<Select[\s\S]{0,200}value=\{formData\.reasonId\}/.test(form),
);
check(
  'the picker draws one option per reason the shop keeps',
  /\{reasons\.map\(\(r\) => \([\s\S]{0,140}<option key=\{r\.id\} value=\{r\.id\}>/.test(form),
);
check(
  'the field is required before a slip can be saved',
  /if \(!formData\.reasonId\) \{[\s\S]{0,80}Please pick a reason/.test(form),
);

// The view flow: the slip that is read back and printed names the reason.
const printModal = read('src/components/modules/product-out/ProductOutPrintModal.tsx');
check(
  'the view / print slip shows the saved reason',
  /<b>Reason:<\/b> \{master\.reason_name \|\| '-'\}/.test(printModal),
);

// The route: /inventory/product-out renders this very component, so the field
// above is the one the user reaches.
const app = read('src/App.tsx');
const appRoutes = read('src/components/services/appRoutes.tsx');
check(
  'the Product Out screen is routed to the component carrying this field',
  /product_out: '\/inventory\/product-out'/.test(appRoutes) &&
    /<Route path=\{routes\.product_out\} element=\{<ProductOut \/>\} \/>/.test(app),
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
