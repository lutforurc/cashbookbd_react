import { useTranslation } from 'react-i18next';
import { useUiTranslation } from './useUiTranslation';
import { useLatinDigitsInput } from './useLatinDigitsInput';

/**
 * One invisible mount that keeps the whole app's fixed form words in the
 * screen's language while a local language is on. Mounted once, in the layout,
 * so it covers the routed screen, the sidebar and any modal portalled to
 * document.body.
 */
const UiTranslator = () => {
  const { i18n } = useTranslation();
  useUiTranslation(i18n.language || 'en');
  // A Bangla digit typed into a numeric field is stored as its Latin equal.
  useLatinDigitsInput();
  return null;
};

export default UiTranslator;
