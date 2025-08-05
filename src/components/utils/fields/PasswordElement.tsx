import React from 'react';

interface InputElementProps {
  // Define the prop types here if known
  id: string;
  name: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className: string;
}

const PasswordElement: React.FC<InputElementProps> = ({
  id = '',
  name = '',
  label = '',
  value = '',
  placeholder = 'Enter Text',
  onChange,
  className = '',
}) => {
  return (
    <div className="text-left flex flex-col">
      <label
        htmlFor={id || name}
        className="text-black dark:text-white text-left"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        onChange={onChange}
        value={value}
        type={'password'}
        placeholder={placeholder || 'Enter text'}
        className={`form-input px-3 py-2 text-gray-600 outline-none form-input bg-white border border-gray-300 rounded-xs 
        dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 
        focus:outline-none focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${className}`}
      />
    </div>
  );
};

export default PasswordElement;
