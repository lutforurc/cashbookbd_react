/**
 * Product List sorting: the arrows, what the API is asked for, and the paper.
 *
 *     set CHECK_ENTRY=_product_list_sort_check.tsx
 *     npx vite build --config vite.check.config.js && node dist-check/_product_list_sort_check.js
 *
 * Exit 0 when everything below holds.
 *
 * ⚠️ WHY THIS EXISTS. The sort is spread over four places that can each be right
 * while the whole thing is wrong: the panel that offers it, the table that must
 * NOT apply it, the slice that has to put it on the wire, and the API that is
 * the only thing that can actually order a paged list. A check that read one of
 * them and called the feature verified would miss the failure that matters --
 * the screen showing the arrows, the request going out unchanged, and the rows
 * coming back in the order they always did.
 *
 * So: the panel is DRAWN and read back, the slice is RUN and its URL examined,
 * the screen's own wiring is read, and the API's whitelist is executed. The
 * backend half needs the API checkout; it is skipped, loudly, where there is
 * none (set CASHBOOK_API_DIR to point at it).
 */
import React from 'react';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import Table, { Column, TableColumnsPanel } from './src/components/utils/others/Table';
import httpService from './src/components/services/httpService';
import { getProduct } from './src/components/modules/product/productSlice';

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
};

/* The Table reads the route and the browser's own storage while it renders --
   once to key the hidden-columns list, once to read it. A stub is all this needs
   of a browser: nothing here clicks, so nothing here calls openMenu(). */
(globalThis as any).window = {
  location: { pathname: '/product/list', hostname: 'app.cashbookbd.com', href: '/' },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  innerWidth: 1280,
  innerHeight: 900,
  addEventListener: () => {},
  removeEventListener: () => {},
};

const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const read = (path: string) => readFileSync(path, 'utf8');

