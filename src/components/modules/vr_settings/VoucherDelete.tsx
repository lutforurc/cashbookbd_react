import React, { useEffect, useState } from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import {
  ButtonLoading,
  DeleteButton,
} from '../../../pages/UiElements/CustomButtons';
import { FiHome, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import Link from '../../utils/others/Link';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { getSettings } from '../settings/settingsSlice';
import { deleteVoucher } from './voucherSettingsSlice';

const VoucherDelete = () => {
  const settings = useSelector((s) => s.settings);
  const dispatch = useDispatch();

  const [voucherNo, setVoucherNo] = useState('');
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ================= Sync Settings from localStorage =================
  useEffect(() => {
    if (settings?.data?.trx_dt) {
      localStorage.setItem('settings_updated', Date.now().toString());
    }
  }, [settings?.data?.trx_dt]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'settings_updated') {
        dispatch(getSettings());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [dispatch]);

  // ================= Handle Confirm Delete =================
const handleDeleteConfirmed = async () => {
  setSaveButtonLoading(true);

  try {
    const result = await dispatch(deleteVoucher({ voucher_no: voucherNo }));

    // success match
    if (deleteVoucher.fulfilled.match(result)) {
      
      const response = result.payload;

      // ❗ API success flag check
      if (response?.success === true) {
        toast.success("Voucher deleted successfully");
        setVoucherNo("");
      } else {
        // API error message safely read
        toast.error(response?.error?.message || "Failed to delete voucher");
      }

    } else {
      toast.error("Failed to delete voucher");
    }

  } catch (error) {
    toast.error("Something went wrong");
  } finally {
    setSaveButtonLoading(false);
    setShowConfirm(false);
  }
};


  return (
    <>
      <HelmetTitle title="Voucher Delete" />

      <div className="grid grid-cols-1 gap-2 w-full md:w-1/3 mx-auto mt-5">
        {/* Branch Info */}
        <div className="!mb-2">
          <div className='text-gray-800 dark:text-white mb-1'>The branch whose data you want to delete:</div>
          <span className="text-gray-800 dark:text-white font-bold">
            {settings?.data?.branch?.name}
          </span>
        </div>

        {/* Voucher Number Input */}
        <InputElement
          id="voucher_no"
          value={voucherNo}
          name="voucher_no"
          placeholder="Enter Voucher Number"
          label="Enter Voucher Number"
          className="mb-2"
          onChange={(e) => setVoucherNo(e.target.value)}
        />

        {/* Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ButtonLoading
            onClick={() => {
              if (!voucherNo) {
                toast.error('Please enter voucher number');
                return;
              }
              setShowConfirm(true);
            }}
            buttonLoading={saveButtonLoading}
            label="Delete Voucher"
            className="whitespace-nowrap h-8"
            icon={<FiTrash2 className="dark:text-red-700 text-lg ml-2 mr-2" />}
          />

          <Link to="/dashboard" className="text-nowrap justify-center h-8">
            <FiHome className="text-white text-lg ml-2 mr-2" />
            <span className="hidden md:block">Home</span>
          </Link>
        </div>
      </div>

      {/* ================= Confirmation Modal ================= */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-900 text-white rounded-lg shadow-lg w-96 p-5">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="mb-4">
              Are you sure you want to delete voucher{' '}
              <span className="block font-bold">{voucherNo} ?</span>
            </p>
            <div className="flex justify-end gap-3">
              {/* Cancel Button */}
              <ButtonLoading
                onClick={() => setShowConfirm(false)}
                label="Cancel"
                className="whitespace-nowrap h-8 bg-gray-600 hover:bg-gray-700"
                icon={<FiX className="text-white text-lg mr-2" />}
                disabled={saveButtonLoading} // Cancel button disabled while loading
              />

              {/* Confirm Button */}
              <DeleteButton
                label="Confirm"
                onClick={handleDeleteConfirmed}
                loading={saveButtonLoading} // spinner shows while API call is running
                disabled={saveButtonLoading} // button disabled while API call
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoucherDelete;
