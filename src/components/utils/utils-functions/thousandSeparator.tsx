import store from "../../../store";

const thousandSeparator = (value: number) => {
  const settings = store.getState()?.settings;
  const decimalPlaces = Number(settings?.data?.branch?.decimal_places ?? 0);

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
