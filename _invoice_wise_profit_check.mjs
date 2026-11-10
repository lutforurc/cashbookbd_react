/**
 * Invoice Wise Profit is wired up, reads the server's figures, and prints whole.
 *
 *   node _invoice_wise_profit_check.mjs
 *
 * Exit 0 when it is.
 *
 * ⚠️ WHY THIS EXISTS. Everything about this report is quiet when it breaks:
 *
 *   1. THE MENU AND THE GUARD DISAGREE. Three files have to name the same
 *      permission -- the sidebar gate, menuPermissions and the App.tsx guard --
 *      and a typo in one either hides the screen or leads the menu to
 *      /no-access. None of that raises an error at build time.
 *   2. THE FILTER SITS ON THE SCREEN. A report that fetched once and sifted on
 *      the client would show one invoice's profit over a whole month's rows.
 *      The search has to travel with branch and dates.
 *   3. THE TOTALS COVER ONLY WHAT IS ON PAPER. The foot must be the same
 *      figure on screen and on the sheet, and over the whole result.
 *   4. THE PRINT LOSES ITS HEADER OR ITS FOOTING.
 *
 * Pure static reading of the files, so it runs on any node.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const PAGE = 'src/components/modules/reports/invoice-wise-profit/InvoiceWiseProfit.tsx';
const PRINT = 'src/components/modules/reports/invoice-wise-profit/InvoiceWiseProfitPrint.tsx';

assert.ok(existsSync(PAGE), `${PAGE} is missing`);
assert.ok(existsSync(PRINT), `${PRINT} is missing`);

const page = read(PAGE);
const print = read(PRINT);

/* -- the route and the endpoint exist, and agree on the path ----------------- */

const appRoutes = read('src/components/services/appRoutes.tsx');
assert.ok(
  /invoice_wise_profit:\s*'\/reports\/invoice-wise-profit'/.test(appRoutes),
  'appRoutes is missing invoice_wise_profit',
);

const apiRoutes = read('src/components/services/apiRoutes.tsx');
assert.ok(
  /API_REPORT_INVOICE_WISE_PROFIT_URL\s*=\s*`\$\{API_BASE_URL\}\/reports\/invoice-wise-profit`/.test(apiRoutes),
  'apiRoutes does not point at /reports/invoice-wise-profit',
);

assert.ok(
  /import \{ API_REPORT_INVOICE_WISE_PROFIT_URL \}/.test(page),
  'the screen does not import its own endpoint',
);

/* -- the screen is routed, guarded, and on the menu --------------------------- */

