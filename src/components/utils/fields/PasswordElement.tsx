import React from 'react';
import { FIELD_LABEL, fieldClass } from '../../../theme/fieldStyles';
import { Input } from './FormControls';

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
      <Input
        id={id}
        name={name}
        onChange={onChange}
        value={value}
        type={'password'}
        // Every screen that uses this box is setting a *new* password (add user,
        // edit user), never signing in -- so tell the browser not to drop the
        // saved login into it. Without this the box looks pre-filled on open.
        autoComplete={'new-password'}
        placeholder={placeholder || 'Enter text'}
        className={fieldClass(undefined, className)}
      />
    </div>
  );
};

export default PasswordElement;
