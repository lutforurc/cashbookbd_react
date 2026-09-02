import thousandSeparator from "../utils-functions/thousandSeparator";

/* =====================================================
   Small Component: Journal Table (per master)
===================================================== */
const JournalTable = ({ details, coaNameMap, tableKey }) => {
  // An account name against two money columns, in half a card from md up. The
  // account names are the long part and the figures are the part that must not
  // wrap, so the table keeps a working width and the strip scrolls instead.
  return (
    <div className="mb-3 overflow-x-auto">
    <table
      key={tableKey}
      className="w-full min-w-88 text-sm border border-[rgb(var(--c-border))] bg-white dark:bg-gray-900"
    >
      <thead className="bg-[rgb(var(--c-table-head))]">
        <tr>
          <th className="border px-2 py-1 dark:border-gray-700 text-left">COA</th>
          <th className="border px-2 py-1 dark:border-gray-700 text-right">Debit</th>
          <th className="border px-2 py-1 dark:border-gray-700 text-right">Credit</th>
        </tr>
      </thead>

      <tbody>
        {(details || []).map((d, di) => {
          const coaTitle =
            d?.coa_l4?.name ||
            (d?.coa4_id ? coaNameMap[d.coa4_id] : null) ||
            d?.coa4_id ||
            '';

          return (
            <tr key={d?.id ?? `${tableKey}-${di}`}>
              <td className="border px-2 py-1 dark:border-gray-700">{coaTitle}</td>
              <td className="border px-2 py-1 text-right dark:border-gray-700">
                { thousandSeparator(d.debit) }
              </td>
              <td className="border px-2 py-1 text-right dark:border-gray-700">
                { thousandSeparator(d.credit) }
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
};

export default JournalTable;