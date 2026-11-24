import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../i18n/useLanguage';

/**
 * English | বাংলা, in the header.
 *
 * Only drawn when the company has a local language switched on; when it has
 * not, this returns nothing at all and the header is exactly what it was
 * before Phase 1. The active half is filled with the app's primary colour.
 */
const LanguageSwitcher = () => {
  const { t } = useTranslation('common');
  const { code, options, setLanguage, localCode } = useLanguage();

  if (!localCode || options.length < 2) return null;

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className="inline-flex items-center rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-0.5"
    >
      {options.map((option) => {
        const active = option.code === code;

        return (
          <button
            key={option.choice}
            type="button"
            aria-pressed={active}
            aria-label={option.label}
            onClick={() => setLanguage(option.choice)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              active
                ? 'bg-[rgb(var(--c-primary))] text-white'
                : 'text-[rgb(var(--c-text-muted))] hover:text-[rgb(var(--c-text))]'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
