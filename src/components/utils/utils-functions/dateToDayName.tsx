
import React from 'react'

const dateToDayName = (dateString: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(dateString);
    return (
        days[d.getDay()]
    )
};

export default dateToDayName;