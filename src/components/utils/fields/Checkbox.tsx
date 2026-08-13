import React from 'react';
import { FIELD_CHECKBOX } from '../../../theme/fieldStyles';

const Checkbox = ({
  name,
  checked,
  onChange,
  label,
  id,
  className = "",
  labelClassName = "",
  inputClassName = FIELD_CHECKBOX,
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className={`flex items-center space-x-2 ${labelClassName}`}>
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className={inputClassName}
        />
        <span>{label}</span>
      </label>
    </div>
  );
};

export default Checkbox;