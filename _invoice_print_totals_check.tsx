/**
 * The foot under the printed invoice's Product Details table.
 *
 *     CHECK_ENTRY=_invoice_print_totals_check.tsx npx vite build --config vite.check.config.js \
 *       && node dist-check/_invoice_print_totals_check.js
 *
 * The printed paper is the other half of the same request, and it is the half
 * that is easy to get wrong in a way nobody notices: the designer's table can
 * already foot itself, but it foots by COLUMN NAME out of the totals map -- so
 * what this draws and reads back is that the quantity and the money come to
 * something and the rate between them does not. A rate footed would put the sum
 * of six identical prices on the paper beside the money they were charged at.
 *
 * The four invoice papers are drawn: the two invoices, and the two returns,
 * which are built from their invoices rather than drawn of their own -- so a
 * foot on the invoice that the return then dropped would show up here.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import DocumentPrint from './src/components/utils/print-designer/DocumentPrint';
import { defaultTemplate, normalizeTemplate } from './src/components/utils/print-designer/printTemplate';
import store from './src/store';
import { updateSettings } from './src/components/modules/settings/settingsSlice';

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
};

store.dispatch(updateSettings({ branch: { decimal_places: 2 } }));

const products = [
  { id: 1, product_name: 'Walton Fridge', qty: 2, price: 100, amount: 200 },
  { id: 2, product_name: 'Walton Fan', qty: 3, price: 50, amount: 150 },
];

const documentData = {
  basic: { vr_no: '3-261000001', vr_date: '2026-10-20', party_name: 'Rahim Traders' },
  products,
};

const render = (template: any) =>
  renderToStaticMarkup(
    <Provider store={store}>
      <DocumentPrint template={template} data={documentData} preview />
    </Provider>,
  );

/** The foot row's own cells, as text, with the label's span. */
const footOf = (html: string) => {
  const row = html.match(/<tr class="avoid-break font-bold">(.*?)<\/tr>/);
  if (!row) return null;

  const span = row[1].match(/<td colSpan="(\d+)"/i);
  const cells = (row[1].match(/<td[^>]*>.*?<\/td>/g) || []).map((cell) =>
    cell.replace(/<[^>]+>/g, '').trim(),
  );

  return { labelSpan: span ? Number(span[1]) : 1, cells };
};

const label = (foot: any) => (foot && foot.cells[0]) || '';

console.log('The printed invoice foot\n');

/* ══════════════════════════════════════════════════════════════════════════ */
/* The four invoice papers                                                      */
/* ══════════════════════════════════════════════════════════════════════════ */

const foots: Record<string, any> = {};

for (const docType of ['sales_invoice', 'purchase_invoice', 'sales_return', 'purchase_return']) {
  foots[docType] = footOf(render(defaultTemplate(docType as any)));
}

check(
  'every invoice paper draws a foot under its product table',
  Object.values(foots).every((foot) => foot !== null),
  Object.entries(foots).filter(([, foot]) => !foot).map(([docType]) => docType).join(', ') || 'none missing',
);

check(
  'the foot is the Grand Total',
  Object.values(foots).every((foot) => label(foot) === 'Grand Total'),
  Object.values(foots).map(label).join(' | '),
);

/* -- the two invoices, whose tables are not the same shape ------------------ */

// Sales Invoice: # | Product | Measurement | Packaging | Qty | Rate | Amount
// -- but the Meas. and Packaging columns are WITHDRAWN when no line on the
// paper carries either (DocumentPrint drops an optional column nobody filled),
// so these lines print # | Product | Qty | Rate | Amount and the label takes
// the two columns before the quantity. Put a measurement on a line and the
// label widens to four on its own -- that is the column hiding, not this row.
const sales = foots.sales_invoice;
check('the sales foot starts under the Qty column', sales.labelSpan === 2, `colspan ${sales.labelSpan}`);
check('the sales quantity foots to 5', sales.cells[1] === '5.00', sales.cells[1]);
check('the sales RATE is not footed', sales.cells[2] === '', JSON.stringify(sales.cells[2]));
check('the sales money foots to 350', sales.cells[3] === '350.00', sales.cells[3]);

