/**
 * The foot row under an invoice's Product Details table, drawn for real.
 *
 *     CHECK_ENTRY=_invoice_product_totals_row_check.tsx npx vite build --config vite.check.config.js \
 *       && node dist-check/_invoice_product_totals_row_check.js
 *
 * The sibling `_invoice_product_totals_check.mjs` reads the screens and says the
 * row is wired to the right two columns of each one's table. This one draws the
 * row and reads the markup back, because the props being right is not the same
 * as the figures landing under the columns they foot: the label has to take the
 * columns before it, the RATE COLUMN BETWEEN the two figures has to be left
 * empty rather than closed up, and the table has to come out the same width it
 * went in.
 *
 * The branch's own `decimal_places` reaches the figures through
 * thousandSeparator, so it is set on the real store here -- dp 2 -- and the sums
 * are read back in it.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductTotalsRow from './src/components/utils/utils-functions/ProductTotalsRow';
import store from './src/store';
import { updateSettings } from './src/components/modules/settings/settingsSlice';

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
};

store.dispatch(updateSettings({ branch: { decimal_places: 2 } }));

const render = (props: any) => renderToStaticMarkup(<ProductTotalsRow {...props} />);

/** Every <td> the row drew, in order, as its text ('' when it has none). */
const cellsOf = (html: string) =>
  (html.match(/<td[^>]*>.*?<\/td>/g) || []).map((cell) =>
    cell.replace(/<[^>]+>/g, '').trim(),
  );

/** The colspan on the first cell, which is the label's. */
const labelSpanOf = (html: string) => {
  const match = html.match(/<td colSpan="(\d+)"/i);
  return match ? Number(match[1]) : 1;
};

console.log('The foot row\n');

/* -- a 6-column invoice: Sl. No. | Product | Quantity | Rate | Total | Action -- */

const products = [
  { qty: 2, price: 1250.5, unit: 'Pcs' },
  { qty: 3, price: 400, unit: 'Pcs' },
  { qty: 1.5, price: 100, unit: 'Pcs' },
];

const six = render({ products, columnCount: 6, qtyColumn: 2, totalColumn: 4 });
const sixCells = cellsOf(six);

check('the label takes the two columns before the quantity', labelSpanOf(six) === 2, `colspan ${labelSpanOf(six)}`);
check('the label reads Grand Total', sixCells[0] === 'Grand Total', sixCells[0]);

// label | Quantity | Rate (empty) | Total | Action (empty)
// 2 + 3 + 1.5 = 6.5
check('the quantity sum stands under the Quantity heading', sixCells[1] === '6.50', sixCells[1]);
// ⚠️ The rate column is BETWEEN the two figures and must be left blank -- one
// cell per column, so the money cannot slide up into the rate's place.
check('the rate column is left empty', sixCells[2] === '', JSON.stringify(sixCells[2]));
// 2*1250.5 + 3*400 + 1.5*100 = 3851.00
check('the money sum stands under the Total heading', sixCells[3] === '3,851.00', sixCells[3]);
check('the action column is left empty', sixCells[4] === '', JSON.stringify(sixCells[4]));
check('no third figure was drawn', sixCells.length === 5, `${sixCells.length} cells`);

// ⚠️ Six columns of paper, however many cells were drawn: the label's span plus
// one cell for each column that follows it.
check('the row still fills the table it sits under', labelSpanOf(six) + sixCells.length - 1 === 6);

/* -- the trading table, where the weight variance shifts Quantity to third -- */

const seven = render({ products, columnCount: 7, qtyColumn: 3, totalColumn: 5 });
const sevenCells = cellsOf(seven);

check('the label takes the three columns before the quantity', labelSpanOf(seven) === 3, `colspan ${labelSpanOf(seven)}`);
check('the quantity still sums', sevenCells[1] === '6.50', sevenCells[1]);
check('the rate column is still left empty', sevenCells[2] === '', JSON.stringify(sevenCells[2]));
check('the money still sums after the rate', sevenCells[3] === '3,851.00', sevenCells[3]);
check('the action column is still left empty', sevenCells[4] === '');
check('a seven-column table gets a seven-column row', labelSpanOf(seven) + sevenCells.length - 1 === 7);

/* -- an empty table draws nothing at all ------------------------------------ */

check('no foot under an empty product list', render({ products: [], columnCount: 6, qtyColumn: 2, totalColumn: 4 }) === '');
check('no foot when the list is missing', render({ products: undefined, columnCount: 6, qtyColumn: 2, totalColumn: 4 }) === '');

/* -- the arithmetic is the screens' own ------------------------------------- */

const single = render({ products: [{ qty: 1, price: 99.99 }], columnCount: 6, qtyColumn: 2, totalColumn: 4 });
check('one line foots as that line reads', cellsOf(single)[3] === '99.99', cellsOf(single)[3]);

const strings = render({ products: [{ qty: '2', price: '10' }, { qty: '3', price: '10' }], columnCount: 6, qtyColumn: 2, totalColumn: 4 });
check(
  'a quantity that arrives as text still adds up',
  cellsOf(strings)[1] === '5.00' && cellsOf(strings)[3] === '50.00',
  JSON.stringify(cellsOf(strings)),
);

// ⚠️ A line with no quantity is the screens' own problem -- their `totalAmount`
// comes to NaN for one too -- and what must not reach the paper is the WORD.
// thousandSeparator answers a non-number with its dash, which is what the line
// above shows as well.
const ragged = render({ products: [{ qty: 1, price: 10 }, { qty: '', price: 10 }], columnCount: 6, qtyColumn: 2, totalColumn: 4 });
check(
  'a line with no quantity never prints the word NaN',
  !ragged.includes('NaN') && cellsOf(ragged)[1] === '1.00',
  JSON.stringify(cellsOf(ragged)),
);

/* -- the row is the shared one, not a copy ---------------------------------- */

check(
  'the row has no store or print dependency of its own',
  !/useSelector|useDispatch|react-to-print/.test(
    readFileSync('src/components/utils/utils-functions/ProductTotalsRow.tsx', 'utf8'),
  ),
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
