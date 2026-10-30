/**
 * Customer Wise Sold Units: oldest purchase first, five buyers a page.
 *
 *   node _customer_wise_sold_units_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. Two things about this screen are easy to break quietly.
 *
 * The ORDER comes from the server (the buyer's earliest sale, oldest first) and
 * the page is cut on the client -- so if the client ever starts fetching a page
 * at a time, or stops slicing, the printed sheet silently drops to five buyers
 * while its own grand total still covers every one the filters matched. The
 * print must keep the whole set.
 *
 * And the serial must be the buyer's number ON THE REPORT, not on the page:
 * with five a page, page two has to start at 6. A page-local index would print
 * 1..5 on every page and look entirely plausible.
 *
 * The server's own half is covered by its PHPUnit test
 * (cashbook_api tests/Unit/SoldUnitsOrderTest.php).
 *
 * Static reading of the files, as the other checks are.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const list = read('src/components/modules/real-estate/sales/SoldUnitList.tsx');

let checked = 0;
const check = (title, fn) => {
  fn();
  checked += 1;
  console.log(`  ok  ${title}`);
};

check('the page size is five buyers', () => {
  assert.ok(
    /const CUSTOMERS_PER_PAGE = 5;/.test(list),
    'the report no longer asks for five customers a page',
  );
});

check('the table draws only the current page, sliced from the full list', () => {
  assert.ok(
    /customers\.slice\(\s*firstCustomerIndex,\s*firstCustomerIndex \+ CUSTOMERS_PER_PAGE,?\s*\)/.test(list),
    'the table no longer slices the list it was given',
  );
  assert.ok(
    /\{pageCustomers\.map\(/.test(list),
    'the table no longer renders pageCustomers',
  );
  // The whole list must still be fetched -- the totals and the sheet need it.
  assert.ok(
    !/fetchSoldUnits\([^)]*(page|per_page)/.test(list),
    'the screen has started asking the server for one page',
  );
});

check('the pager is drawn, and only when there is more than one page', () => {
  assert.ok(list.includes('<Pagination'), 'the report has no pager');
  assert.ok(
    /totalPages > 1 \?/.test(list),
    'the pager is no longer gated on more than one page',
  );
  assert.ok(
    /Math\.ceil\(customers\.length \/ CUSTOMERS_PER_PAGE\)/.test(list),
    'the page count no longer comes from the whole list',
  );
});

check('the serial carries on across pages', () => {
  assert.ok(
    /const customerIndex = firstCustomerIndex \+ index;/.test(list),
    'the row number is page-local -- page two would restart at 1',
  );
  assert.ok(
    /const firstCustomerIndex = \(page - 1\) \* CUSTOMERS_PER_PAGE;/.test(list),
    'the page offset is gone',
  );
});

check('a new search starts at its own first page', () => {
  assert.ok(
    /setPage\(1\);\s*loadData\(\)/.test(list),
    'Search does not return to page one',
  );
  assert.ok(
    /A search or a reset can leave fewer buyers/.test(list),
    'a page left beyond the end of a shorter list is no longer corrected',
  );
});

check('the printed sheet still carries the whole set', () => {
  // ⚠️ Not pageCustomers: the sheet prints every buyer the filters matched, in
  // the server's order, under a grand total that covers all of them.
  assert.ok(
    /<SoldUnitListPrint[\s\S]{0,200}customers=\{customers\}/.test(list),
    'the print is being fed the page instead of the whole report',
  );
});

console.log(`\n${checked} checks passed.`);
