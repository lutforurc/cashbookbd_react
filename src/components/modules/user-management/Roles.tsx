import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { useEffect, useMemo, useRef, useState } from 'react';
import routes from '../../services/appRoutes';
import {
  getPermissions,
  getRoles,
  getSelectedPermissions,
  updateRolePermissions,
} from './userManagementSlice';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import CategoryDropdown from '../../utils/utils-functions/CategoryDropdown';
import { formatRoleNameForCashBook } from '../../utils/utils-functions/formatRoleName';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiPlus } from 'react-icons/fi';
import { getSettings } from '../settings/settingsSlice';

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
  subscription_plan_id?: number | null;
  role_group_code?: string | null;
  is_company_owned_role?: boolean;
  company_id?: number | null;
  team_id?: number | null;
}

const smsPermissionLabels: Record<string, string> = {
  'branch.sms.received.update': 'Received SMS',
  'branch.sms.payment.update': 'Payment SMS',
  'branch.sms.sales.update': 'Sales SMS',
  'branch.sms.purchase.update': 'Purchase SMS',
};

/**
 * Readable labels for the Inter-Branch Transfer group.
 *
 * Everything else on this screen derives its label from the permission name;
 * these read better spelled out, and they are the four controls the group is
 * meant to show. "Show on dashboard" is a permission of its own, independent
 * of View, Receive and Reverse Receipt.
 */
const permissionLabelOverrides: Record<string, string> = {
  'interbranch.transfer.view': 'View Inter-Branch Transfers',
  'interbranch.transfer.receive': 'Receive Transfer',
  'interbranch.transfer.reverse': 'Reverse Transfer',
  'inter_branch.receipt.reverse': 'Reverse Receipt',
  'interbranch.transfer.dashboard': 'Show on dashboard',
};

