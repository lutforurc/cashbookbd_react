import React from 'react';
import { FIELD_SELECT } from '../../../theme/fieldStyles';

interface SelectOptionProps {
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
}

const SelectOption: React.FC<SelectOptionProps> = ({
  onChange,
  className,
  id,
}) => {
  return (
    <select
      onChange={onChange}
      id={id}
      className={`${FIELD_SELECT} block p-2 text-sm ${className}`}
    >
      <option value="10">10</option>
      <option value="20">20</option>
      <option value="30">30</option>
      <option value="50">50</option>
      <option value="100">100</option>
      <option value="">All</option>
    </select>
  );
};

export default SelectOption;
