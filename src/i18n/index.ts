import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../locales/en/common.json';
import bnCommon from '../locales/bn/common.json';
import { getCurrentLanguage } from './currentLanguage';

/**
 * Screen labels, by language, all under src/locales/<code>/<namespace>.json --
 * one folder per language, one file per namespace, one place to edit.
 *
 * Both languages are bundled with the build, so no screen can open on an empty
 * label and there is no runtime fetch to wait for. `fallbackLng: 'en'` covers a
 * key a translation has not answered yet: it reads English, never blank.
 */
i18n.use(initReactI18next).init({
  lng: getCurrentLanguage(),
  fallbackLng: 'en',
  ns: ['common'],
  defaultNS: 'common',
  resources: {
    en: { common: enCommon },
    bn: { common: bnCommon },
  },
  interpolation: { escapeValue: false },
  // The app has no Suspense boundary of its own, and a label is not worth
  // blanking a screen for.
  react: { useSuspense: false },
});

export default i18n;
