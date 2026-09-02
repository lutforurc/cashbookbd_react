import thousandSeparator from "../utils-functions/thousandSeparator";

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

      {/*
        Field / Before / After, and the values are money -- so the columns have
        a width below which they stop being readable and start wrapping every
        cell onto three lines. The scroller lets the table keep that width and
        move sideways instead, which is what the shared Table does everywhere
        else. Without the min-width the scroller would never engage: a w-full
        table cannot outgrow its own container.
      */}
      <div className="mb-4 overflow-x-auto">
      <table className="w-full min-w-104 text-sm border border-[rgb(var(--c-border))]">
        <thead className="bg-[rgb(var(--c-table-head))]">
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
              <td className="border px-2 py-1 text-red-600 dark:border-gray-700">{ thousandSeparator( c.old)}</td>
              <td className="border px-2 py-1 text-green-600 dark:border-gray-700">{thousandSeparator(c.new)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
};
export default InvoiceChangesTable;