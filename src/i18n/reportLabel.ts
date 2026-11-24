import i18n from './index';

/**
 * A fixed report label ("Total Assets", "Net Profit") in the screen's language.
 *
 * Looked up by its English text in common.json → reportLabel, so the many
 * labels across the Balance Sheet, P&L and Business Summary keep their English
 * text in the code. Anything not in the list reads as it was.
 */
export const rl = <T,>(text: T): T => {
  if (typeof text !== "string") return text;
  // ⚠️ READ THE RAW BUNDLE, NOT i18n.t(..., { returnObjects }). t() runs every
  // value through its own lookup, and a key holding ':' ("Period:", "Report
  // Date:") is split there as namespace:key -- it came back empty, so the
  // label stayed English.
  const dict = i18n.getResource(i18n.language, 'common', 'reportLabel') as
    | Record<string, string>
    | undefined;
  return ((dict && typeof dict === "object" && dict[text]) as T) || text;
};
