import httpService from '../../services/httpService';
import { API_HIGHLIGHT_RULES_ACTIVE_URL } from '../../services/apiRoutes';

// A configurable "phrase -> coloured border" rule. Wherever the app applies
// these, a line whose text CONTAINS the phrase (case-insensitive) is boxed in
// the rule's colour. Generalises the old hard-coded "Not Yet Report" red box.
export type HighlightRule = {
  id: number;
  phrase: string;
  color: string;
  priority: number;
};

// Palette keys -> full Tailwind border classes. Full strings (not
// `border-${color}-500`) so Tailwind's scanner keeps them, and paired for both
// light and dark. Keep the keys in step with COLORS in HighlightRuleController.
const BORDER_CLASS: Record<string, string> = {
  red: 'border-red-500 dark:border-red-400',
  amber: 'border-amber-500 dark:border-amber-400',
  green: 'border-green-500 dark:border-green-400',
  blue: 'border-blue-500 dark:border-blue-400',
  purple: 'border-purple-500 dark:border-purple-400',
  pink: 'border-pink-500 dark:border-pink-400',
  gray: 'border-gray-500 dark:border-gray-400',
};

// The swatch a palette key shows in the admin picker/preview.
export const HIGHLIGHT_COLORS: { value: string; label: string; swatch: string }[] = [
  { value: 'red', label: 'Red', swatch: 'bg-red-500' },
  { value: 'amber', label: 'Amber', swatch: 'bg-amber-500' },
  { value: 'green', label: 'Green', swatch: 'bg-green-500' },
  { value: 'blue', label: 'Blue', swatch: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', swatch: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', swatch: 'bg-pink-500' },
  { value: 'gray', label: 'Gray', swatch: 'bg-gray-500' },
];

const borderFor = (color: string) => BORDER_CLASS[color] ?? BORDER_CLASS.red;

/**
 * The rule that should style a given text, or null. Rules are expected to
 * arrive already sorted best-priority-first (the API does this), so the first
 * phrase found wins — highest priority, ties broken by earliest added.
 * Matching is a case-insensitive "contains", per the agreed rule.
 */
export const matchHighlightRule = (
  text: unknown,
  rules: HighlightRule[],
): HighlightRule | null => {
  const hay = String(text ?? '').toLowerCase();
  if (!hay || !Array.isArray(rules)) return null;

  for (const rule of rules) {
    const needle = String(rule?.phrase ?? '').toLowerCase().trim();
    if (needle && hay.includes(needle)) return rule;
  }
  return null;
};

/**
 * The class string to box a whole line for a matched rule (empty when none).
 * Wrap the line's element with it, e.g.:
 *   <div className={`... ${highlightLineClass(matchHighlightRule(text, rules))}`}>
 */
export const highlightLineClass = (rule: HighlightRule | null): string =>
  rule ? `rounded border-2 px-1 ${borderFor(rule.color)}` : '';

// --- active-rules fetch, cached so many pages share one request ------------

let cache: HighlightRule[] | null = null;
let inflight: Promise<HighlightRule[]> | null = null;

/** Active rules, best priority first. Cached; a failure resolves to []. */
export const fetchActiveHighlightRules = (): Promise<HighlightRule[]> => {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = httpService
      .get(API_HIGHLIGHT_RULES_ACTIVE_URL)
      .then((res: any) => {
        const rows = res?.data?.data?.data?.highlight_rules;
        cache = Array.isArray(rows) ? rows : [];
        return cache;
      })
      .catch(() => {
        cache = [];
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

/** Drop the cache so the next read refetches — call after an admin edit. */
export const invalidateHighlightRulesCache = () => {
  cache = null;
  inflight = null;
};
