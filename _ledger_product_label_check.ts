/**
 * The ledger's Product & Details block, run through the real document-data
 * adapters (the ones the preview and the print designer read).
 *
 *     set CHECK_ENTRY=_ledger_product_label_check.ts
 *     npx vite build --config vite.check.config.js && node dist-check/_ledger_product_label_check.js
 *
 * ⚠️ WHY THIS EXISTS. A product called "Carrying (Cement)" sits under a category
 * called "Carrying"; prefixing the category printed the word twice -- "Carrying
 * Carrying (Cement)". And when the branch switches product information off, the
 * product lines must go while the account and the voucher's own note stay. Both
 * failures are silent: the cell just shows the wrong thing.
 */
import { toSalesLedgerDocumentData } from './src/components/modules/reports/salesledger/salesLedgerDocumentData';
import { toPurchaseLedgerDocumentData } from './src/components/modules/reports/purchaseledger/purchaseLedgerDocumentData';

let pass = 0;
let fail = 0;

const check = (label: string, ok: boolean, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  ok    ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
  }
};

const product = { name: 'Carrying (Cement)', category: { name: 'Carrying' } };

const salesRow = {
  id: 318,
  sales_master: {
    details: [{ id: 1, quantity: 20, sales_price: 500, product }],
    notes: 'Delivery by truck',
    total: 10000,
  },
  acc_transaction_master: [
    {
      acc_transaction_details: [
        { coa4_id: 319, debit: 10000, credit: 0, coa_l4: { name: 'Md. Khanjahan Ali (Customer)' } },
        { coa4_id: 15, debit: 0, credit: 10000, coa_l4: { name: 'Sales' } },
      ],
    },
  ],
};

const purchaseRow = {
  id: 900,
  purchase_master: {
    details: [{ id: 2, quantity: 5, purchase_price: 400, product }],
    notes: 'Supplied by truck',
    total: 2000,
  },
  acc_transaction_master: [
    {
      acc_transaction_details: [
        { coa4_id: 320, credit: 2000, debit: 0, coa_l4: { name: 'Karim Traders (Supplier)' } },
        { coa4_id: 16, debit: 2000, credit: 0, coa_l4: { name: 'Purchase' } },
      ],
    },
  ],
};

/* -- enabled: the product line is drawn, the category is not repeated ------ */

const salesOn = toSalesLedgerDocumentData({ rows: [salesRow], showCategory: true, showProductDetails: true }).products[0];
check(
  'sales on: the product line is drawn',
  salesOn.product_details_lines.includes('Carrying (Cement)'),
  JSON.stringify(salesOn.product_details_lines),
);
check(
  'sales on: the category is not repeated ("Carrying Carrying (Cement)")',
  !salesOn.product_details_flat.includes('Carrying Carrying'),
  salesOn.product_details_flat,
);

const purchaseOn = toPurchaseLedgerDocumentData({ rows: [purchaseRow], showCategory: true, showProductDetails: true }).products[0];
check(
  'purchase on: the product line is drawn',
  purchaseOn.product_details_lines.includes('Carrying (Cement)'),
  JSON.stringify(purchaseOn.product_details_lines),
);
check(
  'purchase on: the category is not repeated',
  !purchaseOn.product_details_flat.includes('Carrying Carrying'),
  purchaseOn.product_details_flat,
);

/* -- disabled: the product goes, the account and the note stay ------------- */

const salesOff = toSalesLedgerDocumentData({ rows: [salesRow], showCategory: true, showProductDetails: false }).products[0];
check('sales off: the product line is gone', !salesOff.product_details_flat.includes('Carrying (Cement)'), salesOff.product_details_flat);
check('sales off: the account stays', salesOff.product_details_flat.includes('Md. Khanjahan Ali (Customer)'), salesOff.product_details_flat);
check("sales off: the voucher's own note stays", salesOff.product_details_flat.includes('Delivery by truck'), salesOff.product_details_flat);

const purchaseOff = toPurchaseLedgerDocumentData({ rows: [purchaseRow], showCategory: true, showProductDetails: false }).products[0];
check('purchase off: the product line is gone', !purchaseOff.product_details_flat.includes('Carrying (Cement)'), purchaseOff.product_details_flat);
check('purchase off: the account stays', purchaseOff.product_details_flat.includes('Karim Traders (Supplier)'), purchaseOff.product_details_flat);
check("purchase off: the voucher's own note stays", purchaseOff.product_details_flat.includes('Supplied by truck'), purchaseOff.product_details_flat);

/* -- a product that does not carry its category still gets the prefix ------- */

const plain = toSalesLedgerDocumentData({
  rows: [{ ...salesRow, sales_master: { ...salesRow.sales_master, details: [{ id: 3, quantity: 1, sales_price: 100, product: { name: 'Cement', category: { name: 'Carrying' } } }] } }],
  showCategory: true,
  showProductDetails: true,
}).products[0];
check('a product whose name does not carry its category keeps the prefix', plain.product_details_flat.includes('Carrying Cement'), plain.product_details_flat);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
