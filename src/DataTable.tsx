import React from 'react';
import Select from 'react-select';

interface OptionType {
  value: string;
  label: string;
  additionalDetails: string;
}

interface DropdownProps {
  options: OptionType[];
  onSelect: (selectedOption: OptionType | null) => void;
}

const DataTable: React.FC<DropdownProps> = ({ options, onSelect }) => {
  const formatOptionLabel = ({ label, additionalDetails }: OptionType) => (
    <div>
      <div>{label}</div>
      <div className='text-sm text-[rgb(var(--c-text))]'>{additionalDetails}</div>
    </div>
  );

  return (
    <Select
      options={options}
      onChange={(selectedOption) => onSelect(selectedOption as OptionType)}
      formatOptionLabel={formatOptionLabel}
    />
  );
};

export default DataTable;


