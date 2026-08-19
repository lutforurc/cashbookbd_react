import React, { useEffect, useState } from 'react';
import { FIELD_SELECT } from '../../../theme/fieldStyles';
import { Select } from '../fields/FormControls';

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
    <Select
    id={id}
      name={'weightVariance'} // Assuming name is a string for the select element
      value={selectedValue}
      onChange={handleSelectChange}
      className={`${FIELD_SELECT} block p-2 text-sm ${className}`}
    >
        {VARIANCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                  {option.label}
              </option>
          ))}
      {/* <option value="">Not Applicable</option>
      <option value="+">(+) Increase</option>
      <option value="-">(-) Decrease</option> */}
    </Select>
  );
};

export default SelectWeightVariance;
