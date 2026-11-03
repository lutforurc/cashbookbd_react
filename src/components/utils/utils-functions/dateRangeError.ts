import dayjs from "dayjs";

/**
 * The 31-day cap the API puts on Product Profit Loss, Product Profit Summary
 * and Profit & Loss (Date Wise), both days counted. The message to show, or
 * null when the range may run.
 */
const dateRangeError = (start: Date, end: Date, maxDays = 31): string | null => {
  const days = dayjs(end).startOf("day").diff(dayjs(start).startOf("day"), "day") + 1;
  if (days < 1) return "End Date, Start Date-এর আগে হতে পারবে না";
  if (days > maxDays) return `Start Date থেকে End Date সর্বোচ্চ ${maxDays} দিন হতে পারবে`;
  return null;
};

export default dateRangeError;
