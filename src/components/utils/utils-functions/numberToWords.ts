import store from '../../../store';
import { getCurrentLanguage } from '../../../i18n/currentLanguage';

/** 0-99 as Bangla spells them -- "একুশ", not "বিশ এক". */
const BANGLA_NUMBERS = [
  'শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়',
  'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোল', 'সতেরো', 'আঠারো', 'উনিশ',
  'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'ঊনত্রিশ',
  'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ',
  'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ',
  'পঞ্চাশ', 'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট',
  'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর',
  'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি',
  'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'ঊননব্বই',
  'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই',
];

const convertHundredsBn = (num: number): string => {
  let words = '';

  if (num >= 100) {
    words += `${BANGLA_NUMBERS[Math.floor(num / 100)]}শত `;
    num %= 100;
  }

  if (num > 0) words += `${BANGLA_NUMBERS[num]} `;

  return words.trim();
};

/** The same Indian grouping as the English, in Bangla words. */
const convertIntegerToWordsBn = (num: number): string => {
  if (!Number.isFinite(num)) return '';
  if (num === 0) return 'শূন্য';

  const parts: string[] = [];

  const units = num % 1000;
  if (units > 0) parts.unshift(convertHundredsBn(units));
  num = Math.floor(num / 1000);

  const thousands = num % 100;
  if (thousands > 0) parts.unshift(`${convertHundredsBn(thousands)} হাজার`);
  num = Math.floor(num / 100);

  const lakhs = num % 100;
  if (lakhs > 0) parts.unshift(`${convertHundredsBn(lakhs)} লক্ষ`);
  num = Math.floor(num / 100);

  if (num > 0) parts.unshift(`${convertIntegerToWordsBn(num)} কোটি`);

  return parts.join(' ');
};

const banglaMoneyWords = (amount: number, currencyName: string): string => {
  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);
  const integerWords = convertIntegerToWordsBn(integerPart);
  const paisaWords = decimalPart === 0 ? '' : `এবং ${convertIntegerToWordsBn(decimalPart)} পয়সা`;
  const minus = amount < 0 ? 'মাইনাস ' : '';
  const currency = currencyName === 'Taka' ? 'টাকা' : currencyName;
  const only = 'মাত্র';

  switch (moneyFormat()) {
    case 1:
      return `${minus}${currency} ${integerWords} ${paisaWords} ${only}`.replace(/\s+/g, ' ').trim();
    case 3:
      return `${minus}${only} ${integerWords} ${paisaWords} ${currency}`.replace(/\s+/g, ' ').trim();
    case 4:
      return `${minus}${only} ${currency} ${integerWords} ${paisaWords}`.replace(/\s+/g, ' ').trim();
    case 2:
    default:
      return `${minus}${integerWords} ${currency} ${paisaWords} ${only}`.replace(/\s+/g, ' ').trim();
  }
};

const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const convertHundreds = (num: number): string => {
  let words = '';

  if (num >= 100) {
    words += `${ones[Math.floor(num / 100)]} Hundred `;
    num %= 100;
  }

  if (num >= 20) {
    words += `${tens[Math.floor(num / 10)]} `;
    num %= 10;
  }

  if (num > 0) {
    words += `${ones[num]} `;
  }

  return words.trim();
};

/**
 * ⚠️ INDIAN GROUPING, not international. The last three digits are the units,
 * and every group above them is TWO digits -- thousand, lakh, crore. 506,185
 * is "Five Lakh Six Thousand One Hundred Eighty Five"; the million/billion
 * scales this used to carry spelled it "Five Hundred Six Thousand One Hundred
 * Eighty Five", which is not how anybody here writes money.
 *
 * The two spellers this app already had beside it -- CashVoucherPrintBase and
 * CustomerVoucherModal -- grouped this way, so the shared one was the odd one
 * out above 99,999.
 */
const convertIntegerToWords = (num: number): string => {
  if (!Number.isFinite(num)) return '';
  if (num === 0) return 'Zero';

  const parts: string[] = [];

  // The last three digits first, then two at a time.
  const units = num % 1000;
  if (units > 0) parts.unshift(convertHundreds(units));
  num = Math.floor(num / 1000);

  const thousands = num % 100;
  if (thousands > 0) parts.unshift(`${convertHundreds(thousands)} Thousand`);
  num = Math.floor(num / 100);

  const lakhs = num % 100;
  if (lakhs > 0) parts.unshift(`${convertHundreds(lakhs)} Lakh`);
  num = Math.floor(num / 100);

  // ⚠️ EVERYTHING LEFT IS CRORE, and there may be more than ninety-nine of
  // them: 100 crore is "One Hundred Crore", not "Ten Crore". So the remainder
  // goes back through this function rather than being taken as one two-digit
  // group -- which is also why it stays right at a trillion, where taking a
  // fixed group would run off the end of the ones table.
  if (num > 0) parts.unshift(`${convertIntegerToWords(num)} Crore`);

  return parts.join(' ');
};

/**
 * How the branch writes money out in words.
 *
 * The four values are Branch > Invoice Setup > "Select Money Format":
 *   1  Taka ... Only
 *   2  ... Taka Only
 *   3  Only ... Taka
 *   4  Only Taka ...
 *
 * An unset branch gets 2, which is the wording every printed paper had before
 * the setting was honoured at all. Read from the store on each call so a change
 * on the branch screen reaches the next printed page without a reload --
 * thousandSeparator reads decimals the same way.
 */
const moneyFormat = (): number => {
  const raw = Number(store.getState()?.settings?.data?.branch?.money_format);
  return raw >= 1 && raw <= 4 ? raw : 2;
};

const numberToWords = (value: number | string, currencyName = 'Taka'): string => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return '';

  // The printed paper follows the screen's language: Bangla digits and Bangla
  // words when a local language is on, English otherwise.
  const lang = getCurrentLanguage();
  if (lang && lang !== 'en') return banglaMoneyWords(amount, currencyName);

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);
  const integerWords = convertIntegerToWords(integerPart);
  const paisaWords =
    decimalPart === 0 ? '' : `And ${convertIntegerToWords(decimalPart)} Paisa`;
  const minus = amount < 0 ? 'Minus ' : '';

  switch (moneyFormat()) {
    case 1:
      return `${minus}${currencyName} ${integerWords} ${paisaWords} Only`.replace(/\s+/g, ' ').trim();
    case 3:
      return `${minus}Only ${integerWords} ${paisaWords} ${currencyName}`.replace(/\s+/g, ' ').trim();
    case 4:
      return `${minus}Only ${currencyName} ${integerWords} ${paisaWords}`.replace(/\s+/g, ' ').trim();
    case 2:
    default:
      return `${minus}${integerWords} ${currencyName} ${paisaWords} Only`.replace(/\s+/g, ' ').trim();
  }
};

export default numberToWords;
