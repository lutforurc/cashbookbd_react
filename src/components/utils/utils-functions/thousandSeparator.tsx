const thousandSeparator = (value: number, decimal: number) => {
  const decimalFormattedValue = Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal,
    useGrouping: true,
  });
  return decimalFormattedValue;
};

export default thousandSeparator;
