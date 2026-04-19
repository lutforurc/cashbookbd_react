// Common formatter: enum-like string -> Human readable Title Case
export const humanizeEnumText = (value?: string | null): string => {
  if (!value) return "-";

  return value
    .trim()
    .replace(/[_-]+/g, " ")       // underscore/hyphen => space
    .replace(/\s+/g, " ")         // multiple spaces => single space
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase()); // title case
};