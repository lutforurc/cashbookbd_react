import React, { useState, useEffect } from "react";
import Select from "react-select";

interface CategoryDropdownProps {
  categoryDdl: { id: number; name: string }[];
  onChange: (selectedOption: any) => void;
  className?: string;
}

const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  categoryDdl,
  onChange,
  className,
}) => {
  const [selectedOption, setSelectedOption] = useState<any>(null);

  const options =
    Array.isArray(categoryDdl) &&
    categoryDdl.map((item) => ({
      value: item.id,
      label: item.name,
    }));

  // প্রথমে ডিফল্ট সেট করা
  useEffect(() => {
    if (options && options.length > 0 && !selectedOption) {
      setSelectedOption(options[0]);
      onChange(options[0]); // চাইলে parent component-এ notify করতে
    }
  }, [options]);

  const handleChange = (option: any) => {
    setSelectedOption(option);
    onChange(option);
  };

  return (
    <Select
      value={selectedOption}
      onChange={handleChange}
      options={options}
      placeholder="Select Category..."
      isSearchable
      className={`block text-sm bg-transparent outline-none dark:bg-boxdark dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 ${className}`}
      classNames={{
        control: (state) =>
          `!bg-transparent !border-gray-300 !rounded-none dark:!bg-boxdark dark:!border-gray-600 ${
            state.isFocused
              ? "dark:!border-blue-500 dark:!ring-blue-500"
              : "dark:!border-gray-600"
          }`,
        placeholder: () => `dark:text-gray-400 text-gray-500 text-sm`,
        input: () => `dark:text-white text-gray-900 text-sm`,
        menu: () => `dark:bg-boxdark bg-white border border-gray-300 !rounded-none`,
        option: (state) =>
          `cursor-pointer text-sm ${
            state.isFocused
              ? "dark:bg-gray-700 bg-gray-100"
              : "dark:bg-boxdark bg-white"
          }`,
        singleValue: () => `dark:text-white text-gray-900 text-sm`,
      }}
    />
  );
};

export default CategoryDropdown;
