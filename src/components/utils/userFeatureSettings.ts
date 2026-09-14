/**
 * Reading a saved setting as a yes or a no.
 *
 * Settings live in the `metas` table, which stores every answer as text. A
 * switch turned off comes back as the string '0' -- and '0' is a non-empty
 * string, which JavaScript calls true. So
 *
 *   {settings?.data?.branch?.due_list_with_address && <Address />}
 *
 * shows the address whichever way the switch is set, and the branch form that
 * writes the setting looks broken. That is exactly what happened on the Due
 * List, where a report meant to be a plain name-and-amount list carried every
 * customer's mobile number and street address onto the page.
 *
 * These are what such a condition should ask instead. They accept what the API
 * actually sends -- '1', 1, true, and their opposites -- and treat anything
 * else as off, so a setting nobody has saved yet behaves like a switch that
 * was never turned on.
 */

/** One value, read as a switch. */
export const settingOn = (value: unknown): boolean =>
  value === true || value === 1 || value === '1';

/** A switch on the user's own account. */
export const isUserFeatureEnabled = (
  settings: any,
  feature: 'sidebar_menu' | 'use_filter_parameter',
): boolean => settingOn(settings?.data?.user?.[feature]);

/** A switch on the branch, set from Branch Setup. */
export const isBranchSettingOn = (settings: any, key: string): boolean =>
  settingOn(settings?.data?.branch?.[key]);

/**
 * The books are locked up to the last closed year end -- spec §42.
 *
 * The server answers `books_locked_until` beside the current branch (the last
 * day of the branch's last closed year, or null), and refuses any voucher
 * dated on or before it with a sentence. These two let a screen say so BEFORE
 * somebody presses edit: a lock icon on the row instead of a refusal after.
 * The server is still the truth; this is courtesy.
 */

/** The last day of the current branch's last closed year, or null. */
export const booksLockedUntil = (currentBranch: any): string | null => {
  const value = currentBranch?.books_locked_until;
  return typeof value === 'string' && value ? value.slice(0, 10) : null;
};

/**
 * A voucher date as YYYY-MM-DD, whatever shape the row carries it in: ISO,
 * DD/MM/YYYY, or the DD/MM/YY some ledgers print. Null when unreadable, and
 * an unreadable date is never treated as locked.
 */
const isoDate = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value.trim());
  if (!dmy) return null;

  const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
  return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
};

/** Whether a voucher dated `value` sits inside a closed year. */
export const inClosedYear = (value: unknown, lockedUntil: string | null): boolean => {
  if (!lockedUntil) return false;
  const on = isoDate(value);
  return !!on && on <= lockedUntil;
};

/** "30/06/2026", for the sentence beside the lock. */
export const lockedUntilLabel = (lockedUntil: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(lockedUntil ?? '');
  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '';
};
