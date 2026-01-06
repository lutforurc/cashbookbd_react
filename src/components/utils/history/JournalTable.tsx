
/* =====================================================
   Small Component: Journal Table (per master)
===================================================== */
const JournalTable = ({ details, coaNameMap, tableKey }) => {
  return (
    <table
      key={tableKey}
      className="w-full text-sm border mb-3 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
    >
      <thead className="bg-gray-100 dark:bg-gray-800">
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
                {d?.debit && d.debit !== '0' ? d.debit : ''}
              </td>
              <td className="border px-2 py-1 text-right dark:border-gray-700">
                {d?.credit && d.credit !== '0' ? d.credit : ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default JournalTable;