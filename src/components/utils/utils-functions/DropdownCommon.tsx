import React from 'react';
import { FIELD_HELP, FIELD_LABEL, fieldClass } from '../../../theme/fieldStyles';

interface SelectOptionProps {
  id?: string;
  name: string;
  label?: string;
  value?: string; // 🔥 controlled value
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLSelectElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLSelectElement>) => void;
  className?: string;
  data: { id: number | string; name: string }[];
  /** A line under the box saying what the choice decides. */
  description?: React.ReactNode;
}

const DropdownCommon: React.FC<SelectOptionProps> = ({
  id,
  name,
  label,
  value,
  defaultValue,
  onChange,
  onBlur,
  onKeyDown,
  className,
  data = [],
  description,
}) => {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id || name}
          className={`${FIELD_LABEL} text-left text-sm`}
        >
          {label}
        </label>
      )}

      <select
        id={id}
        name={name}
        value={value}                 // ✅ parent controls value
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={fieldClass(undefined, `w-full block text-sm ${className}`)}
      >
        {data.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>

      {description ? (
        <p className={FIELD_HELP}>
          {description}
        </p>
      ) : null}
    </div>
  );
};

export default DropdownCommon;
