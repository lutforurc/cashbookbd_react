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
const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

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

const convertIntegerToWords = (num: number): string => {
  if (!Number.isFinite(num)) return '';
  if (num === 0) return 'Zero';

  let words = '';
  let scaleIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;

    if (chunk > 0) {
      const chunkWords = convertHundreds(chunk);
      words = `${chunkWords}${scales[scaleIndex] ? ` ${scales[scaleIndex]}` : ''} ${words}`.trim();
    }

    num = Math.floor(num / 1000);
    scaleIndex += 1;
  }

  return words.trim();
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
