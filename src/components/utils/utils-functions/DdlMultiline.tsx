import React from 'react';
import { useDispatch } from 'react-redux';
import AsyncSelect from 'react-select/async';
import { getCoal4DdlNext } from '../../modules/chartofaccounts/levelfour/coal4DdlSlicer';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { StylesConfig } from 'react-select';

interface OptionType {
  value: string;
  label: string;
  label_2?: string;
  label_3?: string;
  label_4?: string;
  label_5?: string;
  isAction?: boolean;
}

interface DropdownProps {
  id?: string;
  name?: string;
  onSelect?: (selected: OptionType | null) => void;
  acType?: string;
  defaultValue?: { value: any; label: any } | null;
  value?: { value: any; label: any } | null;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  actionOptionLabel?: string;
  onActionSelect?: (inputValue: string) => void;
}

const ACTION_OPTION_VALUE = '__ddl_multiline_action__';

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

const DdlMultiline: React.FC<DropdownProps> = ({
  id,
  name,
  onSelect,
  acType = '',
  defaultValue,
  value,
  onKeyDown,
  className,
  placeholder,
  actionOptionLabel,
  onActionSelect,
}) => {
  const [isSelected, setIsSelected] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [internalSelectedOption, setInternalSelectedOption] = React.useState<OptionType | null>(
    value ?? defaultValue ?? null,
  );
  const dispatch = useDispatch();

  const themeMode = useLocalStorage('color-theme', 'light');
  const darkMode = themeMode[0] === 'dark';
  const controlHeight = getControlHeightFromClassName(className);

  React.useEffect(() => {
    setInternalSelectedOption(value ?? defaultValue ?? null);
  }, [value, defaultValue]);

  // Load Options (Asynchronous)
  const loadOptions = async (
    inputValue: string,
    callback: (options: OptionType[]) => void,
  ) => {
    if (inputValue.length >= 3) {
      try {
        const response: any = await dispatch(getCoal4DdlNext(inputValue, acType),
        );

        if (Array.isArray(response.payload)) {
          const formattedOptions: OptionType[] = response.payload.map(
            (item: any) => ({
              value: item?.value?.toString?.() || '',
              label: item.label,
              label_2: item.label_2,
              label_3: item.label_3,
              label_4: item.label_4,
              label_5: item.label_5,
            }),
          );
          if (actionOptionLabel) {
            formattedOptions.push({
              value: ACTION_OPTION_VALUE,
              label: actionOptionLabel,
              isAction: true,
            });
          }
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
      borderColor: state.isFocused
        ? 'rgb(59 130 246)'
        : darkMode
          ? '#363843'
          : '#d2d6dc',
      backgroundColor: darkMode ? '#1f212a' : '#fcfcfc',
      color: darkMode ? '#fff' : '#000',
      boxShadow: state.isFocused ? 'none' : '',
      fontSize: '0.9rem',
      '&:hover': {
        borderColor: state.isFocused
          ? 'rgb(59 130 246)'
          : darkMode
            ? '#363843'
            : '#d2d6dc',
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
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    placeholder: (base) => ({
      ...base,
      color: darkMode ? '#9CA3AF' : '#c2c2c2',
      marginTop: 0,
      marginBottom: 0,
      lineHeight: controlHeight,
    }),
    singleValue: (base) => ({
      ...base,
      color: darkMode ? '#fff' : '#000',
      marginTop: 0,
      marginBottom: 0,
      lineHeight: controlHeight,
    }),
    input: (base) => ({
      ...base,
      color: darkMode ? '#fff' : '#000',
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
          if (selected?.isAction) {
            onActionSelect?.(inputValue.trim());
            return;
          }
          setInternalSelectedOption(selected || null);
          onSelect?.(selected);
        }}
        onInputChange={(nextValue, meta) => {
          if (meta.action === 'input-change') {
            setInputValue(nextValue);
          }
          if (meta.action === 'set-value' || meta.action === 'input-blur' || meta.action === 'menu-close') {
            return nextValue;
          }
          return nextValue;
        }}
        onMenuOpen={() => setIsSelected(true)}
        onMenuClose={() => setIsSelected(false)}
        onKeyDown={onKeyDown}
        getOptionLabel={(option) => option.label}
        formatOptionLabel={(option) => (
          <div>
            <div className="text-sm text-gray-900 dark:text-white focus:border-blue-500">
              {option.label}
              {option.isAction ? null : (
                <>
              {option?.label_4 && Number(option.label_4) > 0 && (
                <span className="text-gray-600 dark:text-white text-sm">
                  {' '}({option.label_4})
                </span>
              )}
                </>
              )}
            </div>
            {isSelected && !option.isAction && (
              <div className="additional-info">
                {option.label_5 && (
                  <div className="text-gray-600 dark:text-white text-sm">
                    {option.label_5 &&
                      option.label_5.trim() !== '' &&
                      option.label_5.trim() !== '0' && (
                        // <>C/O: {option.label_5.trim()}</>
                        <>{option.label_5.trim()}</>
                      )}
                  </div>
                )}
                {option.label_2 && option.label_2.trim().length > 5 && (
                  <div className="text-gray-600 dark:text-white text-sm">
                    {option.label_2.trim()}
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
        value={value ?? internalSelectedOption}
        menuPortalTarget={document.body} // Fix Dropdown Render Issue
      />
    </div>
  );
};

export default DdlMultiline;
