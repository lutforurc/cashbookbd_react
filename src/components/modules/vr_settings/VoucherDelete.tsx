import React, { useEffect, useState } from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import { Button, ButtonLoading, DeleteButton } from '../../../pages/UiElements/CustomButtons';
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
  const [alreadyDeletedMsg, setAlreadyDeletedMsg] = useState('');
  const [forceLoading, setForceLoading] = useState(false);

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

        const response = result.payload as any;

        // ❗ API success flag check
        if (response?.success === true) {
          toast.success("Voucher deleted successfully");
          setVoucherNo("");
        } else if (response?.requires_confirmation) {
          // Already deleted earlier — ask the user to confirm instead of erroring.
          setShowConfirm(false);
          setAlreadyDeletedMsg(response?.error?.message || `${voucherNo} was already deleted earlier.`);
          return;
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

  // ================= Handle Force Delete (already-deleted confirmation) =================
  const handleForceDelete = async () => {
    setForceLoading(true);

    try {
      const result = await dispatch(deleteVoucher({ voucher_no: voucherNo, confirm: true }));

      if (deleteVoucher.fulfilled.match(result) && (result.payload as any)?.success === true) {
        toast.success((result.payload as any)?.error?.message || `${voucherNo} deleted`);
        setVoucherNo("");
      } else {
        toast.error((result.payload as any)?.error?.message || "Failed to delete voucher");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setForceLoading(false);
      setAlreadyDeletedMsg("");
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
                className="whitespace-nowrap"
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

      {/* ========== Already-Deleted Confirmation (continue anyway) ========== */}
      {alreadyDeletedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-stroke bg-white shadow-xl dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-amber-300 bg-amber-50 px-5 py-3 dark:border-amber-700/50 dark:bg-amber-500/10">
              <h3 className="text-base font-semibold text-amber-700 dark:text-amber-400">Voucher Already Deleted</h3>
              <p className="mt-0.5 text-sm text-amber-700/90 dark:text-amber-400/90">{alreadyDeletedMsg}</p>
            </div>

            <div className="px-5 py-4 text-sm text-slate-600 dark:text-bodydark">
              You can continue and delete it again, or cancel.
              <div className="mt-2 border border-stroke px-3 py-2 dark:border-strokedark">
                <div className="font-semibold text-black dark:text-white">Voucher: {voucherNo}</div>
                <div className="text-xs text-slate-400">{settings?.data?.branch?.name}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-stroke px-5 py-3 dark:border-strokedark">
              <Button
                type="button"
                onClick={() => setAlreadyDeletedMsg('')}
                className="border border-stroke px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-strokedark dark:text-bodydark dark:hover:bg-meta-4"
              >
                Cancel
              </Button>
              <ButtonLoading
                type="button"
                onClick={handleForceDelete}
                buttonLoading={forceLoading}
                disabled={forceLoading}
                label="Continue"
                icon={<FiSave className="mr-2 text-lg" />}
                className="px-6"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoucherDelete;
