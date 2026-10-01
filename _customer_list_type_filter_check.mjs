/**
 * The List Customers classification is applied BY THE SERVER, before it pages.
 *
 *   node _customer_list_type_filter_check.mjs
 *
 * Exit 0 when it is.
 *
 * ⚠️ WHY THIS EXISTS. The classification filter sits in `apiContactDetails`'s
 * own query -- a `cust_party_infos.party_type_id` filter applied before the
 * paginator counts, the same column and the same values the Due List narrows
 * by. Three things about that are quiet when they break:
 *
 *   1. The filter is applied OVER the page -- on the screen, or after the
 *      paginator has already counted. Ten rows of one class then sit under the
 *      total and page count of every class, and the last pages come back empty
 *      while the count still promises rows. This check insists the filter sits
 *      inside the query, before `paginate()`.
 *   2. The screen sends no type, so every change refetches the whole branch and
 *      filters nothing. This check insists the request carries `party_type_id`
 *      -- from the dropdown, from paging, from the search box and from the
 *      global-search hand-off.
 *   3. Two requests in flight overwrite each other -- a slow "Advance" answer
 *      lands after a fast "Customer" one, and one classification's rows are
 *      shown under another's heading. This check insists the slice tags each
 *      request and drops answers that are no longer the latest.
 *
 * The backend's own live check (which runs the endpoint against the database)
 * lives with the API, as `customer_list_type_filter_check.php`.
 *
 * Pure static reading of the three files, so it runs on any node.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

/* -- the backend filters inside the query, before the paginator ------------- */

const api = read('temp/PartyController.php');
const dataStart = api.indexOf('function apiContactDetails');
const dataEnd = api.indexOf('function apiContactStore');
assert.ok(dataStart > -1 && dataEnd > dataStart, 'apiContactDetails is not where it was');
const contactDetails = api.slice(dataStart, dataEnd);

assert.ok(
  /\$request->filled\('party_type_id'\)/.test(contactDetails),
  'apiContactDetails does not read the party_type_id request parameter',
);

const filterIndex = contactDetails.indexOf(
  "where('cust_party_infos.party_type_id', $request->party_type_id)",
);
const paginateIndex = contactDetails.indexOf('->paginate($perPage)');
assert.ok(filterIndex > -1, 'the query does not filter on cust_party_infos.party_type_id');
assert.ok(
  paginateIndex > -1 && filterIndex < paginateIndex,
  '⚠️ the filter is applied after the page is cut -- the total would describe every party',
);

// An absent parameter must mean "every party", so the filter is conditional.
assert.ok(
  /->when\(\s*\$request->filled\('party_type_id'\)/.test(contactDetails),
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

const screen = read('src/components/modules/customer-supplier/CustomerSupplier.tsx');

assert.ok(
  /import \{ ClientType \} from ['"]\.\.\/\.\.\/utils\/fields\/DataConstant['"]/.test(screen),
  'the screen does not read ClientType from Add Customers\' constant',
);
assert.ok(
  /\[\s*\{ id: '', name: 'All Types' \},[\s\S]*?\.\.\.ClientType\.filter/.test(screen),
  'the screen\'s options are not built from ClientType with an "All Types" blank',
);

/* -- choosing a classification asks the server, and starts a new page ------- */

assert.ok(
  /const setPartyTypeId = \(value: string\) =>\s*setListParams\(\{ party_type_id: value, page: null \}\)/.test(screen),
  '⚠️ changing the classification does not reset the page -- a shorter list could open past its end',
);
assert.ok(
  /handlePartyTypeChange = \(e: React\.ChangeEvent<HTMLSelectElement>\) => \{[\s\S]*?setPartyTypeId\(e\.target\.value\)/.test(screen),
  'the dropdown handler does not set the classification',
);
assert.ok(
  /id="party_type_id"[\s\S]{0,200}?data=\{CUSTOMER_TYPE_FILTER\}/.test(screen),
  'the dropdown is not wired to party_type_id / the classification options',
);
assert.ok(
  /value=\{partyTypeId\}[\s\S]{0,120}?onChange=\{handlePartyTypeChange\}/.test(screen),
  'the dropdown does not read and write the classification',
);

/* -- the request carries the type everywhere the list is refetched ---------- */

const fetches = screen.match(/dispatch\(getCustomer\(\{[^}]*partyTypeId[^}]*\}\)\)/g) || [];
assert.ok(
  fetches.length >= 4,
  `⚠️ only ${fetches.length} refetch(es) carry the classification -- a save, a delete or a paging would widen the list`,
);
assert.ok(
  /params\.set\("party_type_id", partyTypeId\)/.test(screen),
  'arriving from the global search drops the selected classification',
);
assert.ok(
  /partyTypeId \? 'No records for the selected client type\.' : undefined/.test(screen),
  'the empty table does not say which classification it is empty for',
);

/* -- the API request carries the type, and stale answers are dropped -------- */

const slice = read('src/components/modules/customer-supplier/customerSlice.tsx');

assert.ok(
  /body\.party_type_id = payload\.partyTypeId/.test(slice),
  'the request does not include party_type_id',
);
assert.ok(
  /payload\.partyTypeId !== ''[\s\S]{0,160}?payload\.partyTypeId !== null[\s\S]{0,160}?payload\.partyTypeId !== undefined/.test(slice),
  'an empty classification is sent as a value -- "All Types" would filter on nothing',
);
assert.ok(
  /state\.activeRequestId = action\.meta\.requestId/.test(slice),
  'the slice does not tag the request in flight',
);
assert.ok(
  /state\.activeRequestId !== action\.meta\.requestId\) return/.test(slice),
  '⚠️ an older request can overwrite a newer one -- no stale-response guard',
);

console.log('ok -- List Customers classification is filtered by the server, before it is paged');
