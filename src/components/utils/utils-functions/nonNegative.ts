/**
 * Negative numbers are not a user input anywhere in this application.
 *
 * ⚠️ WHY THIS IS ONE MODULE. "No negatives" is a business rule over the whole
 * app, not a property of any one screen: every money box, every quantity, every
 * rate. Spelling it out per form is how it comes to be true on the forms
 * somebody remembered and false on the rest, so the reading of "is this value
 * negative" and the sentence shown for it live here, and are used by the shared
 * field (InputElement) and by the request gate (httpService).
 *
 * ⚠️ A MINUS IS NOT ALWAYS U+002D. A paste out of Excel, a keyboard with a
 * typographic dash, a Bengali or Arabic-Indic figure all mean the same thing to
 * the reader and none of them is '-'. Parentheses are accounting's other way of
 * writing a negative -- (12.50) is -12.50 -- and a thousands separator and a
 * currency mark ride along with a pasted figure. A plain `includes('-')` test
 * misses every one of those, which is exactly how a "we blocked the minus key"
 * fix leaks.
 *
 * ⚠️ AND A HYPHEN IS NOT A MINUS. "14-261000019", "2026-10-26", "0171-1234567"
 * and a sentence with a dash in it are all perfectly good values on this app
 * and none of them is a number -- so a value counts only when the WHOLE of it
 * parses as a negative number, and nothing here flags a text field.
 */
export const NEGATIVE_VALUE_MESSAGE = 'Negative values are not allowed.';

/** Every dash-like character a reader would call a minus. */
const DASHES = /[\u002D\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g;
/** The spaces a paste may carry: ordinary, no-break, figure and thin. */
const SPACES = /[\s\u00A0\u2007\u202F]/g;
/** Digits outside ASCII: Bengali ০-৯ and Arabic-Indic ٠-٩. */
const NON_ASCII_DIGITS = /[\u09E6-\u09EF\u0660-\u0669]/g;
/** What is left once normalised is a plain number, or it is nothing. */
const PLAIN_NUMBER = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
/** Separators and currency marks a pasted figure keeps. */
const NOISE = /[,\u09F3\u09F2\u0024\u00A3\u20B9\u00A5]/g;

/** Bengali and Arabic-Indic figures, so ১২ reads as 12. */
const toAsciiDigits = (text: string) =>
  text.replace(NON_ASCII_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x09e6 ? 0x09e6 : 0x0660;
    return String(code - base);
  });

/**
 * The number a box holds, or null when the text is not a plain number.
 *
 * Null, not zero, for anything it cannot read -- "text", "12-3", "" and "-" are
 * all "not a number", and answering 0 for them would quietly turn a reference
 * number into a balance.
 */
export const parseNumericInput = (raw: unknown): number | null => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;

  let text = toAsciiDigits(raw).replace(SPACES, '').replace(DASHES, '-');

  // (12.50) is accounting's other minus.
  const wrapped = /^\((.*)\)$/.exec(text);
  if (wrapped) text = `-${wrapped[1]}`;

  text = text.replace(NOISE, '');

  if (!PLAIN_NUMBER.test(text)) return null;

  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};

/** True when the whole value reads as a negative number. */
export const isNegativeNumeric = (raw: unknown): boolean => {
  const value = parseNumericInput(raw);
  return value !== null && value < 0;
};

/**
 * Where in a payload the first negative number sits, or null.
 *
 * Returned as a path rather than a boolean so a refusal can name the field a
 * clerk has to go and change. Files and buffers are skipped: nothing a reader
 * typed lives in one.
 */
export const findNegativePath = (data: unknown, path = ''): string | null => {
  if (isNegativeNumeric(data)) return path || '(value)';

  if (data === null || typeof data !== 'object') return null;
  if (typeof FormData !== 'undefined' && data instanceof FormData) return null;
  if (typeof File !== 'undefined' && data instanceof File) return null;
  if (typeof Blob !== 'undefined' && data instanceof Blob) return null;
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(data as ArrayBufferView)) return null;

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i += 1) {
      const found = findNegativePath(data[i], path ? `${path}.${i}` : String(i));
      if (found) return found;
    }
    return null;
  }

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const found = findNegativePath(value, path ? `${path}.${key}` : key);
    if (found) return found;
  }

  return null;
};
