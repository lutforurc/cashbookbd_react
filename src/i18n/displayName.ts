/**
 * A row's name in the language on screen.
 *
 * `lang` is the resolved code from useLanguage(): 'en' or the company's local
 * code. Anything that is not 'en' counts as local. A missing local value falls
 * back to the English one, so a row the client never translated still reads.
 *
 * The fourth argument exists for a column whose local value lives under a
 * different name -- a party's Address column reads `manual_address` but its
 * local text is `address_local`.
 */
export type DisplayLanguage = 'en' | 'local' | string | null | undefined;

export const displayName = (
  row: any,
  field = 'name',
  lang: DisplayLanguage = 'en',
  localField?: string,
): string => {
  if (!row) return '';

  const english = row[field];
  const local = row[localField ?? `${field}_local`];

  if (
    lang !== 'en' &&
    local !== null &&
    local !== undefined &&
    String(local).trim() !== ''
  ) {
    return String(local);
  }

  return english === null || english === undefined ? '' : String(english);
};
