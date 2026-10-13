/**
 * The totals footer: the lines belong to the TENANT, the Grand Total sits under
 * them, and a line may wait on another line.
 *
 *   node _totals_rule_control_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. The rule over "Net Tk." and "Due Tk." was baked into the
 * default layout and drawn as a `border-t` on the figure's own cells. Both
 * halves of that fail silently: a border on a cell cannot be given a margin,
 * and a flag the designer has no switch for cannot be taken off the paper --
 * the tenant's only escape was to abandon the default footer altogether, which
 * is why the owner's paper had lines he could not move and could not lose.
 *
 * The owner asked for that twice, once per invoice, and the second ask is the
 * one that catches a doc-type branch sneaking in: the middle of this file is
 * about the Sales change reaching the Purchase paper with no line of its own.
 *
 * The failure mode after the fix is quiet in the other direction too: if the
 * rule row is emitted AFTER the figure it is supposed to sit over, every sum on
 * the paper is underlined instead of topped, and nothing raises.
 *
 * Static reading of the files, as the other print checks are.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const doc = read('src/components/utils/print-designer/DocumentPrint.tsx');
const ed = read('src/components/modules/settings/print-designer/bandEditors.tsx');
const tpl = read('src/components/utils/print-designer/printTemplate.ts');

let checked = 0;
const check = (title, fn) => {
  fn();
  checked += 1;
  console.log(`  ok  ${title}`);
};

/* ------------------------------------------------------------------ */
/* The renderer                                                        */
/* ------------------------------------------------------------------ */

// The one region that decides all of this: from the `ruled` flag to the end of
// the figure row. Reading a slice rather than the whole file, so a `ruleAbove`
// mentioned in some other block cannot satisfy an assertion about this one.
const ruledAt = doc.indexOf('const ruled = item.ruleAbove && index > 0;');
const figureEnd = doc.indexOf('</React.Fragment>', ruledAt);
assert.ok(ruledAt > -1 && figureEnd > ruledAt, 'the ruled figure row is gone from TotalsBlock');
const row = doc.slice(ruledAt, figureEnd);

check('a rule over a figure is drawn only past the first line, never over the table', () => {
  assert.ok(
    row.includes('const ruled = item.ruleAbove && index > 0;'),
    'the index guard is gone -- the first total would be ruled off from the table above',
  );
});

check('the rule is a row of its own, emitted BEFORE the figure it sits over', () => {
  const ruleRow = row.indexOf('{ruled ? (');
  const figureRow = row.indexOf('<tr>', ruleRow);
  assert.ok(ruleRow > -1, 'the rule is no longer its own row');
  assert.ok(
    figureRow > ruleRow,
    'the rule row comes after the figure row -- every sum would be underlined, not topped',
  );
});

check('its two margins are the tenant’s, defaulting to nought', () => {
  // ⚠️ Nought, not RULE_SPACE. A paper saved before this control existed
  // carries no margins; six pixels of default air would move every such
  // paper's net line the first time it was opened.
  assert.ok(
    row.includes('paddingTop: `${item.ruleSpaceAbove ?? 0}px`'),
    'space above the rule defaults to something other than nought',
  );
  assert.ok(
    row.includes('paddingBottom: `${item.ruleSpaceBelow ?? 0}px`'),
    'space below the rule defaults to something other than nought',
  );
});

check('the rule spans the same columns the standalone Line does', () => {
  assert.ok(/<td\s+colSpan=\{3\}/.test(row), 'the rule no longer spans label, colon and value');
  assert.ok(
    row.includes('{footedTo ? <td /> : null}'),
    'the empty column on the left lost its cell -- the rule would start at the margin',
  );
});

check('solid or dashed, and the figure keeps none of the old border', () => {
  assert.ok(row.includes('border-t border-dashed border-gray-400'), 'the dashed style is gone');
  assert.ok(row.includes('border-t border-gray-800'), 'the solid style is gone');
  assert.ok(
    !/const rule = item\.ruleAbove/.test(doc),
    'the figure cells still carry a border -- the line would print twice',
  );
  assert.ok(
    row.includes('className="pr-3 text-right font-semibold"'),
    'the label cell still carries a rule class',
  );
});

check('a standalone Line keeps its own air, which is a different default', () => {
  assert.ok(
    doc.includes('${item.ruleSpaceAbove ?? RULE_SPACE}px'),
    'the standalone Line lost its RULE_SPACE default',
  );
});

/* ------------------------------------------------------------------ */
/* A line that waits on another line                                   */
/* ------------------------------------------------------------------ */

