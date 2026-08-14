import React from 'react'
import dayjs from 'dayjs';

function formatDate(dateString: string) {
    if (!dateString) return "";
    const [year, month, day] = dateString.split('-');
    return (
        <>
            {day}/{month}/{year}
        </>
    )
}

export { formatDate }
export default formatDate;


function formatBdShortDate(dateString?: string): string {
  if (!dateString) return "-";

  try {
    const [day, month, year] = dateString.split("/");
    if (!day || !month || !year) return dateString;

    // Only last two digits of year
    const shortYear = year.slice(-2);

    return `${day}/${month}/${shortYear}`;
  } catch {
    return dateString;
  }
}

export { formatBdShortDate };


function formatDateBdToUsd(dateString: string) {
    if (dateString) {
        const [day, month, year] = dateString.split('/');
        const parsed = new Date(`${year}-${month}-${day}`); // YYYY-MM-DD
        return parsed
    }
    return null
}

export { formatDateBdToUsd }


function formatDateUsdToBd(dateString?: string | null) {
  if (!dateString || !dayjs(dateString).isValid()) return ""; // ফাঁকা বা invalid date handle

  const [year, month, day] = dateString.split('-');
  const shortYear = year.slice(-2);

  return `${day}/${month}/${shortYear}`;
}

export { formatDateUsdToBd };


function formatLongDateUsdToBd(dateString: string) {
  if (!dateString) return "-";

  try {
    const [day, month, year] = dateString.split("/");
    if (!day || !month || !year) return dateString;

    // Only last two digits of year

    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export { formatLongDateUsdToBd }


function chartDate(dateString: string) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}
export { chartDate }

const formatPaymentMonth = (value: string) => {
  if (!value) return value;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  let month: string | undefined;
  let year: string | undefined;

  // Case 1: "092025"
  if (/^\d{6}$/.test(value)) {
    month = value.substring(0, 2);
    year = value.substring(2);
  }

  // Case 2: "12-2025" or "12/2025"
  else if (/^\d{2}[-/]\d{4}$/.test(value)) {
    const parts = value.split(/[-/]/);
    month = parts[0];
    year = parts[1];
  }

  if (!month || !year) return value;

  const monthIndex = Number(month) - 1;

  return monthNames[monthIndex]
    ? `${monthNames[monthIndex]} ${year}`
    : value;
};

export { formatPaymentMonth };

/**
 * "2026-04" -> "April 2026", or "Apr 2026" in the short form.
 *
 * The twelve-month dashboard chart is keyed by the month the API returns, and
 * that key was reaching the reader as it stood. Charts keep the raw key as
 * their category -- the series are lined up by it -- so only the label and the
 * tooltip title pass through here.
 *
 * formatPaymentMonth() next door reads MM-YYYY and "092025"; this is the other
 * way round, hence a second function rather than another branch in that one.
 */
const CHART_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function chartMonth(value: string, short = false): string {
  if (!value) return '';

  // Anything not YYYY-MM is handed back untouched, so a formatter that is
  // given an already-formatted title cannot mangle it.
  const match = /^(\d{4})-(\d{2})$/.exec(String(value).trim());

  if (!match) return String(value);

  const name = CHART_MONTH_NAMES[Number(match[2]) - 1];

  return name ? `${short ? name.slice(0, 3) : name} ${match[1]}` : String(value);
}

export { chartMonth };

/**
 * dd/mm/yyyy, whichever way round the date arrives.
 *
 * formatBdShortDate() next door splits on "/" and hands back anything else
 * untouched, so an API returning "2023-02-18" printed exactly that in the
 * middle of a report where every other date was day-first. This reads both
 * shapes and always answers in one.
 *
 * The year stays four digits: on a row saying a product has not moved in three
 * years, "18/02/23" invites the reader to wonder which century.
 */
function formatDayMonthYear(value?: string | null): string {
  if (!value) return '-';

  // Trims a timestamp down to its date before matching.
  const text = String(value).trim().slice(0, 10);

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) {
    return `${iso[3].padStart(2, '0')}/${iso[2].padStart(2, '0')}/${iso[1]}`;
  }

  const dayFirst = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(text);
  if (dayFirst) {
    const year = dayFirst[3].length === 2 ? `20${dayFirst[3]}` : dayFirst[3];
    return `${dayFirst[1].padStart(2, '0')}/${dayFirst[2].padStart(2, '0')}/${year}`;
  }

  return text;
}

export { formatDayMonthYear };

/**
 * A span of days said the way people say it: "3 Year 5 Month 29 Day".
 *
 * A stock report that has sat still since 2023 reads 1,274 in the Days Idle
 * column, and nobody converts that in their head -- the number is precise and
 * tells you nothing. Years and months do.
 *
 * The count is converted rather than the two dates being subtracted, so this
 * always agrees with the figure the report worked out; a 365/30 year and month
 * are what "so many days" means when nobody has said which months.
 *
 * Empty parts are dropped -- 45 days is "1 Month 15 Day", not "0 Year 1 Month
 * 15 Day" -- and a span under a month keeps its days alone.
 */
function formatDaySpan(totalDays?: number | string | null): string {
  // Nothing recorded is a dash, not "0 Day" -- Number(null) is 0, and a
  // product with no movement date at all has not been idle for no days.
  if (totalDays === null || totalDays === undefined || totalDays === '') return '-';

  const days = Math.floor(Number(totalDays));

  if (!Number.isFinite(days) || days < 0) return '-';
  if (days === 0) return '0 Day';

  const years = Math.floor(days / 365);
  const afterYears = days % 365;
  const months = Math.floor(afterYears / 30);
  const remainingDays = afterYears % 30;

  const parts: string[] = [];

  if (years) parts.push(`${years} Year`);
  if (months) parts.push(`${months} Month`);
  if (remainingDays) parts.push(`${remainingDays} Day`);

  return parts.join(' ');
}

export { formatDaySpan };

function chartDateTime(dateString: string) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");

  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();

  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

export { chartDateTime };
