import React from "react";
import AsyncSelect from "react-select/async";
import useLocalStorage from "../../../hooks/useLocalStorage";
import { StylesConfig } from "react-select";

interface OptionType {
  value: string;
  label: string;
  label_2?: string;
  label_3?: string;
  label_4?: string;
  label_5?: string;
}

interface DropdownProps {
  onSelect?: (selected: OptionType | null) => void;
  defaultValue?: OptionType | null;
  value?: OptionType | null;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  data: OptionType[]; // 🔸 data is passed from parent
}

const DdlDynamicMultiline: React.FC<DropdownProps> = ({
  onSelect,
  defaultValue,
  value,
  onKeyDown,
  data = [],
}) => {
  const [isSelected, setIsSelected] = React.useState(false);

  const themeMode = useLocalStorage("color-theme", "light");
  const darkMode = themeMode[0] === "dark";

  // 🔸 Just filter from props
  const loadOptions = async (
    inputValue: string,
    callback: (options: OptionType[]) => void
  ) => {
    if (inputValue.length >= 3) {
      const filtered = data.filter((item) =>
        item.label.toLowerCase().includes(inputValue.toLowerCase())
      );
      callback(filtered);
    } else {
      callback([]);
    }
  };

  const customStyles: StylesConfig = {
    control: (provided, state) => ({
      ...provided,
      borderRadius: "0.0rem",
      borderColor: state.isFocused ? "rgb(var(--c-blue-500))" : darkMode ? "rgb(var(--c-strokedark))" : "rgb(var(--c-gray-300))",
      backgroundColor: darkMode ? "rgb(var(--c-form-input))" : "rgb(var(--c-gray-3))",
      color: darkMode ? "rgb(var(--c-white))" : "rgb(var(--c-black-2))",
      boxShadow: "none",
      fontSize: "0.9rem",
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      whiteSpace: "normal",
      backgroundColor: isFocused
        ? darkMode
          ? "rgb(var(--c-graydark))"
          : "rgb(var(--c-gray-200))"
        : isSelected
        ? darkMode
          ? "rgb(var(--c-gray-600))"
          : "rgb(var(--c-gray-300))"
        : darkMode
        ? "rgb(var(--c-form-input))"
        : "rgb(var(--c-white))",
      color: darkMode ? "rgb(var(--c-white))" : "rgb(var(--c-black-2))",
      fontSize: "0.8rem",
    }),
    menu: (base) => ({
      ...base,
      zIndex: 1000,
      backgroundColor: darkMode ? "rgb(var(--c-graydark))" : "rgb(var(--c-white))",
    }),
    placeholder: (base) => ({
      ...base,
      color: darkMode ? "rgb(var(--c-gray-400))" : "rgb(var(--c-gray-400))",
    }),
    singleValue: (base) => ({
      ...base,
      color: darkMode ? "rgb(var(--c-white))" : "rgb(var(--c-black-2))",
    }),
    input: (base) => ({
      ...base,
      color: darkMode ? "rgb(var(--c-white))" : "rgb(var(--c-black-2))",
    }),
  };

  return (
    <div className="dark:bg-black focus:border-blue-500">
      <AsyncSelect<OptionType>
        className="cash-react-select-container w-full dark:bg-black focus:border-blue-500"
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
              {option.label_4 && (
                <span className="text-gray-600 dark:text-white text-sm">
                  {" "}
                  ({option.label_4})
                </span>
              )}
            </div>
             
            {isSelected && (
              <div className="text-sm text-gray-600 dark:text-white additional-info">
                {option.label_5 && <div>C/O: {option.label_5}</div>}
                {option.label_2 && <div>{option.label_2}</div>}
                {option.label_3 && <div>{option.label_3}</div>}
              </div>
            )}
          </div>
        )}
        getOptionValue={(option) => option.value}
        placeholder="Select an account..."
        styles={customStyles}
        defaultValue={defaultValue}
        value={value}
        menuPortalTarget={document.body}
      />
    </div>
  );
};

export default DdlDynamicMultiline;
