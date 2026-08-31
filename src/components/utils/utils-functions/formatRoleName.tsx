export const formatRoleName = (roleName: any) => {
  return roleName.split(".")[0].replace(/^./, (char: string) => char.toUpperCase());
};



// export const formatRoleNameForCashBook = (roleName:any) => {
//   const parts = roleName.split('.');
//   const lastPart = parts[parts.length - 1];
//   return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
// };
export const formatRoleNameForCashBook = (roleName: any) => {
  return roleName
    .split('.')                 // ['ledger', 'create', 'view']
    .map(
      (part: string) =>
        part.charAt(0).toUpperCase() + part.slice(1)
    )                            // ['Ledger', 'Create', 'View']
    .join(' ');                  // 'Ledger Create View'
};

export const firstCharacterUppercase = (roleName: any) => {
  return roleName.split(".")[0].replace(/^./, (char: string) => char.toUpperCase());
};

export const firstLetterCapitalize = (text: any) => {
  const s = String(text ?? "").trim();
  if (!s) return "";
  return s
    .toLowerCase()
    .split(/\s+/)
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
};
export const UpperCase = (text: any) => {
  const s = String(text ?? "").trim();
  if (!s) return "";
  return s.toUpperCase();
};

/**
 * A vehicle or truck number, tidied for display.
 *
 * ⚠️ ALWAYS UPPER CASE, on every path out.
 *
 * A plate is upper case on the plate, and a column where one row reads
 * "dmt-13-1641" among a list of "DMT-11-7226" reads as a different vehicle
 * rather than the same one typed in a hurry. These numbers are compared by eye
 * down a column -- that is why they are in the report at all -- and a case
 * difference breaks the comparison.
 *
 * It used to raise only the letters before the first separator, and returned
 * anything the pattern did not match exactly as typed. Three callers had
 * already worked around that on their own -- twice with a CSS "uppercase"
 * class, once with a trailing .toUpperCase() -- and the callers that had not
 * were printing whatever the keyboard sent. A formatter that leaves each caller
 * to finish the job is not doing the job.
 */
export const formatTransportationNumber = (text: any) => {
  const s = String(text ?? "").trim();
  if (!s) return "";

  const normalized = s.replace(/\s*-\s*/g, "-").replace(/\s+/g, " ");
  const match = normalized.match(/^([A-Za-z]+)(?:[-\s]+(.+))?$/);

  // Not shaped like "letters, then the rest" -- a number written in Bengali, or
  // one whose prefix carries a digit like B31. Still raised: the shape decides
  // the spacing, never whether the thing comes out in capitals.
  if (!match) return normalized.toUpperCase();

  const [, prefix, numberPart] = match;
  if (!numberPart) return prefix.toUpperCase();

  return `${prefix} ${numberPart}`.toUpperCase();
};
