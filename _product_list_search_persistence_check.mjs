/**
 * Product List: does an edit-and-save keep the search and the filtered results?
 *
 *     node _product_list_search_persistence_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. The product list holds its page, its three filters and its
 * search word. Three of those four were moved onto the address bar when an edit
 * was found to reset them -- but the search was left in a useState, and an edit
 * unmounts the list and comes back to it, so a search for "demo" came back
 * empty, over the whole catalogue. Two files have to agree for the word to
 * survive, and nothing on screen says when they stop: this pins both.
 *
 *   1. THE LIST reads the applied word off the query string, writes it there on
 *      Enter, and never clears it but on Reset or an emptied box.
 *   2. THE EDIT SCREEN returns to the address the list handed it -- which is
 *      where the word and the filters ride -- rather than to a bare list.
 *
 * Pure static reading of the files, so it runs on any node.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const LIST = 'src/components/modules/product/Product.tsx';
const EDIT = 'src/components/modules/product/EditProduct.tsx';

assert.ok(existsSync(LIST), `${LIST} is missing`);
assert.ok(existsSync(EDIT), `${EDIT} is missing`);

const list = read(LIST);
const edit = read(EDIT);

/* -- the applied word is the address bar's, not a useState -------------------- */

assert.ok(
  !/setAppliedSearch/.test(list),
  '⚠️ the list still holds the applied search in a useState -- it dies on the edit round trip',
);
assert.ok(
  /const appliedSearch = searchParams\.get\('search'\) \?\? ''/.test(list),
  'the applied search is not read from the query string',
);

/* The fetch asks the API with the applied word, so the round trip re-runs it. */
assert.ok(
  /getProduct\(\{ page, perPage, categoryId, brandId, groupId, search: appliedSearch \}\)/.test(list),
  'the list does not search with the applied word',
);
assert.ok(
  /\}, \[page, perPage, categoryId, brandId, groupId, appliedSearch, searchRun\]\);/.test(list),
  'the fetch effect does not depend on the applied word -- a return would not refresh',
);

/* -- one writer keeps search, filters and page from dropping each other ------- */

const setQuery = list.slice(list.indexOf('const setQuery'), list.indexOf('const goToPage'));
for (const key of ['brand', 'category', 'group', 'search', 'page']) {
  assert.ok(
    new RegExp(`${key}: searchParams\\.get\\('${key}'\\)`).test(setQuery),
    `setQuery does not preserve \`${key}\` -- a filter change would drop it`,
  );
}

/* -- Enter writes the word; the box's text survives a filter change ----------- */

assert.ok(
  /setQuery\(\{ search: search\.trim\(\), page: '' \}\)/.test(list),
  'Enter does not write the search to the query string',
);
assert.ok(
  /prevAppliedSearch\.current === appliedSearch[\s\S]{0,120}setSearchValue\(appliedSearch\)/.test(list),
  'the box does not follow the applied word back (Reset, Back, or an edit return)',
);
assert.ok(
  /const \[search, setSearchValue\] = useState\(appliedSearch\)/.test(list),
  'the box is not seeded from the applied word, so it comes back empty',
);

/* -- the only other clear is Reset ------------------------------------------- */

assert.ok(
  /const handleReset = \(\) => \{[\s\S]{0,320}setSearchParams\(\{\}, \{ replace: true \}\)/.test(list),
  'Reset does not clear the whole query (search, filters and page together)',
);
assert.ok(
  /onClick=\{handleReset\}/.test(list),
  'Reset is not wired to a control',
);
assert.ok(
  />\s*Reset\s*</.test(list),
  'there is no Reset control on the list',
);

/* -- the list hands its own address over, and the edit screen comes back ------ */

assert.ok(
  /handleProductEdit[\s\S]{0,400}state: \{ from: `\$\{location\.pathname\}\$\{location\.search\}` \}/.test(list),
  'the edit link does not hand over the list address (search, filters and page included)',
);
assert.ok(
  /const backTo =\s*\(location\.state as \{ from\?: string \} \| null\)\?\.from \?\? '\/product\/product-list'/.test(edit),
  'the edit screen does not read the address the list handed it',
);
assert.ok(
  /navigate\(backTo\)/.test(edit),
  'the edit screen does not return to the list address it was handed',
);
assert.ok(
  !/navigate\('\/product\/product-list'\)/.test(edit),
  '⚠️ the edit screen still navigates to a bare list, dropping the search and filters',
);

console.log('ok -- Product List keeps the search and the filtered results across an edit-and-save');
