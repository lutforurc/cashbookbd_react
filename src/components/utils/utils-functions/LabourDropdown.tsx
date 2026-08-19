import React from 'react';
import { useDispatch } from 'react-redux';
import AsyncSelect from 'react-select/async';
import { getDdlProduct } from '../../modules/product/productSlice';
import { StylesConfig } from 'react-select';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { getDdlLabourItem } from '../../modules/labour-item/labourItemSlice';
import { FIELD_HEIGHT_REM, withFieldHeight } from '../../../theme/fieldStyles';

interface OptionType {
  value: string;
  label: string;
  label_2?: string;
  label_3?: string;
  label_4?: string;
}

interface DropdownProps {
  id?: string;
  name?: string;
  onSelect: (selected: OptionType | null) => void;
  defaultValue?: { value: any; label: any } | null;
  value: { value: any; label: any } | null;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string; // Added className prop for custom styling
}

const LabourDropdown: React.FC<DropdownProps> = ({
  id,
  name,
  onSelect,
  defaultValue,
  value,
  onKeyDown,
  className,
}) => {
  const [isSelected, setIsSelected] = React.useState(false);
  const dispatch = useDispatch();

  const themeMode = useLocalStorage('color-theme', 'light');
  const darkMode = themeMode[0] === 'dark';

  // Load options function
  const loadOptions = async (
    inputValue: string,
    callback: (options: OptionType[]) => void,
  ) => {
    if (inputValue.length >= 3) {
      try {
        const response: any = await dispatch(getDdlLabourItem(inputValue));
        if (Array.isArray(response.payload)) {
          const formattedOptions: OptionType[] = response.payload.map(
            (item: any) => ({
              value: item.value,
              label: item.label,
              label_2: item.label_2,
              label_3: item.label_3,
              label_4: item.label_4,
            }),
          );
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

  // Custom styles (Same as DdlMultiline)
  const customStyles: StylesConfig = {
    control: (provided, state) => ({
      ...provided,
      // The height every field in the app stands at. react-select draws
      // its own control, so it takes the number rather than the class.
      minHeight: FIELD_HEIGHT_REM,
      borderRadius: '0',
      borderColor: state.isFocused
        ? 'rgb(var(--c-blue-500))'
        : darkMode
          ? 'rgb(var(--c-strokedark))'
          : 'rgb(var(--c-gray-300))',
      backgroundColor: darkMode ? 'rgb(var(--c-form-input))' : 'rgb(var(--c-gray-3))',
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
      boxShadow: state.isFocused ? 'none' : 'none',
      fontSize: '0.9rem',
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

    placeholder: (base) => ({
      ...base,
      color: darkMode ? 'rgb(var(--c-gray-400))' : 'rgb(var(--c-gray-400))',
    }),
    singleValue: (base) => ({
      ...base,
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
    }),
    input: (base) => ({
      ...base,
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
    }),
  };

  return (
    <div className="dark:bg-black focus:border-blue-500">
      <AsyncSelect<OptionType>
        inputId={id}
        name={name}
        // className="cash-react-select-container w-full dark:bg-black focus:border-blue-500"
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
            <div className="text-sm text-gray-900 dark:text-[rgb(var(--c-text))] focus:border-blue-500">
              {option.label}
            </div>
            {isSelected && (
              <div className="additional-info">
                {option.label_2 && (
                  <div className="text-gray-600 dark:text-[rgb(var(--c-text))] text-sm">
                    Category: {option.label_2}
                  </div>
                )}
                {option.label_3 && (
                  <div className="text-gray-600 dark:text-[rgb(var(--c-text))] text-sm">
                    Unit: {option.label_3}
                  </div>
                )}
                {option.label_4 && (
                  <div className="text-gray-600 dark:text-[rgb(var(--c-text))] text-sm">
                    Unit Rate: {option.label_4}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        getOptionValue={(option) => option.value}
        placeholder="Select Labour Item"
        styles={withFieldHeight(customStyles)}
        defaultValue={defaultValue}
        value={value}
        menuPortalTarget={document.body} // Fix dropdown rendering issue
      />
    </div>
  );
};

export default LabourDropdown;
