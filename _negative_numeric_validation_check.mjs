/**
 * No negative number may be entered, or submitted, anywhere in the app.
 *
 *   node _negative_numeric_validation_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. "No negatives" is a rule over every money box, quantity
 * and rate in the application, and it is enforced in exactly two places: the
 * shared field (InputElement, which every numeric box renders through) and the
 * request gate (httpService, which every save goes through) -- plus the server's
 * own RejectNegativeNumbers. The reading of "is this negative" is the fragile
 * part: a hyphen is not a minus, and a minus is not always U+002D. So the
 * module is imported and RUN here rather than grepped, and the wiring that
 * reaches it is pinned statically alongside.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  NEGATIVE_VALUE_MESSAGE,
  isNegativeNumeric,
  parseNumericInput,
  findNegativePath,
} from './src/components/utils/utils-functions/nonNegative.ts';

const read = (path) => readFileSync(path, 'utf8');

let checked = 0;
const check = (title, fn) => {
  fn();
  checked += 1;
  console.log(`  ok  ${title}`);
};

/* ------------------------------------------------------------------ */
/* The reading of "is this a negative number"                          */
/* ------------------------------------------------------------------ */

check('the sentence is the one the business asked for', () => {
  assert.equal(NEGATIVE_VALUE_MESSAGE, 'Negative values are not allowed.');
});

check('negative integers, decimals and floats are caught', () => {
  for (const value of ['-12', '-12.50', -12, -12.5, '-0.01', '  -12.50  ', '-1e3']) {
    assert.equal(isNegativeNumeric(value), true, `${JSON.stringify(value)} should be negative`);
  }
});

check('alternate minus characters and formats cannot bypass it', () => {
  // Typographic dashes, accounting parentheses, thousands separators and the
  // Bengali / Arabic-Indic figures a clerk may actually type.
  for (const value of [
    '\u221212', // U+2212 MINUS SIGN
    '\u201312.50', // en dash
    '\u201412.50', // em dash
    '(12.50)', // accounting negative
    '-1,200.00',
    '-১২৩',
    '-١٢٣',
  ]) {
    assert.equal(isNegativeNumeric(value), true, `${JSON.stringify(value)} should be negative`);
  }
});

check('positive values, zero and blanks are left alone', () => {
  for (const value of ['500', '0', 0, '0.00', '1,200.00', '', '   ', '-', '+5', '.5', '12', '১২৩']) {
    assert.equal(isNegativeNumeric(value), false, `${JSON.stringify(value)} should be allowed`);
  }
});

check('a hyphen is not a minus: text, dates, phones and references pass', () => {
  for (const value of [
    '14-261000019',
    '2026-10-26',
    '0171-1234567',
    'paid half - the rest later',
    'KONKA-KK-889DH',
    'a-1',
    '--',
  ]) {
    assert.equal(isNegativeNumeric(value), false, `${JSON.stringify(value)} must not read as a number`);
  }
  assert.equal(parseNumericInput('12-3'), null);
});

check('non-numbers and objects are never read as negative', () => {
  for (const value of [null, undefined, true, false, {}, [], NaN, Infinity]) {
    assert.equal(isNegativeNumeric(value), false);
  }
});

/* ------------------------------------------------------------------ */
/* The payload walk                                                    */
/* ------------------------------------------------------------------ */

check('it finds a nested line item and names its path', () => {
  assert.equal(findNegativePath({ amount: 500, rows: [{ qty: 5 }, { qty: '-2' }] }), 'rows.1.qty');
  assert.equal(findNegativePath({ table_data: [{ rate: '-0.5' }] }), 'table_data.0.rate');
  assert.equal(findNegativePath({ amount: '-12' }), 'amount');
});

check('a clean payload passes', () => {
  assert.equal(findNegativePath({ amount: '500', rows: [{ qty: '5', rate: '10' }] }), null);
  assert.equal(findNegativePath({ vr_no: '14-261000019', vr_date: '2026-10-26' }), null);
  assert.equal(findNegativePath({ note: 'paid half - later' }), null);
});

check('a file upload is not walked', () => {
  const form = new FormData();
  form.append('amount', '-5');
  assert.equal(findNegativePath(form), null);
});

/* ------------------------------------------------------------------ */
/* The wiring: field and request gate                                  */
/*                                                                     */
/* The server's own half lives in the API repo and is covered by its    */
/* PHPUnit test (tests/Unit/RejectNegativeNumbersTest.php).            */
/* ------------------------------------------------------------------ */

check('the shared numeric field shows the inline message', () => {
  const field = read('src/components/utils/fields/InputElement.tsx');
  assert.ok(field.includes('isNegativeNumeric'), 'InputElement no longer reads the shared rule');
  assert.ok(
    field.includes('NEGATIVE_VALUE_MESSAGE'),
    'InputElement does not show the negative-value message',
  );
  // ⚠️ It must ask the VALUE, not the `type`: most money boxes on this app are
  // plain text inputs, and keying off type left them silent.
  assert.ok(
    /const negative = !disabled && isNegativeNumeric\(value\)/.test(field),
    'InputElement no longer flags every negative value (it must not depend on type="number")',
  );
});

check('no save leaves the browser with a negative in it', () => {
  const service = read('src/components/services/httpService.tsx');
  assert.ok(
    service.includes('findNegativePath(config.data)'),
    'httpService does not scan an outgoing body',
  );
  assert.ok(
    service.includes('allowNegativeValues'),
    'httpService has no opt-out for a genuinely signed body',
  );
  assert.ok(
    /method === 'post'/.test(service) && /method === 'put'/.test(service),
    'httpService no longer limits the gate to state-changing requests',
  );
});

console.log(`\n${checked} checks passed.`);