/** Every sort button drawn, with its label and whether it is the one in force. */
const sortButtons = (html: string) =>
  (html.match(/<button[^>]*>/g) || [])
    .filter((tag) => /aria-label="Sort /.test(tag))
    .map((tag) => ({
      label: (tag.match(/aria-label="([^"]+)"/) || [])[1] || '',
      pressed: /aria-pressed="true"/.test(tag),
      lit: /bg-indigo-600/.test(tag),
    }));

/** The panel, drawn for real. The product_list's own seven columns. */
const columns: Column[] = [
  { key: 'serial', header: 'Sl' },
  { key: 'name', header: 'Product', sortKey: 'name' },
  { key: 'category', header: 'Category', sortKey: 'category' },
  { key: 'unit', header: 'Unit', sortKey: 'unit' },
  { key: 'current_stock', header: 'Stock Qty', sortKey: 'current_stock' },
  { key: 'purchase', header: 'P. Price', sortKey: 'purchase' },
  { key: 'sales', header: 'S. Price', sortKey: 'sales' },
];

const panelRef = React.createRef<HTMLDivElement>();

const panel = (props: any = {}) =>
  render(
    <TableColumnsPanel
      columns={columns}
      hiddenColumns={[]}
      hiddenCount={0}
      lastShownMenuKey={null}
      menuId="t"
      menuPos={{}}
      panelRef={panelRef}
      onToggle={() => {}}
      onShowAll={() => {}}
      sortingOn
      sortedKey={null}
      sortedDir="asc"
      onSortChange={() => {}}
      {...props}
    />,
  );

/* ══════════════════════════════════════════════════════════════════════════ */
/* 1. The panel: a pair of arrows beside every column that can be sorted       */
/* ══════════════════════════════════════════════════════════════════════════ */

console.log('The column panel\n');

const idle = panel();

check(
  'every sortable column offers an ascending and a descending button',
  ['Product', 'Category', 'Unit', 'Stock Qty', 'P. Price', 'S. Price'].every(
    (name) =>
      idle.includes(`aria-label="Sort ${name} ascending"`) &&
      idle.includes(`aria-label="Sort ${name} descending"`),
  ),
  sortButtons(idle).map((b) => b.label).join(' | '),
);

check('Sl offers none -- it is a generated row number, not a field', !idle.includes('Sort Sl '));

check('twelve buttons for six sortable columns', sortButtons(idle).length === 12, `${sortButtons(idle).length}`);

check('nothing is lit until a sort is chosen', sortButtons(idle).every((b) => !b.pressed && !b.lit));

check(
  'no Reset line until there is a sort to reset',
  !idle.includes('Reset sorting'),
);

/* -- the seven visibility switches are untouched by any of it --------------- */

check(
  'the column switches are all still there',
  columns.every((column) => idle.includes(`>${String(column.header)}<`)),
);

/* -- a sort in force is shown in the column AND the direction ---------------- */

const sorted = panel({ sortedKey: 'sales', sortedDir: 'desc' });
const sortedButtons = sortButtons(sorted);

check(
  'the chosen column and direction are the only pressed pair',
  sortedButtons.filter((b) => b.pressed).length === 1 &&
    sortedButtons.find((b) => b.pressed)?.label === 'Sort S. Price descending',
  sortedButtons.filter((b) => b.pressed).map((b) => b.label).join(' | ') || 'none pressed',
);

check(
  'the pressed one is the filled one, and the rest stay quiet',
  sortedButtons.filter((b) => b.lit).length === 1 &&
    sortedButtons.filter((b) => b.lit)[0].pressed,
);

check(
  "the other direction of the SAME column is not pressed",
  !sortedButtons.find((b) => b.label === 'Sort S. Price ascending')?.pressed,
);

check('Reset sorting is offered while a sort is in force', sorted.includes('Reset sorting'));

/* The column is named, not only its direction: a filled arrow on the seventh
   row of a panel takes a moment to trace back to the column it belongs to. */
const columnPicked =
  /font-semibold text-indigo-600 dark:text-indigo-400">S\. Price</.test(sorted) &&
  !/font-semibold text-indigo-600 dark:text-indigo-400">Product</.test(sorted) &&
  !idle.includes('font-semibold text-indigo-600');

check(
  'the sorted column is picked out, and no other column is',
  columnPicked,
  columnPicked ? '' : 'the label highlight is missing or on the wrong column',
);

check(
  'the panel is only widened where sorting is offered',
  sorted.includes('w-72') && panel({ sortingOn: false }).includes('w-64'),
);

/* -- and where the screen offers no sorting at all -------------------------- */

const off = panel({ sortingOn: false });

check(
  'a table that offers no sorting draws no arrows at all',
  sortButtons(off).length === 0 && !off.includes('Reset sorting'),
);

check(
  'and its panel is the one it always was',
  off.includes('w-64') && !off.includes('w-72'),
);

/* ══════════════════════════════════════════════════════════════════════════ */
/* 2. The table never sorts its own data -- the API does                       */
/* ══════════════════════════════════════════════════════════════════════════ */

console.log('\nThe table\n');

const rows = [
  { id: 3, name: 'Zeta', sales: 900 },
  { id: 1, name: 'Alpha', sales: 100 },
  { id: 2, name: 'Mid', sales: 500 },
];
const tableColumns: Column[] = [
  { key: 'name', header: 'Product', sortKey: 'name' },
  { key: 'sales', header: 'S. Price', sortKey: 'sales' },
];

const plain = render(<Table columns={tableColumns} data={rows} />);
const nameAsc = render(
  <Table
    columns={tableColumns}
    data={rows}
    sort={{ key: 'name', dir: 'asc' }}
    onSortChange={() => {}}
  />,
);

check(
  'the table never orders its own rows -- the API does that',
  nameAsc.indexOf('Zeta') < nameAsc.indexOf('Alpha'),
  'a name-ascending sort applied here would have put Alpha first',
);

/* ⚠️ THE WHOLE TABLE, byte for byte, with a sort and without one. Nothing in
   this component may depend on the sort except the panel -- not a heading, not
   a width, not a class -- so every table that passes neither prop is provably
   the table it was. */
check(
  'and the sort props change nothing at all except the panel',
  plain === nameAsc,
  plain === nameAsc ? '' : 'the two renders differ',
);

/* ══════════════════════════════════════════════════════════════════════════ */
/* 3. The request the API is actually sent                                     */
/* ══════════════════════════════════════════════════════════════════════════ */

console.log('\nThe request\n');

const asked: string[] = [];
const realGet = (httpService as any).get;
(httpService as any).get = (url: string) => {
  asked.push(url);
  return Promise.resolve({ data: { success: false, message: 'not run' } });
};

const listParams = {
  page: 1,
  perPage: 10,
  categoryId: null,
  brandId: null,
  groupId: null,
  search: '',
};

(getProduct as any)(listParams)(() => {});
(getProduct as any)({ ...listParams, page: 3, sortBy: 'sales', sortDir: 'desc' })(() => {});
(getProduct as any)({ ...listParams, sortBy: 'current_stock', sortDir: 'asc' })(() => {});
(getProduct as any)({ ...listParams, sortBy: 'name', sortDir: null })(() => {});

(httpService as any).get = realGet;

check(
  'a list with no sort asks for exactly the request it always did',
  asked[0].includes('category_id=null&brand_id=null&group_id=null&search=') &&
    !asked[0].includes('sort_by'),
  asked[0],
);

check(
  'a chosen column and direction ride the query string',
  asked[1].includes('&sort_by=sales&sort_dir=desc'),
  asked[1],
);

check(
  'the page and the filters go out with the sort, untouched',
  asked[1].includes('?page=3&per_page=10'),
  asked[1],
);

check('a stock sort sends the API its own key', asked[2].includes('&sort_by=current_stock&sort_dir=asc'), asked[2]);

check(
  'a missing direction reads as ascending rather than as nothing',
  asked[3].includes('&sort_by=name&sort_dir=asc'),
  asked[3],
);

/* ══════════════════════════════════════════════════════════════════════════ */
/* 4. The screen: the sort survives the filters, and the paper follows it      */
/* ══════════════════════════════════════════════════════════════════════════ */

console.log('\nThe screen\n');

const screen = read('src/components/modules/product/Product.tsx');

check(
  'the sort is in the address bar, with the filters',
  /searchParams\.get\('sort'\)/.test(screen) && /searchParams\.get\('dir'\)/.test(screen),
);

check(
  '⚠️ changing a filter or a page CARRIES the sort over, rather than dropping it',
  /sort: searchParams\.get\('sort'\) \?\? '',\s*\n\s*dir: searchParams\.get\('dir'\) \?\? '',/.test(screen),
);

check(
  'choosing or clearing a sort goes back to page 1',
  /const handleSortChange = \(next: SortChoice \| null\) => \{\s*\n\s*setQuery\(\{ sort: next\?\.key \?\? '', dir: next\?\.dir \?\? '', page: '' \}\)/.test(
    screen,
  ),
);

check(
  'the fetch re-runs when the sort changes',
  /searchRun, sortBy, sortDir\]\);/.test(screen),
);

