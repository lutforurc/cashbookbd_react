import { longDateFormat } from 'moment';
import React from 'react';
import { useSelector } from 'react-redux';
import { chartDateTime } from './formatDate';

const BranchPad = () => {
  const settings = useSelector((state: any) => state.settings.data);
  console.log(settings?.branch);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-center uppercase">{settings?.branch?.name}</h1>
        <div className="mt-2 text-center">
          <div>
            <span className=""> {settings?.branch?.address}</span>
          </div>
          <div>
            <span className=""> {settings?.branch?.phone}</span>
          </div> 
        </div>
      </div>
      <div className='border-t-2 border-gray-900 -mt-4'></div>
      <div className='flex justify-between'>
       <div></div>
        <div >
          <span className="text-xs">Printed At:</span>{' '}
          <span className="text-xs">{chartDateTime(new Date().toISOString())}</span>
        </div>
      </div>
    </div>
  );
};

export default BranchPad;
