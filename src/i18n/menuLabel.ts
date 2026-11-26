import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './index';

/**
 * A menu's name in the screen's language.
 *
 * The dictionary lives in common.json -> menuLabel and is keyed by the English
 * text the sidebar already carries, so the JSX keeps its English words and only
 * what is drawn changes. Any text not in the list reads as it was.
 *
 * Same idea as reportLabel's `rl`, but reached through a hook: a language
 * switch changes i18n's language, and useTranslation redraws the menu at once
 * instead of waiting for the next unrelated render.
 */
const read = (instance: typeof i18n, text: string): string => {
  if (typeof text !== 'string') return text;

  // Read the raw bundle, not t(): a label holding ':' or '&' must not go
  // through i18next's key parsing.
  const dict = instance.getResource(instance.language || 'en', 'common', 'menuLabel') as
    | Record<string, string>
    | undefined;

  return (dict && typeof dict === 'object' && dict[text]) || text;
};

/** Non-hook form, for code outside a component. */
export const menuLabel = (text: string): string =>
  typeof text === 'string' ? read(i18n, text) : text;

/** Hook form: subscribes to language changes so the drawn menu follows. */
export const useMenuLabel = () => {
  const { i18n: instance } = useTranslation();

  return useCallback((text: string) => read(instance, text), [instance, instance.language]);
};
