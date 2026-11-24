import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import enCommon from '../locales/en/common.json';
import { getCurrentLanguage } from './currentLanguage';

/**
 * Screen labels, by language.
 *
 * English is bundled with the build and is therefore always present -- the app
 * can never open with an empty label. Every other language is fetched from
 * public/locales/<code>/<namespace>.json at runtime, so a translation can be
 * corrected without rebuilding the software.
 *
 * `fallbackLng: 'en'` covers both a missing file and a half-finished one: a
 * label that has not been translated yet reads in English, never blank.
 */
i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: getCurrentLanguage(),
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    resources: { en: { common: enCommon } },
    // Only English comes from `resources`; the rest come through the backend.
    partialBundledLanguages: true,
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    interpolation: { escapeValue: false },
    // The app has no Suspense boundary of its own, and a label is not worth
    // blanking a screen for.
    react: { useSuspense: false },
  });

export default i18n;
