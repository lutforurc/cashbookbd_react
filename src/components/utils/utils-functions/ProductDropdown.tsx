import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncSelect from 'react-select/async';
import { getDdlProduct } from '../../modules/product/productSlice';
import { StylesConfig } from 'react-select';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { hasPermission } from '../permissionChecker';
import { settingOn } from '../userFeatureSettings';
import { FIELD_HEIGHT_REM, withFieldHeight } from '../../../theme/fieldStyles';

interface OptionType {
  value: string;
  label: string;
  label_2?: string;
  label_3?: string;
  label_4?: string;
  label_5?: string;
  /** The product's own code. Several products may share a name and differ
      only by this, so it is shown beside the name -- never folded into
      `label`, which the Excel imports match against as a plain name. */
  code?: string;
  /** Brand and group. Absent on a database that has not been patched with
      them, which is why every use of them has to allow for nothing. */
  brand?: string;
  group_name?: string;
  /** What is left in stock on this branch. Only sent -- and so only ever
      present -- for a branch that turned the switch on, since working it out
      is the one detail that costs the search anything. */
  balance?: string;
}

interface DropdownProps {
  id?: string;
  name?: string;
  onSelect: (selected: OptionType | null) => void;
  defaultValue?: { value: any; label: any } | null;
  value?: { value: any; label: any } | null;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string; 
}

const getControlHeightFromClassName = (className?: string) => {
  if (!className) return undefined;

  const arbitraryHeightMatch = className.match(/\bh-\[([^\]]+)\]/);
  if (arbitraryHeightMatch) {
    return arbitraryHeightMatch[1];
  }

  const tailwindHeightMatch = className.match(/\bh-(\d+(?:\.\d+)?)\b/);
  if (tailwindHeightMatch) {
    return `${Number(tailwindHeightMatch[1]) * 0.25}rem`;
  }

  return undefined;
};

