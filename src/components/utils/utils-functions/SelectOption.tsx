import React from 'react';
import { FIELD_SELECT } from '../../../theme/fieldStyles';
import { Select } from '../fields/FormControls';

interface SelectOptionProps {
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
  /** The choice on show. Left off, the select keeps whatever the browser holds. */
  value?: string;
}

const SelectOption: React.FC<SelectOptionProps> = ({
  onChange,
  className,
  id,
  value,
}) => {
  return (
    <Select
      onChange={onChange}
      id={id}
      value={value}
      className={`${FIELD_SELECT} block p-2 text-sm ${className}`}
    >
      <option value="10">10</option>
      <option value="20">20</option>
      <option value="30">30</option>
      <option value="50">50</option>
      <option value="100">100</option>
      <option value="">All</option>
    </Select>
  );
};

export default SelectOption;
