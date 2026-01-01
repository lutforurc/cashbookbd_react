import React, { useMemo } from "react";
import DropdownCommon from "../utils-functions/DropdownCommon";

interface Props {
  name: string;
  id?: string;
  label?: string;
  className?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

/* ===== Helper ===== */
const getLast12MonthsData = () => {
  const months: { id: string; name: string }[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    months.push({
      id: `${month}-${year}`, // MM-YYYY
      name: date
        .toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        })
        .replace(" ", "-"),
    });
  }

  return months;
};

/* ===== Component ===== */

const MonthDropdown: React.FC<Props> = ({
  id,
  name,
  label,
  className,
  defaultValue = "", // ✅ empty by default
  onChange,
}) => {
  const monthData = useMemo(() => {
    return [
      { id: "", name: "Select Month" }, // ✅ empty option
      ...getLast12MonthsData(),
    ];
  }, []);

  return (
    <DropdownCommon
      id={id}
      name={name}
      label={label}
      className={className}
      data={monthData}
      defaultValue={defaultValue}
      onChange={onChange}
    />
  );
};

export default MonthDropdown;


