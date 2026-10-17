/**
 * The numbered notes that sit under a financial report — Balance Sheet and
 * Profit & Loss both.
 *
 * ⚠️ ONE COMPONENT FOR SCREEN AND PAPER. A note that says one thing on the
 * screen and another on the printed sheet is the worst kind of difference to
 * find, and the two are written from the same list of notes for exactly that
 * reason. Only the frame changes: on screen a panel with the report's own
 * borders, on paper plain justified text under the sheet's heading. Both carry
 * the same justification, so a note breaks its lines the same way in each.
 *
 * The notes are the report's own labels and classification explained — what an
 * account IS on this report, which of the chart's names read backwards once the
 * money has crossed sides, and anything left unresolved. They carry no
 * implementation detail and no figure that is not already in the report: the
 * amounts named in a note are the rows above it, never a second copy that a
 * total could pick up.
 */
import thousandSeparator from "./thousandSeparator";

export type ReportNote = {
  /** The number the report's own rows point at. */
  n: number;
  title: string;
  body: string;
};

/**
 * The wording for the note on stock that changed hands with no purchase and no
 * sale behind it — write-offs out, Product In receipts back.
 *
 * Shared by the Trial Balance (Group), the Profit & Loss and the Balance Sheet,
 * where it is the last note on each. The three differ only in the closing sentence,
 * which says in that report's own terms where the effect has already landed; it
 * comes in as `closing`. Everything above it is the same paragraph, and three
 * copies of it would drift.
 *
 * ⚠️ TWO AMOUNTS, NEVER A NET, and the amounts are passed in un-netted for that
 * reason. A period that wrote 50,000 off and took 50,000 back in is not a period
 * in which nothing happened — one figure would say it was, and that is exactly
 * the month somebody is reading the note to understand.
 *
 * ⚠️ A NOTE IS DRAWN WHEN EITHER IS ABOVE ZERO, not only when stock was written
 * off. A period that received goods without buying them has as much explaining
 * to do as the other way round, and until 2026-10-17 the write-off was the only
 * case the three notes knew about.
 *
 * ⚠️ API — `null` means write no note. The caller spreads the result, so a
 * period with neither movement leaves the note out and thereby moves no other
 * note's number.
 */
export const stockMovementNote = (
  inventoryLoss: number,
  stockReceipts: number,
  closing: string
): { title: string; body: string } | null => {
  const loss = Number(inventoryLoss) || 0;
  const receipts = Number(stockReceipts) || 0;

  if (loss <= 0 && receipts <= 0) return null;

  const title =
    loss > 0 && receipts > 0
      ? "Stock moved without a purchase or a sale"
      : loss > 0
        ? "Inventory loss — damaged or lost goods"
        : "Goods received without a purchase";

  const body =
    (loss > 0
      ? `Goods written off as damaged or lost in this period are valued at ${thousandSeparator(loss)}, ` +
        "at the cost recorded on each write-off. "
      : "") +
    (receipts > 0
      ? `Goods received in the same period without being bought are valued at ${thousandSeparator(receipts)}, ` +
        "at the rate the books held for them. "
      : "") +
    closing;

  return { title, body };
};

/**
 * The reference a report row carries: the number of the note that explains it,
 * set small and high so it reads as a pointer and not as part of the figure.
 * One component for screen and paper, so a row points at the same note in both.
 *
 * ⚠️ THE COLOUR IS A TOKEN, NOT `text-gray-500`, AND THAT IS THE WHOLE POINT.
 * A grey picked to read on white was picked for ONE mode: `--c-gray-500` is
 * #59636F and dark mode does not move it, so every reference on every report
 * sat at about 2.3:1 against a #212932 card -- dim enough to look like the
 * number had not printed at all. The page read as though its notes had lost
 * their pointers while the notes themselves listed away underneath.
 *
 * `--c-text-muted` is the token that answers to both: #59636F on white, and
 * lifted to #A3ADB9 under html.dark, which is roughly 6:1 either way. It is
 * restated for print in tokens.css, so a report printed from dark mode still
 * comes out in ink -- paper does not have a dark mode.
 */
export const NoteRef = ({ n }: { n: number | string }) => (
  <span className="ml-1 align-super text-[10px] text-[rgb(var(--c-text-muted))]">[{n}]</span>
);

type Props = {
  /** "Notes to the Balance Sheet" */
  title: string;
  notes: ReportNote[];
  /** Print only; the screen takes its type from the surrounding panel. */
  fontSize?: number;
  variant?: "screen" | "print";
};

const ReportNotes = ({
  title,
  notes,
  fontSize,
  variant = "screen",
}: Props) => {
  if (!notes.length) return null;

  if (variant === "print") {
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 11;

    return (
      <div className="text-gray-900">
        <div
          style={{ fontSize: fs + 2 }}
          className="mb-3 text-center font-bold uppercase"
        >
          {title}
        </div>

        <div className="space-y-2" style={{ fontSize: fs }}>
          {notes.map((note) => (
            <div key={note.n} className="text-justify">
              <span className="font-semibold">
                {note.n}. {note.title}
              </span>{" "}
              <span>{note.body}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
      <div className="border-b border-[rgb(var(--c-border))] px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
          {title}
        </h3>
      </div>

      <div className="space-y-3 px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
        {notes.map((note) => (
          <div key={note.n} className="text-justify">
            <span className="font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
              {note.n}. {note.title}
            </span>{" "}
            <span>{note.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportNotes;
