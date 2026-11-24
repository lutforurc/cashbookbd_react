/**
 * Month names in Bangla, and the one mapper every screen uses to turn a month
 * into the screen's language.
 *
 * Accepts what the app actually carries: a month number (1-12), an English
 * name full or short ("November", "Nov"), a "YYYY-MM" key, a "Nov-26" label
 * or a date. On an English screen the input comes back as it was.
 * The digits are left Latin -- useLocalDigits turns them on a Bangla screen.
 */
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
 * Any month the app carries, as "নভেম্বর 2026" on a non-English screen.
 *   toLocalMonth('2026-11', 'bn')  => 'নভেম্বর 2026'
 *   toLocalMonth('Nov-26', 'bn')   => 'নভেম্বর 2026'
 *   toLocalMonth('November', 'bn') => 'নভেম্বর'
 *   toLocalMonth(anything, 'en')   => unchanged
 */
export const toLocalMonth = (value: string | number | Date | null | undefined, lang?: string | null): string => {
  const text = value instanceof Date ? '' : String(value ?? '');
  if (!lang || lang === 'en') return value instanceof Date ? value.toDateString() : text;

  if (value instanceof Date) return `${banglaMonth(value.getMonth() + 1)} ${value.getFullYear()}`;
  if (typeof value === 'number') return banglaMonth(value);

  let m = /^(\d{4})-(\d{1,2})/.exec(text); // 2026-11, 2026-11-24
  if (m) return `${banglaMonth(Number(m[2]))} ${m[1]}`;

  m = /^([A-Za-z]+)[-\s,]*(\d{2,4})?$/.exec(text.trim()); // Nov-26, November 2026, Nov
  if (m && MONTH_MAP[m[1]]) {
    const year = m[2] ? (m[2].length === 2 ? `20${m[2]}` : m[2]) : '';
    return year ? `${MONTH_MAP[m[1]]} ${year}` : MONTH_MAP[m[1]];
  }

  return text;
};
