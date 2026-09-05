/**
 * What actually moved, under the two tables that show the voucher twice.
 *
 * ⚠️ THE CARD USED TO ANSWER "an update happened" AND NOTHING MORE. Its Before
 * and After tables carry accounts and amounts, so a voucher whose narration was
 * corrected -- "adjusted against PO NO-0458" becoming "PO NO-0233" -- drew two
 * identical tables and left the reader hunting for a difference that was never
 * on screen. The change list was there in the payload the whole time, printed
 * underneath as raw JSON.
 *
 * The API names the fields (Journal #1 Line #2 Remarks, Voucher Date, Account),
 * so this only has to lay them out.
 */
const ChangedFields = ({ changes }: { changes?: any[] }) => {
  const rows = Array.isArray(changes) ? changes : [];

  if (rows.length === 0) return null;

  // Empty and blank read as a dash rather than as nothing at all, so a field
  // somebody cleared is visibly a change and not a rendering fault.
  const show = (value: any) =>
    value === null || value === undefined || String(value).trim() === ''
      ? '—'
      : String(value);

  return (
    <div className="mt-4">
      <h4 className="font-semibold text-amber-600 dark:text-amber-400">What changed</h4>

      <div className="mt-1 flex flex-col gap-1">
        {rows.map((change, index) => (
          <div
            key={`${change?.path ?? change?.field}-${index}`}
            className="flex flex-wrap items-baseline gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <span className="font-semibold">{change?.field}:</span>
            <span className="line-through opacity-70 wrap-break-word">{show(change?.old)}</span>
            <span>→</span>
            <span className="font-semibold wrap-break-word">{show(change?.new)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChangedFields;
