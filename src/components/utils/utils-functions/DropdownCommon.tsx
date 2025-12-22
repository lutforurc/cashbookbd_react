import React, { useEffect, useState } from 'react';

interface SelectOptionProps {
  id?: string;
  name: string;
  label?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLSelectElement>) => void;
  className?: string;
  defaultValue?: string; // New prop for default value
  selectOption?: string; // New prop for the first option text
  data: { id: number | string; name: string }[]; // Properly typed data prop
}

const DropdownCommon: React.FC<SelectOptionProps> = ({
  id,
  name,
  label,
  onChange,
  className,
  defaultValue = '',
  selectOption = 'Select All',
  data = [],
}) => {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  // Update selected value when defaultValue changes
  useEffect(() => {
    setSelectedValue(defaultValue);
  }, [defaultValue]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedValue(value);
    onChange(event); // Call the parent onChange function
  };

  return (
    <div className="w-full">
      <label
        htmlFor={id || name} // Fallback to `name` if `id` is not provided
        className="dark:text-white text-left text-md col-start-auto text-sm text-gray-900"
      >
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={selectedValue} // Bind the value to state
        onChange={handleSelectChange}
        className={`w-full block p-1 text-sm text-gray-900 border border-gray-300 rounded-xs bg-transparent outline-none dark:bg-gray-700 dark:border-transparent dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 ${className}`}
      >
        {data.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DropdownCommon;
