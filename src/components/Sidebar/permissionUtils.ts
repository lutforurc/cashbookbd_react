// src/utils/permissionUtils.ts
export type Permission = string | { name: string };

export const normalizePermissions = (permissions: Permission[] | undefined | null): string[] => {
  if (!Array.isArray(permissions)) return [];
  return permissions.map((p) => (typeof p === "string" ? p : p.name));
};

export const hasAnyPermission = (
  permissions: Permission[] | undefined | null,
  requiredAnyOf: string[]
): boolean => {
  const names = normalizePermissions(permissions);
  return requiredAnyOf.some((r) => names.includes(r));
};

export const hasAllPermissions = (
  permissions: Permission[] | undefined | null,
  requiredAll: string[]
): boolean => {
  const names = normalizePermissions(permissions);
  return requiredAll.every((r) => names.includes(r));
};
