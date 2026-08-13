import React from 'react';
import {
  FIELD_HELP,
  FIELD_LABEL,
  FIELD_TOOLTIP,
  FieldSize,
  fieldClass,
} from '../../../theme/fieldStyles';

interface InputElementProps {
  id?: string;
  name?: string;
  label?: React.ReactNode;
  value?: string | number;
  title?: React.ReactNode;
  titleClassName?: string;
  placeholder?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  type?: string;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  pattern?: string;
  list?: string;
  autoComplete?: string;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  /**
   * A line under the box saying what the value is for. Unlike `title`, which
   * hides in a tooltip until hovered, this is read without being looked for --
   * which is what a setting somebody meets once a year needs.
   */
  description?: React.ReactNode;
  /**
   * One of the four heights the app actually uses, instead of passing `h-9.5`
   * through `className`. Left off, the field keeps the size it has always had.
   */
  size?: FieldSize;
}

const InputElement: React.FC<InputElementProps> = ({
  id = '',
  name = '',
  label = '',
  value = '',
  title = '',
  titleClassName = '',
  placeholder = 'Enter Text',
  onChange,
  onKeyDown,
  onBlur,
  className = '',
  type = 'text',
  disabled = false,
  inputMode,
  pattern,
  list,
  autoComplete,
  required,
  min,
  max,
  step,
  description,
  size,
}) => {
  const nativeDateTimeClass = ['date', 'time', 'datetime-local', 'month'].includes(type)
    ? 'native-date-time-input'
    : '';

  return (
    <div className="text-left flex flex-col">
      <label htmlFor={id || name} className={FIELD_LABEL}>
        {label}
      </label>

      <div className="group relative">
        <input
          id={id}
          name={name}
          value={value}
          aria-label={typeof title === 'string' && title ? title : name || id || undefined}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={inputMode}
          pattern={pattern}
          list={list}
          autoComplete={autoComplete}
          required={required}
          min={min}
          max={max}
          step={step}
          className={fieldClass(size, `w-full ${nativeDateTimeClass} ${className}`)}
          style={{
            ...(type === 'number'
              ? {
                  appearance: 'textfield',
                  MozAppearance: 'textfield',
                }
              : {}),
          }}
        />

        {title ? (
          <div
            role="tooltip"
            className={`${FIELD_TOOLTIP} ${titleClassName}`}
          >
            {title}
          </div>
        ) : null}
      </div>

      {description ? (
        <p className={FIELD_HELP}>{description}</p>
      ) : null}
    </div>
  );
};

export default InputElement;