const ProductDropdown: React.FC<DropdownProps> = ({
  id,
  name,
  onSelect,
  defaultValue,
  value,
  onKeyDown,
  className,
}) => {
  const selectRef = useRef(null);
  const [isSelected, setIsSelected] = React.useState(false);
  // Read inside a key handler, where a state value would be a render behind.
  const isMenuOpenRef = useRef(false);
  const [isControlFocused, setIsControlFocused] = React.useState(false);
  const [internalSelectedOption, setInternalSelectedOption] = React.useState<OptionType | null>(
    value ?? defaultValue ?? null,
  );
  const dispatch = useDispatch();
  // What a product cost the company is not everyone's business, and this list
  // is open on the sales counter. The price still travels with the option --
  // the purchase screens fill their rate from it -- so this hides the line,
  // and only the line.
  const settings = useSelector((state: any) => state.settings);
  const permissions = settings?.data?.permissions || [];
  const canSeePurchasePrice = hasPermission(permissions, 'product.purchase.price.view');

  // Branch Setup -> Product Dropdown: how many lines each product takes, and
  // which of them the branch wants shown.
  const branchSettings = settings?.data?.branch;
  const singleLine = branchSettings?.product_ddl_lines === 'single';

  /**
   * One of those switches, as the server settled it.
   *
   * These read the opposite way round to most branch switches: the five the box
   * has always shown have to be ON for a branch that has never been asked, and
   * that is what getBranchEdit() answers. The `undefined` arm is the moment
   * before settings arrive -- reading unset as off there would blank every
   * detail line on a page that is a tick away from drawing them.
   */
  const ddlOn = (key: string) => {
    const value = branchSettings?.[key];

    return value === undefined ? true : settingOn(value);
  };

  // A single line IS the name, so it survives whatever the name switch says.
  const showName = singleLine || ddlOn('product_ddl_show_name');

  /**
   * The details the branch wants beside a product's name, in the order Branch
   * Setup lists the switches. One list for both modes: Multi Line stacks them
   * under the name, one labelled line each; Single Line packs them onto the
   * name's own line, where the full labels would not fit and `short` is used
   * instead (`Purchase`, not `Purchase Price`).
   *
   * A field drops out when its switch is off, when the product has nothing for
   * it, and -- for the cost price -- when this login may not see it.
   */
  const ddlDetails = (option: OptionType) =>
    [
      { setting: 'product_ddl_show_category', label: 'Category', short: 'Category', value: option.label_2, allowed: true },
      { setting: 'product_ddl_show_brand', label: 'Brand', short: 'Brand', value: option.brand, allowed: true },
      { setting: 'product_ddl_show_group', label: 'Group', short: 'Group', value: option.group_name, allowed: true },
      { setting: 'product_ddl_show_purchase_price', label: 'Purchase Price', short: 'Purchase', value: option.label_3, allowed: canSeePurchasePrice },
      { setting: 'product_ddl_show_sales_price', label: 'Sales Price', short: 'Sales', value: option.label_4, allowed: true },
      { setting: 'product_ddl_show_unit', label: 'Unit', short: 'Unit', value: option.label_5, allowed: true },
      { setting: 'product_ddl_show_balance', label: 'Balance', short: 'Balance', value: option.balance, allowed: true },
    ].filter((field) => field.allowed && ddlOn(field.setting) && field.value);
  const themeMode = useLocalStorage('color-theme', 'light');
  const darkMode = themeMode[0] === 'dark';
  const controlHeight = getControlHeightFromClassName(className) || FIELD_HEIGHT_REM;

  /**
   * The code of every product that has been through the list, by id.
   *
   * The screens keep only the id and the name of the product they picked and
   * hand the box back a `{value, label}` of their own making -- so a box that a
   * moment ago read "VC4 - Verso Commode Blue" fell back to the bare name the
   * instant it was filled. Their object wins over the option that was clicked,
   * because it is the `value` prop, so the code has to be put back on it here.
   */
  const codeByValue = useRef<Record<string, string>>({});

  /** The screen's own `{value, label}`, with the code the list already knows. */
  const withCode = (option: OptionType | null | undefined): OptionType | null => {
    if (!option || option.code || !option.value) {
      return option ?? null;
    }

    const code = codeByValue.current[String(option.value)];

    return code ? { ...option, code } : option;
  };

  React.useEffect(() => {
    setInternalSelectedOption(value ?? defaultValue ?? null);
  }, [value, defaultValue]);

  /**
   * Enter belongs to the open list, not to the field after it.
   *
   * react-select calls this handler first and then checks the event: the
   * moment it sees defaultPrevented it drops its own Enter handling and never
   * selects the highlighted product. Every caller here passes
   * handleInputKeyDown, whose first act on Enter is preventDefault() so it can
   * move focus on -- so typing a name, arrowing to the product and pressing
   * Enter closed the list with nothing chosen.
   *
   * With the list open the caller's handler is held back a tick, which lets
   * react-select commit the selection on this same event before focus leaves.
   * Its own move is already deferred, so nothing about the jump changes. With
   * the list closed there is nothing to select and Enter passes straight
   * through, as it always did.
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && isMenuOpenRef.current) {
      window.setTimeout(() => onKeyDown?.(event), 0);
      return;
    }

    onKeyDown?.(event);
  };

  const loadOptions = async (inputValue: string, callback: (options: OptionType[]) => void) => {
    if (inputValue.length >= 3) {
      try {
        const response: any = await dispatch(getDdlProduct(inputValue));
        if (Array.isArray(response.payload)) {
          const formattedOptions: OptionType[] = response.payload.map((item: any) => ({
            value: item.value,
            label: item.label,
            label_2: item.label_2,
            label_3: item.label_3,
            label_4: item.label_4,
            label_5: item.label_5,
            code: item.code || '',
            brand: item.brand,
            group_name: item.group_name,
            // The balance arrives as a number or a numeric string, and a real
            // stock of zero has to keep its line: `0` would be dropped by the
            // truthiness filter in ddlDetails above, `'0'` is not.
            balance: item.balance === null || item.balance === undefined ? '' : String(item.balance),
          }));
          // Remembered so the box keeps the code after the screen takes over
          // the value -- see withCode().
          formattedOptions.forEach((option) => {
            if (option.code) {
              codeByValue.current[String(option.value)] = option.code;
            }
          });
          callback(formattedOptions);
        } else {
          callback([]);
        }
      } catch (error) {
        console.error('Error loading options:', error);
        callback([]);
      }
    } else {
      callback([]);
    }
  };

  const customStyles: StylesConfig = {
    control: (provided, state) => ({
      ...provided,
      minHeight: controlHeight,
      height: controlHeight,
      borderRadius: '0.0rem',
      borderColor: state.isFocused || isControlFocused ? 'rgb(var(--c-blue-500))' : darkMode ? 'rgb(var(--c-strokedark))' : 'rgb(var(--c-gray-300))',
      backgroundColor: darkMode ? 'rgb(var(--c-form-input))' : 'rgb(var(--c-gray-3))',
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
      boxShadow: state.isFocused || isControlFocused ? '0 0 0 1px rgb(var(--c-blue-500))' : '',
      fontSize: '0.9rem',
      '&:hover': {
        borderColor: state.isFocused || isControlFocused ? 'rgb(var(--c-blue-500))' : darkMode ? 'rgb(var(--c-strokedark))' : 'rgb(var(--c-gray-300))',
      },
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      whiteSpace: 'normal',
      backgroundColor: isFocused
        ? darkMode
          ? 'rgb(var(--c-graydark))'
          : 'rgb(var(--c-gray-200))'
        : isSelected
        ? darkMode
          ? 'rgb(var(--c-gray-600))'
          : 'rgb(var(--c-gray-300))'
        : darkMode
        ? 'rgb(var(--c-form-input))'
        : 'rgb(var(--c-white))',
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
      fontSize: '0.8rem',
      '&:hover': {
        backgroundColor: darkMode ? 'rgb(var(--c-gray-600))' : 'rgb(var(--c-gray-300))',
        color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
      },
    }),
    menu: (base) => ({
      ...base,
      zIndex: 1000,
      backgroundColor: darkMode ? 'rgb(var(--c-graydark))' : 'rgb(var(--c-white))',
      borderColor: darkMode ? 'rgb(var(--c-bodydark2))' : 'rgb(var(--c-black-2))',
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    placeholder: (base) => ({
      ...base,
      color: darkMode ? 'rgb(var(--c-gray-400))' : 'rgb(var(--c-gray-400))',
      marginTop: 0,
      marginBottom: 0,
      lineHeight: controlHeight,
    }),
    singleValue: (base) => ({
      ...base,
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
      marginTop: 0,
      marginBottom: 0,
      lineHeight: controlHeight,
    }),
    input: (base) => ({
      ...base,
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
      marginTop: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
      height: controlHeight,
    }),
    valueContainer: (base) => ({
      ...base,
      paddingTop: 0,
      paddingBottom: 0,
      height: controlHeight,
      minHeight: controlHeight,
    }),
    indicatorsContainer: (base) => ({
      ...base,
      paddingTop: 0,
      paddingBottom: 0,
      height: controlHeight,
      minHeight: controlHeight,
      alignItems: 'center',
    }),
    dropdownIndicator: (base) => ({
      ...base,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 0,
      paddingBottom: 0,
      height: controlHeight,
    }),
    clearIndicator: (base) => ({
      ...base,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 0,
      paddingBottom: 0,
      height: controlHeight,
    }),
  };

  return (
    <div className="dark:bg-black focus:border-blue-500">
      <AsyncSelect<OptionType>
        inputId={id}
        name={name}
        className={`cash-react-select-container w-full dark:bg-black focus:border-blue-500 ${className || ''}`}
        classNamePrefix="cash-react-select"
        classNames={{
          control: () => className || '',
        }}
        loadOptions={loadOptions}
        onChange={(selected) => {
          setInternalSelectedOption(selected || null);
          onSelect(selected || null);
        }}
        onMenuOpen={() => {
          isMenuOpenRef.current = true;
          setIsSelected(true);
        }}
        onMenuClose={() => {
          isMenuOpenRef.current = false;
          setIsSelected(false);
        }}
        onFocus={() => setIsControlFocused(true)}
        onBlur={() => setIsControlFocused(false)}
        onKeyDown={handleKeyDown}
        getOptionLabel={(option) => option.label}
        formatOptionLabel={(option) => {
          const details = ddlDetails(option);

          // getOptionLabel above is what the picked value and the search read,
          // and it stays the plain name whatever the branch shows.
          // "CODE - NAME" while there is a code, the bare name when there is
          // none -- the same shape the invoice paper prints. With the name
          // switched off the code carries the line, and a product with neither
          // keeps its name rather than showing nothing. Code and name count as
          // one item: Single Line puts the comma after them, not between.
          const head = !showName
            ? option.code || option.label
            : option.code
              ? `${option.code} - ${option.label}`
              : option.label;

          return (
            <div>
              <div className="text-sm text-gray-900 dark:text-[rgb(var(--c-text))]">
                {/* Code and name are one item, so the comma comes after them.
                    Each detail keeps its label: a row of bare numbers says
                    nothing about which price is which. */}
                {singleLine && isSelected
                  ? [head, ...details.map((field) => `${field.short}: ${field.value}`)].join(', ')
                  : head}
              </div>
              {/* Single Line has already spent its one line, and there is
                  nothing to add before the list is open. */}
              {!singleLine && isSelected && (
                <div className="additional-info">
                  {details.map((field) => (
                    <div key={field.label} className="text-gray-600 dark:text-[rgb(var(--c-text))] text-sm">
                      {field.label}: {field.value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }}
        getOptionValue={(option) => option.value}
        placeholder="Select product"
        styles={withFieldHeight(customStyles, controlHeight)}
        defaultValue={withCode(defaultValue)}
        value={withCode(value ?? internalSelectedOption)}
        menuPortalTarget={document.body}
        ref={selectRef} // রেফ যোগ করুন
        // components={{ DropdownIndicator: () => null }}
      />
    </div>
  );
};

export default ProductDropdown;
