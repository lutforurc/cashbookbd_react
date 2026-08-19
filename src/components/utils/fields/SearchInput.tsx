import React from 'react';
import { fieldClass } from '../../../theme/fieldStyles';
import { Input } from './FormControls';

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
    <Input
      type="text"
      className={fieldClass(undefined, `w-50 ${className}`)}
      placeholder="Search..."
      value={search}
      onChange={(e) => setSearchValue(e.target.value)} // Call the passed function
    />
  );
};

export default SearchInput;
