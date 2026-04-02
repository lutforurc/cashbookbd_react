import { useDispatch, useSelector } from 'react-redux';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { useEffect, useState } from 'react';
import {
  getOwnerRoleGroup,
  getPermissions,
  getRoles,
  getSelectedPermissions,
  syncOwnerRoleGroup,
  updateOwnerRoleGroup,
  updateRolePermissions,
} from './userManagementSlice';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { formatRoleNameForCashBook } from '../../utils/utils-functions/formatRoleName';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import httpService from '../../services/httpService';
import { API_GET_SELECTED_PERMISSIONS_URL } from '../../services/apiRoutes';

interface Permission {
  id: number;
  name: string;
  group_name: string;
}

interface Role {
  id: number;
  name: string;
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
  const [syncingOwnerRoles, setSyncingOwnerRoles] = useState(false);
  const [catalogPermissions, setCatalogPermissions] = useState<Permission[]>([]);
  const isOwnerRoleSelected = selectedRole?.name?.toLowerCase() === 'owner';
  const ownerRoleGroup = rolesPermissions.ownerRoleGroup?.data;
  const rolePermissions = Array.isArray(rolesPermissions.selectedPermissions?.data?.data)
    ? rolesPermissions.selectedPermissions.data.data
    : [];
  const isCompanyBoundRoleView = !isOwnerRoleSelected && roles.length === 1;

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

    const basePermissions = catalogPermissions.length > 0 ? catalogPermissions : availablePermissions;
    const mergedPermissions = [...basePermissions];
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
  }, [catalogPermissions, isCompanyBoundRoleView, rolePermissions, rolesPermissions.permissions?.data?.data]);

  useEffect(() => {
    const ownerRole = roles.find((role) => role.name?.toLowerCase() === 'owner');
    if (!ownerRole) return;

    const loadOwnerPermissions = async () => {
      try {
        const { data } = await httpService.get(`${API_GET_SELECTED_PERMISSIONS_URL}/${ownerRole.id}`);
        const ownerPermissions = Array.isArray(data?.data?.data) ? data.data.data : [];
        if (ownerPermissions.length > 0) {
          setCatalogPermissions(ownerPermissions);
        }
      } catch {
        // keep current fallback behavior if owner permissions can't be loaded
      }
    };

    loadOwnerPermissions();
  }, [roles]);

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
    }
  }, [rolesPermissions.roles]);

  useEffect(() => {
    if (!selectedRole) return;

    if (selectedRole.name?.toLowerCase() === 'owner') {
      dispatch(getOwnerRoleGroup() as any);
      return;
    }

    dispatch(getSelectedPermissions(selectedRole.id) as any);
  }, [dispatch, selectedRole]);

  useEffect(() => {
    if (isOwnerRoleSelected && Array.isArray(ownerRoleGroup?.permissions)) {
      setSelectedPermissions(ownerRoleGroup.permissions.map((p: any) => p.name));
      return;
    }

    if (rolesPermissions.selectedPermissions?.data?.data) {
      setSelectedPermissions(
        rolesPermissions.selectedPermissions.data.data.map((p: any) => p.name)
      );
    }
  }, [isOwnerRoleSelected, ownerRoleGroup?.permissions, rolesPermissions.selectedPermissions?.data?.data]);

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRoleId = parseInt(event.target.value);
    setRoleId(nextRoleId);
    const role = roles.find((r) => r.id === nextRoleId);
    setSelectedRole(role || null);
  };

  const handlePermissionChange = (permName: string) => {
    if (isCompanyBoundRoleView) return;
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
    if (isCompanyBoundRoleView) return;
    setSelectedPermissions(checked ? allPermissionNames : []);
  };

  const handleSyncOwnerRoles = async () => {
    if (syncingOwnerRoles) return;

    setSyncingOwnerRoles(true);
    try {
      const res = await dispatch(syncOwnerRoleGroup() as any).unwrap();
      toast.success(res?.message || 'Owner role group synced successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to sync owner roles');
    } finally {
      setSyncingOwnerRoles(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (updating) return;
    if (!selectedRole) return toast.info('No role selected');
    if (isCompanyBoundRoleView) return toast.info('This company role is view only.');
    if (selectedPermissions.length === 0) return toast.info('No permissions selected');

    setUpdating(true);
    try {
      if (isOwnerRoleSelected) {
        const permissionIds = permissions
          .filter((perm) => selectedPermissions.includes(perm.name))
          .map((perm) => perm.id);

        const res = await dispatch(updateOwnerRoleGroup(permissionIds) as any).unwrap();
        toast.success(res?.message || 'Owner role group updated successfully');
      } else {
        await dispatch(updateRolePermissions({ roleId, selectedPermissions }) as any).unwrap();
        toast.success(rolesPermissions?.updatePermission?.message || 'Permissions updated successfully');
      }
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
        {!isCompanyBoundRoleView && (
          <ButtonLoading className="p-2 w-30" icon="" onClick={handleUpdatePermissions} buttonLoading={updating} label="Update" />
        )}
        {isOwnerRoleSelected && (
          <ButtonLoading
            className="p-2 w-44"
            icon={<FiRefreshCw size={16} className="mr-2" />}
            onClick={handleSyncOwnerRoles}
            buttonLoading={syncingOwnerRoles}
            label="Sync Owners"
          />
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
        />
      </div>

      <div className="text-sm mt-6">
        <div className="mb-4 flex items-center justify-between border-b pb-2 border-gray-300 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Permissions
          </h2>
          {!isCompanyBoundRoleView && (
            <ToggleSwitch
              label="All"
              checked={isAllSelected}
              onChange={handleRootToggle}
            />
          )}
        </div>

        {isOwnerRoleSelected && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
            Owner Role Group mode active. এখানে permission change করলে সব company-এর Owner role-এ sync হবে.
            {ownerRoleGroup?.owner_roles_count ? ` Managed Owner roles: ${ownerRoleGroup.owner_roles_count}.` : ''}
          </div>
        )}

        {isCompanyBoundRoleView && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            This company role is view only. Only the permissions assigned from API are shown here.
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
                {!isCompanyBoundRoleView && (
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
                    disabled={isCompanyBoundRoleView}
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
