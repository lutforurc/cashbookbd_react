import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { clearPrintBranch, setPrintBranchId } from './printBranchSlice';
import { FIELD_SELECT } from '../../../theme/fieldStyles';

interface SelectOptionProps {
  name?: string;
  branchDdl: Array<{ id: string; name: string }>; // Assuming branchDdl is an array of objects
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLSelectElement>) => void;
  className?: string | undefined;
  id?: string | undefined;
  defaultValue?: string | undefined; // New prop for default value
  value?: string | undefined;
  // For a field that is fixed by what is being edited rather than by choice --
  // shown, so the reader can see which branch it is, but not offered.
  disabled?: boolean;
}

const BranchDropdown: React.FC<SelectOptionProps> = ({
  name,
  branchDdl,
  onChange,
  onKeyDown,
  className,
  id,
  defaultValue,
  value,
  disabled,
}) => {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue || '');
  const dispatch = useDispatch();

  // Update selected value when defaultValue changes
  useEffect(() => {
    if (defaultValue) {
      setSelectedValue(defaultValue);
    }
  }, [defaultValue]);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  // Publish the selection so the shared print pad can head the page with the
  // branch this screen is reporting on, not the logged-in user's own branch.
  useEffect(() => {
    dispatch(setPrintBranchId(selectedValue || null));
  }, [dispatch, selectedValue]);

  // Leaving the screen drops the selection, so a report without a branch
  // selector does not inherit the previous screen's branch.
  useEffect(() => () => {
    dispatch(clearPrintBranch());
  }, [dispatch]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedValue(event.target.value);
    onChange(event); // Call the parent onChange function
  };

  return (
    <select
      id={id}
      name={name}
      value={selectedValue} // Bind the value to state
      onChange={handleSelectChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
      className={`${FIELD_SELECT} block w-full text-sm ${className} ${
        disabled ? 'cursor-not-allowed opacity-70' : ''
      }`}
    >
      {branchDdl &&
        branchDdl.map((item: any, index: number) => (
          <option key={index} value={item.id}>
            {item.name}
          </option>
        ))}
    </select>
  );
};

export default BranchDropdown;
