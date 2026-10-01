/**
 * The Daily Account Book is wired up, filters on the server, and prints whole.
 *
 *   node _daily_account_book_check.mjs
 *
 * Exit 0 when it is.
 *
 * ⚠️ WHY THIS EXISTS. Four things about this report are quiet when they break:
 *
 *   1. THE FILTER SITS ON THE SCREEN. A report that fetched once and sifted on
 *      the client would show one day's rows over a whole month's totals. This
 *      check insists the request carries branch_id/start_date/end_date and that
 *      Apply asks again.
 *   2. THE TWO SIDES DRIFT APART FROM THE PAPER. The fifteen sections are the
 *      report; a renamed or reordered one prints a page that no longer matches
 *      the book the desk keeps. The order is pinned here, both sides.
 *   3. THE TOTALS COVER ONLY WHAT IS ON SCREEN. The server foots the sections,
 *      so the page must print the server's totals rather than re-adding
 *      whatever it happens to render.
 *   4. THE PRINT LOSES ITS HEADING OR ITS FOOTING. A section cut across a sheet
 *      needs its column heading again, and its Total only once, on the last
 *      block. Both are easy to get wrong and invisible on screen.
 *
 * Pure static reading of the files, so it runs on any node.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const PAGE = 'src/components/modules/reports/daily-account-book/DailyAccountBook.tsx';
const PRINT = 'src/components/modules/reports/daily-account-book/DailyAccountBookPrint.tsx';

assert.ok(existsSync(PAGE), `${PAGE} is missing`);
assert.ok(existsSync(PRINT), `${PRINT} is missing`);

const page = read(PAGE);
const print = read(PRINT);

/* -- the route and the endpoint exist, and agree on the path ----------------- */

const appRoutes = read('src/components/services/appRoutes.tsx');
assert.ok(
  /report_daily_account_book:\s*'\/reports\/daily-account-book'/.test(appRoutes),
  'appRoutes is missing report_daily_account_book',
);

const apiRoutes = read('src/components/services/apiRoutes.tsx');
assert.ok(
  /API_REPORT_DAILY_ACCOUNT_BOOK_URL\s*=\s*`\$\{API_BASE_URL\}\/reports\/daily-account-book`/.test(apiRoutes),
  'apiRoutes does not point at /reports/daily-account-book',
);

assert.ok(
  /import \{ API_REPORT_DAILY_ACCOUNT_BOOK_URL \}/.test(page),
  'the screen does not import its own endpoint',
);

/* -- the screen is routed, guarded, and on the menu --------------------------- */

const app = read('src/App.tsx');
assert.ok(
  /import DailyAccountBook from '\.\/components\/modules\/reports\/daily-account-book\/DailyAccountBook'/.test(app),
  'App.tsx does not import the screen',
);
assert.ok(
  /path=\{routes\.report_daily_account_book\}[\s\S]{0,120}element=\{<DailyAccountBook user=\{me\} \/>\}/.test(app),
  'App.tsx does not route the screen',
);

const sidebar = read('src/components/Sidebar/index.tsx');
assert.ok(
  /\{ id: 'reports\/daily-account-book', title: "Daily Account Book" \}/.test(sidebar),
  'the sidebar submenu list has no Daily Account Book entry',
);
assert.ok(
  /subSlot\('reports', 'reports\/daily-account-book'\)/.test(sidebar),
  'the menu item is not slotted into the reports group',
);
assert.ok(
  /hasPermission\(permissions, 'cashbook\.view'\)[\s\S]{0,220}routes\.report_daily_account_book/.test(sidebar),
  'the menu item is not gated on cashbook.view',
);

const menuRoutes = read('src/components/Sidebar/menuRoutes.ts');
const reports = menuRoutes.slice(menuRoutes.indexOf("'reports':"));
assert.ok(
  reports.slice(0, reports.indexOf(']')).includes('routes.report_daily_account_book'),
  'the path is not in MENU_ROUTES reports -- the menu would never highlight',
);

const menuPermissions = read('src/components/Sidebar/menuPermissions.ts');
const permissionBlock = menuPermissions.slice(
  menuPermissions.indexOf('reports: ['),
  menuPermissions.indexOf('requisition: ['),
);
assert.ok(
  permissionBlock.includes("'cashbook.view'"),
  'cashbook.view does not open the Reports group, so the screen is unreachable',
);

/* -- the filter is the server's ---------------------------------------------- */

