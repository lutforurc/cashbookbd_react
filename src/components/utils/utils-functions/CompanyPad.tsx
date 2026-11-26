import React from 'react';
import { useSelector } from 'react-redux';
import { PrintBranch, hasPrintBranch, usePrintBranch } from './printBranch';
import { formatMobile, useMobileFormat } from './mobileFormat';
import PadLogo from './PadLogo';
import { usePadLogo } from './padLogoLayout';
import { getCurrentLanguage } from '../../../i18n/currentLanguage';

type Props = {
  /** The branch the report is about; falls back to the logged-in user's. */
  branch?: PrintBranch;
};

const CompanyPad: React.FC<Props> = ({ branch }) => {
  const settings = useSelector((state: any) => state.settings.data);
  const mobileFormat = useMobileFormat();

  // The report's own branch wins outright: the address must not fall back to the
  // session's, which belongs to a different branch.
  const printBranch = usePrintBranch(branch);
  const overridden = hasPrintBranch(printBranch);
  const localOn = getCurrentLanguage() !== 'en';
  const branchNameRaw = overridden ? printBranch?.name : settings?.branch?.name;
  const branchLocal = overridden ? printBranch?.name_local : settings?.branch?.name_local;
  const branchName = localOn && branchLocal ? branchLocal : branchNameRaw;
  const companyName = localOn
    ? settings?.company?.name_local || settings?.company?.name
    : settings?.company?.name;
  const branchAddress = overridden ? printBranch?.address : settings?.branch?.address;
  // The same mark, position and margins the branch set for its own pad heading.
  const logo = usePadLogo();

  return (
    <div>
      <div className="mb-0">
        <PadLogo config={logo}>
          <h1 className="text-2xl font-bold text-center uppercase">
            {companyName}
          </h1>
          <div className="text-center">
            <div>
              <span className="-mt-1"> {settings?.company?.address}</span>
            </div>
            <div>
              <span className="-mb-1"> {formatMobile(settings?.company?.phone, mobileFormat)}</span>
            </div>
            { settings?.company?.notes && (
              <div>
                <span className="-mt-3! text-xs"> {settings?.company?.notes}</span>
              </div>
            )}
          </div>
        </PadLogo>
      </div>
      <div className="border-t-2 border-gray-900"></div>
      {/* The print time used to sit on the right of this row, level with the
          report's own figures. It is in the footer now, beside the page count,
          where the rest of the facts about the sheet live. */}
      <div className='flex justify-between'>
        <h3 className="text-xs"> Branch: <span className='font-bold text-xs'>{branchName}</span></h3>
      </div>
      <div className="-mt-1 text-xs">Address: <span className='font-bold text-xs'>{branchAddress}</span></div>
    </div>
  );
};

export default CompanyPad;
