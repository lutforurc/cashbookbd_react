import React, { useEffect, useState } from 'react';
import { FIELD_SELECT } from '../../../theme/fieldStyles';

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
  name,
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
      name={name || 'warehouse'}
      value={selectedValue} // Bind the value to state
      onChange={handleSelectChange}
      onKeyDown={onKeyDown} // Pass it to the select element
      className={`${FIELD_SELECT} block w-full text-sm ${className}`}
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
