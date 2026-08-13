import React from 'react';
import { FIELD_LABEL, fieldClass } from '../../../theme/fieldStyles';

interface InputElementProps {
  // Define the prop types here if known
  id: string;
  name: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className: string;
}

const PasswordElement: React.FC<InputElementProps> = ({
  id = '',
  name = '',
  label = '',
  value = '',
  placeholder = 'Enter Text',
  onChange,
  className = '',
}) => {
  return (
    <div className="text-left flex flex-col">
      <label
        htmlFor={id || name}
        className={`${FIELD_LABEL} text-left`}
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        onChange={onChange}
        value={value}
        type={'password'}
        placeholder={placeholder || 'Enter text'}
        className={fieldClass(undefined, className)}
      />
    </div>
  );
};

export default PasswordElement;
