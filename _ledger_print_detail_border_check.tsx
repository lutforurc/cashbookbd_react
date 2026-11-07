/**
 * Both printed ledgers carry the same rule under each product line as their
 * screens do -- across Product & Details, Quantity, Rate and Total.
 *
 *     set CHECK_ENTRY=_ledger_print_detail_border_check.tsx
 *     npx vite build --config vite.check.config.js && node dist-check/_ledger_print_detail_border_check.js
 *
 * ⚠️ WHY THIS EXISTS. On screen the rule is a themed border on a stacked div;
 * on paper it is a black hairline that has to run to the cell edges, and the
 * Quantity/Rate/Total cells have to stand in for the account line the product
 * cell draws above its products or every rule below the first is a line out.
 * A mistaken `-mx-2` or a spacer dropped from one column still renders, still
 * looks like a table -- it is only wrong. This reads the markup back.
 *
 * The real components are rendered; nothing is copied.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import store from './src/store';
import { updateSettings } from './src/components/modules/settings/settingsSlice';
import SalesLedgerPrint from './src/components/modules/reports/salesledger/SalesLedgerPrint';
import PurchaseLedgerPrint from './src/components/modules/reports/purchaseledger/PurchaseLedgerPrint';

store.dispatch(
  updateSettings({
    branch: {
      decimal_places: 2,
      stock_report_type: '0',
      ledger_show_product_details: '1',
    },
  }),
);

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
};

const detail = (id: number, name: string) => ({
  id,
  quantity: id,
  sales_price: 100,
  purchase_price: 100,
  product: { name, code: '', unit: { name: 'Pcs' } },
});

const salesRow = (notes: string) => ({
  id: 1,
  sl_number: 1,
  challan_no: '3-261000001',
  challan_date: '01/10/2026',
  acc_transaction_master: [
    { acc_transaction_details: [{ coa4_id: 40, coa_l4: { name: 'Ridoy Saha' } }] },
  ],
  sales_master: {
    total: 600,
    notes,
    details: [detail(1, 'Marco Polo'), detail(2, 'Akij 24*24'), detail(3, 'Akij 8*12')],
  },
});

const purchaseRow = (notes: string) => ({
  id: 1,
  sl_number: 1,
  challan_no: '3-261000001',
  challan_date: '01/10/2026',
  acc_transaction_master: [
    { acc_transaction_details: [{ coa4_id: 40, coa_l4: { name: 'Ridoy Saha' } }] },
  ],
  purchase_master: {
    total: 600,
    notes,
    details: [detail(1, 'Marco Polo'), detail(2, 'Akij 24*24'), detail(3, 'Akij 8*12')],
  },
});

const count = (haystack: string, needle: string) => (haystack.match(new RegExp(needle, 'g')) || []).length;

const render = (Component: any, row: any) =>
  renderToStaticMarkup(
    <Provider store={store}>
      <Component rows={[row]} rowsPerPage={8} fontSize={9} />
    </Provider>,
  );

console.log('Printed ledger detail rules\n');

for (const [name, Component, row] of [
  ['Sales', SalesLedgerPrint, salesRow('')],
  ['Purchase', PurchaseLedgerPrint, purchaseRow('')],
] as const) {
  const html = render(Component as any, row as any);

  // Three product lines, no note: the first two are ruled in each of the four
  // stacked columns; the last is left to the cell's own border.
  check(
    `${name}: every product line but the last is ruled in all four columns`,
    count(html, 'border-b border-gray-900') === 8,
    `${count(html, 'border-b border-gray-900')} ruled lines`,
  );
  check(
    `${name}: the rule runs to the cell edges`,
    count(html, '\\-mx\\-2 border\\-b border\\-gray\\-900 px\\-2') === 8,
    `${count(html, '\\-mx\\-2 border\\-b border\\-gray\\-900 px\\-2')} full-width rules`,
  );
  check(
    `${name}: the numeric cells stand in for the account line`,
    count(html, 'invisible select-none') === 3,
    `${count(html, 'invisible select-none')} spacers`,
  );
}

for (const [name, Component, row] of [
  ['Sales', SalesLedgerPrint, salesRow('Delivered by hand.')],
  ['Purchase', PurchaseLedgerPrint, purchaseRow('Delivered by hand.')],
] as const) {
  const html = render(Component as any, row as any);

  // A note below the products keeps the last product ruled, so the stack still
  // reads line by line.
  check(
    `${name}: a note keeps the last product line ruled`,
    count(html, 'border-b border-gray-900') === 12,
    `${count(html, 'border-b border-gray-900')} ruled lines`,
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
