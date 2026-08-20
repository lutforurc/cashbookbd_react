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
