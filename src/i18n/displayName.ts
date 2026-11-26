import { rl } from './reportLabel';
import i18n from './index';
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

const LABEL_NAMESPACES = ['menuLabel', 'tabLabel', 'uiLabel'];

/**
 * The Bangla the app already knows for a fixed English phrase (a standard
 * trade, a menu name), or the phrase unchanged. Used where a row has no
 * `name_local` of its own but the value is still one of the app's own words --
 * so "Real Estate" reads "রিয়েল এস্টেট" even before anyone has typed a local
 * name for that row.
 */
export const knownLabel = (text: string, lang?: DisplayLanguage): string => {
  if (typeof text !== 'string' || text === '' || !lang || lang === 'en') return text;

  for (const ns of LABEL_NAMESPACES) {
    const dict = i18n.getResource(lang, 'common', ns) as
      | Record<string, string>
      | undefined;
    const hit = dict && typeof dict === 'object' ? dict[text] : undefined;
    if (hit) return hit;
  }

  return text;
};

const NAME_KEYS = ['name', 'group_name', 'coal4_name'];

/**
 * A chart-of-accounts row's name in the screen's language.
 *
 * `displayName` reads `name_local`, which is what the CoA list returns. Some
 * list endpoints (the invoice service list, for one) join the head through a
 * different alias, so the local column arrives as `coal4_name_local`,
 * `l4_name_local` or `label_local`. This checks those in turn, then falls back
 * to the English name -- a row with no local name still reads, as before.
 */
const LOCAL_NAME_FIELDS = [
  'name_local',
  'coal4_name_local',
  'coa4_name_local',
  'l4_name_local',
  'label_local',
  'local_name',
];

export const accountName = (row: any, lang?: DisplayLanguage): string => {
  if (!row) return '';

  const english = row.name ?? row.label ?? row.coal4_name ?? row.l4_name ?? '';

  if (lang && lang !== 'en') {
    for (const field of LOCAL_NAME_FIELDS) {
      const value = row[field];
      if (value !== null && value !== undefined && String(value).trim() !== '') return String(value);
    }
  }

  return english === null || english === undefined ? '' : String(english);
};

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
