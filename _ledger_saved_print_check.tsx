/**
 * A saved Sales / Purchase Ledger print layout prints its product lines, and
 * rules them line by line like the report.
 *
 *     set CHECK_ENTRY=_ledger_saved_print_check.tsx
 *     npx vite build --config vite.check.config.js && node dist-check/_ledger_saved_print_check.js
 *
 * ⚠️ WHY THIS EXISTS. A tenant whose Product & Details cell came out blank
 * could repair it in the designer by pointing that column at "Account" -- or by
 * cutting its pattern down to `{coa_name}`. Both leave the heading promising
 * products over a column that is only the customer's name, with the figures
 * beside it still one per product. normalizeTemplate puts that column back on
 * the voucher's block; the renderer then rules each product line across the
 * cells that stack figures, standing in for the account and note lines the
 * product cell has and the others have not.
 *
 * The real normalizer, adapter and renderer are used; nothing is copied.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import store from './src/store';
import { updateSettings } from './src/components/modules/settings/settingsSlice';
import DocumentPrint from './src/components/utils/print-designer/DocumentPrint';
import { normalizeTemplate } from './src/components/utils/print-designer/printTemplate';
import { toSalesLedgerDocumentData } from './src/components/modules/reports/salesledger/salesLedgerDocumentData';

store.dispatch(updateSettings({ branch: { decimal_places: 2, stock_report_type: '0' } }));

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
};

const count = (haystack: string, needle: string) =>
  (haystack.match(new RegExp(needle, 'g')) || []).length;

const detail = (id: number, name: string) => ({
  id,
  quantity: id,
  sales_price: 100,
  product: { name, code: '', unit: { name: 'Pcs' } },
});

const row = (notes: string) => ({
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

/** The columns the tenant's sheet carries -- no Qty/Rate, as in the report. */
const savedLayout = (productColumn: any) => ({
  bands: [
    {
      type: 'table',
      bordered: true,
      columns: [
        { field: 'sl', label: 'Sl', width: 5, align: 'center' },
        { field: 'challan_no', label: 'Chal. & Date', width: 11, subField: 'challan_date' },
        productColumn,
        { field: 'amount_lines', label: 'Total', width: 12, align: 'right' },
        { field: 'discount', label: 'Disc.', width: 6, align: 'right' },
        { field: 'received', label: 'Received', width: 8, align: 'right' },
        { field: 'balance', label: 'Balance', width: 7, align: 'right' },
      ],
    },
  ],
});

const render = (layout: any, notes: string) => {
  const template = normalizeTemplate(layout, 'sales_ledger');
  const data = toSalesLedgerDocumentData({
    rows: [row(notes)],
    startDate: '2026-09-01',
    endDate: '2026-11-06',
    accountName: 'Ridoy Saha',
    branchName: 'Krishibitan Tiles & Sanitary Corner',
  });

  return renderToStaticMarkup(
    <Provider store={store}>
      <DocumentPrint template={template} data={data} preview />
    </Provider>,
  );
};

console.log('Saved ledger print layout\n');

/* -- a column repaired from "Account" ------------------------------------- */

const accountOnly = render(
  savedLayout({ field: 'coa_name', label: 'Product & Details', width: 33 }),
  '',
);

for (const name of ['Ridoy Saha', 'Marco Polo', 'Akij 24*24', 'Akij 8*12']) {
  check(`account-only layout prints ${name}`, accountOnly.includes(name));
}

/* -- a column repaired from a `{coa_name}` pattern ------------------------ */

const patternOnly = render(
  savedLayout({
    field: 'product_details_format',
    label: 'Product & Details',
    width: 33,
    pattern: '{coa_name}',
  }),
  '',
);

check('a `{coa_name}` pattern is restored', patternOnly.includes('Marco Polo'));

const ownFormatOnly = render(
  savedLayout({
    field: 'own_format',
    label: 'Product & Details',
    width: 33,
    pattern: '{coa_name}',
  }),
  '',
);

check('an own_format `{coa_name}` column is restored', ownFormatOnly.includes('Marco Polo'));

/* -- the rules, and the lines they need to land on ------------------------ */

// Three products, no note: the product cell is account + 3; the Total cell is
// spacer + 3. Both draw a rule under the first two lines -> 3 + 3 = 6.
check(
  'every product line but the last is ruled across the row',
  count(accountOnly, 'border-b border-gray-800') === 6,
  `${count(accountOnly, 'border-b border-gray-800')} rules`,
);
check(
  'the Total cell stands in for the account line',
  count(accountOnly, 'leading-snug invisible') === 1,
  `${count(accountOnly, 'leading-snug invisible')} spacers`,
);

const withNote = render(
  savedLayout({ field: 'coa_name', label: 'Product & Details', width: 33 }),
  'Delivered by hand.',
);

// With a note below the products the last product keeps its rule: 4 + 4 = 8,
// and the Total cell stands in for the note as well -> 2 spacers.
check(
  'a note keeps the last product line ruled',
  count(withNote, 'border-b border-gray-800') === 8,
  `${count(withNote, 'border-b border-gray-800')} rules`,
);
check(
  'the Total cell stands in for the note line too',
  count(withNote, 'leading-snug invisible') === 2,
  `${count(withNote, 'leading-snug invisible')} spacers`,
);

/* -- a layout that keeps a separate Account column is left alone ---------- */

const withAccountColumn = savedLayout({
  field: 'product_details_format',
  label: 'Product & Details',
  width: 30,
});
withAccountColumn.bands[0].columns.splice(3, 0, {
  field: 'coa_name',
  label: 'Account',
  width: 10,
});

const accountColumn = normalizeTemplate(withAccountColumn, 'sales_ledger').bands
  .filter((item) => item.type === 'table')
  .flatMap((item: any) => item.columns)
  .find((column: any) => column.field === 'coa_name');

check(
  'a separate Account column is left as the tenant arranged it',
  accountColumn?.label === 'Account',
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
