import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../i18n/useLanguage';
import { Input } from './FormControls';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

/**
 * "Bangla name missing" -- the list filter that finds the rows still to fill.
 *
 * Only drawn when the company has a local language; on an English-only
 * installation there is nothing to fill and the control is not offered.
 */
const LocalNameMissingFilter = ({ checked, onChange, className = '' }: Props) => {
  const { t } = useTranslation('common');
  const { localCode, localName } = useLanguage();

  if (!localCode) return null;

  return (
    <label
      className={`inline-flex items-center gap-2 whitespace-nowrap text-sm text-[rgb(var(--c-text))] ${className}`}
    >
      <Input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
      <span>{t('data.missingLocalName', { language: localName })}</span>
    </label>
  );
};

export default LocalNameMissingFilter;
