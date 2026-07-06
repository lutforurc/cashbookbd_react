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
import ConfirmModal from '../../utils/components/ConfirmModalProps';

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

      <div className="mx-auto mt-6 w-full max-w-md">
        <div className="border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-stroke px-5 py-3.5 dark:border-strokedark">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-red-500/10 text-red-500">
              <FiTrash2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-black dark:text-white">Voucher Delete</h3>
              <p className="text-xs text-slate-500 dark:text-bodydark2">Remove a voucher and its related entries.</p>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {/* Branch Info */}
            <div className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
              <div className="text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Branch whose data you want to delete
              </div>
              <div className="mt-0.5 text-base font-bold text-slate-800 dark:text-white">
                {settings?.data?.branch?.name || '-'}
              </div>
            </div>

            {/* Voucher Number Input */}
            <InputElement
              id="voucher_no"
              value={voucherNo}
              name="voucher_no"
              placeholder="Enter Voucher Number"
              label="Enter Voucher Number"
              className="mb-0"
              onChange={(e) => setVoucherNo(e.target.value)}
            />

            {/* Buttons */}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
                className="h-10 whitespace-nowrap"
                icon={<FiTrash2 className="ml-2 mr-2 text-lg text-red-400" />}
              />

              <Link to="/dashboard" className="h-10 justify-center text-nowrap">
                <FiHome className="ml-2 mr-2 text-lg text-white" />
                <span className="hidden md:block">Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ================= Confirmation Modal ================= */}
      <ConfirmModal
        show={showConfirm}
        title="Confirm Deletion"
        message={
          <>
            Are you sure you want to delete voucher
            <span className="block font-bold mt-1">
              {voucherNo} ?
            </span>
          </>
        }
        loading={saveButtonLoading}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleDeleteConfirmed}
        className="bg-red-600 hover:bg-red-700"
      />
    </>
  );
};

export default VoucherDelete;
