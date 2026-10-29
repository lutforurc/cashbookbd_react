interface Permission {
  id: number;
  name: string;
  group_name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Function to check if a permission exists.
 *
 * ⚠️ A NAME MAY ARRIVE AS A BARE STRING OR AS A PERMISSION OBJECT. The settings
 * payload sends objects today, but this helper and hasAnyPermission() in
 * Sidebar/permissionUtils used to disagree on that -- this one read
 * `permission.name` and silently answered false for a string list. Same
 * question, two answers. Both accept either shape now.
 */
export const hasPermission = (
  permissions: (Permission | string)[] = [],
  permissionToCheck: string,
): boolean => {
  if (!Array.isArray(permissions)) {
    return false;
  }

  return permissions.some((permission) => {
    const name = typeof permission === 'string' ? permission : permission?.name;

    return name === permissionToCheck || name === '*';
  });
};
