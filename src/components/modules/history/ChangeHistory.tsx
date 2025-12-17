import React, { useEffect, useState } from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FiHome, FiFileText, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Link from '../../utils/others/Link';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { getSettings } from '../settings/settingsSlice';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { fetchVoucherChangeHistory } from './historySlice';

/* =====================================================
   DIFF UI COMPONENT
===================================================== */
const DiffRow = ({ field, oldVal, newVal, level }) => (
  <div
    className="grid grid-cols-3 gap-3 text-sm py-2"
    style={{ paddingLeft: level * 20 }}
  >
    <div className="font-medium text-gray-700 break-all">
      {field}
    </div>
    <div className="bg-red-50 text-red-700 px-2 py-1 rounded">
      {String(oldVal)}
    </div>
    <div className="bg-green-50 text-green-700 px-2 py-1 rounded">
      {String(newVal)}
    </div>
  </div>
);

/* =====================================================
   RECURSIVE DIFF LOGIC (NO FIELD SKIPPED)
===================================================== */
const renderDiff = (oldVal, newVal, path = '', level = 0) => {
  if (
    typeof oldVal !== 'object' ||
    oldVal === null ||
    typeof newVal !== 'object' ||
    newVal === null
  ) {
    if (oldVal === newVal) return null;
    return (
      <DiffRow
        key={path}
        field={path || 'value'}
        oldVal={oldVal}
        newVal={newVal}
        level={level}
      />
    );
  }

  if (Array.isArray(oldVal)) {
    return oldVal.map((item, i) =>
      renderDiff(item, newVal?.[i], `${path}[${i}]`, level + 1)
    );
  }

  return Object.keys(oldVal).map((key) =>
    renderDiff(
      oldVal[key],
      newVal?.[key],
      path ? `${path}.${key}` : key,
      level + 1
    )
  );
};

/* =====================================================
   HISTORY CARD (ACCORDION STYLE)
===================================================== */
const HistoryCard = ({ item }) => {
  const [open, setOpen] = useState(false);
  const oldData = JSON.parse(item.old_data);
  const newData = JSON.parse(item.new_data);

  return (
    <div className="border rounded-xl mb-4 bg-white shadow-sm">
      {/* Header */}
      <div
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        <div>
          <h3 className="font-semibold text-gray-800">
            Voucher / Invoice Update
          </h3>
          <p className="text-xs text-gray-500">
            {new Date(item.created_at).toLocaleString()}
          </p>
        </div>

        {open ? <FiChevronUp /> : <FiChevronDown />}
      </div>

      {/* Body */}
      {open && (
        <div className="border-t p-4 bg-gray-50">
          <div className="grid grid-cols-3 text-sm font-semibold mb-3">
            <span className="text-gray-600">Field</span>
            <span className="text-red-600">Old</span>
            <span className="text-green-600">New</span>
          </div>

          <div className="space-y-1">
            {renderDiff(oldData, newData)}
          </div>
        </div>
      )}
    </div>
  );
};

/* =====================================================
   MAIN COMPONENT
===================================================== */
const ChangeHistory = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings);
  const historyState = useSelector((state) => state.history);

  const historyList = historyState?.history?.data?.data || [];

  const [voucherNo, setVoucherNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    return () =>
      window.removeEventListener('storage', handleStorageChange);
  }, [dispatch]);

  const handleFetchConfirmed = async () => {
    setLoading(true);
    try {
      const result = await dispatch(
        fetchVoucherChangeHistory({ voucher_no: voucherNo })
      );

      if (
        fetchVoucherChangeHistory.fulfilled.match(result) &&
        result.payload?.success
      ) {
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
      <HelmetTitle title="Voucher / Invoice Change History" />

      {/* Search Section */}
      <div className="grid grid-cols-1 gap-2 w-full md:w-1/3 mx-auto mt-5">
        <div>
          <span className="font-bold">
            {settings?.data?.branch?.name}
          </span>
        </div>

        <InputElement
          value={voucherNo}
          label="Voucher Number"
          placeholder="Enter Voucher Number"
          onChange={(e) => setVoucherNo(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <ButtonLoading
            label="View History"
            buttonLoading={loading}
            icon={<FiFileText />}
            onClick={() => {
              if (!voucherNo) {
                toast.error('Please enter voucher number');
                return;
              }
              setShowConfirm(true);
            }}
          />

          <Link to="/dashboard" className="h-8 justify-center">
            <FiHome /> Home
          </Link>
        </div>
      </div>

      {/* History List */}
      <div className="max-w-5xl mx-auto mt-6">
        {historyState.loading && (
          <p className="text-center">Loading...</p>
        )}

        {!historyState.loading && historyList.length === 0 && (
          <p className="text-center text-gray-500">
            No history found
          </p>
        )}

        {historyList.map((item) => (
          <HistoryCard key={item.id} item={item} />
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
