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
export type ReportNote = {
  /** The number the report's own rows point at. */
  n: number;
  title: string;
  body: string;
};

/**
 * The reference a report row carries: the number of the note that explains it,
 * set small and high so it reads as a pointer and not as part of the figure.
 * One component for screen and paper, so a row points at the same note in both.
 */
export const NoteRef = ({ n }: { n: number | string }) => (
  <span className="ml-1 align-super text-[10px] text-gray-500">[{n}]</span>
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
