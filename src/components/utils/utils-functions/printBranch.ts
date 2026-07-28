/**
 * The branch a printed report is *about*, which is not always the branch the
 * person printing it belongs to: a head-office user can pull any branch's
 * report, and the page must be headed with that branch — not the caller's.
 *
 * Pass it down to PadPrinting; leaving it out keeps the old behaviour of using
 * the logged-in user's branch from settings.
 */
export type PrintBranch = {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
};

/**
 * True when a report supplied its own branch. The name is what identifies the
 * override — address and phone may legitimately be blank, and when they are we
 * must NOT fall back to the session branch's, which belongs to someone else.
 */
export const hasPrintBranch = (branch?: PrintBranch | null): boolean =>
  Boolean(branch?.name && String(branch.name).trim());
