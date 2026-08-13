import React from 'react';
import { FIELD_TRANSPARENT, fieldClass } from '../../../theme/fieldStyles';

interface InputElementProps {
  id: string;
  name: string;
  label: string | number;
  value: string;
  placeholder: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void; // Optional onKeyDown prop
  className?: string;
  type?: string; // Optional type prop (e.g., 'number')
}

const InputOnly: React.FC<InputElementProps> = ({
  id = '',
  name = '',
  value = '',
  placeholder = 'Enter Text',
  onChange,
  className = '',
  type = 'text', // Default to 'text'
  onKeyDown,
}) => {
  return (
    <div className="text-left flex flex-col">
      <input
        id={id}
        name={name}
        onChange={onChange}
        onKeyDown={onKeyDown} // Pass it to the input
        value={value}
        type={type} // Use dynamic type
        placeholder={placeholder}
        className={fieldClass(undefined, `${FIELD_TRANSPARENT} ${className}`)}
      />
    </div>
  );
};

export default InputOnly;
