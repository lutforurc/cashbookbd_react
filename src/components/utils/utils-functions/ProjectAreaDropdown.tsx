import React from 'react';
import { useDispatch } from 'react-redux';
import AsyncSelect from 'react-select/async';
import { StylesConfig } from 'react-select';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { fetchAreaDdl } from '../../modules/real-estate/area/projectAreaSlice';

/* ================= TYPES ================= */

interface OptionType {
  value: string;
  label: string;
  label_1?: string;
  label_2?: string;
  label_3?: string;
  label_4?: string;
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

const ProjectAreaDropdown: React.FC<DropdownProps> = ({
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
      const response = await dispatch(fetchAreaDdl(inputValue)).unwrap();

      // 🔴 IMPORTANT FIX
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];

      const formattedOptions: OptionType[] = list.map((item: any) => ({
        value: item.value,
        label: item.label,
        label_2: item.label_2,
        label_3: item.label_3,
        label_4: item.label_4,
        label_5: item.label_5,
      }));

      callback(formattedOptions);
    } catch (error) {
      console.error('Error loading project areas:', error);
      callback([]);
    }
  };

  /* ================= STYLES ================= */

  const customStyles: StylesConfig<OptionType> = {
    control: (provided, state) => ({
      ...provided,
      borderRadius: '0rem',
      borderColor: state.isFocused
        ? 'rgb(59 130 246)'
        : darkMode
          ? '#363843'
          : '#d2d6dc',
      backgroundColor: darkMode ? '#1f212a' : '#fcfcfc',
      color: darkMode ? '#fff' : '#000',
      boxShadow: 'none',
      fontSize: '0.9rem',
      minHeight: '2.1rem',
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
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
      backgroundColor: darkMode ? '#3b3e47' : '#fff',
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

  /* ================= RENDER ================= */

  return (
    <div className="dark:bg-black focus:border-blue-500">
      <AsyncSelect<OptionType>
        inputId={id}
        name={name}
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
            <div className="text-sm text-gray-900 dark:text-white focus:border-blue-500">
              {option.label}
              {option?.label_4 && Number(option.label_4) > 0 && (
                <span className="text-gray-600 dark:text-white text-sm">
                  {' '}({option.label_4})
                </span>
              )}
            </div>
            {isSelected && (
              <div className="additional-info">
                {option.label_5 && (
                  <div className="text-gray-600 dark:text-white text-sm">
                    {option.label_5 &&
                      option.label_5.trim() !== '' &&
                      option.label_5.trim() !== '0' && (
                        <>C/O: {option.label_5.trim()}</>
                      )}
                  </div>
                )}
                {option.label_2 && (
                  <div className="text-gray-600 dark:text-white text-sm">
                    {option.label_2}
                  </div>
                )}
                {option.label_3 && (
                  <div className="text-gray-600 dark:text-white text-sm">
                    {option.label_3}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        getOptionValue={(option) => option.value}
        placeholder={placeholder || 'Select an account'}
        styles={customStyles}
        defaultValue={defaultValue}
        value={value}
        menuPortalTarget={document.body} // Fix Dropdown Render Issue
      />
    </div>
  );
};

export default ProjectAreaDropdown;
