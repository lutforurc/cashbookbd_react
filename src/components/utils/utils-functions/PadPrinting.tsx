import React from 'react';
import { useSelector } from 'react-redux';
import BranchPad from './BranchPad';
import CompanyPad from './CompanyPad';

const PadPrinting = () => {
  const settings = useSelector((state: any) => state.settings.data);
  console.log(settings?.branch.pad_heading_print);

  return (
    <div>
      {Number(settings?.branch?.pad_heading_print) === 1 ? (
        <BranchPad />
      ) : (
        <CompanyPad />
      )}
    </div>
  );
};

export default PadPrinting;
