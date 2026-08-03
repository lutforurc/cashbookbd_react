import React from 'react';
import ToggleSwitch from './ToggleSwitch';

interface FormToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  preserveCheckedColorWhenDisabled?: boolean;
  /**
   * A line of plain speech under the label saying what the switch changes.
   * Many of these settings are named after the column behind them rather than
   * the effect they have, which leaves the reader guessing.
   */
  description?: string;
}

const FormToggleField: React.FC<FormToggleFieldProps> = ({
  label,
  checked,
  onChange,
  className = 'mb-4',
  disabled = false,
  preserveCheckedColorWhenDisabled = false,
  description,
}) => (
  <div className={className}>
    <ToggleSwitch
      label={label}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      preserveCheckedColorWhenDisabled={preserveCheckedColorWhenDisabled}
    />
    {description && (
      // Indented past the switch itself -- the track is w-10 and the gap is 2,
      // so pl-12 puts the first word directly under the first word of the label.
      <p className="mt-0.5 pl-12 text-xs leading-snug text-gray-500 dark:text-gray-400">
        {description}
      </p>
    )}
  </div>
);

export default FormToggleField;
