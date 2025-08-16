import React from 'react';

interface InputElementProps {
  id: string;
  name: string;
  label: string | number;
  value: string;
  placeholder: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void; // Optional onKeyDown prop
  className?: string;
  type?: string; // Optional type prop (e.g., 'number')
}

const InputOnly: React.FC<InputElementProps> = ({
  id = '',
  name = '',
  value = '',
  placeholder = 'Enter Text',
  onChange,
  className = '',
  type = 'text', // Default to 'text'
  onKeyDown,
}) => {
  return (
    <div className="text-left flex flex-col">
      <input
        id={id}
        name={name}
        onChange={onChange}
        onKeyDown={onKeyDown} // Pass it to the input
        value={value}
        type={type} // Use dynamic type
        placeholder={placeholder}
        className={`form-input px-3 py-1 text-gray-600 outline-none  border rounded-xs bg-transparent dark:bg-gray-700 
        dark:border-gray-600 dark:text-white dark:placeholder-gray-500 focus:outline-none 
        focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${className}`}
      />
    </div>
  );
};

export default InputOnly;
