import { useSelector } from 'react-redux';

/**
 * How a branch chooses to see a mobile number.
 *
 * Numbers are stored as the eleven digits somebody typed and nothing else --
 * that is what a phone dials, what a duplicate check compares, and what an SMS
 * gateway wants. A branch that reads them off a printed sheet all day wants
 * them grouped; a branch that copies them into a dialler does not. So the
 * grouping is a display choice, held per branch, and the stored value never
 * changes.
 *
 * The pattern is written with `#` standing for one digit and everything else
 * standing for itself:
 *
 *   #####-######     01973-190490
 *   ####-###-####    0197-319-0490
 *   +88 ##### ######  +88 01973 190490
 *
 * An empty pattern means the branch has not asked for one, and the number is
 * shown exactly as it was entered.
 */

/** Digits only. Anything already grouped is regrouped rather than doubled up. */
const digitsOf = (value: string): string => value.replace(/\D/g, '');

export const MOBILE_FORMAT_PLACEHOLDER = '#';

/**
 * The number, grouped by the pattern.
 *
 * Left alone when there is no pattern, when there are no digits to place, or
 * when the value carries a letter -- an "N/A" or a note in the mobile column is
 * not a number and should not be minced into one.
 *
 * Digits the pattern has no room for are appended rather than dropped: a
 * pattern written for eleven digits meeting a twelve-digit number should show
 * the whole number badly, never most of it silently.
 */
export const formatMobile = (value: unknown, pattern?: string | null): string => {
  const raw = String(value ?? '').trim();

  if (!raw || !pattern) return raw;
  if (/[A-Za-z]/.test(raw)) return raw;

  const digits = digitsOf(raw);
  if (!digits) return raw;

  let index = 0;
  let out = '';

  for (const character of pattern) {
    if (character === MOBILE_FORMAT_PLACEHOLDER) {
      if (index >= digits.length) break;
      out += digits[index];
      index += 1;
    } else if (index < digits.length) {
      // Separators are only drawn while digits are still coming, so a pattern
      // longer than the number does not leave a trailing dash hanging.
      out += character;
    }
  }

  return index < digits.length ? out + digits.slice(index) : out;
};

/**
 * The pattern this branch has set, or an empty string.
 *
 * Read from the settings already in the store, so a screen showing numbers does
 * not have to fetch anything of its own.
 */
export const useMobileFormat = (): string => {
  const pattern = useSelector((state: any) => state.settings?.data?.branch?.mobile_number_format);

  return typeof pattern === 'string' ? pattern : '';
};

/** The formatter itself, bound to the branch's pattern. */
export const useMobileFormatter = (): ((value: unknown) => string) => {
  const pattern = useMobileFormat();

  return (value: unknown) => formatMobile(value, pattern);
};
