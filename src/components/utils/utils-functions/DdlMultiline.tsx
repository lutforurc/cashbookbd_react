import React from 'react';
import { useDispatch } from 'react-redux';
import AsyncSelect from 'react-select/async';
import { getCoal4DdlNext } from '../../modules/chartofaccounts/levelfour/coal4DdlSlicer';
import type { AccountTypeFilter } from '../../modules/chartofaccounts/levelfour/coal4DdlSlicer';
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
  acType?: AccountTypeFilter;
  defaultValue?: { value: any; label: any } | null;
  value?: { value: any; label: any } | null;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  actionOptionLabel?: string;
  onActionSelect?: (inputValue: string) => void;
  /**
   * Where the options come from, for a screen that may not offer the whole
   * chart. Project Expense, for one, may only spend against expense accounts,
   * and that narrowing belongs to the endpoint that knows the rule -- not to
   * this dropdown. Left unset, the chart-wide search below is used.
   */
  fetchOptions?: (inputValue: string) => Promise<OptionType[]>;
  /** Characters before a search is made. Defaults to 3, or 0 with fetchOptions. */
  minChars?: number;
  /** Fill the menu before anything is typed. Only worth it on a short list. */
  defaultOptions?: boolean;
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
  fetchOptions,
  minChars,
  defaultOptions,
}) => {
  const [isSelected, setIsSelected] = React.useState(false);
  const [isControlFocused, setIsControlFocused] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [internalSelectedOption, setInternalSelectedOption] = React.useState<OptionType | null>(
    value ?? defaultValue ?? null,
  );
  const [darkMode, setDarkMode] = React.useState(() =>
    document.documentElement.classList.contains('dark')
  );
  const dispatch = useDispatch();

  const controlHeight = getControlHeightFromClassName(className);

  React.useEffect(() => {
    setInternalSelectedOption(value ?? defaultValue ?? null);
  }, [value, defaultValue]);

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setDarkMode(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const minimumChars = minChars ?? (fetchOptions ? 0 : 3);

  const withActionOption = (options: OptionType[]) =>
    actionOptionLabel
      ? [...options, { value: ACTION_OPTION_VALUE, label: actionOptionLabel, isAction: true }]
      : options;

  // Load Options (Asynchronous)
  const loadOptions = async (
    inputValue: string,
    callback: (options: OptionType[]) => void,
  ) => {
    if (inputValue.length < minimumChars) {
      callback([]);
      return;
    }

    if (fetchOptions) {
      try {
        callback(withActionOption(await fetchOptions(inputValue)));
      } catch (error) {
        console.error('Error loading options:', error);
        callback([]);
      }
      return;
    }

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
      borderColor: state.isFocused || isControlFocused
        ? 'rgb(var(--c-blue-500))'
        : darkMode
          ? 'rgb(var(--c-strokedark))'
          : 'rgb(var(--c-gray-300))',
      backgroundColor: darkMode ? 'rgb(var(--c-form-input))' : 'rgb(var(--c-gray-3))',
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
      boxShadow: state.isFocused || isControlFocused ? '0 0 0 1px rgb(var(--c-blue-500))' : '',
      fontSize: '0.9rem',
      '&:hover': {
        borderColor: state.isFocused || isControlFocused
          ? 'rgb(var(--c-blue-500))'
          : darkMode
            ? 'rgb(var(--c-strokedark))'
            : 'rgb(var(--c-gray-300))',
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
        defaultOptions={defaultOptions}
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
        onFocus={() => setIsControlFocused(true)}
        onBlur={() => setIsControlFocused(false)}
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
