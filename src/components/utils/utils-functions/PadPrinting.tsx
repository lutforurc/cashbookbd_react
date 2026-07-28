import React from 'react';
import { useSelector } from 'react-redux';
import BranchPad from './BranchPad';
import CompanyPad from './CompanyPad';
import { PrintBranch } from './printBranch';

type Props = {
  /**
   * The branch the report is about. Omit it and the header falls back to the
   * logged-in user's branch, which is only correct when the two match.
   */
  branch?: PrintBranch;
};

const PadPrinting: React.FC<Props> = ({ branch }) => {
  const settings = useSelector((state: any) => state.settings.data);


  return (
    <div>
      {Number(settings?.branch?.pad_heading_print) === 2 ? (
        <CompanyPad branch={branch} />
      ) : (
        <BranchPad branch={branch} />
      )}
    </div>
  );
};

export default PadPrinting;
