import { useState } from 'react';
import { toast } from 'react-toastify';
import httpService from '../../services/httpService';
import { API_VOUCHER_APPROVAL_REMOVE_BY_ID_URL } from '../../services/apiRoutes';

const getVoucherId = (row: any) => Number(
  row?.mtm_id ??
  row?.smtm_id ??
  row?.mtmid ??
  row?.mtmId ??
  row?.mid ??
  row?.id ??
  0,
);

export const useRemoveVoucherApproval = () => {
  const [removingApprovalId, setRemovingApprovalId] = useState<number | null>(null);

  const removeVoucherApproval = async (
    row: any,
    options?: {
      onSuccess?: () => void;
    },
  ) => {
    const voucherId = getVoucherId(row);

    if (!voucherId) {
      toast.error('Approval id not found.');
      return false;
    }

    try {
      setRemovingApprovalId(voucherId);
      const response = await httpService.post(API_VOUCHER_APPROVAL_REMOVE_BY_ID_URL, {
        id: voucherId,
        mtm_id: voucherId,
        remove_for_approval: row?.vr_no,
      });
      const result = response?.data;

      if (result?.success) {
        toast.success(result?.message || 'Voucher approval removed successfully.');
        options?.onSuccess?.();
        return true;
      }

      toast.error(result?.message || 'Voucher approval remove failed.');
      return false;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Voucher approval remove failed.');
      return false;
    } finally {
      setRemovingApprovalId(null);
    }
  };

  return {
    removingApprovalId,
    removeVoucherApproval,
    getVoucherId,
  };
};
