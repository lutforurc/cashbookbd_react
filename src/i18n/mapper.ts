/**
 * The app's one text mapper: anything it writes in the screen's language.
 *
 * Every screen that has to MAKE a label in the local language -- a month
 * option, a date line, a heading, a rule in words -- calls this file and
 * nothing else. It owns the Bangla digits and the Bangla month names, so a
 * spelling or a digit is corrected here once and every screen follows.
 *
 * Two rules run through it:
 *   - "en" (or no language at all) comes back untouched;
 *   - a month the app carries may arrive as a number (1-12), an English name
 *     ("November", "Nov"), a "YYYY-MM" key, a "Nov-26" label or a Date.
 *
 * useLocalDigits is the DOM counterpart: it maps digits in text React has
 * already rendered. Anything handed to a native <select>, a formatter or an API
 * must come through toLocalDigits / toLocalMonth first, because that hook
 * cannot reach it.
 */
const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Digits as the screen writes them: "ডিসেম্বর 2026" -> "ডিসেম্বর ২০২৬". */
export const toLocalDigits = (text: string, lang?: string | null): string =>
  !lang || lang === 'en' ? text : text.replace(/[0-9]/g, (digit) => BANGLA_DIGITS[Number(digit)]);

export const BANGLA_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

const ENGLISH = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** English month (full or short, any case) => Bangla, e.g. MONTH_MAP.Nov === 'নভেম্বর'. */
export const MONTH_MAP: Record<string, string> = Object.fromEntries(
  ENGLISH.flatMap((short, i) => {
    const full = new Date(2000, i, 1).toLocaleString('en', { month: 'long' });
    const cap = short[0].toUpperCase() + short.slice(1);
    return [[short, BANGLA_MONTHS[i]], [cap, BANGLA_MONTHS[i]], [full, BANGLA_MONTHS[i]], [full.toLowerCase(), BANGLA_MONTHS[i]]];
  }),
);

/** 1-12 => Bangla month name. */
export const banglaMonth = (month: number): string => BANGLA_MONTHS[month - 1] ?? String(month);

/**
 * Any month the app carries, as "নভেম্বর ২০২৬" on a non-English screen.
 *   toLocalMonth('2026-11', 'bn')  => 'নভেম্বর ২০২৬'
 *   toLocalMonth('Nov-26', 'bn')   => 'নভেম্বর ২০২৬'
 *   toLocalMonth('November', 'bn') => 'নভেম্বর'
 *   toLocalMonth(anything, 'en')   => unchanged
 */
export const toLocalMonth = (value: string | number | Date | null | undefined, lang?: string | null): string => {
  const text = value instanceof Date ? '' : String(value ?? '');
  if (!lang || lang === 'en') return value instanceof Date ? value.toDateString() : text;

  const local = (monthText: string) => toLocalDigits(monthText, lang);

  if (value instanceof Date) return local(`${banglaMonth(value.getMonth() + 1)} ${value.getFullYear()}`);
  if (typeof value === 'number') return local(banglaMonth(value));

  let m = /^(\d{4})-(\d{1,2})/.exec(text); // 2026-11, 2026-11-24
  if (m) return local(`${banglaMonth(Number(m[2]))} ${m[1]}`);

  m = /^([A-Za-z]+)[-\s,]*(\d{2,4})?$/.exec(text.trim()); // Nov-26, November 2026, Nov
  if (m && MONTH_MAP[m[1]]) {
    const year = m[2] ? (m[2].length === 2 ? `20${m[2]}` : m[2]) : '';
    return local(year ? `${MONTH_MAP[m[1]]} ${year}` : MONTH_MAP[m[1]]);
  }

  return text;
};

/**
 * Unicode decimal digits -> Latin digits: "১০০০" -> "1000", "١٢٣" -> "123".
 *
 * The screen writes Bangla digits, but a number a form saves (an amount, a
 * quantity, a date part) has to be Latin: the API and every parse we do read
 * ASCII. This is the inverse of toLocalDigits and is applied AS the user types
 * into a numeric field, so a Bangla digit never reaches the state.
 */
const LATIN_DIGIT: Record<number, string> = {};
[
  0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66,
  0x0ce6, 0x0d66, 0x0e50, 0x0ed0, 0x0f20, 0x1040, 0x17e0, 0x1810, 0xff10,
].forEach((zero) => {
  for (let digit = 0; digit < 10; digit += 1) LATIN_DIGIT[zero + digit] = String(digit);
});

export const toLatinDigits = (text: string): string =>
  text.replace(
    /[\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\uFF10-\uFF19]/g,
    (digit) => LATIN_DIGIT[digit.charCodeAt(0)] ?? digit,
  );
