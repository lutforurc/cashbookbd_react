import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../i18n/useLanguage';
import InputElement from './InputElement';

type Props = {
  /** The English field this sits under: 'name' or 'address'. */
  field: string;
  value: string;
  onChange: (value: string) => void;
  /** Overrides the generated "Name (Bangla)" / "Address (Bangla)" label. */
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
};

/**
 * The optional second name, in the company's local language.
 *
 * Shown only when the company has a local language switched on. The label is
 * the local language's own name ("Name (Bangla)" on an English screen,
 * "নাম (বাংলা)" on a Bangla one), and the box carries that language's direction
 * and lang attribute, so an Arabic company gets a right-to-left field without
 * this component having to know which language it is.
 *
 * The English field above it stays required; this one may be left empty and
 * the screen falls back to English.
 */
const LocalNameInput = ({
  field,
  value,
  onChange,
  label,
  placeholder,
  className,
  disabled,
  required,
}: Props) => {
  const { t } = useTranslation('common');
  const { localCode, localInfo, localName } = useLanguage();

  if (!localCode) return null;

  const isAddress = field === 'address';
  const generatedLabel = t(
    isAddress ? 'data.addressInLanguage' : 'data.nameInLanguage',
    { language: localName },
  );

  return (
    <div
      dir={localInfo?.direction === 'rtl' ? 'rtl' : 'ltr'}
      lang={localCode}
    >
      <InputElement
        id={`${field}_local`}
        name={`${field}_local`}
        label={label ?? generatedLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? ''}
        className={className}
        disabled={disabled}
        required={required}
      />
    </div>
  );
};

export default LocalNameInput;
