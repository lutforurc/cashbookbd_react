/**
 * The Transfer List (and the Receive List beside it) must actually ask the
 * server to page.
 *
 *   node _transfer_list_pagination_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. The screen was built for paging -- it holds `page` and
 * `perPage`, sends them, and draws a pager off `last_page` -- but the thunk
 * handed its params object to axios as the request CONFIG rather than as
 * `{ params }`. axios ignores unknown config keys, so no query string was ever
 * sent: the server answered with its unpaged flat array, `last_page` was
 * always absent, and the pager stayed hidden while the whole register came
 * back on one page. A one-argument mistake that looks like a working call, so
 * it is pinned here rather than trusted to review.
 *
 * Static reading of the files, as the other checks are.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const transferSlice = read('src/components/modules/warehouse-transfer/warehouseTransferSlice.tsx');
const receivedSlice = read('src/components/modules/warehouse-received/warehouseReceivedSlice.tsx');
const transferList = read('src/components/modules/warehouse-transfer/TransferList.tsx');
const receiveList = read('src/components/modules/warehouse-received/ReceiveList.tsx');

let checked = 0;
const check = (title, fn) => {
  fn();
  checked += 1;
  console.log(`  ok  ${title}`);
};

/* ------------------------------------------------------------------ */
/* The two list thunks pass their params as `{ params }`              */
/* ------------------------------------------------------------------ */

check('the transfer thunk sends its params as a query string, not as axios config', () => {
  assert.ok(
    transferSlice.includes('httpService.get(API_BRANCH_TRANSFER_LIST_URL, { params })'),
    'the transfer list call does not pass { params } -- page/perPage never reach the server',
  );
  assert.ok(
    !/httpService\.get\(API_BRANCH_TRANSFER_LIST_URL,\s*params\s*\)/.test(transferSlice),
    'the transfer list call still passes the params object as axios config',
  );
});

check('the received thunk does the same', () => {
  assert.ok(
    receivedSlice.includes('httpService.get(API_BRANCH_RECEIVED_LIST_URL, { params })'),
    'the received list call does not pass { params } -- page/perPage never reach the server',
  );
  assert.ok(
    !/httpService\.get\(API_BRANCH_RECEIVED_LIST_URL,\s*params\s*\)/.test(receivedSlice),
    'the received list call still passes the params object as axios config',
  );
});

/* ------------------------------------------------------------------ */
/* Both screens ask for a page and draw the pager off the answer       */
/* ------------------------------------------------------------------ */

check('the transfer list asks for a page and a page size', () => {
  assert.ok(
    /getBranchTransfers\(\{\s*page,\s*perPage,/.test(transferList),
    'the transfer list no longer sends page/perPage',
  );
  assert.ok(
    transferList.includes('transfer?.pagination?.lastPage'),
    'the transfer list no longer reads last_page',
  );
});

check('the transfer list draws the pager, and only when there is more than one page', () => {
  assert.ok(transferList.includes('<Pagination'), 'the transfer list has no pager');
  assert.ok(
    /totalPages\s*>\s*1\s*\?/.test(transferList),
    'the pager is no longer gated on more than one page',
  );
});

check('the receive list asks for a page and draws the pager too', () => {
  assert.ok(
    /getBranchReceived\(\{\s*page,\s*perPage,/.test(receiveList),
    'the receive list no longer sends page/perPage',
  );
  assert.ok(receiveList.includes('<Pagination'), 'the receive list has no pager');
  assert.ok(
    receiveList.includes('received?.pagination?.lastPage'),
    'the receive list no longer reads last_page',
  );
});

/* ------------------------------------------------------------------ */
/* A page change must actually re-issue the request                    */
/* ------------------------------------------------------------------ */

check('both lists re-read when the page or the page size changes', () => {
  assert.ok(
    /\[dispatch,\s*page,\s*perPage/.test(transferList),
    'the transfer list does not re-read on a page/perPage change',
  );
  assert.ok(
    /\[dispatch,\s*page,\s*perPage/.test(receiveList),
    'the receive list does not re-read on a page/perPage change',
  );
});

/* ------------------------------------------------------------------ */
/* The normaliser still understands a Laravel paginator                */
/* ------------------------------------------------------------------ */

check('the normaliser turns a paginator into rows + page counts', () => {
  for (const [name, src] of [['transfer', transferSlice], ['received', receivedSlice]]) {
    assert.ok(src.includes('last_page'), `${name} slice no longer reads last_page`);
    assert.ok(src.includes('current_page'), `${name} slice no longer reads current_page`);
    assert.ok(
      /Array\.isArray\(listRoot\)/.test(src),
      `${name} slice no longer keeps its flat-array fallback`,
    );
  }
});

console.log(`\n${checked} checks passed.`);
