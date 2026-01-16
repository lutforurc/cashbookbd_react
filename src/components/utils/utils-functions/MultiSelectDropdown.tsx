import Select, {
  StylesConfig,
  components,
  OptionProps,
  ValueContainerProps,
} from 'react-select';
import useLocalStorage from '../../../hooks/useLocalStorage';

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
const CustomValueContainer = (
  props: ValueContainerProps<Option, true>
) => {
  const selected = props.getValue();

  let displayText = 'Select salary level';

  if (selected.length === 1) {
    displayText = '1 level selected';
  } else if (selected.length > 1) {
    displayText = `${selected.length} levels selected`;
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
}: Props) => {
  const themeMode = useLocalStorage('color-theme', 'light');
  const darkMode = themeMode[0] === 'dark';

  const styles: StylesConfig<Option, true> = {
    /* ===== Control ===== */
    control: (base, state) => ({
      ...base,
      display: 'flex',
      alignItems: 'center',
      minHeight: '2.3rem',
      height: '2.3rem',
      borderRadius: '0.125rem',
      borderColor: state.isFocused
        ? 'rgb(59 130 246)'
        : darkMode
        ? '#4b5563'
        : '#d1d5db',
      backgroundColor: darkMode ? '#1f2937' : '#fff',
      boxShadow: 'none',
      fontSize: '0.875rem',
    }),

    /* ===== Value Container ===== */
    valueContainer: (base) => ({
  ...base,
  height: '2.3rem',
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
      color: darkMode ? '#9ca3af' : '#6b7280',
      margin: 0,
    }),

    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      color: darkMode ? '#fff' : '#111827',
    }),

    menu: (base) => ({
      ...base,
      backgroundColor: darkMode ? '#1f2937' : '#fff',
      zIndex: 50,
    }),

    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isFocused
        ? darkMode
          ? '#374151'
          : '#e5e7eb'
        : isSelected
        ? darkMode
          ? '#4b5563'
          : '#d1d5db'
        : 'transparent',
      color: darkMode ? '#e5e7eb' : '#111827',
      fontSize: '0.875rem',
    }),
  };

  return (
    <Select
      isMulti
      options={options}
      value={value}
      onChange={(selected) => onChange(selected as Option[])}
      placeholder={placeholder}
      styles={styles}
      className={className}
      classNamePrefix="react-select"
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      components={{
        Option: CustomOption,
        ValueContainer: CustomValueContainer,
      }}
    />
  );
};

export default MultiSelectDropdown;
