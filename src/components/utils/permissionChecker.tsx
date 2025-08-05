interface Permission {
  id: number;
  name: string;
  group_name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
}

// Function to check if a permission exists
export const hasPermission = (permissions: Permission[] = [], permissionToCheck: string): boolean => {
  if (!Array.isArray(permissions)) { 
    return false;
  }
  return permissions.some((permission) => permission.name === permissionToCheck);
};