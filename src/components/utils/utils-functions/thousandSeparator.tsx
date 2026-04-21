import store from "../../../store";

const thousandSeparator = (value: number) => {
  const settings = store.getState()?.settings;
  const decimalPlaces = Number(settings?.data?.branch?.decimal_places ?? 0);

  if (value == 0) return "-";

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return "-";

  return numericValue.toLocaleString("en-IN", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
    useGrouping: true,
  });
};

export default thousandSeparator;
