/**
 * The Due List's classification filter is applied BY THE SERVER.
 *
 *   node _due_list_type_filter_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. The classification filter used to be a client-side sift
 * over every row the branch returned (dueListFilter.ts). It is now a
 * `cust_party_infos.party_type_id` filter in the report's own query, so the
 * rows, the running cumulative columns and the Total line are all computed over
 * the chosen classification. Three things about that are quiet when they break:
 *
 *   1. The filter is applied OUTSIDE the row source -- the totals come back for
 *      the whole branch while the table shows one class. This check insists the
 *      `when(... party_type_id ...)` sits inside `$subQuery`, before groupBy.
 *   2. The screen sends no type, so every change refetches the whole branch and
 *      filters nothing. This check insists the request carries `party_type_id`.
 *   3. Two requests in flight overwrite each other -- a slow "Advance" answer
 *      lands after a fast "Customer" one. This check insists the slice tags
 *      each request and drops answers that are no longer the latest.
 *
 * Pure static reading of the three files, so it runs on any node.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

/* -- the backend filters inside the query, before the totals ---------------- */

const api = read('temp/ReportsController.php');
const dataStart = api.indexOf('function dueListData');
const dataEnd = api.indexOf('function apiCustomerSupplierStatement');
assert.ok(dataStart > -1 && dataEnd > dataStart, 'dueListData is not where it was');
const dueListData = api.slice(dataStart, dataEnd);

assert.ok(
  /\$partyTypeId = \$request->party_type_id;/.test(dueListData),
  'dueListData does not read the party_type_id request parameter',
);

const whenIndex = dueListData.indexOf('$query->where(\'cpi.party_type_id\', $partyTypeId)');
const groupByIndex = dueListData.indexOf('->groupBy(\'atd.coa4_id\'');
assert.ok(whenIndex > -1, 'the query does not filter on cpi.party_type_id');
assert.ok(
  groupByIndex > -1 && whenIndex < groupByIndex,
  '⚠️ the filter is applied after the rows are grouped -- the totals would be the whole branch',
);

