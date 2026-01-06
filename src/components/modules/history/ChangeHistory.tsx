import React, { useEffect, useMemo, useState } from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { fetchVoucherChangeHistory } from './historySlice';
import HistorySearchForm from '../../utils/history/HistorySearchForm';
import HistoryCard from '../../utils/history/HistoryCard';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';

const normalizeData = (val) => {
  if (!val) return {};
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      return {};
    }
  }
  return val;
};

const ChangeHistory = ( user:any ) => {
  const dispatch = useDispatch();
  const historyState = useSelector((state) => state.history);
  const historyList = historyState?.history?.data?.data || [];
  const [voucherNo, setVoucherNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [branchId, setBranchId] = useState<number | null>(user?.user?.branch_id ?? null);

  const coaNameMap = useMemo(() => {
    const map = {};
    historyList.forEach((item:any) => {
      const oldData = normalizeData(item.old_data);
      const newData = normalizeData(item.new_data);
      [oldData, newData].forEach((d) => {
        (d?.acc_transaction_master || []).forEach((m) => {
          (m?.acc_transaction_details || []).forEach((row:any) => {
            if (row?.coa4_id && row?.coa_l4?.name) {
              map[row.coa4_id] = row.coa_l4.name;
            }
          });
        });
      });
    });
    return map;
  }, [historyList]);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  const handleFetchConfirmed = async () => {
    setLoading(true);
    try {
      const result = await dispatch(
        fetchVoucherChangeHistory({
          branch: branchId,      
          voucher_no: voucherNo,
        })
      );

      if (fetchVoucherChangeHistory.fulfilled.match(result) && result.payload?.success) {
        toast.success('History loaded successfully');
      } else {
        toast.error('Failed to load history');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <HelmetTitle title="Log History" />
      <HistorySearchForm
        voucherNo={voucherNo}
        setVoucherNo={setVoucherNo}
        loading={loading}
        user={user}
        branchId={branchId}           
        setBranchId={setBranchId}     
        onSubmit={() => {
          if (!voucherNo) {
            toast.error('Please enter voucher number');
            return;
          }
          setShowConfirm(true);
        }}
      />

      <div className="max-w-5xl mx-auto mt-6">
        {/* {branchName && ( */}
        { historyList.length > 0 && <div className="border rounded-lg pl-4 pt-2 pb-2 mb-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">

        <p className="text-green-600 dark:text-green-400 font-semibold">Branch: {historyList[0]?.branch_info?.name}</p>
        </div>}
      {/* )} */}
        {historyList.map((item) => (
          <HistoryCard key={item.id} item={item} coaNameMap={coaNameMap} />
        ))}
      </div>

      <ConfirmModal
        show={showConfirm}
        title="Confirm"
        message={`View history for voucher ${voucherNo}?`}
        loading={loading}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleFetchConfirmed}
      />
    </>
  );
};

export default ChangeHistory;
