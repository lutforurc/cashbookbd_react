import React from 'react';

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
}) => {
  const nativeDateTimeClass = ['date', 'time', 'datetime-local', 'month'].includes(type)
    ? 'native-date-time-input'
    : '';

  return (
    <div className="text-left flex flex-col">
      <label htmlFor={id || name} className="text-black dark:text-white">
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
          className={`w-full form-input px-3 py-1 text-gray-700 outline-none border rounded-xs bg-white placeholder-gray-400 dark:bg-boxdark 
          dark:border-gray-600 dark:text-white dark:placeholder-gray-500 focus:outline-none 
          focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${nativeDateTimeClass} ${className}`}
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
            className={`pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-56 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${titleClassName}`}
          >
            {title}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InputElement;
