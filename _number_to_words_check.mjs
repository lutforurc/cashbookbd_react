/**
 * Money is spelled the Indian way -- thousand, lakh, crore.
 *
 *   node _number_to_words_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. The shared speller grouped in THREES and carried
 * million/billion scales, so 506,185 printed "Five Hundred Six Thousand One
 * Hundred Eighty Five" on every paper that spells an amount -- the two
 * ledgers' designer layouts among them. Nothing failed loudly: the words were
 * well-formed English, just not the numbering anybody here uses. The first
 * amount below is the one that was reported, and the Million/Karoor guards
 * below are what fails if the old grouping comes back.
 *
 * The file imports nothing and holds only type annotations, so node runs it as
 * it stands (v24 strips the types). Nothing here touches React.
 */
import assert from 'node:assert/strict';
import numberToWords from './src/components/utils/utils-functions/numberToWords.ts';

/* -- the amount that was reported ---------------------------------------- */

const reported = numberToWords(506185);
assert.equal(reported, 'Five Lakh Six Thousand One Hundred Eighty Five Taka');

// The old shape of the same figure, and the scales that produced it. Either
// one coming back is this bug.
assert.ok(!/Million|Billion|Trillion/.test(reported), 'an international scale is back');
assert.ok(!/Hundred Six Thousand/.test(reported), 'the digits are being grouped in threes again');

/* -- every boundary the grouping turns on --------------------------------- */

const cases = [
  [0, 'Zero Taka'],
  [7, 'Seven Taka'],
  [99, 'Ninety Nine Taka'],
  [100, 'One Hundred Taka'],
  [999, 'Nine Hundred Ninety Nine Taka'],
  [1000, 'One Thousand Taka'],
  [1050, 'One Thousand Fifty Taka'],
  [99999, 'Ninety Nine Thousand Nine Hundred Ninety Nine Taka'],
  [100000, 'One Lakh Taka'],
  [100001, 'One Lakh One Taka'],
  [999999, 'Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine Taka'],
  [1000000, 'Ten Lakh Taka'],
  [10000000, 'One Crore Taka'],
  [12345678, 'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Taka'],
  [
    999999999,
    'Ninety Nine Crore Ninety Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine Taka',
  ],
  // ⚠️ Above ninety-nine crore the word repeats rather than moving to a new
  // one. Two-digit groups would read this as "Ten Crore".
  [1000000000, 'One Hundred Crore Taka'],
  [10000000000, 'One Thousand Crore Taka'],
];

for (const [amount, expected] of cases) {
  assert.equal(numberToWords(amount), expected, `${amount} spelled wrong`);
}

// A string is what most call sites hand over -- a column out of a row.
assert.equal(numberToWords('506185'), reported, 'a string amount spells differently from a number');

/* -- what the callers do with it ----------------------------------------- */

// The suffix is the caller's: DocumentPrint appends " Only" itself.
assert.ok(reported.endsWith('Taka'), 'the currency word moved or went missing');

// Rounded to the nearest paisa, as before. Unchanged by the regrouping.
assert.equal(numberToWords(100.5), 'One Hundred Taka And Fifty Paisa');
assert.equal(numberToWords(1234.25), 'One Thousand Two Hundred Thirty Four Taka And Twenty Five Paisa');

// Signed, and spelled the same either way.
assert.equal(numberToWords(-506185), `Minus ${reported}`);

// ⚠️ A BLANK STRING IS A ZERO -- `Number('')` is 0, so it spells "Zero Taka".
// That is what this has always done, and it is why every caller guards the
// figure before spelling it: DocumentPrint prints nothing at all for a zero,
// because "Zero Only" on a receipt is a receipt for no money. Left as it was
// rather than special-cased, because a figure that really is 0 is a figure.
assert.equal(numberToWords(''), 'Zero Taka');
assert.equal(numberToWords(0), 'Zero Taka');

// Nothing at all to say, and the callers' blank checks depend on it being ''.
assert.equal(numberToWords('not a number'), '');
assert.equal(numberToWords(NaN), '');

// A currency other than Taka still works -- the parameter is not decoration.
assert.equal(numberToWords(100000, 'Rupee'), 'One Lakh Rupee');

console.log(`ok -- ${cases.length + 11} spellings, Indian grouping through 1,000 crore`);
