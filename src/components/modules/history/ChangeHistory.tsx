import React, { useEffect, useState } from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FiFileText } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { getSettings } from '../settings/settingsSlice';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { fetchVoucherChangeHistory } from './historySlice';

/* =====================================================
   Helper: Invoice Changes (CLEAN)
===================================================== */
const extractInvoiceChanges = (oldData, newData) => {
  if (!oldData.sales_master || !newData.sales_master) return [];

  const changes = [];
  const oldSales = oldData.sales_master;
  const newSales = newData.sales_master;

  if (oldSales.customer_id !== newSales.customer_id) {
    changes.push({
      field: 'Customer',
      old: oldSales.customer_id,
      new: newSales.customer_id,
    });
  }

  if (oldSales.netpayment !== newSales.netpayment) {
    changes.push({
      field: 'Net Payment',
      old: oldSales.netpayment,
      new: newSales.netpayment,
    });
  }

  const oldItem = oldSales.details?.[0];
  const newItem = newSales.details?.[0];

  if (oldItem && newItem) {
    if (oldItem.quantity !== newItem.quantity) {
      changes.push({
        field: 'Quantity',
        old: oldItem.quantity,
        new: newItem.quantity,
      });
    }

    if (oldItem.sales_price !== newItem.sales_price) {
      changes.push({
        field: 'Sales Price',
        old: oldItem.sales_price,
        new: newItem.sales_price,
      });
    }
  }

  return changes;
};

/* =====================================================
   Helper: Accounting Journal
===================================================== */
const renderJournal = (data) => {
  const masters = data?.acc_transaction_master || [];

  if (masters.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No entries
      </p>
    );
  }

  return masters.map((m, mi) => (
    <table
      key={mi}
      className="w-full text-sm border mb-3 
                 border-gray-200 dark:border-gray-700
                 bg-white dark:bg-gray-900"
    >
      <thead className="bg-gray-100 dark:bg-gray-800">
        <tr>
          <th className="border px-2 py-1 dark:border-gray-700 text-left">
            COA
          </th>
          <th className="border px-2 py-1 dark:border-gray-700 text-right">
            Debit
          </th>
          <th className="border px-2 py-1 dark:border-gray-700 text-right">
            Credit
          </th>
        </tr>
      </thead>
      <tbody>
        {m.acc_transaction_details.map((d) => (
          <tr key={d.id}>
            <td className="border px-2 py-1 dark:border-gray-700">
              {d.coa4_id}
            </td>
            <td className="border px-2 py-1 text-right dark:border-gray-700">
              {d.debit !== '0' ? d.debit : ''}
            </td>
            <td className="border px-2 py-1 text-right dark:border-gray-700">
              {d.credit !== '0' ? d.credit : ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ));
};

/* =====================================================
   History Card
===================================================== */
const HistoryCard = ({ item }) => {
  const oldData = JSON.parse(item.old_data);
  const newData = JSON.parse(item.new_data);

  const invoiceChanges = extractInvoiceChanges(oldData, newData);
  const isInvoice = !!newData.sales_master;

  return (
    <div className="border rounded-lg p-4 mb-4
                    bg-white dark:bg-gray-900
                    border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex justify-between mb-3">
        <div className="font-semibold text-gray-700 dark:text-gray-200">
          {isInvoice ? 'Invoice Update' : 'Voucher Update'}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(item.created_at).toLocaleString()}
        </div>
      </div>

      {/* Invoice Changes */}
      {invoiceChanges.length > 0 && (
        <>
          <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">
            Invoice Changes
          </h4>

          <table
            className="w-full text-sm border mb-4
                       border-gray-200 dark:border-gray-700"
          >
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="border px-2 py-1 dark:border-gray-700">
                  Field
                </th>
                <th className="border px-2 py-1 dark:border-gray-700">
                  Before
                </th>
                <th className="border px-2 py-1 dark:border-gray-700">
                  After
                </th>
              </tr>
            </thead>
            <tbody>
              {invoiceChanges.map((c, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1 dark:border-gray-700">
                    {c.field}
                  </td>
                  <td className="border px-2 py-1 text-red-600 dark:border-gray-700">
                    {c.old}
                  </td>
                  <td className="border px-2 py-1 text-green-600 dark:border-gray-700">
                    {c.new}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Accounting Journal */}
      <h4 className="font-semibold mb-2 text-green-600 dark:text-green-400">
        Accounting Journal
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="font-semibold text-sm mb-1 text-gray-700 dark:text-gray-300">
            Before
          </p>
          {renderJournal(oldData)}
        </div>

        <div>
          <p className="font-semibold text-sm mb-1 text-gray-700 dark:text-gray-300">
            After
          </p>
          {renderJournal(newData)}
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   Main Component
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
      localStorage.setItem(
        'settings_updated',
        Date.now().toString()
      );
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
      window.removeEventListener(
        'storage',
        handleStorageChange
      );
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

      <div className="grid grid-cols-1 gap-2 w-full md:w-1/3 mx-auto mt-5">
        <InputElement
          value={voucherNo}
          label="Voucher Number"
          placeholder="Enter Voucher Number"
          onChange={(e) => setVoucherNo(e.target.value)}
        />

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
      </div>

      <div className="max-w-5xl mx-auto mt-6">
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
