import thousandSeparator from "../utils-functions/thousandSeparator";

const PurchaseDetailsTable = ({ details }) => {
  const rows = details || [];

  if (!rows.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No product items</p>;
  }

  // Product / Qty / Price, and this sits in one half of a two-column grid from
  // md up -- so it has a card's width to work with on a phone and half of one
  // on a laptop. The scroller keeps the columns readable at both; the min-width
  // is what lets it engage, since a w-full table cannot outgrow its container.
  return (
    <div className="overflow-x-auto">
    <table className="w-full min-w-96 text-sm border border-[rgb(var(--c-border))]">
      <thead className="bg-[rgb(var(--c-table-head))]">
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
              { thousandSeparator( d?.quantity)}
            </td>
            <td className="border px-2 py-1 text-right dark:border-gray-700">
              { thousandSeparator( d?.purchase_price)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
};
export default PurchaseDetailsTable;