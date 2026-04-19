import React, { useState, useEffect, useMemo } from "react"; // ✅ Add useMemo import
import Select from "react-select";

interface CategoryDropdownProps {
  categoryDdl: { id: number | string; name: string }[];
  onChange: (selectedOption: any) => void;
  className?: string;
  value?: string | number | null;  
}

const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  categoryDdl,
  onChange,
  className,
  value,
}) => {
  const [selectedOption, setSelectedOption] = useState<any>(null);

  // ✅ Memoize options to stabilize reference
  const options = useMemo(
    () =>
      Array.isArray(categoryDdl)
        ? categoryDdl.map((item) => ({
            value: item.id,
            label: item.name,
          }))
        : [],
    [categoryDdl]
  );


useEffect(() => {
  if (value != null && options.length > 0) {
    const match = options.find(
      (opt) => opt.value.toString() === value.toString()
    );

    if (
      match &&
      (!selectedOption ||
        match.value.toString() !== selectedOption.value.toString())
    ) {
      setSelectedOption(match);
    }
  }
}, [value, options]);

  // ✅ যদি value না থাকে (optional), প্রথম option কে default সিলেক্ট করবে
  useEffect(() => {
    if (!value && options.length > 0 && !selectedOption) {
      setSelectedOption(options[0]);
      onChange(options[0]);
    }
  }, [options, value, selectedOption, onChange]); // ✅ Added selectedOption and onChange to deps

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