// Purchase Invoice: # | Product | Qty | Rate | Amount -- the rate sits between.
const purchase = foots.purchase_invoice;
check('the purchase foot starts under the Qty column', purchase.labelSpan === 2, `colspan ${purchase.labelSpan}`);
check('the purchase quantity foots to 5', purchase.cells[1] === '5.00', purchase.cells[1]);
check('the purchase RATE is not footed', purchase.cells[2] === '', JSON.stringify(purchase.cells[2]));
check('the purchase money foots to 350', purchase.cells[3] === '350.00', purchase.cells[3]);

/* -- the returns inherit both the layout and the foot ----------------------- */

check(
  'a sales return foots like the sales invoice it is built from',
  foots.sales_return.labelSpan === 2 &&
    foots.sales_return.cells[1] === '5.00' &&
    foots.sales_return.cells[2] === '' &&
    foots.sales_return.cells[3] === '350.00',
  JSON.stringify(foots.sales_return),
);

check(
  'a purchase return foots like the purchase invoice it is built from',
  foots.purchase_return.labelSpan === 2 &&
    foots.purchase_return.cells[1] === '5.00' &&
    foots.purchase_return.cells[2] === '' &&
    foots.purchase_return.cells[3] === '350.00',
  JSON.stringify(foots.purchase_return),
);

/* ══════════════════════════════════════════════════════════════════════════ */
/* A layout a tenant has already saved keeps its own answer                     */
/* ══════════════════════════════════════════════════════════════════════════ */

const savedWithoutFoot = normalizeTemplate(
  {
    bands: [
      { id: 'title', type: 'title', text: 'Sales Invoice', align: 'center', scale: 1.5 },
      { id: 'table', type: 'table', columns: [{ field: 'sl' }, { field: 'qty' }, { field: 'amount' }] },
    ],
  },
  'sales_invoice',
);

const savedMarkup = render(savedWithoutFoot);
check(
  'a saved layout that never asked for the row does not get one',
  !savedMarkup.includes('Grand Total'),
);

const savedWithFoot = normalizeTemplate(
  {
    bands: [
      { id: 'title', type: 'title', text: 'Sales Invoice', align: 'center', scale: 1.5 },
      {
        id: 'table',
        type: 'table',
        totalRow: true,
        columns: [{ field: 'sl' }, { field: 'qty' }, { field: 'amount' }],
      },
    ],
  },
  'sales_invoice',
);

const savedWithFootMarkup = render(savedWithFoot);
const savedFoot = footOf(savedWithFootMarkup);
// This saved table has no rate column of its own -- # | Qty | Amount -- so the
// label takes the one column before the quantity and the two figures sit next
// to each other. The foot follows the table it is put under.
check(
  'a saved layout that asked for it keeps it, footed the same way',
  savedFoot !== null && savedFoot.cells[1] === '5.00' && savedFoot.cells[2] === '350.00',
  JSON.stringify(savedFoot),
);

/* ══════════════════════════════════════════════════════════════════════════ */
/* Nothing on the paper moved for the papers that were not asked about          */
/* ══════════════════════════════════════════════════════════════════════════ */

for (const docType of ['sales_challan', 'hotel_bill']) {
  const markup = render(defaultTemplate(docType as any));
  check(`${docType} is left exactly as it was -- no foot`, !markup.includes('Grand Total'));
}

/* ⚠️ The ORDER SHEET already footed its table before any of this -- what is
   pinned here is that it still does, and still foots the same columns: the
   order's money means something different from the invoice's (it also carries
   what was received against it and what is still due), so its foot is longer
   and the rate in the middle stays empty just the same. */
const orderFoot = footOf(render(defaultTemplate('sales_order')));
check('the order sheet still foots its table', orderFoot !== null && label(orderFoot) === 'Grand Total');
check(
  'the order foots its quantity and amount, and not its rate',
  orderFoot.cells[1] === '5.00' && orderFoot.cells[2] === '' && orderFoot.cells[3] === '350.00',
  JSON.stringify(orderFoot.cells),
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
