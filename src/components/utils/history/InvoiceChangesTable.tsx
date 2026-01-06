
/* =====================================================
   Small Component: Invoice Changes Table
===================================================== */
const InvoiceChangesTable = ({ changes }) => {
  if (!changes?.length) return null;

  return (
    <>
      <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">
        Invoice Changes
      </h4>

      <table className="w-full text-sm border mb-4 border-gray-200 dark:border-gray-700">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="border px-2 py-1 dark:border-gray-700">Field</th>
            <th className="border px-2 py-1 dark:border-gray-700">Before</th>
            <th className="border px-2 py-1 dark:border-gray-700">After</th>
          </tr>
        </thead>

        <tbody>
          {changes.map((c, i) => (
            <tr key={i}>
              <td className="border px-2 py-1 dark:border-gray-700">{c.field}</td>
              <td className="border px-2 py-1 text-red-600 dark:border-gray-700">{c.old}</td>
              <td className="border px-2 py-1 text-green-600 dark:border-gray-700">{c.new}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
export default InvoiceChangesTable;