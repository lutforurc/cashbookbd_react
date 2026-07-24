import store from "../../../store";

const thousandSeparator = (value: number) => {
  const settings = store.getState()?.settings;
  const rawDecimalPlaces = Number(settings?.data?.branch?.decimal_places ?? 0);
  // Guard against NaN / out-of-range config values: toLocaleString only
  // accepts minimum/maximumFractionDigits in the 0–20 range.
  const decimalPlaces = Number.isFinite(rawDecimalPlaces)
    ? Math.min(Math.max(Math.trunc(rawDecimalPlaces), 0), 20)
    : 0;

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return "-";

  const roundedValue = Number(numericValue.toFixed(decimalPlaces));

  if (roundedValue === 0) return "-";

  return numericValue.toLocaleString("en-IN", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
    useGrouping: true,
  });
};

export default thousandSeparator;
