import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncSelect from 'react-select/async';
import { getDdlProduct } from '../../modules/product/productSlice';
import { StylesConfig } from 'react-select';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { hasPermission } from '../permissionChecker';

interface OptionType {
  value: string;
  label: string;
  label_2?: string;
  label_3?: string;
  label_4?: string;
  label_5?: string;
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
  const [isControlFocused, setIsControlFocused] = React.useState(false);
  const [internalSelectedOption, setInternalSelectedOption] = React.useState<OptionType | null>(
    value ?? defaultValue ?? null,
  );
  const dispatch = useDispatch();
  // What a product cost the company is not everyone's business, and this list
  // is open on the sales counter. The price still travels with the option --
  // the purchase screens fill their rate from it -- so this hides the line,
  // and only the line.
  const permissions = useSelector((state: any) => state.settings?.data?.permissions) || [];
  const canSeePurchasePrice = hasPermission(permissions, 'product.purchase.price.view');
  const themeMode = useLocalStorage('color-theme', 'light');
  const darkMode = themeMode[0] === 'dark';
  const controlHeight = getControlHeightFromClassName(className);

  React.useEffect(() => {
    setInternalSelectedOption(value ?? defaultValue ?? null);
  }, [value, defaultValue]);

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
          }));
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
      minHeight: controlHeight || '2.1rem',
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
        onMenuOpen={() => setIsSelected(true)}
        onMenuClose={() => setIsSelected(false)}
        onFocus={() => setIsControlFocused(true)}
        onBlur={() => setIsControlFocused(false)}
        onKeyDown={onKeyDown}
        getOptionLabel={(option) => option.label}
        formatOptionLabel={(option) => (
          <div>
            <div className="text-sm text-gray-900 dark:text-white">
              {option.label}
            </div>
            {isSelected && (
              <div className="additional-info">
                {option.label_2 && (
                  <div className="text-gray-600 dark:text-white text-sm">
                    Category: {option.label_2}
                  </div>
                )}
                {canSeePurchasePrice && option.label_3 && (
                  <div className="text-gray-600 dark:text-white text-sm">
                    Purchase Price: {option.label_3}
                  </div>
                )}
                {option.label_4 && (
                  <div className="text-gray-600 dark:text-white text-sm">
                    Sales Price: {option.label_4}
                  </div>
                )}
                {option.label_5 && (
                  <div className="text-gray-600 dark:text-white text-sm">
                    Unit: {option.label_5}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        getOptionValue={(option) => option.value}
        placeholder="Select product"
        styles={customStyles}
        defaultValue={defaultValue}
        value={value ?? internalSelectedOption}
        menuPortalTarget={document.body}
        ref={selectRef} // রেফ যোগ করুন
        // components={{ DropdownIndicator: () => null }}
      />
    </div>
  );
};

export default ProductDropdown;
