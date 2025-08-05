import React, { useEffect, useState } from 'react';

interface SelectOptionProps {
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
  defaultValue?: string; // New prop for default value
  value?: string;
}

const VARIANCE_OPTIONS = [
  { value: "", label: "Not Applicable" },
  { value: "+", label: "(+) Increase" },
  { value: "-", label: "(-) Decrease" },
];


const SelectWeightVariance: React.FC<SelectOptionProps> = ({
 
  onChange,
  className,
  id,
  defaultValue,
  value
}) => {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue || '');
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
      name={'weightVariance'} // Assuming name is a string for the select element
      value={selectedValue}
      onChange={handleSelectChange}
      className={`block p-2 text-sm text-gray-900 border border-gray-300 rounded-xs bg-white outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 ${className}`}
    >
        {VARIANCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                  {option.label}
              </option>
          ))}
      {/* <option value="">Not Applicable</option>
      <option value="+">(+) Increase</option>
      <option value="-">(-) Decrease</option> */}
    </select>
  );
};

export default SelectWeightVariance;
