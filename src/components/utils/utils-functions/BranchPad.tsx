import React from 'react';
import { useSelector } from 'react-redux';
import { API_REMOTE_URL } from '../../services/apiRoutes';
import { chartDateTime } from './formatDate';

const BranchPad = () => {
  const settings = useSelector((state: any) => state.settings.data);
  const branch = settings?.branch;
  const useCustomImage = Number(branch?.pad_heading_print) === 3;


  const imagePath =
    branch?.pad_header_image ||
    branch?.pad_heading_image ||
    branch?.letterhead_image ||
    branch?.pad_image ||
    branch?.header_image ||
    '';



  const resolvedImagePath =
    typeof imagePath === 'string' && imagePath
      ? /^(https?:|data:|blob:)/i.test(imagePath)
        ? imagePath
        : `${API_REMOTE_URL}/${imagePath
            .replace(/^\/+/, '')
            .replace(/^public\//i, '')}`
      : '';

  return (
    <div>
      {useCustomImage && resolvedImagePath ? (
        <div className="mb-4">
          <img
            src={resolvedImagePath}
            alt={branch?.name || 'Pad header'}
            className="mx-auto max-h-32 w-full object-contain"
          />
        </div>
      ) : (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center uppercase">{branch?.name}</h1>
          <div className="mt-2 text-center">
            <div>
              <span>{branch?.address}</span>
            </div>
            <div>
              <span>{branch?.phone}</span>
            </div>
          </div>
        </div>
      )}
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
