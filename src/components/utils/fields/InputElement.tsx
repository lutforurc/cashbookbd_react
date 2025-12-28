import React, { InputHTMLAttributes } from 'react';

interface InputElementProps {
  id?: string;
  name?: string;
  label?: string | number;
  value?: string | number;
  placeholder?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  type?: string;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  pattern?: string;
}

const InputElement: React.FC<InputElementProps> = ({
  id = '',
  name = '',
  label = '',
  value = '',
  placeholder = 'Enter Text',
  onChange,
  onKeyDown,
  onBlur,
  className = '',
  type = 'text',
  disabled = false,
  inputMode,
  pattern,
}) => {
  return (
    <div className="text-left flex flex-col">
      <label htmlFor={id || name} className="text-black dark:text-white">
        {label}
      </label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        inputMode={inputMode}
        pattern={pattern}
        className={`form-input px-3 py-1 text-gray-600  outline-none border rounded-xs bg-white dark:bg-transparent 
          dark:border-gray-600 dark:text-white dark:placeholder-gray-500 focus:outline-none 
          focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${className}`}
        style={{
          appearance: 'textfield', // for Firefox
          MozAppearance: 'textfield', // for older Firefox
          WebkitAppearance: 'none', // for Chrome/Safari
        }}
      />
    </div>
  );
};

export default InputElement;
