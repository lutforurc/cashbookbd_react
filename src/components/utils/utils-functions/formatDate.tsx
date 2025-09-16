import React from 'react'

function formatDate(dateString: string) {
    const [year, month, day] = dateString.split('-');
    return (
        <>
            {day}/{month}/{year}
        </>
    )
}

export { formatDate }

function formatDateBdToUsd(dateString: string) {
    if (dateString) {
        const [day, month, year] = dateString.split('/');
        const parsed = new Date(`${year}-${month}-${day}`); // YYYY-MM-DD
        return parsed
    }
    return null
}

export { formatDateBdToUsd }
