import React from 'react'

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


function formatDateUsdToBd(dateString: string) {
  if (!dateString) return "";
    const [year, month, day] = dateString.split('-');
        const shortYear = year.slice(-2);
    return (
        <>
            {day}/{month}/{shortYear}
        </>
    )
}

export { formatDateUsdToBd }


function formatLongDateUsdToBd(dateString: string) {
  if (!dateString) return "";
    const [year, month, day] = dateString.split('-');
    return (
        <>
            {day}/{month}/{year}
        </>
    )
}

export { formatLongDateUsdToBd }