const app = read('src/App.tsx');
assert.ok(
  /import InvoiceWiseProfit from '\.\/components\/modules\/reports\/invoice-wise-profit\/InvoiceWiseProfit'/.test(app),
  'App.tsx does not import InvoiceWiseProfit',
);
assert.ok(
  /anyOf=\{\['invoice\.wise\.profit'\]\}/.test(app) &&
    /path=\{routes\.invoice_wise_profit\} element=\{<InvoiceWiseProfit/.test(app),
  'App.tsx does not guard and mount the report on invoice.wise.profit',
);

const sidebar = read('src/components/Sidebar/index.tsx');
assert.ok(
  /\{ id: 'invoice_wise_profit', title: "Invoice Wise Profit" \}/.test(sidebar),
  'the sidebar submenu list does not declare Invoice Wise Profit',
);
assert.ok(
  /hasPermission\(permissions, 'invoice\.wise\.profit'\)/.test(sidebar),
  'the sidebar link is not gated on invoice.wise.profit',
);
assert.ok(
  /subSlot\('financial_statement', 'invoice_wise_profit'\)/.test(sidebar),
  'the sidebar link is not in the financial_statement menu slot',
);

const menuRoutes = read('src/components/Sidebar/menuRoutes.ts');
const financialRoutes = menuRoutes.slice(
  menuRoutes.indexOf("'financial_statement':"),
  menuRoutes.indexOf("'legacy':"),
);
assert.ok(
  /routes\.invoice_wise_profit,/.test(financialRoutes),
  'menuRoutes does not light Financial Statement for this path',
);

const menuPermissions = read('src/components/Sidebar/menuPermissions.ts');
const financialKeys = menuPermissions.slice(
  menuPermissions.indexOf('financial_statement:'),
  menuPermissions.indexOf('requisition:'),
);
assert.ok(
  /'invoice\.wise\.profit',/.test(financialKeys),
  'menuPermissions cannot open Financial Statement on invoice.wise.profit',
);

const searchItems = read('src/components/Header/globalSearchItems.ts');
assert.ok(
  /title: 'Invoice Wise Profit',[\s\S]{0,160}permissions: \['invoice\.wise\.profit'\]/.test(searchItems),
  'global search does not offer Invoice Wise Profit',
);

/* -- Help: the `?` needs a topic, and help:check needs it indexed ------------- */

const routeTopics = read('src/components/help/helpTopicForPath.ts');
assert.ok(
  /'\/reports\/invoice-wise-profit': 'invoice-wise-profit'/.test(routeTopics),
  'helpTopicForPath does not name the report its topic',
);

const helpTopic = JSON.parse(read('public/help/reports.json'))['invoice-wise-profit'];
assert.ok(helpTopic, 'public/help/reports.json has no invoice-wise-profit topic');
assert.ok(
  Array.isArray(helpTopic.sections) && helpTopic.sections.length > 0,
  'the help topic has no sections',
);

const helpIndex = read('public/help/index.json');
assert.ok(
  /"invoice-wise-profit"/.test(helpIndex),
  'public/help/index.json does not index the topic',
);

assert.ok(
  /Financial Statement → Invoice Wise Profit[^|]*\| `\/reports\/invoice-wise-profit` \| `invoice-wise-profit` \| done \|/.test(
    read('docs/help-coverage.md'),
  ),
  'docs/help-coverage.md has no done row for the report',
);

/* -- the filters travel to the server, not to a client-side sieve ------------- */

assert.ok(
  /httpService\.post\(API_REPORT_INVOICE_WISE_PROFIT_URL,/.test(page),
  'the screen does not post to its endpoint',
);
for (const field of ['branch_id:', 'startDate:', 'endDate:', 'search:']) {
  assert.ok(
    new RegExp(`\\b${field}`).test(page),
    `the report request does not carry ${field.replace(':', '')}`,
  );
}
assert.ok(
  /payload\?\.data\?\.data \?\? payload\?\.data/.test(page) &&
    /Array\.isArray\(reportData\?\.items\)/.test(page),
  'the response envelope is not unwrapped to items',
);

/* -- reading a row: date, amount, profit, and the two actions ----------------- */

assert.ok(
  /formatDayMonthYear\(row\?\.vr_date\)/.test(page),
  'the Date column does not go through the shared day/month/year formatter',
);
assert.ok(
  /thousandSeparator\(toNumber\(row\?\.invoice_amount\)\)/.test(page) &&
    /const profit = toNumber\(row\?\.profit\)/.test(page) &&
    /thousandSeparator\(profit\)/.test(page),
  'amount or profit is printed without the shared formatter',
);

assert.ok(
  /received_amount: toNumber\(item\?\.received_amount\)/.test(page) &&
    /discount: toNumber\(item\?\.discount\)/.test(page),
  'the received and discount figures are not mapped from the response',
);
assert.ok(
  /formatReceivedAmount/.test(page) &&
    /toLocaleString\("en-IN"/.test(page),
  'an invoice that took nothing does not print 0.00',
);
assert.ok(
  /header: "#"/.test(page) &&
    /header: "Received Amt"/.test(page) &&
    /header: "Customer"/.test(page),
  'the renamed columns or the Customer column are missing',
);
assert.ok(
  /row\?\.customer_name/.test(page),
  'the Customer column does not read the server field',
);
assert.ok(
  /canEditVoucherRow\(userPermissions, row\)/.test(page),
  'the pencil is not gated on the voucher edit permission',
);
assert.ok(
  /buildVoucherAutoEditStateForRow\(row\)/.test(page) &&
    /navigate\(target\.route, \{ state \}\)/.test(page),
  'the pencil does not open the invoice on its own screen',
);
assert.ok(
  /handleVoucherPrint\(\{ vr_no: row\.vr_no, mtm_id: row\.mid \}\)/.test(page),
  'the printer does not hand the voucher registry both the number and the id',
);
assert.ok(
  /<VoucherPrintRegistry/.test(page),
  'the screen renders no voucher registry, so the printer has nothing to print',
);

/* -- both feet are the same figure, over every row ---------------------------- */

assert.ok(
  /reportData\?\.summary/.test(page) &&
    /summary\.invoice_amount/.test(page),
  'the on-screen foot is not the server summary',
);
assert.ok(
  /footerRows = pagination\.total/.test(page),
  'the table has no total row',
);
assert.ok(
  /per_page: perPage/.test(page) &&
    /pagination\.lastPage/.test(page) &&
    /<Pagination/.test(page),
  'the table does not page through the server, 10 invoices at a time',
);
assert.ok(
  /row\?\.sl/.test(page),
  'the row number is not the server-wide one carried across pages',
);
assert.ok(
  /common\/Loader/.test(page) && /tableLoading \? <Loader \/> : null/.test(page),
  'a page change does not run the app loader',
);
assert.ok(
  /safeRows\.reduce\(/.test(print),
  'the printed total is not summed from every row',
);
assert.ok(
  /Customer/.test(print) &&
    /Received Amt/.test(print) &&
    /Discount/.test(print) &&
    /customer_name/.test(print),
  'the printed sheet is missing the customer or money columns',
);
assert.ok(
  /chunkRows\(safeRows, rowsPerPage\)/.test(print) &&
    /rowsPerPage = 12/.test(print),
  'the print does not paginate the whole set (or does not default a page size)',
);
assert.ok(
  /PrintFooter page=\{pageIndex \+ 1\} total=\{pages\.length\}/.test(print),
  'the printed pages carry no page count',
);
assert.ok(
  /<PrintStyles accent="black" \/>/.test(print),
  'the sheet is not pinned to black',
);
assert.ok(
  !/\bbg-(gray|slate|zinc|neutral|stone|blue|red)-/.test(print),
  'the printed table still carries a background fill',
);

console.log('Invoice Wise Profit: wiring, filters, actions and print all check out.');
