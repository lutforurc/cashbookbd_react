import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaCheckDouble, FaHouse, FaArrowLeft, FaArrowsTurnToDots  } from 'react-icons/fa6';

import HelmetTitle from '../../utils/others/HelmetTitle';
import Link from '../../utils/others/Link';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';

import { getSettings } from '../settings/settingsSlice';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { changeVoucherTypeStore, getVoucherTypes } from './changeVoucherTypeSlice';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';

interface VoucherTypeItems {
  id: string | number;
  branch_id?: string | number;
  voucher_type: string;
  voucher_number: string;
}

const ChangeVoucherType = () => {
  const dispatch = useDispatch();
  const { me } = useSelector((state: any) => state.auth);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const voucherTypes = useSelector((state: any) => state.changeVoucherType);

  const initialFormData: VoucherTypeItems = {
    id: '',
    branch_id: me?.branch_id ?? '',
    voucher_type: '',
    voucher_number: '',
  };


  // console.log('vType', voucherTypes);

  const [formData, setFormData] = useState<VoucherTypeItems>(initialFormData);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(me?.branch_id ?? null);

  useEffect(() => {
    dispatch(getVoucherTypes());
  }, []);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);


  console.log('vouchrType', voucherTypes?.voucherList);

  useEffect(() => {
    setDropdownData(branchDdlData?.protectedData?.data || []);
  }, [branchDdlData]);

  useEffect(() => {
    if (me?.branch_id) setBranchId(me.branch_id);
  }, [me?.branch_id]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'settings_updated') dispatch(getSettings());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [dispatch]);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBranchId(Number(e.target.value));
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target; 
      setFormData({ ...formData, [name]: value }); 
  };


  const handleSave = async () => {
    await dispatch(
      changeVoucherTypeStore({ ...formData, branch_id: branchId }, (message: string) => {
        toast.success(message);
      })
    );
  };

  return (
    <>
      <HelmetTitle title="Change Voucher Type" />
      <div className="grid grid-cols-1 gap-2 w-full md:w-2/3 lg:w-1/2 mx-auto mt-5">

        <div>
          <label>Select Branch</label>
          {branchDdlData.isLoading && <Loader />}
          <BranchDropdown
            defaultValue={me?.branch_id}
            onChange={handleBranchChange}
            className="w-60 font-medium text-sm p-1.5"
            branchDdl={dropdownData}
          />
        </div>

        <InputElement
          id="voucher_number"
          name="voucher_number"
          value={formData.voucher_number}
          onChange={handleOnChange}
          label="Enter Voucher Number"
          placeholder="Enter Voucher Number"
          className=''
        />

{/* {voucherTypes?.isLoading ? (
  <Loader />
) : ( */}

{/* { voucherTypes?.isLoading && <Loader /> } */}
<DropdownCommon
  id="voucher_type"
  name="voucher_type"
  label="Select Voucher Type"
  onChange={handleOnSelectChange}
  defaultValue={formData?.voucher_type || ""}
  className="h-[2.1rem] bg-transparent"
  data={Array.isArray(voucherTypes?.voucherList) ? voucherTypes.voucherList : []}
/>


{/* )} */}




        <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
          <ButtonLoading
            onClick={handleSave}
            buttonLoading={true}
            label="Change"
            className="whitespace-nowrap text-center mr-0 h-8"
            icon={<FaArrowsTurnToDots className="text-white text-lg ml-2 mr-2" />}
          />
          <Link to="/admin/dayclose" className="text-nowrap justify-center mr-0 h-8">
            <FaArrowLeft className="text-white text-lg ml-2 mr-2" />
            <span className="hidden md:block">Back</span>
          </Link>
          <Link to="/dashboard" className="text-nowrap justify-center mr-0 h-8">
            <FaHouse className="text-white text-lg ml-2 mr-2" />
            <span className="hidden md:block">Home</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default ChangeVoucherType;
