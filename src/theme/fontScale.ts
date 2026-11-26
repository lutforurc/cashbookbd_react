import { useEffect } from 'react';

/**
 * The font size a branch reads the software at.
 *
 * One number, a percentage of the browser's own base size, written onto the
 * root element. Every Tailwind size in the app is in rem, so one value moves
 * the page headings, the tables, the forms and the control heights together and
 * in proportion -- no screen has to know the setting exists.
 *
 * ⚠️ SCREEN ONLY. A printed report is set in px and laid out for its sheet, so
 * tokens.css restates the root at 100% for print; the setting cannot change a
 * salary sheet's paper size.
 *
 * Kept on the branch rather than the user: it is a policy for that office, not
 * personal taste (the colours are the personal half -- see theme/userTheme.ts).
 *
 * ⚠️ THE BROWSER KEEPS A COPY. `/settings/get-settings` does not carry
 * `font_scale` yet, so a Save would otherwise be undone the moment the session
 * is refetched -- the panel would read its value back as "not set" and the page
 * would snap to the default. The copy is per branch and only stands in while
 * the server says nothing; the moment the API returns a value, that value wins.
 */

export const FONT_SCALE_MIN = 80;
export const FONT_SCALE_MAX = 150;
export const FONT_SCALE_STEP = 5;

/**
 * What a branch that has never chosen reads at.
 *
 * The shipped 100% was reported as a little small, so a missing value means
 * 110% rather than the browser's default.
 */
export const FONT_SCALE_DEFAULT = 110;

const CACHE_PREFIX = 'branch-font-scale:';

/** The stored value as a usable percentage, or null when there is none. */
export const parseFontScale = (value: unknown): number | null => {
  // A missing branch, a null column or an empty string all read as "not
  // chosen" -- 0 is not a size anyone could read at.
  const parsed = Number(value);
  if (value == null || value === '' || !Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(parsed)));
};

/** A stored percentage, held inside the control's range. */
export const clampFontScale = (value: unknown): number =>
  parseFontScale(value) ?? FONT_SCALE_DEFAULT;

const cacheKey = (branchId: unknown) =>
  branchId == null || branchId === '' ? '' : `${CACHE_PREFIX}${branchId}`;

const readCachedFontScale = (branchId: unknown): number | null => {
  const key = cacheKey(branchId);
  if (!key || typeof window === 'undefined') return null;
  try {
    return parseFontScale(window.localStorage.getItem(key));
  } catch {
    // Private mode, or storage full: the page still scales, it just does not
    // remember once the tab is closed.
    return null;
  }
};

/** Remember the size this branch was saved at, for the next reload. */
export const cacheFontScale = (branchId: unknown, scale: number): void => {
  const key = cacheKey(branchId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, String(clampFontScale(scale)));
  } catch {
    /* as above */
  }
};

/**
 * The size to wear right now: the server's, else the copy this browser kept,
 * else the default. A real server value always wins, so the day the API starts
 * returning `font_scale` the copy is simply never consulted.
 */
export const resolveFontScale = (serverValue: unknown, branchId?: unknown): number =>
  parseFontScale(serverValue) ?? readCachedFontScale(branchId) ?? FONT_SCALE_DEFAULT;

/** Write the scale onto <html>; 100% removes the override rather than writing it. */
export const applyFontScale = (scale: number): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const value = clampFontScale(scale);
  if (value === 100) root.style.removeProperty('font-size');
  else root.style.fontSize = `${value}%`;
};

/**
 * Keep the page at the branch's size.
 *
 * Called once, high up (App), with the current branch's id and
 * `settings.data.branch.font_scale`. A change -- the Save on the branch form
 * refetching the session -- is worn at once without a reload.
 */
export const useFontScale = (branchId: unknown, scale: unknown): number => {
  const value = resolveFontScale(scale, branchId);

  useEffect(() => {
    applyFontScale(value);
  }, [value]);

  return value;
};
