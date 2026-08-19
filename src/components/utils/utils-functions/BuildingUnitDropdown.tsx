import React from 'react';
import { useDispatch } from 'react-redux';
import AsyncSelect from 'react-select/async';
import { StylesConfig } from 'react-select';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { unitDdl } from '../../modules/real-estate/units/unitSlice';
import { FIELD_HEIGHT_REM, withFieldHeight } from '../../../theme/fieldStyles';

/* ================= TYPES ================= */

interface OptionType {
  value: string;
  label: string;      // Unit No
  label_0?: string;   // Flat
  label_1?: string;   // Flat
  label_2?: string;   // Flat
  label_3?: string;   // Project / Area
  label_4?: string;   // Branch
  label_5?: string;
  status?: number | string;
}

interface DropdownProps {
  id?: string;
  name?: string;
  onSelect?: (selected: OptionType | null) => void;
  defaultValue?: OptionType | null;
  value?: OptionType | null;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
}

/* ================= COMPONENT ================= */

const BuildingUnitDropdown: React.FC<DropdownProps> = ({
  id,
  name,
  onSelect,
  defaultValue,
  value,
  onKeyDown,
  className,
  placeholder,
}) => {
  const dispatch = useDispatch<any>();
  const [isSelected, setIsSelected] = React.useState(false);

  const themeMode = useLocalStorage('color-theme', 'light');
  const darkMode = themeMode[0] === 'dark';

  /* ================= LOAD OPTIONS ================= */

  const loadOptions = async (
    inputValue: string,
    callback: (options: OptionType[]) => void,
  ) => {
    if (inputValue.length < 2) {
      callback([]);
      return;
    }

    try {
      // ✅ FIXED: string pass করা হচ্ছে
      const response = await dispatch(
        unitDdl(inputValue)
      ).unwrap();

      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];

      const formattedOptions: OptionType[] = list.map((item: any) => ({
        value: item.value,
        label: item.label,       // Unit No
        label_0: item.label_0,       // Unit No
        label_1: item.label_1,       // Flat
        label_2: item.label_2,   // Flat
        label_3: item.label_3,   // Area / Project
        label_4: item.label_4,   // Branch
        label_5: item.label_5,
      }));

      callback(formattedOptions);
    } catch (error) {
      console.error('Error loading units:', error);
      callback([]);
    }
  };


  /* ================= STYLES ================= */

  const customStyles: StylesConfig<OptionType> = {
    control: (provided, state) => ({
      ...provided,
      borderRadius: '0rem',
      borderColor: state.isFocused
        ? 'rgb(var(--c-blue-500))'
        : darkMode
          ? 'rgb(var(--c-strokedark))'
          : 'rgb(var(--c-gray-300))',
      backgroundColor: darkMode ? 'rgb(var(--c-form-input))' : 'rgb(var(--c-gray-3))',
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
      boxShadow: 'none',
      fontSize: '0.9rem',
      minHeight: FIELD_HEIGHT_REM,
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
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
      backgroundColor: darkMode ? 'rgb(var(--c-graydark))' : 'rgb(var(--c-white))',
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

  /* ================= RENDER ================= */

  return (
    <div className="dark:bg-black">
      <AsyncSelect<OptionType>
        inputId={id}
        name={name}
        className={`cash-react-select-container w-full ${className}`}
        classNamePrefix="cash-react-select"
        loadOptions={loadOptions}
        onChange={onSelect}
        onMenuOpen={() => setIsSelected(true)}
        onMenuClose={() => setIsSelected(false)}
        onKeyDown={onKeyDown}
        getOptionValue={(option) => option.value}
        placeholder={placeholder || 'Select Unit'}
        styles={withFieldHeight(customStyles)}
        defaultValue={defaultValue}
        value={value}
        menuPortalTarget={document.body}
        formatOptionLabel={(option, { context }) => {
          const isMenu = context === 'menu';     // dropdown list
          const isValue = context === 'value';   // selected value

          return (
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {option.label}
              </div>
              {isMenu && (
                <div className="mt-1 space-y-0.5">
                  {option.label_0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Size: {option.label_0}
                    </div>
                  )}
                  {option.label_1 && (
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Rate: {option.label_1}
                    </div>
                  )}
                  {option.label_2 && (
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Flat: {option.label_2}
                    </div>
                  )}
                  {option.label_3 && (
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Building: {option.label_3}
                    </div>
                  )}
                  {option.label_4 && (
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Branch: {option.label_4}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
};

export default BuildingUnitDropdown;
