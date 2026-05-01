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

export const formatTransportationNumber = (text: any) => {
  const s = String(text ?? "").trim();
  if (!s) return "";

  const normalized = s.replace(/\s*-\s*/g, "-").replace(/\s+/g, " ");
  const match = normalized.match(/^([A-Za-z]+)(?:[-\s]+(.+))?$/);
  if (!match) return normalized;

  const [, prefix, numberPart] = match;
  if (!numberPart) return prefix.toUpperCase();

  return `${prefix.toUpperCase()} ${numberPart}`;
};
