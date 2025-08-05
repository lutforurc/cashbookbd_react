import React, { useEffect, useState } from 'react';

interface SelectOptionProps {
  branchDdl: Array<{ id: string; name: string }>; // Assuming branchDdl is an array of objects
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string | undefined;
  id?: string | undefined;
  defaultValue?: string | undefined; // New prop for default value
}

const BranchDropdown: React.FC<SelectOptionProps> = ({
  branchDdl,
  onChange,
  className,
  id,
  defaultValue
}) => {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue || '');

  // Update selected value when defaultValue changes
  useEffect(() => {
    if (defaultValue) {
      setSelectedValue(defaultValue);
    }
  }, [defaultValue]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedValue(event.target.value);
    onChange(event); // Call the parent onChange function
  };

  return (
    <select
      id={id}
      value={selectedValue} // Bind the value to state
      onChange={handleSelectChange}
      className={`block w-full text-sm text-gray-900 border border-gray-300 rounded-xs bg-white outline-none dark:bg-boxdark dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 ${className}`}
    >
      {branchDdl &&
        branchDdl.map((item: any, index: number) => (
          <option key={index} value={item.id}>
            {item.name}
          </option>
        ))}
    </select>
  );
};

export default BranchDropdown;
