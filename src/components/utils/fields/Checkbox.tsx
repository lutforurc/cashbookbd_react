import React from 'react';

const Checkbox = ({
  name,
  checked,
  onChange,
  label,
  id,
  className = "",
  labelClassName = "",
  inputClassName = "w-4 h-4 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400",
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className={`flex items-center space-x-2 ${labelClassName}`}>
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className={inputClassName}
        />
        <span>{label}</span>
      </label>
    </div>
  );
};

export default Checkbox;