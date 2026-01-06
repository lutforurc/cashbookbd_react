import React, { useMemo, useState } from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FiFileText } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { fetchVoucherChangeHistory } from './historySlice';
import { chartDateTime } from '../../utils/utils-functions/formatDate';
import JournalTable from '../../utils/history/JournalTable';
import JournalSection from '../../utils/history/JournalSection';

/* =====================================================
   Helper: Safe JSON Parse (string OR object)
===================================================== */
const normalizeData = (val) => {
  if (!val) return {};
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      return {};
    }
  }
  return val; // already object/array
};

/* =====================================================
   Helper: Invoice Changes
===================================================== */
const extractInvoiceChanges = (oldData, newData) => {
  if (!oldData.sales_master || !newData.sales_master) return [];

  const changes = [];
  const oldSales = oldData.sales_master;
  const newSales = newData.sales_master;

  if (oldSales.customer_id !== newSales.customer_id) {
    changes.push({ field: 'Customer', old: oldSales.customer_id, new: newSales.customer_id });
  }

  if (oldSales.netpayment !== newSales.netpayment) {
    changes.push({ field: 'Net Payment', old: oldSales.netpayment, new: newSales.netpayment });
  }

  const oldItem = oldSales.details?.[0];
  const newItem = newSales.details?.[0];

  if (oldItem && newItem) {
    if (oldItem.quantity !== newItem.quantity) {
      changes.push({ field: 'Quantity', old: oldItem.quantity, new: newItem.quantity });
    }
    if (oldItem.sales_price !== newItem.sales_price) {
      changes.push({ field: 'Sales Price', old: oldItem.sales_price, new: newItem.sales_price });
    }
  }

  return changes;
};

/* =====================================================
   Small Component: History Header (✅ action_by_user.name)
===================================================== */
const HistoryHeader = ({ title, actionByName, createdAt }) => {
  const formattedDate = createdAt ? chartDateTime(new Date(createdAt).toLocaleString('en-US')): '';

  return (
    <div className="flex justify-between mb-3">
      <div className="font-semibold text-gray-700 dark:text-gray-200">
        {title}
        {actionByName ? (
          <span className="ml-2 text-sm font-medium text-red-500 dark:text-gray-400">
            (Updated by: {actionByName})
          </span>
        ) : null}
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        {formattedDate}
      </div>
    </div>
  );
};

/* =====================================================
   Small Component: Invoice Changes Table
===================================================== */
const InvoiceChangesTable = ({ changes }) => {
  if (!changes?.length) return null;

  return (
    <>
      <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">
        Invoice Changes
      </h4>

      <table className="w-full text-sm border mb-4 border-gray-200 dark:border-gray-700">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="border px-2 py-1 dark:border-gray-700">Field</th>
            <th className="border px-2 py-1 dark:border-gray-700">Before</th>
            <th className="border px-2 py-1 dark:border-gray-700">After</th>
          </tr>
        </thead>

        <tbody>
          {changes.map((c, i) => (
            <tr key={i}>
              <td className="border px-2 py-1 dark:border-gray-700">{c.field}</td>
              <td className="border px-2 py-1 text-red-600 dark:border-gray-700">{c.old}</td>
              <td className="border px-2 py-1 text-green-600 dark:border-gray-700">{c.new}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

/* =====================================================
   Small Component: Journal Section (Before/After)
===================================================== */
// const JournalSection = ({ label, data, coaNameMap }) => {
//   const masters = data?.acc_transaction_master || [];

//   return (
//     <div>
//       <p className="font-semibold text-sm mb-1 text-gray-700 dark:text-gray-300">
//         {label}
//       </p>

//       {!masters.length ? (
//         <p className="text-sm text-gray-500 dark:text-gray-400">No entries</p>
//       ) : (
//         masters.map((m, mi) => (
//           <JournalTable
//             key={m?.id ?? mi}
//             tableKey={m?.id ?? mi}
//             details={m?.acc_transaction_details || []}
//             coaNameMap={coaNameMap}
//           />
//         ))
//       )}
//     </div>
//   );
// };

/* =====================================================
   History Card (✅ fixed action_by_user display)
===================================================== */
const HistoryCard = ({ item, coaNameMap }) => {
  const oldData = useMemo(() => normalizeData(item.old_data), [item.old_data]);
  const newData = useMemo(() => normalizeData(item.new_data), [item.new_data]);

  const invoiceChanges = useMemo(
    () => extractInvoiceChanges(oldData, newData),
    [oldData, newData]
  );

  const isInvoice = !!newData.sales_master;


  const actionByName =
    item?.action_by_user?.name ||
    item?.actionByUser?.name ||
    '';

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <HistoryHeader
        title={isInvoice ? 'Invoice Update' : 'Voucher Update'}
        actionByName={actionByName}
        createdAt={item?.created_at}
      />

      <InvoiceChangesTable changes={invoiceChanges} />

      <h4 className="font-semibold mb-2 text-green-600 dark:text-green-400">
        Accounting Journal
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <JournalSection label="Before" data={oldData} coaNameMap={coaNameMap} />
        <JournalSection label="After" data={newData} coaNameMap={coaNameMap} />
      </div>
    </div>
  );
};

/* =====================================================
   Search Form (small component)
===================================================== */
const HistorySearchForm = ({
  voucherNo,
  setVoucherNo,
  loading,
  onSubmit,
}) => {
  return (
    <div className="grid grid-cols-1 gap-2 w-full md:w-1/3 mx-auto mt-5">
      <InputElement
        id="voucherNo"
        name="voucherNo"
        value={voucherNo}
        label="Voucher Number"
        placeholder="Enter Voucher Number"
        onChange={(e) => setVoucherNo(e.target.value)}
      />

      <ButtonLoading
        label="View History"
        buttonLoading={loading}
        className="p-2 dark:text-gray-200"
        icon={<FiFileText />}
        onClick={onSubmit}
      />
    </div>
  );
};

/* =====================================================
   Main Component
===================================================== */
const ChangeHistory = () => {
  const dispatch = useDispatch();
  const historyState = useSelector((state) => state.history);

  // ✅ আপনার response structure অনুযায়ী:
  // data: { data: [ ... ] }
  const historyList = historyState?.history?.data?.data || [];

  const [voucherNo, setVoucherNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* GLOBAL COA ID → NAME MAP */
  const coaNameMap = useMemo(() => {
    const map = {};

    historyList.forEach((item) => {
      const oldData = normalizeData(item.old_data);
      const newData = normalizeData(item.new_data);

      [oldData, newData].forEach((d) => {
        (d?.acc_transaction_master || []).forEach((m) => {
          (m?.acc_transaction_details || []).forEach((row) => {
            if (row?.coa4_id && row?.coa_l4?.name) {
              map[row.coa4_id] = row.coa_l4.name;
            }
          });
        });
      });
    });

    return map;
  }, [historyList]);

  const handleFetchConfirmed = async () => {
    setLoading(true);
    try {
      const result = await dispatch(fetchVoucherChangeHistory({ voucher_no: voucherNo }));

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
      <HelmetTitle title="Voucher Change History" />

      <HistorySearchForm
        voucherNo={voucherNo}
        setVoucherNo={setVoucherNo}
        loading={loading}
        onSubmit={() => {
          if (!voucherNo) {
            toast.error('Please enter voucher number');
            return;
          }
          setShowConfirm(true);
        }}
      />

      <div className="max-w-5xl mx-auto mt-6">
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
