/**
 * Both invoice workflows behind one menu entry.
 *
 *     CHECK_ENTRY=_invoice_workflow_check.ts npx vite build --config vite.check.config.js \
 *       && node dist-check/_invoice_workflow_check.js
 *
 * The runtime half runs the real resolver the two index screens share. The
 * static half reads the files that wire it: the Forms Setup option, the switch,
 * the payloads, and the report Edit route.
 */
import { readFileSync } from 'node:fs';
import routes from './src/components/services/appRoutes';
import {
  INVOICE_WORKFLOW_ORDER,
  INVOICE_WORKFLOW_TILES,
  invoiceWorkflowForBranch,
  invoiceWorkflowFromRow,
  isInvoiceWorkflow,
  ownInvoiceWorkflow,
  pickInvoiceForm,
  withInvoiceWorkflowQuery,
} from './src/components/modules/invoices/shared/invoiceWorkflow';
import {
  buildVoucherAutoEditStateForRow,
  getVoucherEditRouteForRow,
  getVoucherEditTargetForRow,
} from './src/components/utils/utils-functions/voucherEditNavigation';

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
};
const read = (path: string) => readFileSync(path, 'utf8');

console.log('Workflow resolution\n');

check('tiles branch falls back to tiles', invoiceWorkflowForBranch(true) === INVOICE_WORKFLOW_TILES);
check('every other branch falls back to order', invoiceWorkflowForBranch(false) === INVOICE_WORKFLOW_ORDER);
// preferred, requested, legacy edit?, tiles branch?, inventory_system_id
const pick = (preferred: string, requested: string, legacyEdit: boolean, tiles: boolean, systemId: number) => {
  const p = pickInvoiceForm({
    preferred,
    requested,
    legacyEdit,
    ownWorkflow: ownInvoiceWorkflow(preferred, tiles, systemId),
    isTilesAndSanitary: tiles,
  });
  return `${p.form}${p.showSwitch ? '+switch' : ''}`;
};
check('Both: a tiles branch opens tiles with the switch', pick('both', '', false, true, 4) === 'tiles+switch');
check('Both: a trading branch opens order with the switch', pick('both', '', false, false, 4) === 'order+switch');
check('Both: an explicit "order" wins', pick('both', 'order', false, true, 4) === 'order+switch');
check('Both: an unknown word falls back, never through as a route', pick('both', 'bogus', false, true, 4) === 'tiles+switch');
check('Both: a legacy edit on a Smart branch keeps its own form', pick('both', '', true, false, 2) === 'own');
check('Both: the "auto" pin keeps the own form after the state clears', pick('both', 'auto', false, false, 2) === 'own');
check('Not Both: Tiles setup reopens an order invoice on its form', pick('tiles', 'order', false, true, 4) === 'order');
check('Not Both: a Smart branch ignores ?workflow=', pick('electronics', 'order', false, false, 2) === 'own');
check('Not Both: an Automatic General branch ignores ?workflow=', pick('', 'tiles', false, false, 1) === 'own');
check('only the two known words are accepted',
  isInvoiceWorkflow('order') && isInvoiceWorkflow('tiles') &&
  !isInvoiceWorkflow('both') && !isInvoiceWorkflow(null) && !isInvoiceWorkflow(''));

console.log('\nReport rows\n');

const tilesRow = { vr_no: '3-261100001', invoice_workflow: 'tiles' };
const orderRow = { vr_no: '3-261100002', invoice_workflow: 'order' };
const legacyRow = { vr_no: '3-261100003' };

check('a row names its workflow', invoiceWorkflowFromRow(tilesRow) === 'tiles');
check('an unknown value is not a workflow', invoiceWorkflowFromRow({ invoice_workflow: 'x' }) === null);
check('a legacy row has none', invoiceWorkflowFromRow(legacyRow) === null);

const tilesState = buildVoucherAutoEditStateForRow(tilesRow);
check('the auto-edit state carries the workflow', tilesState?.invoiceWorkflow === 'tiles');
check('the legacy state carries nothing', buildVoucherAutoEditStateForRow(legacyRow)?.invoiceWorkflow === undefined);

const target = getVoucherEditTargetForRow(tilesRow);
check('a "3-" row still opens Sales', target?.route === routes.inv_sales);
check('and the route names the form', getVoucherEditRouteForRow(tilesRow, target!) === `${routes.inv_sales}?workflow=tiles`);
check('a legacy row keeps the plain route', getVoucherEditRouteForRow(legacyRow, target!) === routes.inv_sales);
check('a "4-" row still opens Purchase',
  getVoucherEditTargetForRow({ vr_no: '4-261100001' })?.route === routes.inv_purchase);
