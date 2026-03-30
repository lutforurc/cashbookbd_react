import { useDispatch, useSelector } from 'react-redux';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { useEffect, useState } from 'react';
import { getPermissions, getRoles, getSelectedPermissions, updateRolePermissions } from './userManagementSlice';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { formatRoleNameForCashBook } from '../../utils/utils-functions/formatRoleName';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import { toast } from 'react-toastify';
import { FiPlus } from 'react-icons/fi';
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
  const [catalogPermissions, setCatalogPermissions] = useState<Permission[]>([]);
  const isOwnerRoleSelected = selectedRole?.name?.toLowerCase() === 'owner';

  useEffect(() => {
    dispatch(getRoles());
    dispatch(getPermissions());
  }, []);

  useEffect(() => {
    const availablePermissions = Array.isArray(rolesPermissions.permissions?.data?.data)
      ? rolesPermissions.permissions.data.data
      : [];

    const rolePermissions = Array.isArray(rolesPermissions.selectedPermissions?.data?.data)
      ? rolesPermissions.selectedPermissions.data.data
      : [];

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
  }, [catalogPermissions, rolesPermissions.permissions?.data?.data, rolesPermissions.selectedPermissions?.data?.data]);

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
    setRoles(rolesPermissions.roles?.data?.data || []);
  }, [rolesPermissions.roles?.data?.data]);

  useEffect(() => {
    if (selectedRole) {
      dispatch(getSelectedPermissions(selectedRole.id));
    }
  }, [dispatch, selectedRole]);

  useEffect(() => {
    if (rolesPermissions.selectedPermissions?.data?.data) {
      setSelectedPermissions(
        rolesPermissions.selectedPermissions.data.data.map((p: any) => p.name)
      );
    }
  }, [rolesPermissions.selectedPermissions?.data?.data]);

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const roleId = parseInt(event.target.value);
    setRoleId(roleId);
    const role = roles.find((r) => r.id === roleId);
    setSelectedRole(role || null);
  };

  const handlePermissionChange = (permName: string) => {
    if (isOwnerRoleSelected) return;
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
    if (isOwnerRoleSelected) return;
    setSelectedPermissions(checked ? allPermissionNames : []);
  };

  // Update permissions of the selected role
  const handleUpdatePermissions = async () => {
    if (updating) return; // double click block
    if (!selectedRole) return toast.info("No role selected");
    if (isOwnerRoleSelected) return toast.info("Owner role cannot be modified");
    if (selectedPermissions.length === 0) return toast.info("No permissions selected");

    setUpdating(true);
    try {
      await dispatch(updateRolePermissions({ roleId, selectedPermissions })).unwrap();
      toast.success(rolesPermissions?.updatePermission?.message || "Permissions updated successfully");
    } catch (error) {
      toast.error(error.message || "Failed to update permissions");
    } finally {
      setUpdating(false);
    }
  };



  return (
    <div>
      <HelmetTitle title="Role List" />

      <div className="flex justify-end mb-1 gap-2">
        <ButtonLoading className="p-2 w-30" icon="" onClick={handleUpdatePermissions}  buttonLoading={updating} label="Update" />
        <ButtonLoading className="p-2 w-40" icon={<FiPlus size={16} className='mr-2' />} onClick={() => { }} buttonLoading={addingRole} label="Add Role" />
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
        {/* Root-level Select All */}
        <div className="mb-4 flex items-center justify-between border-b pb-2 border-gray-300 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Permissions
          </h2>
          <ToggleSwitch
            label="All"
            checked={isAllSelected}
            onChange={handleRootToggle}
            disabled={isOwnerRoleSelected}
            preserveCheckedColorWhenDisabled={isOwnerRoleSelected}
          />
        </div>

        {isOwnerRoleSelected && (
          <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
            Owner role protected. এই role-এর permission পরিবর্তন করা যাবে না।
          </p>
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
                <ToggleSwitch
                  label="All"
                  checked={allSelectedInGroup}
                  onChange={handleGroupToggle}
                  disabled={isOwnerRoleSelected}
                  preserveCheckedColorWhenDisabled={isOwnerRoleSelected}
                />
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {perms.map((perm) => (
                  <ToggleSwitch
                    key={perm.id}
                    label={formatRoleNameForCashBook(perm.name)}
                    checked={selectedPermissions.includes(perm.name)}
                    onChange={() => handlePermissionChange(perm.name)}
                    disabled={isOwnerRoleSelected}
                    preserveCheckedColorWhenDisabled={isOwnerRoleSelected}
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
