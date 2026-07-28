import React from 'react';
import { useSelector } from 'react-redux';
import { chartDateTime } from './formatDate';
import { PrintBranch, hasPrintBranch } from './printBranch';

type Props = {
  /** The branch the report is about; falls back to the logged-in user's. */
  branch?: PrintBranch;
};

const CompanyPad: React.FC<Props> = ({ branch }) => {
  const settings = useSelector((state: any) => state.settings.data);

  // When a report names its own branch, that branch's details win outright: the
  // address must not fall back to the session's, which belongs to another branch.
  const overridden = hasPrintBranch(branch);
  const branchName = overridden ? branch?.name : settings?.branch?.name;
  const branchAddress = overridden ? branch?.address : settings?.branch?.address;

  return (
    <div>
      <div className="mb-0">
        <h1 className="text-2xl font-bold text-center uppercase">
          {settings?.company?.name}
        </h1>
        <div className="text-center">
          <div>
            <span className="-mt-1"> {settings?.company?.address}</span>
          </div>
          <div>
            <span className="-mb-1"> {settings?.company?.phone}</span>
          </div>
          { settings?.company?.notes && (
            <div>
              <span className="!-mt-3 text-xs"> {settings?.company?.notes}</span>
            </div>
          )}
        </div>
      </div>
      <div className="border-t-2 border-gray-900"></div>
      <div className='flex justify-between'>
        <h3 className="text-xs"> Branch: <span className='font-bold text-xs'>{branchName}</span></h3>
        <div >
          <span className="text-xs">Printed At:</span>{' '}
          <span className="text-xs">{chartDateTime(new Date().toISOString())}</span>
        </div>
      </div>
      <div className="-mt-1 text-xs">Address: <span className='font-bold text-xs'>{branchAddress}</span></div>
    </div>
  );
};

export default CompanyPad;
