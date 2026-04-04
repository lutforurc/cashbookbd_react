import { useDispatch, useSelector } from 'react-redux';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { useEffect, useState } from 'react';
import {
  getPermissions,
  getRoles,
  getSelectedPermissions,
  updateRolePermissions,
} from './userManagementSlice';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { formatRoleNameForCashBook } from '../../utils/utils-functions/formatRoleName';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import { toast } from 'react-toastify';
import { FiPlus } from 'react-icons/fi';

interface Permission {
  id: number;
  name: string;
  group_name: string;
}

interface Role {
  id: number;
  name: string;
  can_edit_permissions?: boolean;
  is_plan_role?: boolean;
  role_source?: string;
}

const Roles = () => {
  const dispatch = useDispatch();
  const rolesPermissions = useSelector((state: any) => state.userManagement);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [roleId, setRoleId] = useState<number>(0);
  const [updating, setUpdating] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const rolePermissions = Array.isArray(rolesPermissions.selectedPermissions?.data?.data)
    ? rolesPermissions.selectedPermissions.data.data
    : [];
  const isCompanyBoundRoleView = roles.length === 1;
  const isReadonlyRole = selectedRole ? selectedRole.can_edit_permissions === false : isCompanyBoundRoleView;

  useEffect(() => {
    dispatch(getRoles() as any);
    dispatch(getPermissions() as any);
  }, [dispatch]);

  useEffect(() => {
    const availablePermissions = Array.isArray(rolesPermissions.permissions?.data?.data)
      ? rolesPermissions.permissions.data.data
      : [];
    
    if (isCompanyBoundRoleView) {
      const sortedPermissions = [...rolePermissions].sort((a, b) => {
        const groupCompare = (a.group_name || '').localeCompare(b.group_name || '');
        if (groupCompare !== 0) return groupCompare;
        return (a.name || '').localeCompare(b.name || '');
      });

      setPermissions(sortedPermissions);
      return;
    }

    const mergedPermissions = [...availablePermissions];
    const existingIds = new Set(mergedPermissions.map((perm: Permission) => perm.id));

    rolePermissions.forEach((perm: Permission) => {
      if (!existingIds.has(perm.id)) {
        mergedPermissions.push(perm);
        existingIds.add(perm.id);
      }
    });

    mergedPermissions.sort((a, b) => {
      const groupCompare = (a.group_name || '').localeCompare(b.group_name || '');
      if (groupCompare !== 0) return groupCompare;
      return (a.name || '').localeCompare(b.name || '');
    });

    setPermissions(mergedPermissions);
  }, [isCompanyBoundRoleView, rolePermissions, rolesPermissions.permissions?.data?.data]);

  useEffect(() => {
    const rawRoles = rolesPermissions.roles;
    const incomingRoles = Array.isArray(rawRoles?.data?.data)
      ? rawRoles.data.data
      : Array.isArray(rawRoles?.data)
        ? rawRoles.data
        : Array.isArray(rawRoles)
          ? rawRoles
          : [];

    const uniqueRoles = incomingRoles.filter((role: Role, index: number, arr: Role[]) => {
      return index === arr.findIndex((item: Role) => {
        if (item.id === role.id) return true;
        return item.name?.trim().toLowerCase() === role.name?.trim().toLowerCase();
      });
    });

    const nextRoles = uniqueRoles.filter((role) => role?.id && role?.name);
    setRoles(nextRoles);

    if (nextRoles.length === 1) {
      setRoleId(nextRoles[0].id);
      setSelectedRole(nextRoles[0]);
    } else if (!selectedRole && nextRoles.length > 0) {
      setRoleId(nextRoles[0].id);
      setSelectedRole(nextRoles[0]);
    }
  }, [rolesPermissions.roles, selectedRole]);

  useEffect(() => {
    if (!selectedRole) return;

    dispatch(getSelectedPermissions(selectedRole.id) as any);
  }, [dispatch, selectedRole]);

  useEffect(() => {
    if (rolesPermissions.selectedPermissions?.data?.data) {
      setSelectedPermissions(
        rolesPermissions.selectedPermissions.data.data.map((p: any) => p.name)
      );
    }
  }, [rolesPermissions.selectedPermissions?.data?.data]);

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRoleId = parseInt(event.target.value);
    setRoleId(nextRoleId);
    const role = roles.find((r) => r.id === nextRoleId);
    setSelectedRole(role || null);
  };

  const handlePermissionChange = (permName: string) => {
    if (isReadonlyRole) return;
    setSelectedPermissions((prev) =>
      prev.includes(permName)
        ? prev.filter((p) => p !== permName)
        : [...prev, permName]
    );
  };

  const groupedPermissions: Record<string, Permission[]> = permissions.reduce(
    (acc: Record<string, Permission[]>, perm) => {
      if (!acc[perm.group_name]) {
        acc[perm.group_name] = [];
      }
      acc[perm.group_name].push(perm);
      return acc;
    },
    {}
  );

  const allPermissionNames = permissions.map((perm) => perm.name);
  const isAllSelected =
    allPermissionNames.length > 0 &&
    allPermissionNames.every((name) => selectedPermissions.includes(name));

  const handleRootToggle = (checked: boolean) => {
    if (isReadonlyRole) return;
    setSelectedPermissions(checked ? allPermissionNames : []);
  };

  const handleUpdatePermissions = async () => {
    if (updating) return;
    if (!selectedRole) return toast.info('No role selected');
    if (isReadonlyRole) return toast.info('Plan role permissions cannot be changed. Only company custom roles are editable.');
    if (selectedPermissions.length === 0) return toast.info('No permissions selected');

    setUpdating(true);
    try {
      await dispatch(updateRolePermissions({ roleId, selectedPermissions }) as any).unwrap();
      toast.success(rolesPermissions?.updatePermission?.message || 'Permissions updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update permissions');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <HelmetTitle title="Role List" />

      <div className="flex justify-end mb-1 gap-2">
        {!isReadonlyRole && (
          <ButtonLoading className="p-2 w-30" icon="" onClick={handleUpdatePermissions} buttonLoading={updating} label="Update" />
        )}
        {!isCompanyBoundRoleView && (
          <ButtonLoading className="p-2 w-40" icon={<FiPlus size={16} className="mr-2" />} onClick={() => {}} buttonLoading={addingRole} label="Add Role" />
        )}
      </div>

      <div className="overflow-y-auto">
        <DropdownCommon
          className="h-10 px-2"
          name="name"
          onChange={handleRoleChange}
          label="Roles"
          data={roles}
          value={roleId ? String(roleId) : undefined}
        />
      </div>

      <div className="text-sm mt-6">
        <div className="mb-4 flex items-center justify-between border-b pb-2 border-gray-300 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Permissions
          </h2>
          {!isReadonlyRole && (
            <ToggleSwitch
              label="All"
              checked={isAllSelected}
              onChange={handleRootToggle}
            />
          )}
        </div>

        {isReadonlyRole && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            {selectedRole?.is_plan_role
              ? 'This is a plan role. Its permissions are fixed and cannot be changed here.'
              : 'Only company Owner-created custom roles are editable here.'}
          </div>
        )}

        {Object.keys(groupedPermissions).map((group) => {
          const perms = groupedPermissions[group];
          const allSelectedInGroup = perms.every((perm) =>
            selectedPermissions.includes(perm.name)
          );

          const handleGroupToggle = (checked: boolean) => {
            const namesInGroup = perms.map((perm) => perm.name);
            setSelectedPermissions((prev) =>
              checked
                ? Array.from(new Set([...prev, ...namesInGroup]))
                : prev.filter((p) => !namesInGroup.includes(p))
            );
          };

          return (
            <div
              key={group}
              className="mb-5 p-4 rounded-xl border shadow-sm bg-white dark:bg-gray-800 dark:border-gray-600"
            >
              <div className="flex items-center justify-between mb-3 border-b pb-2 border-gray-300 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {group}
                </h3>
                {!isReadonlyRole && (
                  <ToggleSwitch
                    label="All"
                    checked={allSelectedInGroup}
                    onChange={handleGroupToggle}
                  />
                )}
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {perms.map((perm) => (
                  <ToggleSwitch
                    key={perm.id}
                    label={formatRoleNameForCashBook(perm.name)}
                    checked={selectedPermissions.includes(perm.name)}
                    disabled={isReadonlyRole}
                    preserveCheckedColorWhenDisabled
                    onChange={() => handlePermissionChange(perm.name)}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Roles;
