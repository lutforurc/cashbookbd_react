/**
 * How a sidebar entry looks, said once.
 *
 * The 153 sub-menu links each carried the same two strings inline -- the same
 * base, the same "active" -- which is why the active one was so hard to spot:
 * being bold and a shade darker is not much of a mark when the row above and
 * below are already medium weight, and in dark mode the shade barely moved. A
 * person could not tell which report they were looking at from the menu.
 *
 * The mark is now a brand-coloured bar down the left edge and a wash of the
 * same colour behind the row. Both come from --c-primary, so a user who sets
 * their own brand colour marks their place in their own colour too.
 */

/** Every sub-menu row, chosen or not. */
const SUB_MENU_BASE =
  'group relative flex items-center gap-2.5 px-4 font-medium duration-300 ease-in-out ' +
  'hover:text-gray-900 dark:hover:text-white';

/**
 * The row you are on.
 *
 * `before:` draws the bar; the anchor is already `relative`, so it hangs off
 * the row's own left edge rather than the list's. Square, both the row and the
 * bar: everything else in this software is square -- the fields, the buttons,
 * the tables -- and a rounded menu row was the odd one out.
 */
const SUB_MENU_ACTIVE =
  'bg-primary/10 font-semibold text-primary dark:bg-primary/25 dark:text-[rgb(var(--c-text))] ' +
  'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary';

/**
 * Pass this straight to a NavLink: `className={subMenuLinkClass}`.
 *
 * React Router hands it `{ isActive }`; the old code wrote
 * `base + (isActive && active)`, which appended the word "false" to the class
 * list on every row that was not the current one.
 */
export const subMenuLinkClass = ({ isActive }: { isActive: boolean }): string =>
  isActive ? `${SUB_MENU_BASE} ${SUB_MENU_ACTIVE}` : SUB_MENU_BASE;

export { SUB_MENU_ACTIVE, SUB_MENU_BASE };