check(
  'a sorted list is grouped in the API order, not re-ordered here',
  /buildCategoryWiseRows\(flatRows, Boolean\(sortBy\)\)/.test(screen),
);

check(
  'Sl carries no sort key -- it is not a field of the table',
  /\{\s*\n\s*key: 'serial',\s*\n\s*header: 'Sl',\s*\n\s*headerClass: 'text-center',\s*\n\s*cellClass: 'text-center w-14',\s*\n\s*render:/.test(
    screen,
  ) && !/key: 'serial',[\s\S]{0,120}sortKey/.test(screen),
);

check(
  'every column the request names is offered a sort key',
  ['name', 'category', 'unit', 'current_stock', 'purchase', 'sales'].every((key) =>
    new RegExp(`sortKey: '${key}'`).test(screen),
  ),
);

check(
  'the Table is given the sort and told to report it',
  /sort=\{sort\}\s*\n\s*onSortChange=\{handleSortChange\}/.test(screen),
);

/* -- the paper ------------------------------------------------------------- */

const print = read('src/components/modules/product/ProductPrint.tsx');

check(
  '⚠️ the print does not re-sort the rows it is handed',
  !/\.sort\(\(a, b\) => \{[\s\S]{0,160}localeCompare/.test(print) &&
    /for \(const r of rowsArr\)/.test(print),
);

check(
  'the print takes its rows from the table it is printing',
  /rows=\{\(tableData \|\| \[\]\)\.filter\(\(r: any\) => !isGroupRow\(r\)\)\}/.test(screen),
);

/* ══════════════════════════════════════════════════════════════════════════ */
/* 5. The API: the whitelist, run                                             */
/* ══════════════════════════════════════════════════════════════════════════ */

console.log('\nThe API\n');

const apiDir = process.env.CASHBOOK_API_DIR || 'F:/All_Database/www/cashbook_api';
const sortClass = `${apiDir}/app/Support/ProductListSort.php`;
const controller = `${apiDir}/app/Http/Controllers/Products/ItemController.php`;

if (!existsSync(sortClass)) {
  console.log(`  ..    skipped -- no API checkout at ${apiDir} (set CASHBOOK_API_DIR)`);
} else {
  const php = `
require '${sortClass}';
$fail = 0;
$ok = function ($label, $got, $want) use (&$fail) {
    if (json_encode($got) === json_encode($want)) { echo "  ok    $label\\n"; }
    else {
        $fail++;
        echo "  FAIL  $label\\n        got  " . json_encode($got) . "\\n        want " . json_encode($want) . "\\n";
    }
};
$S = '\\\\App\\\\Support\\\\ProductListSort';

// The list's own order, for anything it cannot or must not sort by.
$default = [['TRIM(pc.name)','ASC'],['product_items.name','ASC'],['product_items.id','ASC']];

$ok('no sort asked for is the list own order', $S::orderFor(null, null), $default);
$ok('category stays first when a product column is chosen', $S::orderFor('sales', 'desc'),
    [['TRIM(pc.name)','ASC'],['product_items.sales_price','DESC'],['product_items.id','ASC']]);
$ok('a price sorts on the price column', $S::orderFor('purchase', 'asc'),
    [['TRIM(pc.name)','ASC'],['product_items.purchase_price','ASC'],['product_items.id','ASC']]);
$ok('a name sorts on the name column', $S::orderFor('name', 'asc'),
    [['TRIM(pc.name)','ASC'],['product_items.name','ASC'],['product_items.id','ASC']]);
$ok('a unit sorts on the joined unit', $S::orderFor('unit', 'desc'),
    [['TRIM(pc.name)','ASC'],['u.name','DESC'],['product_items.id','ASC']]);
$ok('stock sorts on the COMPUTED on-hand figure', $S::orderFor('current_stock', 'asc'),
    [['TRIM(pc.name)','ASC'],['(COALESCE(stock.balance, 0))','ASC'],['product_items.id','ASC']]);

// Sorting BY category is what moves the groups themselves.
$ok('a category sort reorders the headings and nothing inside them', $S::orderFor('category', 'desc'),
    [['TRIM(pc.name)','DESC'],['product_items.id','ASC']]);

// The generated row number is not a column of anything.
$ok('sl is refused', $S::orderFor('sl', 'desc'), $default);

// Anything at all, from a browser.
$ok('a column that does not exist is refused', $S::orderFor('profit_margin', 'asc'), $default);
$ok('a column name is not read out of the request', $S::orderFor('name; DROP TABLE product_items', 'asc'), $default);
$ok('a union-select is refused', $S::orderFor("name) UNION SELECT 1 --", 'asc'), $default);
$ok('an empty key is refused', $S::orderFor('', 'asc'), $default);
$ok('a non-string key is refused', $S::orderFor(['name'], 'asc'), $default);

// The direction, whitelisted beside the column.
$ok('DESC in capitals is a descending sort', $S::orderFor('name', 'DESC')[1][1], 'DESC');
$ok('a padded desc is a descending sort', $S::orderFor('name', ' desc ')[1][1], 'DESC');
$ok('garbage in the direction reads as ascending', $S::orderFor('name', 'ascending')[1][1], 'ASC');
$ok('an injected direction reads as ascending', $S::orderFor('name', "DESC; DROP TABLE x")[1][1], 'ASC');
$ok('a missing direction reads as ascending', $S::orderFor('name', null)[1][1], 'ASC');

// The last word, always.
$ids = array_map(function ($pair) { return $pair[0]; }, $S::orderFor('sales', 'desc'));
$ok('an id closes every order, so paging is stable', end($ids), 'product_items.id');

// Nothing the request sent reaches the SQL.
$hostile = $S::orderFor("name') OR 1=1 --", 'asc; DELETE FROM product_items');
$ok('nothing from the request reaches the SQL', count(array_filter($hostile, function ($pair) {
    return strpos($pair[0], 'name') === 0 || strpos($pair[1], ';') !== false;
})), 0);

echo "\\n" . ($fail === 0 ? "php ok" : "php FAILED ($fail)") . "\\n";
exit($fail === 0 ? 0 : 1);
`;

  /* ⚠️ A FILE, RUN THROUGH THE SHELL, rather than `php -r` -- and that is a
     Windows detail, not a preference: `php` here is reached through the shell's
     own PATH, and spawning it directly answers ENOENT. The throwaway file also
     keeps a battery of quoted SQL out of a command line. */
  const phpFile = join(tmpdir(), 'product_list_sort_check.php');
  // ⚠️ THE OPENING TAG IS NOT DECORATION. Run without it, PHP treats the whole
  // file as plain text, prints it, and exits 0 -- so the battery below would
  // "pass" having asserted nothing at all.
  writeFileSync(phpFile, `<?php\n${php}`, 'utf8');

  const run = spawnSync('php', [phpFile], { encoding: 'utf8', shell: true });
  const output = `${run.stdout || ''}${run.stderr || ''}`;

  console.log(output.trimEnd());
  check(
    'the API whitelist behaves as the battery above says',
    run.status === 0 && output.includes('php ok'),
    run.error ? String(run.error.message) : `php exited ${run.status}`,
  );

  /* -- and the controller goes through it, never round it ------------------ */

  const api = read(controller);

  check(
    'the list hands its sort straight to the whitelist',
    api.includes('ProductListSort::orderFor($request->sort_by, $request->sort_dir)'),
  );

  check(
    'the ORDER BY is built only from what the whitelist returned',
    /foreach \(ProductListSort::orderFor\([^)]*\) as \[\$sql, \$direction\]\) \{\s*\n\s*\$query->orderByRaw\("\{\$sql\} \{\$direction\}"\);/.test(
      api,
    ),
  );

  check(
    'no request value is interpolated into an ORDER BY anywhere in the file',
    !/orderByRaw\([^)]*\$request/.test(api),
  );

  check(
    'the sort is applied to the query before either branch reads a page of it',
    api.indexOf('ProductListSort::orderFor') < api.indexOf('$query->paginate($perPage'),
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
