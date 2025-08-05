import React from 'react'
import thousandSeparator from './thousandSeparator';

const checkNumber = (num: number) => {
    if (num > 0) {
        return <span className='text-green-600'>{thousandSeparator(num, 0)}</span>;
    } else if (num < 0) {
        <span className='text-red-600'>{num}</span>;
    } else {
        return <span className=''>{num}</span>;
    }
};

export default checkNumber
