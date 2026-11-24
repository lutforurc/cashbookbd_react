import i18n from './index';
import { setCurrentLanguage, setCurrentDirection } from './currentLanguage';
import type { LanguageInfo } from './languages';

/**
 * Put a language on the page in one place.
 *
 * <html lang> tells the browser which language this is (spell-check, screen
 * readers, hyphenation), `dir` makes Arabic/Urdu read right-to-left, and
 * `data-lang` is what the stylesheets will use for the font work in the next
 * phase. The i18n labels are changed here too, so no caller has to remember
 * the order.
 */
export const applyLanguage = (code: string, info?: LanguageInfo): void => {
  const language = code || 'en';

  setCurrentLanguage(language);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const direction = info?.direction === 'rtl' ? 'rtl' : 'ltr';

    root.lang = language;
    root.dir = direction;
    root.setAttribute('data-lang', language);

    setCurrentDirection(direction);
  }

  if (i18n.language !== language) {
    i18n.changeLanguage(language);
  }
};
