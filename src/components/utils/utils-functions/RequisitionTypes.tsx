import React, { useState } from 'react';
import { FIELD_SELECT } from '../../../theme/fieldStyles';

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
      className={`${FIELD_SELECT} block p-2 text-sm ${className}`}
    >
      <option value="">Select All</option>
      <option value="1">Approved</option>
      <option value="2">Rejected</option> 
    </select>
  );
};

export default RequisitionTypes;