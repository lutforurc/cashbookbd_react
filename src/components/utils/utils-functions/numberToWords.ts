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

const numberToWords = (value: number | string, currencyName = 'Taka'): string => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return '';

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);
  const integerWords = convertIntegerToWords(integerPart);

  if (decimalPart === 0) {
    return `${amount < 0 ? 'Minus ' : ''}${integerWords} ${currencyName}`.trim();
  }

  const decimalWords = convertIntegerToWords(decimalPart);
  return `${amount < 0 ? 'Minus ' : ''}${integerWords} ${currencyName} And ${decimalWords} Paisa`.trim();
};

export default numberToWords;