const condAt = doc.indexOf('const prints = (item');
// Through to the end of the `visible` line, which is the whole point of the
// verdict above it -- a slice stopping before that would pass on a file where
// nothing ever called it.
const visibleAt = doc.indexOf('const visible = band.items.filter', condAt);
const condEnd = doc.indexOf('\n', visibleAt);
assert.ok(condAt > -1 && visibleAt > condAt && condEnd > visibleAt, 'the condition is gone from TotalsBlock');
const cond = doc.slice(condAt, condEnd);

check('a line asks whether the OTHER LINE printed, not whether the voucher has a figure', () => {
  assert.ok(
    cond.includes('const prints = (item') && cond.includes('): boolean => {'),
    'there is no verdict function for a line any more',
  );
  assert.ok(
    cond.includes('if (!stands(item)) return false;'),
    'the named line’s own emptiness and repetition are ignored -- the condition would leak a blank Net',
  );
  assert.ok(
    cond.includes('return !other || prints(other, seen);'),
    'the chain is not followed, so a line waiting on a line that waits on a third is wrong',
  );
  assert.ok(
    cond.includes('band.items.filter((item) => prints(item))'),
    'the visible list is still built from the unconditional test',
  );
});

check('a pair of lines naming each other cannot hang the print', () => {
  assert.ok(
    cond.includes('seen.has(item.field)') && cond.includes('seen.add(item.field)'),
    'the walk has no guard against a loop -- the designer can set one in two clicks',
  );
});

check('a condition naming a line that is not on this paper is satisfied', () => {
  // ⚠️ The tenant took that line away on purpose. Reading the absence as "not
  // printed" would delete this figure behind their back.
  assert.ok(
    cond.includes('return !other || prints(other, seen);'),
    'a missing line is read as a failed condition',
  );
  assert.ok(
    cond.includes('const needs = item.hideUnlessShown;') && cond.includes('if (!needs'),
    'a line with no condition of its own is not short-circuited to printing',
  );
});

check('nothing in the shipped defaults carries a condition', () => {
  // ⚠️ Opt-in is the whole point -- "many users can use it, and the rest can work
  // without it". One `hideUnlessShown:` in the file is the type declaration; a
  // second would be a default template quietly pairing two lines for everybody.
  const declarations = (tpl.match(/hideUnlessShown\??:/g) || []).length;
  assert.equal(
    declarations,
    1,
    `the shipped defaults set a condition on ${declarations - 1} line(s) -- every untouched paper would change`,
  );
});

/* ------------------------------------------------------------------ */
/* The designer                                                        */
/* ------------------------------------------------------------------ */

// The totals editor's own item list, from its declaration to its picker. Read
// as a slice so `allowTotalsControls` appearing anywhere else in the file -- the
// prop's declaration, say -- cannot stand in for the call under test.
const totalsAt = ed.indexOf('export const TotalsBandEditor');
const totalsTo = ed.indexOf('<FieldPicker', totalsAt);
assert.ok(totalsAt > -1 && totalsTo > totalsAt, 'TotalsBandEditor is gone');
const totals = ed.slice(totalsAt, totalsTo);

check('both totals-only controls are offered there, and nowhere else', () => {
  assert.ok(ed.includes('allowTotalsControls?: boolean;'), 'ItemList has no allowTotalsControls prop');
  assert.ok(
    ed.includes('allowHideIfEmpty = true, allowTotalsControls = false'),
    'the controls do not default to off',
  );
  assert.ok(
    totals.includes('allowTotalsControls'),
    'TotalsBandEditor never turns the controls on for its own rows',
  );
  // ⚠️ The exact call made by InfoBandEditor. The renderer honours neither the
  // rule nor the condition in an info block.
  assert.ok(
    ed.includes('<ItemList items={band.items} onChange={(items) => onChange({ ...band, items })} />'),
    'the info band now offers controls its block cannot draw',
  );
});

check('the switch writes the flag the renderer reads', () => {
  assert.ok(
    ed.includes('{ ...item, ruleAbove: !item.ruleAbove }'),
    'the Line button does not toggle ruleAbove',
  );
});

