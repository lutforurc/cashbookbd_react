const getPrintPaperMode = (paperSize: unknown) => {
  const value = String(paperSize ?? '1');

  return {
    id: value,
    isHalf: value === '3' || value === '4',
    isLandscape: value === '2' || value === '4',
  };
};

export default getPrintPaperMode;
