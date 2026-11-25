import React, { useMemo } from "react";
import DropdownCommon from "../utils-functions/DropdownCommon";
import { useLanguage } from "../../../i18n/useLanguage";
import { toLocalMonth } from "../../../i18n/mapper";
import { rl } from "../../../i18n/reportLabel";

interface Props {
  name: string;
  id?: string;
  label?: string;
  className?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

const getLast12MonthsData = () => {
  const months: { id: string; name: string }[] = [];
  const now = new Date();

  for (let i = 0; i < 13; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + 1 - i, 2);

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    months.push({
      id: `${month}-${year}`,
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

const MonthDropdown: React.FC<Props> = ({
  id,
  name,
  label,
  className,
  value,
  defaultValue = "",
  onChange,
}) => {
  const { code: languageCode } = useLanguage();
  // On a Bangla screen the months read "অক্টোবর ২০২৬" from the shared month
  // mapper, year digits included; the id stays "10-2026", so the value sent is
  // the same either way.
  const monthData = useMemo(
    () => [
      { id: "", name: rl("Select Month") },
      ...getLast12MonthsData().map((month) => ({
        ...month,
        name: languageCode !== "en" ? toLocalMonth(month.name, languageCode) : month.name,
      })),
    ],
    [languageCode]
  );

  return (
    <DropdownCommon
      id={id}
      name={name}
      label={label}
      className={className}
      value={value}
      data={monthData}
      defaultValue={defaultValue}
      onChange={onChange}
    />
  );
};

export default MonthDropdown;
