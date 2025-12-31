import React from 'react';

interface SelectOptionProps {
  id?: string;
  name: string;
  label?: string;
  value: string; // 🔥 controlled value
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLSelectElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLSelectElement>) => void;
  className?: string;
  data: { id: number | string; name: string }[];
}

const DropdownCommon: React.FC<SelectOptionProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  onKeyDown,
  className, 
  data = [],
}) => {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id || name}
          className="dark:text-white text-left text-sm text-gray-900"
        >
          {label}
        </label>
      )}

      <select
        id={id}
        name={name}
        value={value}                 // ✅ parent controls value
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={`w-full block p-1 text-sm text-gray-900 border border-gray-300 rounded-xs bg-transparent outline-none dark:bg-gray-700 dark:border-transparent dark:text-white ${className}`}
      >
        {data.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DropdownCommon;
