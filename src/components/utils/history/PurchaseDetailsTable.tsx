import thousandSeparator from "../utils-functions/thousandSeparator";

const PurchaseDetailsTable = ({ details }) => {
  const rows = details || [];

  if (!rows.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No product items</p>;
  }

  return (
    <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
      <thead className="bg-gray-100 dark:bg-gray-800">
        <tr>
          <th className="border px-2 py-1 dark:border-gray-700 text-left">Product</th>
          <th className="border px-2 py-1 dark:border-gray-700 text-right">Qty</th>
          <th className="border px-2 py-1 dark:border-gray-700 text-right">Price</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d, i) => (
          <tr key={d?.id ?? i}>
            <td className="border px-2 py-1 dark:border-gray-700">
              {d?.product_name ?? d?.product_id ?? ''}
            </td>
            <td className="border px-2 py-1 text-right dark:border-gray-700">
              { thousandSeparator( d?.quantity, 0)}
            </td>
            <td className="border px-2 py-1 text-right dark:border-gray-700">
              { thousandSeparator( d?.purchase_price, 0)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
export default PurchaseDetailsTable;