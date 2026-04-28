export type PrintPaperKey =
  | 'a4-portrait'
  | 'a4-landscape'
  | 'half-portrait'
  | 'half-landscape';

const printPaperSizeMap: Record<string, PrintPaperKey> = {
  '1': 'a4-portrait',
  '2': 'a4-landscape',
  '3': 'half-portrait',
  '4': 'half-landscape',
};

const getPrintPaperKey = (paperSize: unknown): PrintPaperKey => {
  const value = String(paperSize ?? '1');
  return printPaperSizeMap[value] || 'a4-portrait';
};

export default getPrintPaperKey;
