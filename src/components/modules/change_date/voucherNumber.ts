/**
 * A voucher number is `<type>-<YY><MM><sequence>`:
 *
 *     10-261000001   type 10, year 26 (2026), month 10 (October), sequence 1
 *
 * The type, year, month and sequence are read out of the NUMBER itself. They
 * are deliberately not read from the voucher's date: a number is minted once
 * and never changes, so a voucher dated into another month still carries the
 * month it was born in.
 */
export const VOUCHER_NUMBER_PATTERN = /^(\d+)-(\d{2})(\d{2})(\d{5,})$/;

export type ParsedVoucherNumber = { type: string; year: string; month: string; sequence: number };

export const parseVoucherNumber = (value?: string | null): ParsedVoucherNumber | null => {
  const match = VOUCHER_NUMBER_PATTERN.exec((value ?? '').trim());
  if (!match) return null;

  const month = Number(match[3]);
  if (month < 1 || month > 12) return null;

  return { type: match[1], year: match[2], month: match[3], sequence: Number(match[4]) };
};

/**
 * The rule the Start and End of a range must satisfy together.
 *
 * Returns the message that explains the actual problem, or null when the pair
 * is a valid range. Identical Start and End is a valid single-voucher range.
 */
export const validateVoucherRange = (
  startValue?: string | null,
  endValue?: string | null,
): string | null => {
  const start = parseVoucherNumber(startValue);
  const end = parseVoucherNumber(endValue);

  if (!start) return 'Start voucher number is not a valid voucher number.';
  if (!end) return 'End voucher number is not a valid voucher number.';

  if (start.type !== end.type) {
    return 'Start and End voucher numbers must have the same voucher type.';
  }
  if (start.year !== end.year || start.month !== end.month) {
    return 'Start and End voucher numbers must belong to the same month and year.';
  }
  if (end.sequence < start.sequence) {
    return 'End voucher number cannot be earlier than the Start voucher number.';
  }

  return null;
};