assert.ok(
  /params:\s*\{[\s\S]{0,220}branch_id: branch,[\s\S]{0,120}start_date: fromText,[\s\S]{0,120}end_date: toText/.test(page),
  'the request does not carry the branch and the date range',
);
assert.ok(
  /const handleReset|const load = async/.test(page) && /onClick=\{\(\) => load\(\)\}/.test(page),
  'Apply does not ask the server again',
);
assert.ok(
  /cash_account_id: cash \|\| undefined/.test(page),
  'the cash account filter is not sent',
);

/* -- the fifteen sections, in the paper's order ------------------------------- */

const RECEIPT = [
  'CASH SALES',
  'RECEIVED FROM CUSTOMER',
  'RECEIVED FROM SUPPLIER',
  'CASH DEBIT BY CONTRA VOUCHER',
  'CASH DEBIT BY JOURNAL VOUCHER',
  'OTHERS INCOME',
];
const PAYMENT = [
  'CASH PURCHASE',
  'PAYMENT TO SUPPLIER',
  'PAYMENT TO CUSTOMER',
  'CASH CREDIT BY CONTRA VOUCHER',
  'CASH CREDIT BY JOURNAL VOUCHER',
  'EXPENSES',
  'TODAY DUE SALES',
  'TODAY DUE PURCHASE',
  'SALES RETURN',
];

// The titles live on the server, which owns the order. The screen must render
// whatever comes back rather than a list of its own -- so it is checked for the
// two loops, and the server is checked for the order.
const service = read('temp/DailyAccountBook.php');
for (const title of [...RECEIPT, ...PAYMENT]) {
    assert.ok(service.includes(`'${title}'`), `the server has no "${title}" section`);
}

const receiptOrder = RECEIPT.map((t) => service.indexOf(`'${t}'`));
const paymentOrder = PAYMENT.map((t) => service.indexOf(`'${t}'`));
assert.deepEqual(receiptOrder, [...receiptOrder].sort((a, b) => a - b), 'the RECEIPT sections are out of order on the server');
assert.deepEqual(paymentOrder, [...paymentOrder].sort((a, b) => a - b), 'the PAYMENT sections are out of order on the server');

assert.ok(
  /report\?\.sections\?\.receipt/.test(page) && /report\?\.sections\?\.payment/.test(page),
  'the screen does not render both sides from the server response',
);

/* -- the totals are the server's, over the whole filtered set ----------------- */

assert.ok(
  /report\.totals\?\.receipt/.test(page) && /report\.totals\?\.payment/.test(page),
  'the side totals are not the server\'s',
);
assert.ok(
  !/reduce\(/.test(page),
  '⚠️ the screen adds rows up itself -- the totals would cover only what it drew',
);

/* -- the closing arithmetic is stated, and the states are handled ------------- */

assert.ok(/Opening Balance/.test(page), 'the opening balance bar is missing');
assert.ok(/Closing Balance/.test(page), 'the closing balance box is missing');
assert.ok(/Closing Receivable Amount/.test(page) && /Closing Payable Amount/.test(page), 'the receivable/payable boxes are missing');
assert.ok(/Closing Bank Balance/.test(page) && /Mobile Bank Balance/.test(page), 'the bank/wallet balance tables are missing');

assert.ok(/loading \? <Loader \/> : null/.test(page), 'there is no loading state');
assert.ok(/No cash movement in that period/.test(page), 'there is no empty state');
assert.ok(/setError\(said\)/.test(page) && /border-red-300/.test(page), 'there is no error state');
assert.ok(/xl:grid-cols-2/.test(page), 'the two sides do not stack on a narrow screen');

/* -- the print keeps its headings, its footings, and every row ---------------- */

assert.ok(/<PrintStyles/.test(print), 'the print does not carry the shared page styles');
assert.ok(/<PadPrinting/.test(print), 'the print does not carry the letterhead');
assert.ok(/<PrintFooter/.test(print), 'the print does not carry the report foot');
assert.ok(/useReactToPrint/.test(page), 'the screen does not print through react-to-print');

assert.ok(/chunkRows/.test(print), 'the print does not cut long sections into page blocks');
assert.ok(
  /<thead>/.test(print) && /blocks\.map/.test(print),
  '⚠️ a continued block would print with no column heading over it',
);
assert.ok(
  /blockIndex === blocks\.length - 1/.test(print),
  '⚠️ the section Total is not confined to the last block -- it would print once per page',
);
assert.ok(
  /report\.closing/.test(print) && /report\.totals\?\.receipt/.test(print) && /report\.totals\?\.payment/.test(print),
  'the print omits the closing figure or a side total',
);
assert.ok(
  /section\.rows \?\? \[\]/.test(print) && /Number\(section\.total\)|section\.total/.test(print),
  'the print does not carry every row and the section footing',
);

/* -- no sample data anywhere -------------------------------------------------- */

for (const [name, source] of [['screen', page], ['print', print]]) {
    assert.ok(
        !/\b(Chan Miya|Bulbul Ahmed|Nasir Vai|15588|135,895|6,837,790)\b/.test(source),
        `⚠️ the ${name} carries figures copied off the screenshot`,
    );
}

console.log('ok -- Daily Account Book is routed, server-filtered, and prints every row with its headings and footings');
