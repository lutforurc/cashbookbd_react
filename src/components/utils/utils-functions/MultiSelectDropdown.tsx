import Select, {
  StylesConfig,
  components,
  OptionProps,
  ValueContainerProps,
} from 'react-select';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { FIELD_HEIGHT_REM } from '../../../theme/fieldStyles';

interface Option {
  value: number | string;
  label: string;
}

interface Props {
  options: Option[];
  value: Option[];
  onChange: (selected: Option[]) => void;
  placeholder?: string;
  className?: string;
  selectionLabel?: string;
  isDisabled?: boolean;
}

/* ===== Option with ✔ ===== */
const CustomOption = (props: OptionProps<Option, true>) => {
  const { isSelected, label } = props;

  return (
    <components.Option {...props}>
      <div className="flex justify-between items-center">
        <span>{label}</span>
        {isSelected && <span className="text-blue-500 font-bold">✔</span>}
      </div>
    </components.Option>
  );
};

/* ===== Value Container (COUNT TEXT) ===== */
const makeValueContainer = (placeholder: string, selectionLabel: string) =>
  function CustomValueContainer(props: ValueContainerProps<Option, true>) {
    const selected = props.getValue();

    let displayText = placeholder;

    if (selected.length === 1) {
      displayText = `1 ${selectionLabel} selected`;
    } else if (selected.length > 1) {
      displayText = `${selected.length} ${selectionLabel}s selected`;
    }

    return (
      <components.ValueContainer {...props}>
        <div className="truncate">{displayText}</div>
        {props.children[1]}
      </components.ValueContainer>
    );
  };

const MultiSelectDropdown = ({
  options,
  value,
  onChange,
  placeholder = 'Select',
  className,
  selectionLabel = 'item',
  isDisabled = false,
}: Props) => {
  const themeMode = useLocalStorage('color-theme', 'light');
  const darkMode = themeMode[0] === 'dark';

  const styles: StylesConfig<Option, true> = {
    /* ===== Control ===== */
    control: (base, state) => ({
      ...base,
      display: 'flex',
      alignItems: 'center',
      minHeight: FIELD_HEIGHT_REM,
      height: FIELD_HEIGHT_REM,
      borderRadius: '0.125rem',
      borderColor: state.isFocused
        ? 'rgb(var(--c-blue-500))'
        : darkMode
        ? 'rgb(var(--c-gray-600))'
        : 'rgb(var(--c-gray-300))',
      backgroundColor: darkMode ? 'rgb(var(--c-gray-800))' : 'rgb(var(--c-white))',
      boxShadow: 'none',
      fontSize: '0.875rem',
      cursor: 'pointer',
    }),

    /* ===== Value Container ===== */
    valueContainer: (base) => ({
  ...base,
  height: FIELD_HEIGHT_REM,
  display: 'flex',
  alignItems: 'center',
  padding: '0 8px',
  overflow: 'hidden',

  lineHeight: '1',          // ✅ ADD
  transform: 'translateY(-1px)', // ✅ ADD (perfect centering)
}),

    /* ❌ Hide chips */
    multiValue: () => ({
      display: 'none',
    }),

    /* ===== Indicators (× ▾) ===== */
    indicatorsContainer: (base) => ({
      ...base,
      height: '100%',
    }),

    clearIndicator: (base) => ({
      ...base,
      padding: '4px',
    }),

    dropdownIndicator: (base) => ({
      ...base,
      padding: '4px',
    }),

    placeholder: (base) => ({
      ...base,
      color: darkMode ? 'rgb(var(--c-gray-400))' : 'rgb(var(--c-gray-500))',
      margin: 0,
    }),

    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-gray-900))',
      cursor: 'pointer',
    }),

    menu: (base) => ({
      ...base,
      backgroundColor: darkMode ? 'rgb(var(--c-gray-800))' : 'rgb(var(--c-white))',
      zIndex: 50,
    }),

    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isFocused
        ? darkMode
          ? 'rgb(var(--c-gray-700))'
          : 'rgb(var(--c-gray-200))'
        : isSelected
        ? darkMode
          ? 'rgb(var(--c-gray-600))'
          : 'rgb(var(--c-gray-300))'
        : 'transparent',
      color: darkMode ? 'rgb(var(--c-gray-200))' : 'rgb(var(--c-gray-900))',
      fontSize: '0.875rem',

      cursor: 'pointer',
    }),
  };

  return (
    <Select
      isMulti
      options={options}
      value={value}
      onChange={(selected) => onChange(selected as Option[])}
      isDisabled={isDisabled}
      placeholder={placeholder}
      styles={styles}
      className={className}
      classNamePrefix="react-select"
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      components={{
        Option: CustomOption,
        ValueContainer: makeValueContainer(placeholder, selectionLabel),
      }}
    />
  );
};

export default MultiSelectDropdown;
