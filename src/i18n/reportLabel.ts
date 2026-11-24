import i18n from './index';

/**
 * A fixed report label ("Total Assets", "Net Profit") in the screen's language.
 *
 * Looked up by its English text in common.json → reportLabel, so the many
 * labels across the Balance Sheet, P&L and Business Summary keep their English
 * text in the code. Anything not in the list reads as it was.
 */
export const rl = <T,>(text: T): T => {
  const dict = i18n.t('reportLabel', { returnObjects: true }) as Record<string, string> | string;
  if (typeof text !== "string" || typeof dict !== "object") return text;
  return (dict?.[text] as T) || text;
};
