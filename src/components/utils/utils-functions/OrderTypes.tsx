import React, { useState } from 'react';
import { FIELD_SELECT } from '../../../theme/fieldStyles';

interface OrderProps {
  name?: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
  value?: string;
  selectOption?: string;
}

const OrderTypes: React.FC<OrderProps> = ({
  name,
  onChange,
  onKeyDown,
  className,
  id,
  value,
  selectOption = 'Select Order Type',
}) => {
  const [selectedValue, setSelectedValue] = useState<string>("");

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedValue(event.target.value); // Update internal state
    onChange(event); // Trigger the parent's onChange handler
  };

  return (
    <select
      onChange={handleChange}
      onKeyDown={onKeyDown}
      value={selectedValue} // Bind the selected value to state
      id={id}
      name={name}
      className={`${FIELD_SELECT} block p-2 text-sm ${className}`}
    >
      <option disabled value="">
        {selectOption}
      </option>
      <option value="1">Purchase</option>
      <option value="2">Sales</option>
      <option value="3">Stock</option>
    </select>
  );
};

export default OrderTypes;