// An absent parameter must mean "every party", so the filter is conditional.
assert.ok(
  /->when\(\$partyTypeId !== null && \$partyTypeId !== ''/.test(dueListData),
  'the filter is not conditional -- "All Types" would return nothing',
);

/* -- the screen reuses Add Customers' own field and values ------------------ */

const constant = read('src/components/utils/fields/DataConstant.tsx');
const clientType = constant.slice(constant.indexOf('export const ClientType'));
for (const label of ['Customer', 'Supplier', 'Supplier & Customer', 'Advance']) {
  assert.ok(clientType.includes(`name: '${label}'`), `ClientType lost "${label}"`);
}
for (const id of [1, 2, 3, 4]) {
  assert.ok(new RegExp(`id: ${id},`).test(clientType), `ClientType lost id ${id}`);
}

const screen = read('src/components/modules/reports/duelist/DueList.tsx');

assert.ok(
  /import \{ ClientType \} from '\.\.\/\.\.\/\.\.\/utils\/fields\/DataConstant'/.test(screen),
  'the screen does not read ClientType from Add Customers\' constant',
);
assert.ok(
  /\[\s*\{ id: '', name: 'All Types' \},[\s\S]*?\.\.\.ClientType\.filter/.test(screen),
  'the screen\'s options are not built from ClientType with an "All Types" blank',
);

/* -- the screen fetches on type change, and does not sift on the client ----- */

assert.ok(
  !screen.includes('filterDueListByType'),
  '⚠️ the screen still filters the classification on the client',
);

assert.ok(
  // Whitespace-tolerant: the call is wrapped over several lines now that it
  // carries the employee as well. What matters is that the type travels with it.
  /handlePartyTypeChange[\s\S]*?getDueList\(\{[\s\S]*?partyTypeId: nextType/.test(screen),
  'changing the Client Type does not send a new request with the selected type',
);

assert.ok(
  /handleActionButtonClick[\s\S]*?dispatch\(getDueList\(\{[\s\S]*?partyTypeId[\s\S]*?\}\)\)/.test(screen),
  'the Apply button does not carry the selected type',
);

assert.ok(
  /query\.asked[\s\S]*?getDueList\(\{[\s\S]*?partyTypeId/.test(screen),
  'the address-bar driven fetch does not carry the selected type',
);

// Page one again when the classification changes.
assert.ok(
  /key=\{partyTypeId\}/.test(screen),
  'the table is not keyed on the classification -- a stale page number would survive',
);

/* -- the API request carries the type, and stale answers are dropped -------- */

const slice = read('src/components/modules/reports/duelist/dueListSlice.tsx');

assert.ok(
  /params\.party_type_id = partyTypeId/.test(slice),
  'the request does not include party_type_id',
);

assert.ok(
  /requestId !== latestRequestId/.test(slice),
  '⚠️ an older request can overwrite a newer one -- no stale-response guard',
);

/* -- the client-side sift is gone entirely ---------------------------------- */

import { existsSync } from 'node:fs';
assert.ok(
  !existsSync('src/components/modules/reports/duelist/dueListFilter.ts'),
  'dueListFilter.ts still exists -- the client-side filter should be gone',
);

/* ══════════════════════════════════════════════════════════════════════════ */
/* The employee filter: owned by the branch, cleared when it stands down      */
/* ══════════════════════════════════════════════════════════════════════════ */

const print = read('src/components/modules/reports/duelist/DueListPrint.tsx');
const doc = read('src/components/modules/reports/duelist/dueListDocumentData.ts');

/**
 * ⚠️ THE SWITCH BELONGS TO THE BRANCH THE REPORT IS RUN FOR. This screen can be
 * run for another branch, so the reader's own `settings.data.branch` is the
 * wrong answer either way round: it offers the filter on a branch that has no
 * such column, or hides it on one that does.
 */
assert.ok(
  /selectedBranchRow[\s\S]{0,240}?need_customer_handle_by_employee/.test(screen),
  'the employee field is not gated on the SELECTED branch\'s setting',
);
assert.ok(
  !/isBranchSettingOn\(settings, 'need_customer_handle_by_employee'\)/.test(screen),
  'the reader\'s own branch setting is still consulted -- the report can be run for another branch',
);
assert.ok(
  /handleByEmployeeOn =\s*branchHandlesCustomers && partyTypeId !== '2'/.test(screen),
  'the visibility condition is not List Customers\' -- the branch switch AND not Supplier',
);

// Loaded for the branch being reported on, and only where it is offered.
assert.ok(
  /getEmployeesDDL\(\{ branchId: String\(branchId \?\? ''\) \}\)/.test(screen),
  'employees are not loaded for the selected branch',
);
assert.ok(
  /if \(!handleByEmployeeOn\) return;[\s\S]{0,140}?getEmployeesDDL/.test(screen),
  'employees are fetched even where the field is not offered',
);

// ⚠️ A hidden filter must not go on narrowing the report.
assert.ok(
  /if \(!handleByEmployeeOn && employeeId\) setEmployeeId\(''\)/.test(screen),
  'the employee choice survives the field being stood down -- a filter nobody can see',
);
assert.ok(
  /nextType !== '2' \? employeeId : ''/.test(screen),
  'switching to Supplier keeps the employee, which the picker no longer offers',
);

for (const [label, pattern] of [
  ['the Client Type change', /employeeId: nextEmployee/],
  ['the employee change', /employeeId: next\b/],
  ['Apply', /partyTypeId, employeeId \}/],
]) {
  assert.ok(pattern.test(screen), `${label} does not carry the employee`);
}

assert.ok(
  /params\.handle_by_employee_id = employeeId/.test(slice),
  'the request does not include handle_by_employee_id',
);
assert.ok(
  /employeeId !== ''[\s\S]{0,120}?params\.handle_by_employee_id/.test(slice),
  'an empty employee is sent as a value -- "All Employees" would filter on nothing',
);

/* -- print: the whole filtered set, and a header that says which set -------- */

assert.ok(
  /clientType=\{clientTypeLabel\}/.test(screen) &&
    /employee=\{handleByEmployeeOn \? employeeLabel : ''\}/.test(screen),
  'the bespoke sheet is not told which filters the report was run under',
);
assert.ok(
  /Client Type:[\s\S]{0,600}?employee \?/.test(print),
  'the printed header does not show the client type, or does not gate the employee line',
);
assert.ok(
  /party_type_label: clientType \|\| 'All Types'/.test(doc) &&
    /employee_name: employee \?\? ''/.test(doc),
  'the designed sheet\'s own data does not carry the filters',
);
assert.ok(
  /dueList\.isLoading/.test(screen),
  'the print can open while a run is still in flight -- it would clone the previous rows',
);

/* -- and the API half, where this machine has the checkout ------------------ */

const LIVE = process.env.CASHBOOK_API_DIR
  ? `${process.env.CASHBOOK_API_DIR}/app/Http/Controllers/Reports/ReportsController.php`
  : 'F:/All_Database/www/cashbook_api/app/Http/Controllers/Reports/ReportsController.php';

if (!existsSync(LIVE)) {
  console.log(`  ..    skipped the API half -- no checkout at ${LIVE} (set CASHBOOK_API_DIR)`);
} else {
  const live = read(LIVE);
  const body = live.slice(
    live.indexOf('function dueListData'),
    live.indexOf('function apiCustomerSupplierStatement'),
  );

  assert.ok(body.length > 0, 'dueListData is not where it was in the live controller');
  assert.ok(
    /\$employeeId = \$request->handle_by_employee_id;/.test(body),
    'the report does not read handle_by_employee_id',
  );
  assert.ok(
    /Schema::hasColumn\('cust_party_infos', 'handle_by_employee_id'\)/.test(body),
    'the column is named without asking the schema -- a database without the patch errors',
  );
  assert.ok(
    /\$employeeId === 'none'[\s\S]{0,90}?whereNull\('cpi\.handle_by_employee_id'\)/.test(body),
    'the "No Employee" sentinel is not translated to IS NULL',
  );

  const employeeIndex = body.indexOf("where('cpi.handle_by_employee_id', $employeeId)");
  const groupIndex = body.indexOf("->groupBy('atd.coa4_id'");
  assert.ok(
    employeeIndex > -1 && employeeIndex < groupIndex,
    '⚠️ the employee filter is applied after the rows are grouped -- the balances would be the whole branch',
  );
  assert.ok(
    !/->groupBy\([^)]*handle_by_employee_id/.test(body),
    'the group-by names a column a database without the patch does not have',
  );

  // The end date is still the INCLUSIVE cutoff, and later vouchers still cannot
  // reach the balance.
  assert.ok(
    /->where\('mtm\.vr_date', '<=', \$endDate\)/.test(body),
    '⚠️ the inclusive end-date cutoff is gone -- later transactions would move the balance',
  );

  /* ══════════════════════════════════════════════════════════════════════ */
  /* Records and totals are two things                                       */
  /* ══════════════════════════════════════════════════════════════════════ */

  /**
   * ⚠️ THE BUG THIS PINS: the API used to push a 'Total' row and a 'Balance'
   * row onto the SAME array as the parties. They were drawn as customers and
   * then footed with them, so a list owing 78,341 printed 2,35,023 -- itself,
   * three times. A name is not a shape; the summary has its own key now.
   */
  assert.ok(
    !/\$results->push\(/.test(body),
    'the API still pushes Total/Balance rows into the records -- they will be drawn as customers and footed again',
  );
  assert.ok(
    !/'coa4_name'\s*=>\s*'Total'/.test(body) && !/'coa4_name'\s*=>\s*'Balance'/.test(body),
    'a summary row is still being built with a customer-shaped record',
  );
  assert.ok(
    /'records'\s*=>\s*\$results->values\(\)/.test(body) && /'summary'\s*=>\s*\[/.test(body),
    'the API does not answer records and summary as two separate things',
  );
  assert.ok(
    /'balance'\s*=>\s*round\(\$debitTotal - \$creditTotal, 2\)/.test(body),
    'the balance is not the net of debit and credit, computed once',
  );
  assert.ok(
    !/\(int\)\s*\$record->debit/.test(body) && !/\(int\)\s*\$record->credit/.test(body),
    '⚠️ debit/credit are cast to integers again -- the totals lose their paisa',
  );
}

/* -- and the screen reads those two things, never one array of rows --------- */

assert.ok(
  /setTableData\(dueList\?\.data\?\.records\)/.test(screen),
  'the screen still reads a bare row array -- summary rows would be drawn as customers',
);
assert.ok(
  !/dueList\?\.data\?\.data\?\.data/.test(screen),
  'the screen still reads the old doubly-wrapped payload',
);
assert.ok(
  /dueList\?\.data\?\.summary/.test(screen),
  'the screen does not read the totals returned beside the records',
);
assert.ok(
  /row\.coa4_name\s*===\s*'(Total|Balance)'|'Total'\s*===\s*row/.test(screen) === false,
  'the screen recognises a summary row by its name',
);
assert.ok(
  /footerRows=\{footerRows\}/.test(screen),
  'the table has no Grand Total footer of its own',
);
assert.ok(
  /colSpan: 4, className: 'text-right'/.test(screen),
  'the Grand Total label does not span the columns that carry no figure',
);
/**
 * ⚠️ AN ARRAY OF ROWS, NOT OF CELLS. `Table` walks `footerRows` with
 * `footerRows.map((row) => withoutHidden(row).map(...))`, so each element has
 * to be a ROW. A flat list of cells reads each cell as a row and the screen
 * dies with `withoutHidden(...).map is not a function` -- the crash this
 * pins. The declared type is what the Table's prop says: `TableFooterCell[][]`.
 */
assert.ok(
  /const footerRows: TableFooterCell\[\]\[\]/.test(screen),
  "⚠️ the screen's footer is a flat cell list -- Table expects a row array, and the screen crashes",
);
assert.ok(
  /Balance \(Debit − Credit\)/.test(screen),
  'the net balance is not stated outside the customer rows',
);
assert.ok(
  /summary=\{footerTotals\}/.test(screen),
  'the printed sheet is not given the same totals the screen shows',
);

console.log('ok -- Due List classification is filtered by the server, before its totals');
