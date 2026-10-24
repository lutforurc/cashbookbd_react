/**
 * The Customer list prints EVERY row, not the page of ten on screen.
 *
 *   node _customer_list_print_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. Every joint here fails silently and looks like a feature
 * that works: printing from the slice puts ten customers on a four-hundred-name
 * sheet; dropping a filter prints a different list under the same heading; a
 * `hidden` on the node the ref points at prints a blank page; a hand-counted
 * colSpan draws the empty table's rule short of the edge. None of those raises
 * anything -- the sheet just comes out wrong.
 *
 * Static reading of the two files, as the other report checks are.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const SCREEN = 'src/components/modules/customer-supplier/CustomerSupplier.tsx';
const SHEET = 'src/components/modules/customer-supplier/CustomerListPrint.tsx';

const screen = read(SCREEN);
const sheet = read(SHEET);

/* -- the fetch asks for the whole list, under the filters on screen --------- */

const handler = screen.slice(
  screen.indexOf('const handlePrintList'),
  screen.indexOf('const handleDeleteConfirmed'),
);

assert.ok(handler.length > 0, 'handlePrintList is gone from the screen');

/**
 * ⚠️ `per_page: 0` IS "EVERY ROW THE FILTERS MATCHED", which the API answers in
 * one page. It used to be sized from the screen's own `totalRecords` -- the
 * list's meta -- and stale or empty that collapsed to the page size, so a sheet
 * with fourteen customers to show carried ten. See apiContactDetails, which
 * treats a non-positive page size as the filtered set's own count.
 */
assert.ok(
  /per_page:\s*0/.test(handler),
  'the print asks for a page size, not for every row -- the sheet would carry one page',
);
assert.ok(
  // The expression, not the word: the comment above explains the old bug by name.
  !/per_page:[^,\n]*totalRecords/.test(handler),
  '⚠️ the print sizes itself from the list meta again -- a stale total prints one page',
);
assert.ok(
  /page:\s*1/.test(handler),
  'the print does not ask for the first page, so serials start where the desk was',
);

// Every filter the list is under -- the search, the client type, and whose
// customers they are. The employee one was missing, so one person's list
// printed as everybody's.
assert.ok(/search[,:}]/.test(handler), 'the print drops the search the list is under');
assert.ok(
  /party_type_id/.test(handler),
  'the print drops the client type the list is under',
);
assert.ok(
  /handle_by_employee_id/.test(handler),
  '⚠️ the print drops the employee the list is under -- one person\'s customers print as everybody\'s',
);

