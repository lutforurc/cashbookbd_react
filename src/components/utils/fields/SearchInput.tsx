import React from 'react';
import { FIELD_LABEL, fieldClass } from '../../../theme/fieldStyles';
import { Input } from './FormControls';

interface SearchObject {
  search: string;
  className: string;
  setSearchValue: (value: string) => void;
  /**
   * A word over the box, for a toolbar where everything else has one.
   *
   * ⚠️ Only wrapped when it is given. Left off, the box is returned bare, the
   * way every screen using this already lays it out -- a wrapper around all of
   * them would move the field inside whatever width the toolbar set for it.
   */
  label?: string;
  id?: string;
}

const SearchInput: React.FC<SearchObject> = ({
  search,
  setSearchValue,
  className,
  label,
  id,
}) => {
  const box = (
    <Input
      id={id}
      name={id}
      type="text"
      className={fieldClass(undefined, `w-50 ${className}`)}
      placeholder="Search..."
      value={search}
      onChange={(e) => setSearchValue(e.target.value)} // Call the passed function
    />
  );

  if (!label) return box;

  return (
    // ⚠️ flex-col, not a plain div. A <label> is inline and the box beside it
    // is too, so without this the word sat to the LEFT of the field while every
    // other label in the toolbar sat above one.
    <div className="flex flex-col text-left">
      <label htmlFor={id} className={`${FIELD_LABEL} text-left text-sm`}>
        {label}
      </label>
      {box}
    </div>
  );
};

export default SearchInput;
