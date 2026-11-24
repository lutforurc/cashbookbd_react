import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { applyLanguage } from './applyLanguage';
import { resolveLanguageCode } from './languages';
import type { LangChoice, LanguageInfo } from './languages';
import { saveLanguage } from './languageSlice';

export type LanguageOption = {
  /** What is stored in users.lang, not the language code. */
  choice: 'en' | 'local';
  code: string;
  label: string;
};

/**
 * The language the page should be in, and the two things a screen can do with
 * the user's choice.
 *
 * Reads the session settings and returns:
 *   code       -- 'en' or the company's local code, for <html lang> and tests
 *   setLanguage-- applies the choice at once, then saves it in the background
 *   options    -- English + the company's one local language, for the pill
 *   localCode  -- null when the company has not switched its local language on
 *
 * Called once in App (for the side effect) and again by the header pill. The
 * effect is idempotent, so both can apply the same language.
 */
export const useLanguage = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: any) => state.settings);
  const languageState = useSelector((state: any) => state.language);

  const company = settings?.data?.company;
  const localCode: string | null = company?.local_language || null;
  const languages: LanguageInfo[] = Array.isArray(company?.languages)
    ? company.languages
    : [];
  const branchDefault: string | null = settings?.data?.branch?.ui_language ?? null;
  const serverChoice: LangChoice = settings?.data?.user?.lang ?? null;

  // undefined means "nothing chosen in this session yet" -- the server's value
  // (or the branch default) decides. A saved null is a real answer ("follow the
  // branch") and must not be confused with undefined.
  const choice: LangChoice =
    languageState?.choice !== undefined ? languageState.choice : serverChoice;

  const code = resolveLanguageCode(choice, branchDefault, localCode);
  const info = languages.find((language) => language.code === code);
  const localInfo = localCode
    ? languages.find((language) => language.code === localCode)
    : undefined;

  // The local language's name as the current screen should print it:
  // "Bangla" on an English screen, "বাংলা" on a Bangla one.
  const localName = localCode
    ? code === 'en'
      ? localInfo?.name || localCode
      : localInfo?.native_name || localInfo?.name || localCode
    : '';

  const settingsReady = Boolean(company);

  useEffect(() => {
    if (!settingsReady) return;

    applyLanguage(code, info);
    // `code` changes the labels, `direction` changes the painting. Nothing else
    // in `info` can alter the page.
  }, [settingsReady, code, info?.direction]);

  const options = useMemo<LanguageOption[]>(() => {
    // Nothing to switch between until the company turns a local language on.
    if (!localCode) return [];

    const local = localInfo;

    return [
      // The English option always says "English": it is the one label that must
      // read the same whichever language the screen is in.
      { choice: 'en', code: 'en', label: 'English' },
      {
        choice: 'local',
        code: localCode,
        label: local?.native_name || local?.name || localCode,
      },
    ];
  }, [languages, localCode, localInfo]);

  const setLanguage = useCallback(
    (next: 'en' | 'local') => {
      // Optimistic: the pill and the labels move before the request returns.
      dispatch(saveLanguage(next) as any);

      const nextCode = resolveLanguageCode(next, branchDefault, localCode);
      applyLanguage(nextCode, languages.find((language) => language.code === nextCode));
    },
    [dispatch, branchDefault, localCode, languages],
  );

  return { code, setLanguage, options, localCode, localInfo, localName };
};
