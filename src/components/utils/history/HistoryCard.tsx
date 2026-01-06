import { useMemo } from "react";
import JournalSection from "./JournalSection";
import HistoryHeader from "./HistoryHeader";
import InvoiceChangesTable from "./InvoiceChangesTable";


const HistoryCard = ({ item, coaNameMap }) => {
  const oldData = useMemo(() => normalizeData(item.old_data), [item.old_data]);
  const newData = useMemo(() => normalizeData(item.new_data), [item.new_data]);

  const invoiceChanges = useMemo(() => extractInvoiceChanges(oldData, newData),[oldData, newData]);

  const isInvoice = !!newData.sales_master;


  

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

export default HistoryCard;