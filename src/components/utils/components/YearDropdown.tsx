import React, { useMemo } from "react";
import DropdownCommon from "../utils-functions/DropdownCommon";

interface Props {
  name: string;
  id?: string;
  label?: string;
  className?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

/* ===== Helper: Generate years from current year down to 10 years back ===== */
const getYearOptions = () => {
  const currentYear = new Date().getFullYear(); // আজকের বছর (2026 হলে 2026)
  const startYear = currentYear - 1; 

  const years: { id: string; name: string }[] = [];

  for (let year = currentYear; year >= startYear; year--) {
    years.push({
      id: year.toString(),
      name: year.toString(),
    });
  }

  return years;
};

/* ===== YearDropdown Component ===== */
const YearDropdown: React.FC<Props> = ({
  id,
  name,
  label,
  className,
  value,
  defaultValue = "",
  onChange,
}) => {
  const yearData = useMemo(() => {
    return [
      { id: "", name: "Select Year" }, // প্রথমে খালি অপশন
      ...getYearOptions(),
    ];
  }, []);

  return (
    <DropdownCommon
      id={id ?? name}
      name={name}
      label={label}
      className={className}
      value={value}
      data={yearData}
      defaultValue={defaultValue}
      onChange={onChange}
    />
  );
};

export default YearDropdown;
