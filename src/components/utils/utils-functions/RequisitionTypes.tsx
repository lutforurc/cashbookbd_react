import React, { useState } from 'react';

interface OrderProps {
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
}

const RequisitionTypes: React.FC<OrderProps> = ({
  onChange,
  className,
  id,
}) => {
  const [selectedValue, setSelectedValue] = useState<string>("");

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedValue(event.target.value); // Update internal state
    onChange(event); // Trigger the parent's onChange handler
  };

  return (
    <select
      onChange={handleChange}
      value={selectedValue} // Bind the selected value to state
      id={id}
      name={id}
      className={`block p-2 text-sm text-gray-900 border border-gray-300 rounded-xs bg-gray-50 outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 ${className}`}
    >
      <option value="">Select All</option>
      <option value="1">Approved</option>
      <option value="2">Rejected</option> 
    </select>
  );
};

export default RequisitionTypes;