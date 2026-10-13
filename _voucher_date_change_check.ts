/**
 * Voucher Change Date: does the screen accept exactly the ranges it should?
 *
 *     set CHECK_ENTRY=_voucher_date_change_check.ts
 *     npx vite build --config vite.check.config.js && node dist-check/_voucher_date_change_check.js
 *
 * ⚠️ WHY THIS EXISTS
 *
 * The voucher type is no longer picked from a dropdown -- it is read out of the
 * voucher numbers, together with the year, month and sequence. A range that
 * mixes two run numbers, two months, or an End before its Start must be refused
 * before it reaches the server, and the message has to say which of those it
 * is. The sequence is compared as a NUMBER, so 9 sits below 10 even though the
 * padded strings would order the other way.
 */
import { parseVoucherNumber, validateVoucherRange } from './src/components/modules/change_date/voucherNumber';

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

console.log('Voucher Change Date — voucher number range\n');

// ── Parsing ────────────────────────────────────────────────────────────────
const parsed = parseVoucherNumber('10-261000001');
check(
  'the components are read out of the number',
  parsed !== null && parsed.type === '10' && parsed.year === '26' && parsed.month === '10' && parsed.sequence === 1,
  JSON.stringify(parsed),
);
check('a number with no dash is refused', parseVoucherNumber('10261000001') === null);
check('a four-digit tail is refused', parseVoucherNumber('10-26100001') === null);
check('month 13 is refused', parseVoucherNumber('10-261300001') === null);
check('empty is refused', parseVoucherNumber('') === null);

// ── VALID ranges ───────────────────────────────────────────────────────────
check('a simple range is valid', validateVoucherRange('10-261000010', '10-261000020') === null);
check(
  'identical Start and End is a valid single voucher',
  validateVoucherRange('10-261000010', '10-261000010') === null,
);
check(
  'the sequence is compared as a number, not a string',
  validateVoucherRange('10-261000009', '10-261000010') === null,
);

// ── INVALID ranges, each with its own message ──────────────────────────────
check(
  'End earlier than Start is refused',
  validateVoucherRange('10-261000010', '10-261000009') ===
    'End voucher number cannot be earlier than the Start voucher number.',
  String(validateVoucherRange('10-261000010', '10-261000009')),
);
check(
  'a different (earlier) month is refused',
  validateVoucherRange('10-261000010', '10-260900020') ===
    'Start and End voucher numbers must belong to the same month and year.',
);
check(
  'a later month is also refused',
  validateVoucherRange('10-261000010', '10-261100001') ===
    'Start and End voucher numbers must belong to the same month and year.',
);
check(
  'a different year is refused',
  validateVoucherRange('10-261000010', '10-251000020') ===
    'Start and End voucher numbers must belong to the same month and year.',
);
check(
  'a different voucher type is refused',
  validateVoucherRange('10-261000010', '19-261000020') ===
    'Start and End voucher numbers must have the same voucher type.',
);
check(
  'a malformed Start is refused',
  validateVoucherRange('nope', '10-261000020') === 'Start voucher number is not a valid voucher number.',
);
check(
  'a malformed End is refused',
  validateVoucherRange('10-261000010', 'nope') === 'End voucher number is not a valid voucher number.',
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
