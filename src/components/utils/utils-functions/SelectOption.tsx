import React from 'react';

interface SelectOptionProps {
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
}

const SelectOption: React.FC<SelectOptionProps> = ({
  onChange,
  className,
  id,
}) => {
  return (
    <select
      onChange={onChange}
      id={id}
      className={`block p-2 text-sm text-gray-900 border border-gray-300 rounded-xs bg-gray-50 outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 ${className}`}
    >
      <option value="10">10</option>
      <option value="20">20</option>
      <option value="30">30</option>
      <option value="50">50</option>
      <option value="100">100</option>
    </select>
  );
};

export default SelectOption;