check('the query helper appends, and does not double the mark',
  withInvoiceWorkflowQuery('/x', 'order') === '/x?workflow=order' &&
  withInvoiceWorkflowQuery('/x?a=1', 'tiles') === '/x?a=1&workflow=tiles' &&
  withInvoiceWorkflowQuery('/x', null) === '/x');

console.log('\nThe screens\n');

const salesIndex = read('src/components/modules/invoices/sales/SalesIndex.tsx');
const purchaseIndex = read('src/components/modules/invoices/purchase/PurchaseIndex.tsx');
const addBranch = read('src/components/modules/branch/AddBranch.tsx');
const autoEdit = read('src/components/utils/hooks/useVoucherAutoEditSearch.ts');
const salesLedger = read('src/components/modules/reports/salesledger/SalesLedger.tsx');
const purchaseLedger = read('src/components/modules/reports/purchaseledger/PurchaseLedger.tsx');

check('Sales Invoice renders the switch only in Both mode',
  /preferred === 'both'/.test(salesIndex) && /<InvoiceWorkflowSwitch/.test(salesIndex));
check('Sales Invoice mounts both existing forms from the choice',
  /<TilesBusinessSales \/>/.test(salesIndex) && /<TradingBusinessSales \/>/.test(salesIndex));
check('Purchase Invoice does the same',
  /preferred === 'both'/.test(purchaseIndex) &&
  /<InvoiceWorkflowSwitch/.test(purchaseIndex) &&
  /<TilesBusinessPurchase \/>/.test(purchaseIndex) &&
  /<TradingBusinessPurchase \/>/.test(purchaseIndex));

check('Forms Setup offers Both for Sales and Purchase',
  (addBranch.match(/id: 'both', name: 'Both — choose per invoice'/g) || []).length === 2);

check('the auto-edit search keeps the workflow query',
  /location\.pathname \+ location\.search/.test(autoEdit));

const formFiles: Array<[string, string, number]> = [
  ['src/components/modules/invoices/sales/TilesBusinessSales.tsx', 'INVOICE_WORKFLOW_TILES', 2],
  ['src/components/modules/invoices/sales/TradingBusinessSales.tsx', 'INVOICE_WORKFLOW_ORDER', 2],
  ['src/components/modules/invoices/purchase/TilesBusinessPurchase.tsx', 'INVOICE_WORKFLOW_TILES', 2],
  ['src/components/modules/invoices/purchase/TradingBusinessPurchase.tsx', 'INVOICE_WORKFLOW_ORDER', 2],
];
for (const [file, marker, expected] of formFiles) {
  const source = read(file);
  const count = (source.match(new RegExp(`invoice_workflow: ${marker}`, 'g')) || []).length;
  check(`${file.split('/').pop()} sends the workflow on save and update`, count === expected, `${count}`);
}

check('both ledgers route by the row',
  /getVoucherEditRouteForRow\(row, editTarget\)/.test(salesLedger) &&
  /getVoucherEditRouteForRow\(row, editTarget\)/.test(purchaseLedger));

console.log('\nThe two forms are still what they were\n');

const tradingSales = read('src/components/modules/invoices/sales/TradingBusinessSales.tsx');
const tilesSales = read('src/components/modules/invoices/sales/TilesBusinessSales.tsx');
const tradingPurchase = read('src/components/modules/invoices/purchase/TradingBusinessPurchase.tsx');
const tilesPurchase = read('src/components/modules/invoices/purchase/TilesBusinessPurchase.tsx');

check('Order Management Sales keeps both order pickers',
  (tradingSales.match(/<OrderDropdown/g) || []).length === 2 &&
  /API_ORDERS_DDL_URL/.test(tradingSales));
check('Order Management Purchase keeps its order picker',
  /<OrderDropdown/.test(tradingPurchase));
check('Tiles Sales keeps the delivery stock switch and the lock',
  /invoice_deducts_stock/.test(tilesSales) &&
  /delivery_locked/.test(tilesSales) &&
  /Deduct stock on delivery/.test(tilesSales));
check('Tiles Sales never grew an order picker',
  !/<OrderDropdown/.test(tilesSales));
check('Tiles Purchase keeps its own manual figures',
  /manual_voucher_no/.test(tilesPurchase) && /manual_challan_no/.test(tilesPurchase));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
