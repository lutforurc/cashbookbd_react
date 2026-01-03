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

    // Only last two digits of ye

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