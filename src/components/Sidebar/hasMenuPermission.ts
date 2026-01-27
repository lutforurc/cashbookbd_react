// src/utils/hasMenuPermission.ts

import { MENU_PERMISSIONS } from './menuPermissions';

type Permission = string | { name: string };

export const hasMenuPermission = (
  permissions: Permission[] | undefined | null,
  menuKey: keyof typeof MENU_PERMISSIONS
): boolean => {
  if (!Array.isArray(permissions)) return false;

  const menuPermissions = MENU_PERMISSIONS[menuKey];
  if (!menuPermissions || menuPermissions.length === 0) return false;

  const permissionNames = permissions.map((p) =>
    typeof p === 'string' ? p : p.name
  );

  return menuPermissions.some((mp) => permissionNames.includes(mp));
};
