import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../i18n/useLanguage';
import { FIELD_HEIGHT } from '../../../theme/fieldStyles';
import InputElement from './InputElement';

type Props = {
  /** The English field: its formik name, e.g. 'name' or 'manual_address'. */
  name: string;
  /**
   * Which generated local label to use: "Name (Bangla)", "Address (Bangla)"...
   * Left off, the local label is the English label + " (Bangla)".
   */
  kind?: 'name' | 'address' | 'description';
  label: React.ReactNode;
  /** The Bangla box's own label ("মায়ের নাম"); wins over `kind`. */
  localLabel?: React.ReactNode;
  placeholder?: string;
  value: string;
  localValue: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLocalChange: (value: string) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autoComplete?: string;
};

/**
 * One box for a value written in English and in the company's local language,
 * with an EN | local switch beside it. Both values stay separate fields; only
 * one is on screen at a time. Without a local language it is a plain box.
 */
const BilingualInput = ({
  name,
  kind,
  label,
  localLabel,
  placeholder,
  value,
  localValue,
  onChange,
  onLocalChange,
  onBlur,
  onKeyDown,
  autoComplete,
}: Props) => {
  const { t } = useTranslation('common');
  const { code, localCode, localInfo, localName } = useLanguage();
  // Opens on the language the app is in.
  const [showLocal, setShowLocal] = useState(code !== 'en');

  const english = (
    <InputElement
      id={name}
      name={name}
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      autoComplete={autoComplete}
      className={localCode ? 'pr-32' : ''}
    />
  );

  if (!localCode) return english;

  const localShort = localInfo?.native_name || localInfo?.name || localCode;
  const tab = (active: boolean, filled: boolean, text: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative rounded-md px-2.5 text-xs font-semibold ${
        active
          ? 'bg-primary text-white shadow-sm'
          : 'text-[rgb(var(--c-gray-700))] dark:text-[rgb(var(--c-gray-300))]'
      }`}
    >
      {text}
      {filled && !active && (
        <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </button>
  );

  // The switch sits inside the box, at its right end; the box keeps room for it.
  return (
    <div className="relative">
      <div
        dir={showLocal && localInfo?.direction === 'rtl' ? 'rtl' : 'ltr'}
        lang={showLocal ? localCode : undefined}
      >
        {showLocal ? (
          <InputElement
            id={`${name}_local`}
            name={`${name}_local`}
            label={
              localLabel ? (
                localLabel
              ) : kind ? (
                t(`data.${kind}InLanguage`, { language: localName })
              ) : (
                <>
                  {label} ({localName})
                </>
              )
            }
            placeholder=""
            value={localValue}
            onChange={(event) => onLocalChange(event.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            className="pr-32"
          />
        ) : (
          english
        )}
      </div>
      <div className={`absolute bottom-0 right-1 flex items-center ${FIELD_HEIGHT}`} dir="ltr">
        <div
          role="group"
          aria-label={t('data.switchLanguage')}
          className="flex h-[calc(100%-8px)] rounded-lg bg-gray-2 p-0.5 dark:bg-meta-4"
        >
          {tab(!showLocal, Boolean(value), 'ENG', () => setShowLocal(false))}
          {tab(showLocal, Boolean(localValue), localShort, () => setShowLocal(true))}
        </div>
      </div>
    </div>
  );
};

export default BilingualInput;
