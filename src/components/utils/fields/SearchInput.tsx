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
  /**
   * What the box is looking through, where that is not obvious from the screen.
   * Left off, every existing caller keeps the plain "Search...".
   */
  placeholder?: string;
}

const SearchInput: React.FC<SearchObject> = ({
  search,
  setSearchValue,
  className,
  label,
  id,
  placeholder,
}) => {
  /**
   * ⚠️ `w-50` is a default width, not a width.
   *
   * It used to be joined in front of the caller's class every time, and both
   * landed on the box -- so which one won was decided by their order in the
   * generated stylesheet, not by the caller. It won, which is why three screens
   * had to reach for `w-full!` to fill a toolbar cell. A caller that names a
   * width now gets it; only a caller that names none gets the 200px default.
   */
  const callerSetsWidth = /(^|\s)w-/.test(className);
  const defaultWidth = callerSetsWidth ? '' : 'w-50';

  /**
   * A caller asking for `w-full` is asking to fill its cell -- so the wrapper
   * has to fill it too. Left `auto`, the wrapper shrank to the box's own width
   * and the box (100% of the wrapper) filled nothing. Screens that state a
   * fixed width keep the old auto wrapper: the wrapper is what a toolbar
   * measures, and widening it would move their neighbouring fields.
   */
  const fillsCell = /(^|\s)w-(full|screen)/.test(className);

  const box = (
    <Input
      id={id}
      name={id}
      type="text"
      className={fieldClass(undefined, `${defaultWidth} ${className}`)}
      placeholder={placeholder || 'Search...'}
      value={search}
      onChange={(e) => setSearchValue(e.target.value)} // Call the passed function
    />
  );

  if (!label) return box;

  return (
    // ⚠️ flex-col, not a plain div. A <label> is inline and the box beside it
    // is too, so without this the word sat to the LEFT of the field while every
    // other label in the toolbar sat above one.
    <div className={`flex flex-col text-left${fillsCell ? ' w-full' : ''}`}>
      <label htmlFor={id} className={`${FIELD_LABEL} text-left text-sm`}>
        {label}
      </label>
      {box}
    </div>
  );
};

export default SearchInput;
