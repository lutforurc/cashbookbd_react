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
  /handlePartyTypeChange = \(e: React\.ChangeEvent<HTMLSelectElement>\) => \{[\s\S]*?dispatch\(getDueList\(\{[\s\S]*?partyTypeId: nextType[\s\S]*?\}\)\)/.test(screen),
  'changing the Client Type does not send a new request with the selected type',
);

assert.ok(
  /handleActionButtonClick[\s\S]*?dispatch\(getDueList\(\{[\s\S]*?partyTypeId[\s\S]*?\}\)\)/.test(screen),
  'the Apply button does not carry the selected type',
);

assert.ok(
  /query\.asked[\s\S]*?dispatch\(getDueList\(\{[\s\S]*?partyTypeId/.test(screen),
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

console.log('ok -- Due List classification is filtered by the server, before its totals');
