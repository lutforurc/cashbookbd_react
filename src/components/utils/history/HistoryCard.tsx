import { useMemo } from "react";
import { extractInvoiceChanges, getVoucherType, normalizeData } from "./historyHelpers";
import HistoryHeader from "./HistoryHeader";
import InvoiceChangesTable from "./InvoiceChangesTable";
import PurchaseSummary from "./PurchaseSummary";
import PurchaseDetailsTable from "./PurchaseDetailsTable";
import JournalSection from "./JournalSection";

const HistoryCard = ({ item, coaNameMap }) => {
  // Safely normalizing old and new data
  const oldData = useMemo(() => normalizeData(item.old_data), [item.old_data]);
  const newData = useMemo(() => normalizeData(item.new_data), [item.new_data]);

  // Extract voucher number and determine the type of voucher
  const vrNo = newData?.vr_no || oldData?.vr_no || '';
  const type = getVoucherType(vrNo); // 4 = purchase, 3 = sales

  // Determine if the record is an invoice or purchase
  const isInvoice = !!newData?.sales_master;
  const isPurchase = !!(newData?.purchase_master || oldData?.purchase_master);

  // Extract changes from invoice
  const invoiceChanges = useMemo(
    () => extractInvoiceChanges(oldData, newData),
    [oldData, newData]
  );

  // Get the action by user name (who made the change)
  const actionByName = item?.action_by_user?.name || item?.actionByUser?.name || '';

  // Define title based on voucher type
  const title = type === 4 || isPurchase ? 'Purchase Update' : isInvoice ? 'Invoice Update' : 'Voucher Update';

  // Get old and new purchase data
  const oldPurchase = oldData?.purchase_master;
  const newPurchase = newData?.purchase_master;

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      {/* History Header with title, action by user, and created date */}
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
      <h4 className="font-semibold text-green-600 dark:text-green-400">
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