check('the condition offers THIS band’s lines, by the words the paper prints', () => {
  assert.ok(
    ed.includes("value={item.hideUnlessShown ?? ''}"),
    'the condition select does not read the item',
  );
  assert.ok(
    ed.includes('{other.label?.trim() || fieldName(other.field)} prints'),
    'the options are field names rather than the tenant’s own labels',
  );
  assert.ok(
    ed.includes('at === index || other.field === RULE_FIELD ? null :'),
    'the line itself or a rule is offered as a condition -- a rule can never be hidden',
  );
  assert.ok(ed.includes('<option value="">Always</option>'), 'there is no way back to no condition');
  // ⚠️ Cleared, not stored as ''. A layout keeping `hideUnlessShown: ''` still
  // reads as "waiting on a line called nothing" to anyone reading the JSON.
  assert.ok(
    ed.includes('delete changed.hideUnlessShown;'),
    'clearing the condition leaves an empty string on the item',
  );
});

check('the three rule knobs still appear under the line switch, on the nought default', () => {
  assert.ok(
    ed.includes('{item.ruleAbove ? (\n') || ed.includes('{item.ruleAbove ? (\r\n'),
    'the knobs are not shown by the flag',
  );
  assert.ok(
    ed.includes('value={item.ruleSpaceAbove ?? 0}'),
    'space above a figure rule defaults to something other than nought',
  );
  assert.ok(
    ed.includes('value={item.ruleSpaceBelow ?? 0}'),
    'space below a figure rule defaults to something other than nought',
  );
  assert.ok(ed.includes("value={item.ruleStyle ?? 'solid'}"), 'the style select is gone');
  // And the standalone Line's own two, untouched.
  assert.ok(
    ed.includes('value={item.ruleSpaceAbove ?? RULE_SPACE}'),
    'the standalone Line lost its RULE_SPACE default in the editor',
  );
  assert.ok(
    ed.includes('value={item.ruleSpaceBelow ?? RULE_SPACE}'),
    'the standalone Line lost its RULE_SPACE default in the editor',
  );
});

/* ------------------------------------------------------------------ */
/* The paper a tenant starts from                                      */
/* ------------------------------------------------------------------ */

check('the default footer still rules the net and the final due', () => {
  assert.ok(
    tpl.includes("{ field: 'net_amount', label: 'Net Tk.', ruleAbove: true }"),
    'the shipped default lost the line over the net',
  );
  assert.ok(
    /field: 'final_due',[\s\S]{0,120}ruleAbove: true/.test(tpl),
    'the shipped default lost the line over the final due',
  );
});

check('the type no longer claims only a standalone Line reads those knobs', () => {
  assert.ok(
    !tpl.includes('ONLY THE `rule` FIELD READS THESE'),
    'the InfoItem comment still says the knobs are the standalone Line’s alone',
  );
  assert.ok(
    tpl.includes('Read by BOTH kinds of rule'),
    'the knobs are not documented as the figure rule’s too',
  );
});

/* ------------------------------------------------------------------ */
/* The Purchase Invoice, on the same paper                             */
/* ------------------------------------------------------------------ */

const designer = read('src/components/modules/settings/print-designer/PrintTemplateDesigner.tsx');
const registry = read('src/components/modules/vouchers/VoucherPrintRegistry.tsx');
const purchase = read('src/components/modules/vouchers/print_items/PurchaseInvoicePrint.tsx');
const catalogAt = tpl.indexOf('export const PURCHASE_INVOICE_FIELD_CATALOG');
const catalogTo = tpl.indexOf('];', catalogAt);
assert.ok(catalogAt > -1 && catalogTo > catalogAt, 'the purchase catalogue is gone');
const catalog = tpl.slice(catalogAt, catalogTo);

check('the band editors branch on the band, never on which paper it is', () => {
  assert.ok(
    /case 'totals':\s+return <TotalsBandEditor band=\{selected as TotalsBand\} onChange=\{replaceBand\} \/>;/.test(
      designer,
    ),
    'the totals editor is now chosen per doc type -- a purchase-only fix would be needed',
  );
});

check('the totals picker still offers a standalone Line, on every paper', () => {
  // From the picker's own `<` to the end of its element -- `totals` was cut
  // just before it, so the slice has to come off the file, not off that.
  const pickerAt = ed.indexOf('<FieldPicker', totalsTo);
  const picker = ed.slice(pickerAt, ed.indexOf('/>', pickerAt));
  assert.ok(picker.includes('onPick'), 'the totals band lost its field picker');
  assert.ok(
    !picker.includes('excludeGroups'),
    'the rule group is now excluded from the totals picker -- no Line can be added at all',
  );
  assert.ok(
    /\{ key: 'rule', name: 'Line', group: 'rule' \}/.test(catalog),
    'the purchase catalogue no longer offers a Line',
  );
  assert.ok(
    /\{ key: 'blank', name: 'Blank line', group: 'manual' \}/.test(catalog),
    'the purchase catalogue no longer offers a hand-written line',
  );
});

