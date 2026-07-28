import { useSelector } from 'react-redux';

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

/**
 * Resolves the branch a printed page should be headed with.
 *
 * Order of trust: the branch a report passed explicitly, then the branch the
 * screen's BranchDropdown currently has selected, then nothing — which leaves
 * the pad on the session branch.
 *
 * Selecting one's own branch returns nothing on purpose: the session copy of it
 * carries more fields (letterhead image, notes) than the dropdown's, so there is
 * no reason to override with a thinner record.
 */
export const usePrintBranch = (explicit?: PrintBranch): PrintBranch | undefined => {
  const sessionBranchId = useSelector((state: any) => state.settings?.data?.branch?.id);
  const selectedBranchId = useSelector((state: any) => state.printBranch?.branchId);
  // Screens load the branch list through either ddl, so look in both.
  const protectedList = useSelector((state: any) => state.branchDdl?.protectedData?.data);
  const openList = useSelector((state: any) => state.branchDdl?.data);

  if (hasPrintBranch(explicit)) return explicit;
  if (selectedBranchId === null || selectedBranchId === undefined) return undefined;
  if (String(selectedBranchId) === String(sessionBranchId ?? '')) return undefined;

  const lookup = (list: any) =>
    Array.isArray(list)
      ? list.find((item: any) => String(item?.id) === String(selectedBranchId))
      : null;

  const found = lookup(protectedList) || lookup(openList);

  if (!found?.name) return undefined;

  return { name: found.name, address: found.address, phone: found.phone };
};