// Into this component's own state -- a dispatch would move the desk to another
// page, and the sheet would be built from whatever it landed on.
assert.ok(
  /setPrintRows\(rows\)/.test(handler),
  'the fetched rows never reach the print',
);
assert.ok(
  !/dispatch\(getCustomer/.test(handler),
  'the print refetches through the slice, which moves the list the desk is reading',
);

/* -- and the sheet says which set it is holding ---------------------------- */

assert.ok(
  /Employee: \$\{employeeName\}/.test(screen),
  'the sheet does not name the employee the list was narrowed to',
);
assert.ok(
  /\$\{rows\.length\} \$\{rows\.length === 1 \? 'customer' : 'customers'\}/.test(screen),
  'the sheet does not state how many customers it carries',
);
// ⚠️ A selected type must never print as "All Types": that fallback was what
// put a narrowed list under a heading saying it was not narrowed.
assert.ok(
  /\(typeValue \|\| 'All Types'\)/.test(screen),
  'a selected client type can still print as "All Types" -- the fallback lies about the list',
);
assert.ok(
  !/\?\?\.name \|\|[\s\S]{0,40}'All Types'/.test(screen),
  'the client-type lookup still falls back to "All Types" when the id does not match',
);

/* -- the button stands to the right of Search ------------------------------ */

const searchButton = screen.indexOf('label="Search"');
const printButton = screen.indexOf('<PrintButton', searchButton);
// The row ends where the Add Customer button outside it begins -- a `</div>`
// anchor would stop at the first small box's closing tag instead.
const rowEnd = screen.indexOf("navigate('/customer-supplier/create')", searchButton);

assert.ok(searchButton > 0 && printButton > 0, 'the Print button is gone');
assert.ok(
  printButton > searchButton && printButton < rowEnd,
  'Print is not in the Search button\'s own row, to its right',
);

/* -- and the Rows and Font boxes stand between the two --------------------- */

const rowsBox = screen.indexOf('<PrintRowsInput');
const fontBox = screen.indexOf('<PrintFontInput');

assert.ok(rowsBox > 0 && fontBox > 0, 'the Rows and Font boxes are gone');
assert.ok(
  rowsBox > searchButton && fontBox > rowsBox && printButton > fontBox && printButton < rowEnd,
  'Rows and Font are not between Search and Print, in that order',
);

/**
 * ⚠️ THE SHEET'S TWO NUMBERS ARE NOT THE SCREEN'S `per_page`. That name is the
 * list's own paging, read out of the address bar: handing it to the print would
 * put ten rows on a printed sheet whatever the desk asked for, and the box
 * beside Print would be a box that does nothing.
 */
const sheetProps = screen.slice(
  screen.indexOf('<CustomerListPrint'),
  screen.indexOf('showNationalId={needNationalId'),
);

assert.ok(
  /rowsPerPage=\{printRowsPerPage\}/.test(sheetProps),
  'the sheet is not given the Rows box -- it is chunked by something else',
);
assert.ok(
  /fontSize=\{printFontSize\}/.test(sheetProps),
  'the sheet is not given the Font box',
);
assert.ok(
  !/rowsPerPage=\{perPage\}|rowsPerPage=\{per_page\}/.test(sheetProps),
  'the sheet is chunked by the screen\'s own paging, so a printed page holds ten',
);

// Both boxes are state, and both handlers hold the default rather than nought:
// a cleared box that fell through as 0 would print one unbroken sheet.
assert.ok(
  /useState<number>\(PRINT_ROWS_PER_SHEET\)/.test(screen) &&
    /Number\.isFinite\(value\) && value > 0 \? value : PRINT_ROWS_PER_SHEET/.test(screen),
  'the Rows box does not fall back to a real page size',
);
assert.ok(
  /useState<number>\(PRINT_FONT_SIZE\)/.test(screen) &&
    /Number\.isFinite\(value\) && value > 0 \? value : PRINT_FONT_SIZE/.test(screen),
  'the Font box does not fall back to a real type size',
);

// And the sheet really cuts the list into sheets of that many rows.
assert.ok(
  /for \(let i = 0; i < allRows\.length; i \+= rowsPerPage\)/.test(sheet),
  'the sheet no longer cuts the rows into pages',
);

/**
 * ⚠️ ENTER IN EITHER BOX MUST NOT SEARCH. The row's Enter handler takes any
 * input as the search box; these two are inputs standing on the same row, so
 * without the exclusion a Rows figure finished with Enter re-runs the search and
 * throws the desk back to page one.
 */
assert.ok(
  /e\.target\.id === "printRowsPerPage" \|\| e\.target\.id === "printFontSize"/.test(screen),
  'Enter in the Rows or Font box searches and resets the list to page one',
);

/* -- one commit between the fetch and the print ---------------------------- */

const effect = screen.slice(
  screen.indexOf('if (!printPending) return;'),
  screen.indexOf('}, [printPending, handlePrint]);'),
);

assert.ok(effect.length > 0, 'the print waits for nothing to be drawn');
assert.ok(
  /setPrintPending\(false\);[\s\S]{0,80}handlePrint\(\)/.test(effect),
  'the print fires in the same commit as the rows, so it clones an empty sheet',
);

/* -- the sheet is hidden on a WRAPPER, never on the node the ref points at -- */

const wrapper = screen.slice(screen.indexOf('className="hidden"'), screen.indexOf('<CustomerListPrint'));
assert.ok(wrapper.length > 0, 'the print sheet is not hidden off-screen');
assert.ok(
  /<CustomerListPrint\s+ref=\{printRef\}/.test(screen),
  'the ref is not on the print node itself',
);

// And the component's own root carries the ref with no `hidden` on it: a
// `hidden` there is cloned with the node and prints a blank page.
const root = sheet.slice(sheet.indexOf('return ('), sheet.indexOf('<PrintStyles />'));
assert.ok(
  /<div ref=\{ref\} className="print-root/.test(root),
  'the print component\'s own root lost its ref',
);
assert.ok(
  !/hidden/.test(root),
  'the print node itself is hidden, so the cloned sheet is blank',
);

/* -- the empty table spans the columns the table actually has -------------- */

assert.ok(
  /colSpan=\{sheetColumns\.length\}/.test(sheet),
  'the empty row counts its columns by hand instead of reading the column list',
);
assert.ok(
  /const sheetColumns: SheetColumn\[\] = \[/.test(sheet),
  'the columns are no longer built as one list, so the heading, the cells and the span can drift',
);

/* -- the three column flags are the screen's own conditions ---------------- */

assert.ok(
  /showNationalId=\{needNationalId && !openingOn\}/.test(screen),
  'the sheet shows the National ID column where the screen stands it down',
);
assert.ok(
  /showLedgerPage=\{!openingOn\}/.test(screen),
  'the sheet shows the Ledger Page column where the screen stands it down',
);
assert.ok(
  /showOpening=\{openingOn\}/.test(screen),
  'the sheet does not carry the opening figure the screen is asking for',
);

/* -- the foot of the sheet adds up ----------------------------------------- */

// Only the money columns carry a `sum`; a column without one prints nothing in
// the total row, which is what keeps a name out of the figures.
assert.ok(
  /sum: \(rows\) => rows\.reduce\(\(total, row\) => total \+ Number\(row\?\.balance \?\? 0\), 0\)/.test(sheet),
  'the Balance column has no total, so the foot of the sheet adds up nothing',
);
assert.ok(
  /sum: \(rows: any\[\]\) =>\s*rows\.reduce\(\(total, row\) => total \+ Number\(row\?\.openingbalance \?\? 0\), 0\)/.test(sheet),
  'the Opening column has no total, so a branch in opening gets a foot that ignores it',
);

/**
 * ⚠️ TWO ROWS, TWO SOURCES. The Page Total adds up the sheet it stands on; the
 * Grand Total adds up the whole run. Handing both the same array prints a page
 * of thirty as the report's figure -- and the number is plausible, so nothing
 * looks wrong.
 */
assert.ok(
  /totalsRow\(pageCount > 1 \? 'Page Total' : 'Grand Total', pageRows, 'page'\)/.test(sheet),
  'the sheet has no page total, or it is not adding up its own rows',
);
assert.ok(
  /totalsRow\('Grand Total', allRows, 'grand'\)/.test(sheet),
  'the grand total does not add up the whole list',
);
assert.ok(
  /pIdx === pageCount - 1[\s\S]{0,120}totalsRow\('Grand Total'/.test(sheet),
  'the grand total is not held back for the last sheet',
);

// The label runs across the columns that carry no figure, and where it stops is
// read off the column list -- counted by hand it prints the total under the
// wrong heading, quietly.
assert.ok(
  /const totalLabelSpan = Math\.max\(\s*sheetColumns\.findIndex\(\(column\) => column\.sum\),\s*1,?\s*\)/.test(sheet),
  'the total label spans a hand-counted number of columns',
);
assert.ok(
  /sheetColumns\.slice\(totalLabelSpan\)\.map/.test(sheet) &&
    /column\.sum \? thousandSeparator\(column\.sum\(source\)\) : ''/.test(sheet),
  'the total cells are not drawn from the same column list as the heading, so they can drift',
);

/* -- five columns sit in the middle of their row --------------------------- */

/**
 * ⚠️ THE ROW IS `align-top` ON PURPOSE -- a name or an address that wraps should
 * start at the top of the row. These five were asked to sit in the middle of it
 * instead, and the override has to be on the CELLS: put it on the row and every
 * column moves with them, Name included.
 */
for (const key of ['serial', 'manual_address', 'ledger_page', 'mobile', 'balance']) {
  assert.ok(
    new RegExp(`key: '${key}'[\\s\\S]{0,240}?valign: 'middle'`).test(sheet),
    `the ${key} column is not vertically centred on the sheet`,
  );
}

assert.ok(
  !/key: 'name'[\s\S]{0,160}?valign:/.test(sheet),
  'the Name column was centred too -- only the five named columns were asked for',
);
assert.ok(
  /column\.valign \? 'align-middle' : ''/.test(sheet),
  'the column flag is declared but never drawn -- nothing on paper would move',
);
assert.ok(
  (sheet.match(/columnCells\(column\)/g) || []).length >= 3,
  'the column classes are not used by the heading, the body row AND the totals row',
);
// Horizontal alignment and widths are untouched by any of it.
assert.ok(
  /\{ key: 'name', header: 'Name', width: 'w-36', value:/.test(sheet),
  'the Name column lost its width or its alignment while the valign was added',
);

console.log('ok -- the Customer list prints every row, in the same row as Search, on a sheet drawn after the fetch');
