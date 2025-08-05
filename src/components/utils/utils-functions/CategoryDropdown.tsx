import React from 'react';
interface SelectOptionProps {
  categoryDdl: {};
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
}
const CategoryDropdown: React.FC<SelectOptionProps> = ({
  categoryDdl,
  onChange,
  className,
  id,
}) => {
  return (
    <>
      <select
        onChange={onChange}
        className={`block text-sm text-gray-900  border border-gray-300 rounded-xs bg-transparent outline-none dark:bg-boxdark  dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 ${className}`}
      >
        <option value="">All Category</option>
      {Array.isArray(categoryDdl) &&
        categoryDdl.map((item: any, index: number) => (
          <option key={index} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </>
  );
};

export default CategoryDropdown;
