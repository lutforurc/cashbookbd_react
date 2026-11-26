import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './index';

/**
 * A tab's name in the screen's language.
 *
 * Same idea as menuLabel: the dictionary lives in common.json -> tabLabel and
 * is keyed by the English label tabGroups declares, so the tab arrays keep
 * their English words and only what RouteTabs draws changes. Anything not in
 * the list reads as it was.
 */
const read = (instance: typeof i18n, text: string): string => {
  if (typeof text !== 'string') return text;

  // Read the raw bundle, not t(): a label holding ':' or '&' must not go
  // through i18next's key parsing.
  const dict = instance.getResource(instance.language || 'en', 'common', 'tabLabel') as
    | Record<string, string>
    | undefined;

  return (dict && typeof dict === 'object' && dict[text]) || text;
};

/** Non-hook form, for code outside a component. */
export const tabLabel = (text: string): string =>
  typeof text === 'string' ? read(i18n, text) : text;

/** Hook form: subscribes to language changes so the tab bar follows. */
export const useTabLabel = () => {
  const { i18n: instance } = useTranslation();

  return useCallback((text: string) => read(instance, text), [instance, instance.language]);
};