check('every purchase screen prints through the designer’s paper', () => {
  assert.ok(
    /case '4':\s+case '9':\s+printAs\(purchaseRef\);/.test(registry),
    'a purchase voucher now prints on something other than the saved layout',
  );
  assert.ok(
    purchase.includes('data?.purchase_print_layout'),
    'the purchase paper stopped reading its own saved layout',
  );
  assert.ok(
    purchase.includes("defaultTemplate('purchase_invoice')"),
    'the purchase paper lost its default footer -- a branch with no saved layout prints nothing',
  );
});

check('that default footer carries the line over the net and the due, as sales does', () => {
  assert.ok(
    tpl.includes("{ field: 'net_amount', label: 'Net Tk.', ruleAbove: true }"),
    'the purchase default lost the line over its net',
  );
  assert.ok(
    tpl.includes("{ field: 'due_amount', label: 'Due Tk.', ruleAbove: true }"),
    'the purchase default lost the line over its due',
  );
});

/* ------------------------------------------------------------------ */
/* The Grand Total: net + what was already owed                        */
/* ------------------------------------------------------------------ */

// ⚠️ TWO READINGS OF THE SAME OLD BALANCE SIT ONE LINE APART, and the whole
// point of the new field is that it takes the OTHER one: final_due is previous
// due + the bill's DUE, this is previous due + the bill's NET. Swap the two
// words and every invoice still prints a plausible figure -- it just answers a
// question nobody asked, on paper, forever.
const salesData = read('src/components/modules/invoices/sales/salesInvoiceDocumentData.ts');
const sampleDoc = read('src/components/modules/settings/print-designer/sampleDocument.ts');
const sampleAt = sampleDoc.indexOf('export const SALES_INVOICE_SAMPLE');
const sample = sampleDoc.slice(sampleAt, sampleDoc.indexOf('\n};', sampleAt));
assert.ok(sampleAt > -1 && sample.length, 'the sales invoice sample is gone');

check('the Grand Total adds the previous due to the NET, not to the bill’s due', () => {
  assert.ok(
    salesData.includes('net_plus_previous: netAmount + previousDue'),
    'the new figure is not net + previous due',
  );
  assert.ok(
    salesData.includes('final_due: previousDue + dueAmount'),
    'final_due was changed -- the two readings of the old balance have collapsed into one',
  );
});

check('it is on the sales catalogue as money, so it right-aligns and formats', () => {
  const salesAt = tpl.indexOf('export const SALES_INVOICE_FIELD_CATALOG');
  const salesCatalog = tpl.slice(salesAt, tpl.indexOf('];', salesAt));
  const at = salesCatalog.indexOf("key: 'net_plus_previous'");
  assert.ok(at > -1, 'the field is not in the sales catalogue -- the picker cannot offer it');
  const declared = salesCatalog.slice(at, salesCatalog.indexOf('}', at));
  assert.ok(
    declared.includes('numeric: true'),
    'the figure would print left-aligned among right-aligned sums',
  );
  assert.ok(declared.includes("format: 'money'"), 'the figure would print unformatted');
});

check('the default footer prints it, and drops it when it says nothing new', () => {
  const lineAt = tpl.indexOf("field: 'net_plus_previous'");
  assert.ok(lineAt > -1, 'the shipped default footer never prints the Grand Total');
  const line = tpl.slice(lineAt, tpl.indexOf('},', lineAt));
  assert.ok(line.includes("label: 'Grand Total Tk.'"), 'the default label is not the owner’s word for it');
  // ⚠️ A party who owed nothing would carry the same figure twice otherwise.
  assert.ok(
    line.includes("hideIfEqualTo: 'net_amount'"),
    'an undebted party would print "Net Tk. 3,600 / Grand Total Tk. 3,600"',
  );
});

check('the designer’s own preview comes to the same figure', () => {
  const grab = (key) => Number(new RegExp(`${key}: (\\d+)`).exec(sample)?.[1]);
  const net = grab('net_amount');
  const previous = grab('previous_due');
  const shown = grab('net_plus_previous');
  assert.ok(
    [net, previous, shown].every(Number.isFinite),
    'the sample is missing one of the three figures',
  );
  assert.equal(shown, net + previous, 'the preview’s Grand Total is not its net plus its previous due');
});

console.log(`\n${checked} checks passed.`);
