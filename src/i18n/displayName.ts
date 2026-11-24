import { rl } from './reportLabel';
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

const NAME_KEYS = ['name', 'group_name', 'coal4_name'];

/**
 * A report payload with its CoA head names in the local language.
 *
 * The Balance Sheet, P&L and Business Summary APIs send `local_names`
 * (English head name => local name). On a local-language screen every
 * `name` / `group_name` / `coal4_name` found in that map is swapped, and the
 * English original is kept beside it as `<key>_en` for anything that looks a
 * row up by its English name (note lookups, the detail request).
 */
export const localizeReport = <T,>(data: T, lang: DisplayLanguage): T => {
  const map: Record<string, string> = (data as any)?.local_names ?? {};
  if (!data || lang === 'en') return data;

  const walk = (value: any): any => {
    if (Array.isArray(value)) return value.map(walk);
    if (!value || typeof value !== 'object') return value;

    const out: any = {};
    for (const [key, item] of Object.entries(value)) out[key] = walk(item);
    for (const key of NAME_KEYS) {
      const english = value[key];
      // A CoA head's own local name first; else a fixed name the server makes
      // up ("Closing Stock", "Retained Earnings") from the report labels.
      const local = typeof english === 'string' ? map[english] || rl(english) : undefined;
      if (local && local !== english) {
        out[key] = local;
        out[`${key}_en`] = english;
      }
    }
    return out;
  };

  return walk(data);
};

/**
 * A dropdown list with each row's `name` in the local language where the row
 * carries a `name_local` and the screen is not English. The id is untouched,
 * so the value picked is the same row either way.
 */
export const withLocalNames = <T,>(list: T[] | undefined | null, lang: DisplayLanguage): T[] => {
  const rows = Array.isArray(list) ? list : [];
  if (lang === 'en' || !lang) return rows;
  return rows.map((row: any) =>
    row?.name_local && String(row.name_local).trim() !== '' ? { ...row, name: row.name_local } : row,
  );
};
