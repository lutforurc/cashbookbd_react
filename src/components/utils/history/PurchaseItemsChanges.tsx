import thousandSeparator from "../utils-functions/thousandSeparator";

// PurchaseItemsChanges.jsx
const PurchaseItemsChanges = ({ items }) => {
  if (!items?.length) return null;

  return (
    <>
      <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">
        Purchase Items Changes
      </h4>

      <table className="w-full text-sm border mb-4 border-gray-200 dark:border-gray-700">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="border px-2 py-1 dark:border-gray-700">Product</th>
            <th className="border px-2 py-1 dark:border-gray-700">Qty (Before)</th>
            <th className="border px-2 py-1 dark:border-gray-700">Qty (After)</th>
            <th className="border px-2 py-1 dark:border-gray-700">Price (Before)</th>
            <th className="border px-2 py-1 dark:border-gray-700">Price (After)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.product_id}>
              <td className="border px-2 py-1 dark:border-gray-700">
                {r.product_name ?? r.product_id}
              </td>
              <td className="border px-2 py-1 text-right text-red-600 dark:border-gray-700">
                {r.old_quantity}
              </td>
              <td className="border px-2 py-1 text-right text-green-600 dark:border-gray-700">
                {r.new_quantity}
              </td>
              <td className="border px-2 py-1 text-right text-red-600 dark:border-gray-700">
                { thousandSeparator(r.old_price, 0)}
              </td>
              <td className="border px-2 py-1 text-right text-green-600 dark:border-gray-700">
                { thousandSeparator(r.new_price, 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default PurchaseItemsChanges;
