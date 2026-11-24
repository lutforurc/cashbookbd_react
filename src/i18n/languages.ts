/**
 * The two choices a user makes, and the language they resolve to.
 *
 * `users.lang` stores the CHOICE ('en' | 'local' | null), not a code. A company
 * that later switches its local language from Bangla to Arabic therefore needs
 * no user row rewritten -- 'local' simply resolves to the new code.
 */

export type LangChoice = 'en' | 'local' | null | undefined;

export type LanguageInfo = {
  code: string;
  name: string;
  native_name: string;
  direction: 'ltr' | 'rtl';
  digits: 'latin' | 'native';
};

/**
 * User's choice, then the branch's default, then English.
 *
 * A 'local' choice with no company local language falls back to English rather
 * than to a blank screen -- which is what an old session in localStorage can
 * ask for after the company turned its local language off.
 */
export const resolveLanguageCode = (
  choice: LangChoice,
  branchDefault?: string | null, // branch meta ui_language: 'en' | 'local'
  companyLocal?: string | null, // company local_language: 'bn' | 'ar' | null
): string => {
  const pick = choice ?? branchDefault ?? null;

  if (pick !== 'local') return 'en';

  return companyLocal && companyLocal !== 'en' ? companyLocal : 'en';
};
