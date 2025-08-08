const thousandSeparator = (value: number, decimal: number) => {

  if (value==0) return '-';
  const decimalFormattedValue = Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal,
    useGrouping: true,
  });
  return decimalFormattedValue;
};

export default thousandSeparator;
