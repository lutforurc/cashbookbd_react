/**
 * Delivery Report print: does the paper draw what the screen holds?
 *
 *     CHECK_ENTRY=_delivery_report_print_check.tsx npx vite build --config vite.check.config.js \
 *       && node dist-check/_delivery_report_print_check.js
 *
 * Renders the real DeliveryReportPrint to markup with a stub store (the pad
 * reads settings) and reads the result back: sheets cut by the Rows box, the
 * serial carried across sheets, the total on the last sheet only, and the
 * screen still built on the shared Table with the Cash Book's print controls.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DeliveryReportPrint from './src/components/modules/delivery/DeliveryReportPrint';

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
};

const store = configureStore({ reducer: { settings: () => ({ data: { branch: {} } }) } });

const rows = Array.from({ length: 5 }, (_, i) => ({
  mtm_id: i + 1,
  vr_no: `3-26100000${i + 1}`,
  vr_date: '2026-10-20', // as the API sends it
  customer_name: `Customer ${i + 1}`,
  ordered: 10,
  delivered: i < 2 ? 10 : i < 4 ? 4 : 0,
  pending: i < 2 ? 0 : i < 4 ? 6 : 10,
  status: i < 2 ? 'complete' : i < 4 ? 'partial' : 'none',
}));

const render = (props: any) =>
  renderToStaticMarkup(
    <Provider store={store}>
      <DeliveryReportPrint {...props} />
    </Provider>,
  );

console.log('Delivery Report print\n');

const one = render({ rows, startDate: '01/10/2026', endDate: '21/10/2026', rowsPerPage: 0, fontSize: 10 });
check('one block when Rows is 0', (one.match(/class="print-page"/g) || []).length === 1);
check('title and date range on the sheet', one.includes('Delivery Report') && one.includes('01/10/2026 to 21/10/2026'));
check('every row drawn', rows.every((r) => one.includes(r.vr_no)));
check('date printed DD/MM/YYYY like the Cash Book', one.includes('20/10/2026') && !one.includes('2026-10-20'));
check('statuses in words', ['Complete', 'Partial', 'Not delivered'].every((w) => one.includes(w)));
check('grand total: ordered 50, delivered 28, pending 22', /Total<\/td><td[^>]*>50<\/td><td[^>]*>28<\/td><td[^>]*>22</.test(one));
check('font size reaches the cells', one.includes('font-size:10px'));

const paged = render({ rows, rowsPerPage: 2, fontSize: 9 });
check('Rows = 2 cuts three sheets', (paged.match(/class="print-page"/g) || []).length === 3);
check('page breaks between sheets only', (paged.match(/class="page-break"/g) || []).length === 2);
check('total on the last sheet only', (paged.match(/>Total</g) || []).length === 1);
const sheets = paged.split('class="print-page"').slice(1);
check('serial carries across sheets (sheet 3 starts at 5)', /<td[^>]*>5<\/td><td[^>]*>3-261000005/.test(sheets[2] || ''));
check('no dates chosen reads "All dates"', paged.includes('All dates'));

const empty = render({ rows: [], rowsPerPage: 0 });
check('no rows: "No data found", no total', empty.includes('No data found') && !empty.includes('>Total<'));

console.log('\nThe screen\n');
const screen = readFileSync('src/components/modules/delivery/DeliveryReport.tsx', 'utf8');
check('built on the shared Table', /import Table from '\.\.\/\.\.\/utils\/others\/Table'/.test(screen) && /<Table\b/.test(screen));
check('totals through Table footerRows', /footerRows=\{/.test(screen));
check("Cash Book's Rows / Font / Print controls", /<PrintRowsInput/.test(screen) && /<PrintFontInput/.test(screen) && /<PrintButton/.test(screen));
check('prints the component, not the whole window', /useReactToPrint\(/.test(screen) && !/window\.print\(\)/.test(screen));
check('no hand-written <table> left', !/<table\b/.test(screen));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
