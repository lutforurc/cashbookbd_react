import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FIELD_HELP,
  FIELD_LABEL,
  FIELD_TOOLTIP,
  FIELD_TOOLTIP_CARET_RIGHT,
  FIELD_TOOLTIP_CARET_UP,
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

  // Where the bubble is on screen, or null when it is not shown. Measured from
  // the field at the moment of hover rather than laid out beside it: drawn into
  // the body, the bubble is no longer inside whatever the field is inside, so a
  // toolbar that scrolls cannot be made to scroll further by it, and a panel
  // that clips cannot cut it in half.
  const anchor = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState<{ top: number; left: number } | null>(null);

  const showTooltip = () => {
    const box = anchor.current?.getBoundingClientRect();
    if (!box || !title) return;
    setBubble(
      titlePlacement === 'left'
        ? { top: box.top + box.height / 2, left: box.left - 10 }
        : { top: box.bottom + 10, left: box.left + box.width / 2 },
    );
  };
  const hideTooltip = () => setBubble(null);

  // Fixed to the viewport, so anything that moves the field underneath it
  // leaves the bubble pointing at empty air. Cheaper to take it away than to
  // follow the field around.
  useEffect(() => {
    if (!bubble) return undefined;
    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip);
    return () => {
      window.removeEventListener('scroll', hideTooltip, true);
      window.removeEventListener('resize', hideTooltip);
    };
  }, [bubble]);

  return (
    <div className="text-left flex flex-col">
      <label htmlFor={id || name} className={FIELD_LABEL}>
        {label}
      </label>

      <div
        ref={anchor}
        className="relative"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocusCapture={showTooltip}
        onBlurCapture={hideTooltip}
      >
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

      </div>

      {title && bubble
        ? createPortal(
            <div
              role="tooltip"
              style={{
                position: 'fixed',
                top: bubble.top,
                left: bubble.left,
                // Centred under the field, or ended at its left edge.
                transform:
                  titlePlacement === 'left'
                    ? 'translate(-100%, -50%)'
                    : 'translateX(-50%)',
                zIndex: 9999,
              }}
              className={`${FIELD_TOOLTIP} ${titleClassName}`}
            >
              <span
                className={
                  titlePlacement === 'left'
                    ? FIELD_TOOLTIP_CARET_RIGHT
                    : FIELD_TOOLTIP_CARET_UP
                }
              />
              {title}
            </div>,
            document.body,
          )
        : null}

      {description ? (
        <p className={FIELD_HELP}>{description}</p>
      ) : null}
    </div>
  );
};

export default InputElement;