const Roles = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const rolesPermissions = useSelector((state: any) => state.userManagement);
  const auth = useSelector((state: any) => state.auth);
  const [roles, setRoles] = useState<Role[]>([]);
  // The themed Select wants {id, name}; the roles already carry both.
  const roleOptions = useMemo(
    () => roles.map((role) => ({ id: role.id, name: role.name })),
    [roles],
  );
  const rolesLoading = Boolean(rolesPermissions?.loading) && roles.length === 0;
  const rolesError = roles.length === 0 ? (rolesPermissions?.error || null) : null;
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  // Which role the loaded `selectedPermissions` belong to. Update reads the
  // whole set, so it must never run while this is still the previous role --
  // see handleUpdatePermissions.
  const [loadedPermissionsRoleId, setLoadedPermissionsRoleId] = useState<number | null>(null);
  // The role whose permissions are in flight. The slice does not echo the id
  // back, so this is how the arriving payload is attributed to the right role.
  const pendingRoleIdRef = useRef<number | null>(null);
  const [roleId, setRoleId] = useState<number>(0);
  const [updating, setUpdating] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const rolePermissions = Array.isArray(rolesPermissions.selectedPermissions?.data?.data)
    ? rolesPermissions.selectedPermissions.data.data
    : [];
  const currentCompanyId = Number(auth?.me?.company_id || 0);
  const isSoftwareCompanyUser = currentCompanyId <= 1;
  const isCompanyBoundRoleView = roles.length === 1;
  const isReadonlyRole = selectedRole
    ? isSoftwareCompanyUser
      ? selectedRole.is_company_owned_role === true
        || (!!selectedRole.team_id && !!selectedRole.company_id)
      : selectedRole.can_edit_permissions === false
        || selectedRole.is_plan_role === true
        || selectedRole.role_source === 'plan'
        || selectedRole.role_source === 'global'
        || selectedRole.subscription_plan_id !== null && selectedRole.subscription_plan_id !== undefined
    : isCompanyBoundRoleView;

  useEffect(() => {
    dispatch(getRoles() as any);
    dispatch(getPermissions() as any);
  }, [dispatch]);

  useEffect(() => {
    const availablePermissions = Array.isArray(rolesPermissions.permissions?.data?.data)
      ? rolesPermissions.permissions.data.data
      : [];

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

    pendingRoleIdRef.current = selectedRole.id;
    setSelectedPermissions([]);
    setLoadedPermissionsRoleId(null);
    dispatch(getSelectedPermissions(selectedRole.id) as any);
  }, [dispatch, selectedRole]);

  useEffect(() => {
    if (rolesPermissions.selectedPermissions?.data?.data) {
      setSelectedPermissions(
        rolesPermissions.selectedPermissions.data.data.map((p: any) => p.name)
      );
      setLoadedPermissionsRoleId(pendingRoleIdRef.current);
    }
  }, [rolesPermissions.selectedPermissions?.data?.data]);

  const handleRoleChange = (option: any) => {
    const nextRoleId = Number(option?.value);
    if (!nextRoleId) return;

    setRoleId(nextRoleId);
    const role = roles.find((r) => Number(r.id) === nextRoleId);
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

  const visiblePermissions = isReadonlyRole
    ? permissions.filter((perm) => selectedPermissions.includes(perm.name))
    : permissions;

  const groupedPermissions: Record<string, Permission[]> = visiblePermissions.reduce(
    (acc: Record<string, Permission[]>, perm) => {
      if (!acc[perm.group_name]) {
        acc[perm.group_name] = [];
      }
      acc[perm.group_name].push(perm);
      return acc;
    },
    {}
  );

  const allPermissionNames = visiblePermissions.map((perm) => perm.name);
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
    // The server REPLACES the role's whole set, so an Update before the role's
    // own permissions have loaded would send just the few toggles on screen and
    // wipe every other assignment. Wait for the load.
    // Number(): role ids may arrive as strings from the API.
    if (Number(loadedPermissionsRoleId) !== Number(roleId)) {
      return toast.info('This role’s permissions are still loading. Try again in a moment.');
    }
    const selectedPermissionIds = permissions
      .filter((permission) => selectedPermissions.includes(permission.name))
      .map((permission) => permission.id);

    setUpdating(true);
    try {
      await dispatch(updateRolePermissions({ roleId, selectedPermissions: selectedPermissionIds }) as any).unwrap();
      await dispatch(getSelectedPermissions(roleId) as any);
      await dispatch(getSettings() as any);
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
          <ButtonLoading className="p-2 w-30" icon={<FiCheckSquare />} onClick={handleUpdatePermissions} buttonLoading={updating} label="Update" />
        )}
        {!isCompanyBoundRoleView && (
          <ButtonLoading className="p-2 w-40" icon={<FiPlus size={16} className="mr-2" />} onClick={() => navigate(routes.add_role)} buttonLoading={addingRole} label="Add Role" />
        )}
      </div>

      <div>
        <label className="mb-1 block text-left text-sm text-black dark:text-white">Roles</label>

        <CategoryDropdown
          categoryDdl={roleOptions}
          value={roleId ? String(roleId) : undefined}
          onChange={handleRoleChange}
          placeholder={
            rolesLoading
              ? 'Loading roles…'
              : rolesError
                ? 'Could not load roles'
                : roles.length === 0
                  ? 'No roles available'
                  : 'Select Role'
          }
          isSearchable={roles.length > 7}
          isDisabled={rolesLoading || Boolean(rolesError) || roles.length === 0}
          ariaLabel="Roles"
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          maxMenuHeight={240}
          className="w-full max-w-sm"
        />

        {rolesError ? (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{rolesError}</p>
        ) : rolesLoading ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Loading roles…</p>
        ) : roles.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No roles available for this company.</p>
        ) : null}
      </div>

      <div className="text-sm mt-6">
        <div className="mb-4 flex items-center justify-between border-b pb-2 border-[rgb(var(--c-border))]">
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
            {selectedRole?.is_company_owned_role
              ? 'This is a company-owned role. Software Company user cannot change its permissions here.'
              : isSoftwareCompanyUser
                ? 'This global role can be managed by Software Company user.'
                : 'This is a global role. Company users cannot change its permissions because it would affect other companies too.'}
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
              <div className="flex items-center justify-between mb-3 border-b pb-2 border-[rgb(var(--c-border))]">
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
                    label={
                      permissionLabelOverrides[perm.name] ||
                      smsPermissionLabels[perm.name] ||
                      formatRoleNameForCashBook(perm.name)
                    }
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
