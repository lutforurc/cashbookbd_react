import React from 'react';
import ToggleSwitch from './ToggleSwitch';

interface FormToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  preserveCheckedColorWhenDisabled?: boolean;
}

const FormToggleField: React.FC<FormToggleFieldProps> = ({
  label,
  checked,
  onChange,
  className = 'mb-4',
  disabled = false,
  preserveCheckedColorWhenDisabled = false,
}) => (
  <div className={className}>
    <ToggleSwitch
      label={label}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      preserveCheckedColorWhenDisabled={preserveCheckedColorWhenDisabled}
    />
  </div>
);

export default FormToggleField;
