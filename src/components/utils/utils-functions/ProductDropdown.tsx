import React, { useRef } from 'react';
import { useDispatch } from 'react-redux';
import AsyncSelect from 'react-select/async';
import { getDdlProduct } from '../../modules/product/productSlice';
import { StylesConfig } from 'react-select';
import useLocalStorage from '../../../hooks/useLocalStorage';

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
  const dispatch = useDispatch();
  const themeMode = useLocalStorage('color-theme', 'light');
  const darkMode = themeMode[0] === 'dark';

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
      borderRadius: '0.0rem',
      borderColor: state.isFocused ? 'rgb(59 130 246)' : darkMode ? '#363843' : '#d2d6dc',
      backgroundColor: darkMode ? '#1f212a' : '#fcfcfc',
      color: darkMode ? '#fff' : '#000',
      // boxShadow: state.isFocused ? 'none': '0 0 0 1px rgb(59 130 246)', 
      boxShadow: state.isFocused ? 'none': '', 
      fontSize: '0.9rem',
      '&:hover': {
        borderColor: state.isFocused ? 'rgb(59 130 246)' : darkMode ? '#363843' : '#d2d6dc',
      },
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      whiteSpace: 'normal',
      backgroundColor: isFocused
        ? darkMode
          ? '#3b3e47'
          : '#E5E7EB'
        : isSelected
        ? darkMode
          ? '#50535e'
          : '#d1d5db'
        : darkMode
        ? '#1f212a'
        : '#fff',
      color: darkMode ? '#fff' : '#000',
      fontSize: '0.8rem',
      '&:hover': {
        backgroundColor: darkMode ? '#50535e' : '#d1d5db',
        color: darkMode ? '#fff' : '#000',
      },
    }),
    menu: (base) => ({
      ...base,
      zIndex: 1000,
      backgroundColor: darkMode ? '#3b3e47' : '#fff',
      borderColor: darkMode ? '#808290' : '#000',
    }),
    placeholder: (base) => ({
      ...base,
      color: darkMode ? '#9CA3AF' : '#c2c2c2',
    }),
    singleValue: (base) => ({
      ...base,
      color: darkMode ? '#fff' : '#000',
    }),
    input: (base) => ({
      ...base,
      color: darkMode ? '#fff' : '#000',
    }),
  };

  return (
    <div className="dark:bg-black focus:border-blue-500">
      <AsyncSelect<OptionType>
        inputId={id}
        name={name}
        // className="cash-react-select-container w-full dark:bg-black"
        className={`cash-react-select-container w-full dark:bg-black focus:border-blue-500 ${className}`} 

        classNamePrefix="cash-react-select"
        loadOptions={loadOptions}
        onChange={onSelect}
        onMenuOpen={() => setIsSelected(true)}
        onMenuClose={() => setIsSelected(false)}
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
                {option.label_3 && (
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
        value={value}
        menuPortalTarget={document.body}
        ref={selectRef} // রেফ যোগ করুন
        // components={{ DropdownIndicator: () => null }}
      />
    </div>
  );
};

export default ProductDropdown;