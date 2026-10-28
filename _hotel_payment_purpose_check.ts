/**
 * Hotel payment form: "What for" settling itself to Settlement.
 *
 *     set CHECK_ENTRY=_hotel_payment_purpose_check.ts
 *     npx vite build --config vite.check.config.js && node dist-check/_hotel_payment_purpose_check.js
 *
 * The one rule the Amount box owns: a figure equal to what is owed SETTLES the
 * bill, and nothing else does. Tested as arithmetic, because the screen's own
 * opening, resetting and submitting all read from the same two functions -- so a
 * full payment recorded as an advance, or a part payment recorded as a
 * settlement, is caught here rather than at the till.
 */
import {
  AMOUNT_EXCEEDS_BALANCE,
  PURPOSE_ADVANCE,
  PURPOSE_SETTLEMENT,
  asMinorUnits,
  exceedsBalance,
  purposeForAmount,
} from './src/components/modules/hotel/booking/paymentPurpose';

let pass = 0;
let fail = 0;

const check = (label: string, got: unknown, want: unknown) => {
  const ok = got === want;
  ok ? pass++ : fail++;

  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'}  ${label}` +
      (ok ? '' : ` -- got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`),
  );
};

const owed = 6400;

console.log('A figure that clears the bill settles it\n');
check('the whole balance settles', purposeForAmount(6400, owed, PURPOSE_ADVANCE), PURPOSE_SETTLEMENT);
check('...typed as a string too', purposeForAmount('6400', owed, PURPOSE_ADVANCE), PURPOSE_SETTLEMENT);
check('...and with the currency\u2019s own decimals', purposeForAmount('6400.00', owed, PURPOSE_ADVANCE), PURPOSE_SETTLEMENT);
check('a float that is the same money settles', purposeForAmount(6399.999999, owed, PURPOSE_ADVANCE), PURPOSE_SETTLEMENT);
check('a poisha over does not settle', purposeForAmount(6400.01, owed, PURPOSE_ADVANCE), PURPOSE_ADVANCE);
check('a poisha under does not settle', purposeForAmount(6399.99, owed, PURPOSE_ADVANCE), PURPOSE_ADVANCE);

console.log('\nAnything else does not\n');
check('a part payment is not a settlement', purposeForAmount(3200, owed, PURPOSE_ADVANCE), PURPOSE_ADVANCE);
check('  ...and the remembered choice comes back', purposeForAmount(3200, owed, 'refund'), 'refund');
check('an empty box is not a settlement', purposeForAmount('', owed, PURPOSE_ADVANCE), PURPOSE_ADVANCE);
check('a nought is not a settlement', purposeForAmount(0, owed, PURPOSE_ADVANCE), PURPOSE_ADVANCE);
check('a negative is not a settlement', purposeForAmount(-100, owed, PURPOSE_ADVANCE), PURPOSE_ADVANCE);
check('an overpayment is not a settlement', purposeForAmount(7000, owed, PURPOSE_ADVANCE), PURPOSE_ADVANCE);
check('junk is not a settlement', purposeForAmount('abc', owed, PURPOSE_ADVANCE), PURPOSE_ADVANCE);

console.log('\nA bill owing nothing never settles\n');
check('owed 0 -- a nought amount does not settle', purposeForAmount(0, 0, PURPOSE_ADVANCE), PURPOSE_ADVANCE);
check('owed 0 -- nor does any other figure', purposeForAmount(100, 0, PURPOSE_ADVANCE), PURPOSE_ADVANCE);
check('a credit balance does not settle', purposeForAmount(-500, -500, PURPOSE_ADVANCE), PURPOSE_ADVANCE);

console.log('\nThe comparison the rule rests on\n');
check('6400 and 6400.00 are the same money', asMinorUnits(6400) === asMinorUnits('6400.00'), true);
check('6400 and 6399.999999 are the same money', asMinorUnits(6400) === asMinorUnits(6399.999999), true);
check('6400 and 6400.01 are not the same money', asMinorUnits(6400) === asMinorUnits(6400.01), false);
check('an empty box is nought', asMinorUnits(''), 0);
check('junk is nought', asMinorUnits('abc'), 0);
check('a negative keeps its sign', asMinorUnits(-100), -10000);

console.log('\nThe Amount cap -- never more than is owed\n');
check('the whole balance is allowed', exceedsBalance(6400, owed), false);
check('a part payment is allowed', exceedsBalance(3200, owed), false);
check('a poisha over the balance is not', exceedsBalance(6400.01, owed), true);
check('an overpayment on top of the balance is not', exceedsBalance(7000, owed), true);
check('a float that is the same money is allowed', exceedsBalance(6399.999999, owed), false);
check('the message is the one the server sends', AMOUNT_EXCEEDS_BALANCE, 'Amount cannot exceed the outstanding balance.');

console.log('\n  ...and a balance that moved before Save was pressed\n');
check('6400 against 6400 is fine', exceedsBalance(6400, 6400), false);
check('  ...but is over once the other till has taken it', exceedsBalance(6400, 0), true);
check('a bill in credit is over for any positive figure', exceedsBalance(100, -500), true);
check('an empty box is never "over"', exceedsBalance('', 6400), false);

console.log(`\n${pass} passed, ${fail} failed\n`);

process.exit(fail ? 1 : 0);
