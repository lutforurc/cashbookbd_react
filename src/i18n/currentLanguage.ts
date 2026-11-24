/**
 * The current language, kept outside React.
 *
 * httpService reads this on every request to set Accept-Language, and
 * index.html's pre-paint script reads the same two localStorage keys. That is
 * why this module imports neither React nor i18next: importing i18next here
 * would make httpService -> i18n -> i18next -> ... and back, and the request
 * interceptor must never depend on the translation library having loaded.
 */

const LANG_KEY = 'ui-lang';
const DIR_KEY = 'ui-dir';

let current = 'en';

const clean = (value: string | null): string =>
  value ? value.replace(/^"|"$/g, '').trim() : '';

/** The language code for the next request. Always a real code, never ''. */
export const getCurrentLanguage = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const stored = clean(window.localStorage.getItem(LANG_KEY));
      if (stored) current = stored;
    } catch {
      /* private mode -- the in-memory value stands */
    }
  }

  return current || 'en';
};

/** Remember a language for the next request and the next page load. */
export const setCurrentLanguage = (code: string): void => {
  current = code || 'en';

  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LANG_KEY, current);
  } catch {
    /* private mode -- the in-memory value still reaches this session */
  }
};

/** Remember the writing direction the pre-paint script puts on <html>. */
export const setCurrentDirection = (direction: 'ltr' | 'rtl'): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(DIR_KEY, direction);
  } catch {
    /* private mode */
  }
};

export const CURRENT_LANGUAGE_STORAGE_KEY = LANG_KEY;
export const CURRENT_DIRECTION_STORAGE_KEY = DIR_KEY;
