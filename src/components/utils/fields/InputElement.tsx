import React from 'react';
import {
  FIELD_HELP,
  FIELD_LABEL,
  FIELD_TOOLTIP,
  FIELD_TOOLTIP_LEFT,
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
  /**
   * Which side the tooltip sits on. Beneath the field by default. `left` is for
   * a field in a strip that scrolls, where a bubble hanging below would earn
   * the strip a scrollbar -- see FIELD_TOOLTIP_LEFT.
   */
  titlePlacement?: 'bottom' | 'left';
  placeholder?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Paired with onBlur by fields that show one thing at rest and another while edited. */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
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
  titlePlacement = 'bottom',
  placeholder = 'Enter Text',
  onChange,
  onKeyDown,
  onBlur,
  onFocus,
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
          onFocus={onFocus}
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
            className={`${
              titlePlacement === 'left' ? FIELD_TOOLTIP_LEFT : FIELD_TOOLTIP
            } ${titleClassName}`}
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
