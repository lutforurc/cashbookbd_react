export const formatRoleName = (roleName:any) => {
    return roleName.split(".")[0].replace(/^./, (char:string) => char.toUpperCase());
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

  export const firstCharacterUppercase = (roleName:any) => {
    return roleName.split(".")[0].replace(/^./, (char:string) => char.toUpperCase());
  };
