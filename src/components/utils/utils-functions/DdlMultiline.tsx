import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncSelect from 'react-select/async';
import { getCoal4DdlNext } from '../../modules/chartofaccounts/levelfour/coal4DdlSlicer';
import type { AccountTypeFilter } from '../../modules/chartofaccounts/levelfour/coal4DdlSlicer';
import { settingOn } from '../userFeatureSettings';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { StylesConfig } from 'react-select';
import { FIELD_HEIGHT_REM, withFieldHeight } from '../../../theme/fieldStyles';
import { nomineeRelationType } from '../fields/DataConstant';
import { useLanguage } from '../../../i18n/useLanguage';
import { displayName } from '../../../i18n/displayName';

interface OptionType {
  value: string;
  label: string;
  name_local?: string;
  label_2?: string;
  label_3?: string;
  label_4?: string;
  label_5?: string;
  /** What label_5 is to the party: 'father', 'husband'... Blank reads as Father. */
  relation?: string;
  isAction?: boolean;
}

/** The relation word as the customer form offers it, so 'husband' prints Husband. */
const relationLabel = (relation?: string) => {
  const key = (relation || '').trim().toLowerCase();

  return nomineeRelationType.find((r) => r.id === key)?.name || 'Father';
};

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
  /**
   * Locked, because something else decides the answer -- an order that already
   * names its party, for one. The control is styled to look locked as well as
   * behave locked: a box that ignores a click while looking ordinary reads as
   * broken, and gets reported as a bug.
   */
  isDisabled?: boolean;
  /**
   * Whether Branch Setup's Customer / Supplier Dropdown settings apply to this
   * box. Left unset it follows `acType`: '3' is what every party picker on the
   * invoice screens passes, while the chart-of-accounts pickers -- ledger,
   * journal, cash -- pass '' and must keep showing everything the chart has. A
   * call site that fits neither can say so outright.
   */
  applyBranchSettings?: boolean;
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
  isDisabled,
  applyBranchSettings,
}) => {
  const [isControlFocused, setIsControlFocused] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [internalSelectedOption, setInternalSelectedOption] = React.useState<OptionType | null>(
    value ?? defaultValue ?? null,
  );
  const [darkMode, setDarkMode] = React.useState(() =>
    document.documentElement.classList.contains('dark')
  );
  const dispatch = useDispatch();
  const { code, localCode } = useLanguage();
  /**
   * The Bangla name by value. The screens keep only the id and the English name
   * of the party they picked, so this is what puts the name the list already
   * answered with back on the `{value, label}` they hand over -- otherwise the
   * picked box loses its Bangla line the moment it is filled.
   */
  const localByValue = React.useRef<Record<string, string>>({});

  // Branch Setup -> Customer / Supplier Dropdown: how many lines each party
  // takes in this box, and which of them the branch wants shown.
  const settings = useSelector((state: any) => state.settings);
  const branchSettings = settings?.data?.branch;
  const partyBox = applyBranchSettings ?? String(acType) === '3';
  const singleLine = partyBox && branchSettings?.party_ddl_lines === 'single';

  /**
   * One of those switches, as the server settled it.
   *
   * These read the opposite way round to most branch switches: all four have to
   * be ON for a branch that has never been asked, and that is what
   * getBranchEdit() answers. The `undefined` arm is the moment before settings
   * arrive -- reading unset as off there would blank every line on a page that
   * is a tick away from drawing them. A box that is not a party picker answers
   * on for all four, so the ledger and journal lists are left as they were.
   */
  const ddlOn = (key: string) => {
    if (!partyBox) return true;

    const value = branchSettings?.[key];

    return value === undefined ? true : settingOn(value);
  };

  /** The party's own code, when it has one and the branch wants it shown. */
  const partyCode = (option: OptionType) =>
    ddlOn('party_ddl_show_code') && option.label_4 && Number(option.label_4) > 0
      ? option.label_4
      : '';

  /**
   * The row's Bangla name beside its English one on an English screen.
   *
   * Only where the company has its local language on AND this row has a name
   * in it -- no local name draws nothing. A Bangla screen already reads the
   * local name from displayName(), so it is not repeated there.
   */
  const localNameOf = (option: OptionType) => {
    const local = (option.name_local || '').trim();

    return code === 'en' && localCode && local ? local : '';
  };

  /** Keeps the Bangla name the list answered with, by value. */
  const rememberLocalNames = (options: OptionType[]) =>
    options.forEach((option) => {
      if (option.name_local) {
        localByValue.current[String(option.value)] = String(option.name_local);
      }
    });

  /** The screen's own `{value, label}`, with the Bangla name put back on it. */
  const withLocalName = (option: OptionType | null | undefined): OptionType | null | undefined => {
    if (!option || option.name_local || !option.value) {
      return option;
    }

    const local = localByValue.current[String(option.value)];

    return local ? { ...option, name_local: local } : option;
  };

  /**
   * The lines the branch wants under a party's name, in the order the owner
   * reads them: father, then mobile, then address. One list for both modes:
   * Multi Line stacks them under the name, Single Line packs them onto the
   * name's own line.
   *
   * A line drops out when its switch is off, and when the party has nothing for
   * it -- which is why a bare ledger head, with no mobile and no father's name,
   * still keeps its own line.
   */
  const partyDetails = (option: OptionType) =>
    [
      {
        setting: 'party_ddl_show_father',
        label: relationLabel(option.relation),
        value: (option.label_5 || '').trim() === '0' ? '' : (option.label_5 || '').trim(),
      },
      {
        setting: 'party_ddl_show_mobile',
        label: 'Mobile',
        value: (option.label_2 || '').trim().length > 5 ? option.label_2!.trim() : '',
      },
      // Trimmed like the two above, because the chart half of the picker sends
      // a single space in every one of these columns as a UNION placeholder --
      // and a space is truthy, so an untrimmed address printed the word
      // "Address:" with nothing after it on every ledger head.
      { setting: 'party_ddl_show_address', label: 'Address', value: (option.label_3 || '').trim() },
    ].filter((field) => ddlOn(field.setting) && field.value);

  // The shared height unless the caller asks for another. It used to fall back
  // to 2.1rem of its own, which is how this dropdown ended up shorter than the
  // box beside it once the screens stopped stating a height.
  const controlHeight = getControlHeightFromClassName(className) || FIELD_HEIGHT_REM;

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
        const options = withActionOption(await fetchOptions(inputValue));
        rememberLocalNames(options);
        callback(options);
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
              name_local: item.name_local,
              label_2: item.label_2,
              label_3: item.label_3,
              label_4: item.label_4,
              label_5: item.label_5,
              relation: item.relation,
            }),
          );
          if (actionOptionLabel) {
            formattedOptions.push({
              value: ACTION_OPTION_VALUE,
              label: actionOptionLabel,
              isAction: true,
            });
          }
          rememberLocalNames(formattedOptions);
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
      borderColor: state.isFocused || isControlFocused
        ? 'rgb(var(--c-blue-500))'
        : darkMode
          ? 'rgb(var(--c-strokedark))'
          : 'rgb(var(--c-gray-300))',
      backgroundColor: isDisabled
        ? (darkMode ? 'rgb(var(--c-graydark))' : 'rgb(var(--c-gray-200))')
        : (darkMode ? 'rgb(var(--c-form-input))' : 'rgb(var(--c-gray-3))'),
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
      boxShadow: state.isFocused || isControlFocused ? '0 0 0 1px rgb(var(--c-blue-500))' : '',
      fontSize: '0.9rem',
      // The cursor is what tells a mouse user the box is not theirs to change
      // before they click it; the shade alone is easy to read as a theme.
      cursor: isDisabled ? 'not-allowed' : 'default',
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
        isDisabled={isDisabled}
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
        onFocus={() => setIsControlFocused(true)}
        onBlur={() => setIsControlFocused(false)}
        onKeyDown={onKeyDown}
        getOptionLabel={(option) => displayName({ name: option.label, name_local: option.name_local }, 'name', code)}
        formatOptionLabel={(option, { context }) => {
          const optionLabel = displayName(
            { name: option.label, name_local: option.name_local },
            'name',
            code,
          );
          // The Bangla name beside the English one -- only where the company
          // has its local language on and this row carries a name in it.
          const localName = localNameOf(option);
          const partyCodeValue = partyCode(option);

          // The picked value is one control high; the Bangla name rides on the
          // same line rather than stacking a second one into the box.
          if (context === 'value') {
            return (
              <div className="text-sm text-gray-900 dark:text-[rgb(var(--c-text))]">
                {optionLabel}
                {localName && (
                  <span lang={localCode || undefined} className="text-gray-600 dark:text-[rgb(var(--c-text))]">
                    {' — '}
                    {localName}
                  </span>
                )}
                {partyCodeValue && (
                  <span className="text-gray-600 dark:text-[rgb(var(--c-text))] text-sm">
                    {' '}({partyCodeValue})
                  </span>
                )}
              </div>
            );
          }

          // Single Line spends the party's one line on everything the branch
          // asked for, so it is drawn on its own: the markup below puts a colour
          // on the code and cannot be packed into a string.
          if (singleLine) {
            const head = partyCodeValue ? `${optionLabel} (${partyCodeValue})` : optionLabel;

            return (
              <div className="text-sm text-gray-900 dark:text-[rgb(var(--c-text))]">
                {option.isAction
                  ? head
                  : [
                      head,
                      ...(localName ? [localName] : []),
                      ...partyDetails(option).map((field) => `${field.label}: ${field.value}`),
                    ].join(', ')}
              </div>
            );
          }

          return (
            <div>
              <div className="text-sm text-gray-900 dark:text-[rgb(var(--c-text))] focus:border-blue-500">
                {optionLabel}
                {option.isAction ? null : (
                  <>
                    {partyCodeValue && (
                      <span className="text-gray-600 dark:text-[rgb(var(--c-text))] text-sm">
                        {' '}({partyCodeValue})
                      </span>
                    )}
                  </>
                )}
              </div>
              {!option.isAction && (localName || partyDetails(option).length > 0) && (
                <div className="additional-info">
                  {/* Labelled, unlike the product box: a party's address and its
                    father's name are both bare words, and three unlabelled lines
                    under a name say nothing about which is which. */}
                  {localName && (
                    <div lang={localCode || undefined} className="text-gray-600 dark:text-[rgb(var(--c-text))] text-sm">
                      {localName}
                    </div>
                  )}
                  {partyDetails(option).map((field) => (
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
        placeholder={placeholder || 'Select an account'}
        styles={withFieldHeight(customStyles, controlHeight)}
        defaultValue={withLocalName(defaultValue) ?? null}
        value={withLocalName(value ?? internalSelectedOption) ?? null}
        menuPortalTarget={document.body} // Fix Dropdown Render Issue
      />
    </div>
  );
};

export default DdlMultiline;
