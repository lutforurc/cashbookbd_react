import { useMemo } from "react";
import HistoryHeader from "./HistoryHeader";
import InvoiceChangesTable from "./InvoiceChangesTable";
import JournalSection from "./JournalSection";
import PurchaseChangesTable from "./PurchaseChangesTable";
import PurchaseItemsChanges from "./PurchaseItemsChanges";
import { extractInvoiceChanges, extractPurchaseChanges, getVoucherType, normalizeData } from "./historyHelpers";

const HistoryCard = ({ item, coaNameMap }) => {
  const oldData = useMemo(() => normalizeData(item.old_data), [item.old_data]);
  const newData = useMemo(() => normalizeData(item.new_data), [item.new_data]);

  const vrNo = newData?.vr_no || oldData?.vr_no || "";
  const type = getVoucherType(vrNo);       // ✅ 4 হলে purchase

  const isInvoice = !!newData.sales_master;
  const isPurchase = !!newData.purchase_master;

  const invoiceChanges = useMemo(
    () => extractInvoiceChanges(oldData, newData),
    [oldData, newData]
  );

  const purchaseChanges = useMemo(
    () => extractPurchaseChanges(oldData, newData),
    [oldData, newData]
  );

  const actionByName = item?.action_by_user?.name || item?.actionByUser?.name || '';

  const title =
    type === 4 || isPurchase ? "Purchase Update" : isInvoice ? "Invoice Update" : "Voucher Update";

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <HistoryHeader title={title} actionByName={actionByName} createdAt={item?.created_at} />

      <InvoiceChangesTable changes={invoiceChanges} />

      {/* ✅ Purchase UI */}
      {isPurchase ? (
        <>
          <PurchaseChangesTable summary={purchaseChanges.summary} />
          <PurchaseItemsChanges items={purchaseChanges.items} />
        </>
      ) : null}

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