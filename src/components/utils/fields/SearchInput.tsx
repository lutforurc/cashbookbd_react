import React from 'react';

interface SearchObject {
  search: string;
  className: string;
  setSearchValue: (value: string) => void;
}

const SearchInput: React.FC<SearchObject> = ({
  search,
  setSearchValue,
  className,
}) => {
  return (
    <input
      type="text"
      className={`form-input w-50 px-3 text-gray-600 outline-none form-input bg-white border border-gray-300 rounded-xs 
        dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 
        focus:outline-none focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${className}`}
      placeholder="Search..."
      value={search}
      onChange={(e) => setSearchValue(e.target.value)} // Call the passed function
    />
  );
};

export default SearchInput;
