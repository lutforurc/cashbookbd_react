import React, { useMemo, useState } from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { fetchVoucherChangeHistory } from './historySlice';

import JournalSection from '../../utils/history/JournalSection';
import InvoiceChangesTable from '../../utils/history/InvoiceChangesTable';
import HistorySearchForm from '../../utils/history/HistorySearchForm';
import HistoryHeader from '../../utils/history/HistoryHeader';
import PurchaseDetailsTable from '../../utils/history/PurchaseDetailsTable';
import PurchaseSummary from '../../utils/history/PurchaseSummary';


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
  return val;
};

const getVoucherType = (vrNo) => {
  if (!vrNo) return 0;
  const first = String(vrNo).split('-')[0];
  return Number(first) || 0;
};

const num = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

/* =====================================================
   Helper: Invoice Changes (Sales)
===================================================== */
const extractInvoiceChanges = (oldData, newData) => {
  if (!oldData?.sales_master || !newData?.sales_master) return [];

  const changes = [];
  const oldSales = oldData.sales_master;
  const newSales = newData.sales_master;

  if (oldSales.customer_id !== newSales.customer_id) {
    changes.push({ field: 'Customer', old: oldSales.customer_id, new: newSales.customer_id });
  }

  if (num(oldSales.netpayment) !== num(newSales.netpayment)) {
    changes.push({ field: 'Net Payment', old: oldSales.netpayment, new: newSales.netpayment });
  }

  const oldItem = oldSales.details?.[0];
  const newItem = newSales.details?.[0];

  if (oldItem && newItem) {
    if (num(oldItem.quantity) !== num(newItem.quantity)) {
      changes.push({ field: 'Quantity', old: oldItem.quantity, new: newItem.quantity });
    }
    if (num(oldItem.sales_price) !== num(newItem.sales_price)) {
      changes.push({ field: 'Sales Price', old: oldItem.sales_price, new: newItem.sales_price });
    }
  }

  return changes;
};


/* =====================================================
   History Card
===================================================== */
const HistoryCard = ({ item, coaNameMap }) => {
  const oldData = useMemo(() => normalizeData(item.old_data), [item.old_data]);
  const newData = useMemo(() => normalizeData(item.new_data), [item.new_data]);

  const vrNo = newData?.vr_no || oldData?.vr_no || '';
  const type = getVoucherType(vrNo); // 4 = purchase, 3 = sales

  const isInvoice = !!newData?.sales_master;
  const isPurchase = !!(newData?.purchase_master || oldData?.purchase_master);

  const invoiceChanges = useMemo(
    () => extractInvoiceChanges(oldData, newData),
    [oldData, newData]
  );

  const actionByName =
    item?.action_by_user?.name ||
    item?.actionByUser?.name ||
    '';

  const title = type === 4 || isPurchase ? 'Purchase Update' : isInvoice ? 'Invoice Update' : 'Voucher Update';

  const oldPurchase = oldData?.purchase_master;
  const newPurchase = newData?.purchase_master;

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <HistoryHeader
        title={title}
        actionByName={actionByName}
        createdAt={item?.created_at}
      />

      {/* Sales Invoice Changes */}
      <InvoiceChangesTable changes={invoiceChanges} />

      {/* ✅ Purchase Info + Product Details */}
      {isPurchase ? (
        <>
          <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">
            Purchase Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="font-semibold text-sm mb-1 text-gray-700 dark:text-gray-300 underline">
                Before
              </p>
              <PurchaseSummary purchase={oldPurchase} />
              <PurchaseDetailsTable details={oldPurchase?.details} />
            </div>

            <div>
              <p className="font-semibold text-sm mb-1 text-gray-700 dark:text-gray-300 underline">
                After
              </p>
              <PurchaseSummary purchase={newPurchase} />
              <PurchaseDetailsTable details={newPurchase?.details} />
            </div>
          </div>
        </>
      ) : null}

      {/* Accounting Journal */}
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
   Main Component
===================================================== */
const ChangeHistory = () => {
  const dispatch = useDispatch();
  const historyState = useSelector((state) => state.history);

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
      <HelmetTitle title="Log History" />

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
