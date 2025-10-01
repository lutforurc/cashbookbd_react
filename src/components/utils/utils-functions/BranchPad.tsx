import React from 'react';
import { useSelector } from 'react-redux';

const BranchPad = () => {
  const settings = useSelector((state: any) => state.settings.data);
  console.log(settings?.branch);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-center">{settings?.branch?.name}</h1>
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
          <span className="font-semibold text-xs">Printed At:</span>{' '}
          {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default BranchPad;
