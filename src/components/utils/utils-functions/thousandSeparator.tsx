import store from "../../../store";

const thousandSeparator = (value: number) => {
  const settings = store.getState()?.settings;
  const decimalPlaces = Number(settings?.data?.branch?.decimal_places ?? 0);

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return "-";

  // When decimal places is 0, treat any positive fractional value < 1 as empty ('-')
  if (decimalPlaces === 0 && numericValue < 1) return "-";

  return numericValue.toLocaleString("en-IN", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
    useGrouping: true,
  });
};

export default thousandSeparator;
