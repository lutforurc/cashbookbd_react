import React from 'react';
import { useSelector } from 'react-redux';

const CompanyPad = () => {
  const settings = useSelector((state: any) => state.settings.data);
  console.log(settings?.company?.name);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-center">
          {settings?.company?.name}
        </h1>
        <div className="text-center">
          <div>
            <span className="-mt-2"> {settings?.company?.address}</span>
          </div>
          <div>
            <span className=""> {settings?.company?.phone}</span>
          </div>
        </div>
      </div>
      <div className="border-t-2 border-gray-900 -mt-4"></div>
      <div className='flex justify-between'>
        <h3 className="">Branch: <span className='font-bold'>{settings?.branch?.name}</span></h3>
        <div >
          <span className="font-semibold text-xs">Printed At:</span>{' '} <span>{new Date().toLocaleString()}</span>
          
        </div>
      </div>
      <div className="">Address: <span className='font-bold'>{settings?.branch?.address}</span></div>
    </div>
  );
};

export default CompanyPad;
