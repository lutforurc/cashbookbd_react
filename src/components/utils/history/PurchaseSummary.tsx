import { chartDate } from "../utils-functions/formatDate";
import thousandSeparator from "../utils-functions/thousandSeparator";

const PurchaseSummary = ({ purchase }) => {
  if (!purchase) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No purchase data</p>;
  }

  const supplier = purchase?.supplier_name ?? purchase?.supplier_id ?? '';
  // const date = purchase?.transact_date ?? '';

  return (
    <div className="text-sm mb-2 text-gray-700 dark:text-gray-300">
      <div><b>Supplier:</b> {supplier}</div>
      <div><b>Date:</b> { chartDate(purchase?.transact_date)}</div>
      <div><b>Total:</b> {thousandSeparator(purchase?.total)}</div>
      <div><b>Discount:</b> { thousandSeparator(purchase?.discount)}</div>
      <div><b>Net Payment:</b> { thousandSeparator(purchase?.netpayment)}</div>
    </div>
  );
};

export default PurchaseSummary;