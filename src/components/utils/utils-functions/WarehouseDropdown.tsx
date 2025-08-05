import React, { useEffect, useState } from 'react';

interface SelectOptionProps {
  warehouseDdl: Array<{ id: string; name: string }>; // Assuming warehouseDdl is an array of objects
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
  name?: string; // New prop for name
  defaultValue?: string; // New prop for default value
}

const WarehouseDropdown: React.FC<SelectOptionProps> = ({
  warehouseDdl,
  onChange,
  onKeyDown,
  className,
  id, 
  defaultValue,
}) => {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue || '');

  // Update selected value when defaultValue changes
  useEffect(() => {
    //if (defaultValue) {
      setSelectedValue(defaultValue);
    //}
  }, [defaultValue]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedValue(event.target.value);
    onChange(event); // Call the parent onChange function
  };

  return (
    <select
      id={id} 
      name={'warehouse'} // Assuming name is a string for the select element
      value={selectedValue} // Bind the value to state
      onChange={handleSelectChange}
      onKeyDown={onKeyDown} // Pass it to the select element
      className={`block w-full text-sm text-gray-900 border border-gray-300 rounded-xs outline-none dark:bg-boxdark dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 ${className}`}
    >
      <option value="">Not Applicable</option>
      {warehouseDdl &&
        warehouseDdl.map((item: any, index: number) => (
          <option key={index} value={item.id}>{item.name}</option>
        ))}
    </select>
  );
};

export default WarehouseDropdown;
