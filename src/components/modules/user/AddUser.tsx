import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { getRoles } from '../roles/rolesSlice';
import routes from '../../services/appRoutes';
import InputElement from '../../utils/fields/InputElement';
import PasswordElement from '../../utils/fields/PasswordElement';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import MultiSelectDropdown from '../../utils/utils-functions/MultiSelectDropdown';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { storeUser } from './userSlice';
import { hasPermission } from '../../utils/permissionChecker';

type MultiOption = {
  value: string | number;
  label: string;
};

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  description: '',
  password: '',
  confirmPassword: '',
  lang: '',
  branch_id: '',
  role_id: '',
};

const CREATE_USER_PERMISSIONS = [
  'all.user.create',
  'user.create',
  'user.store',
  'all.user.add',
];

const AddUser = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const roles = useSelector((state: any) => state.roles);
  const users = useSelector((state: any) => state.users);
  const settings = useSelector((state: any) => state.settings);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<MultiOption[]>([]);
  const [formData, setFormData] = useState(initialFormData);
  const userPermissions = settings?.data?.permissions || [];
  const canCreateUser = CREATE_USER_PERMISSIONS.some((perm) =>
    hasPermission(userPermissions, perm),
  );

  const roleOptions: MultiOption[] = useMemo(
    () =>
      (roles?.roles?.data?.data || []).map((item: any) => ({
        value: String(item.id),
        label: item.name,
      })),
    [roles?.roles?.data?.data],
  );

  const ownerRoleSelected = selectedRoles.some((item) => item.label?.toLowerCase() === 'owner');

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    dispatch(getRoles() as any);
  }, []);

  useEffect(() => {
    setDropdownData(branchDdlData?.protectedData?.data || []);
  }, [branchDdlData]);

  useEffect(() => {
    if (formData.branch_id) return;
    const firstBranch = (dropdownData || []).find(
      (item: any) => String(item?.id ?? '') !== '',
    );
    if (firstBranch) {
      setFormData((prevData) => ({
        ...prevData,
        branch_id: String(firstBranch.id),
      }));
    }
  }, [dropdownData, formData.branch_id]);

  useEffect(() => {
    setFormData((prevData) => ({
      ...prevData,
      role_id: selectedRoles[0] ? String(selectedRoles[0].value) : '',
    }));
  }, [selectedRoles]);

  const handleRolesChange = (items: MultiOption[]) => {
    const pickedOwner = items.find((item) => item.label?.toLowerCase() === 'owner');
    if (pickedOwner) {
      setSelectedRoles([pickedOwner]);
      return;
    }

    setSelectedRoles(items);
  };

  const handleOnChange = (e: any) => {
    const { value, type, name } = e.target;

    if (type === 'checkbox') {
      setFormData((prevData) => ({
        ...prevData,
        [name]: e.target.checked,
      }));
      return;
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleUserSave = (e: any) => {
    e.preventDefault();
    if (!canCreateUser) {
      toast.error('You are not authorized to create user.');
      return;
    }
    if (selectedRoles.length === 0) {
      toast.error('Please select at least one role.');
      return;
    }
    if (!formData.branch_id || String(formData.branch_id).trim() === '') {
      toast.error('Please select a branch.');
      return;
    }

    const roleIds = selectedRoles.map((item) => Number(item.value));

    const payload = {
      ...formData,
      role_id: Number(selectedRoles[0].value),
      role_ids: roleIds,
      branch_id: Number(formData.branch_id),
    };

    dispatch(
      storeUser(payload, (res: any) => {
        if (res?.success) {
          toast.success(res?.message || 'User created successfully');
          setFormData(initialFormData);
          setSelectedRoles([]);
          navigate(routes.user_list);
        } else {
          toast.error(res?.error?.message || 'Failed to create user');
        }
      }) as any,
    );
  };

  const handleBack = () => {
    navigate(routes.user_list);
  };

  useEffect(() => {
    if (!settings?.loading && !canCreateUser) {
      navigate('/no-access');
    }
  }, [settings?.loading, canCreateUser]);

  return (
    <div>
      <HelmetTitle title="Add User" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputElement
          id="name"
          value={formData.name}
          name="name"
          placeholder="Enter User Name"
          label="User Name"
          className=""
          onChange={handleOnChange}
        />
        <InputElement
          id="email"
          value={formData.email}
          name="email"
          placeholder="Enter Email"
          label="Email Address"
          className=""
          onChange={handleOnChange}
        />
        <InputElement
          id="phone"
          value={formData.phone}
          name="phone"
          placeholder="Enter Mobile Number"
          label="Mobile Number"
          className=""
          onChange={handleOnChange}
        />

        <div>
          <div>
            <label htmlFor="role_id">Select Role</label>
          </div>
          <MultiSelectDropdown
            options={roleOptions}
            value={selectedRoles}
            onChange={handleRolesChange}
            placeholder="Select roles"
            selectionLabel="role"
            className="w-full"
          />
          {ownerRoleSelected && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Owner user can only keep the Owner role.
            </p>
          )}
        </div>

        <InputElement
          id="lang"
          value={formData.lang}
          name="lang"
          placeholder="Enter Language"
          label="Language"
          className="py-2 h-9"
          onChange={handleOnChange}
        />

        <div>
          <div>
            <label htmlFor="branch_id">Select Branch</label>
          </div>
          <BranchDropdown
            name="branch_id"
            onChange={(selectedValue) =>
              handleOnChange({
                target: { name: 'branch_id', value: selectedValue.target.value },
              })
            }
            className="w-full font-medium text-sm p-1.5 h-9"
            branchDdl={dropdownData}
            defaultValue={formData.branch_id || ''}
          />
        </div>

        <PasswordElement
          id="password"
          value={formData.password}
          name="password"
          placeholder="Enter Password"
          label="Password"
          className="py-2 h-9"
          onChange={handleOnChange}
        />

        <PasswordElement
          id="confirmPassword"
          value={formData.confirmPassword}
          name="confirmPassword"
          placeholder="Enter Confirm Password"
          label="Confirm Password"
          className="py-2 h-9"
          onChange={handleOnChange}
        />

        <div className="flex gap-2">
          <ButtonLoading
            onClick={handleUserSave}
            buttonLoading={users.isLoading}
            label="Save"
            className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-1/2 h-9"
          />
          <ButtonLoading
            onClick={handleBack}
            buttonLoading={users.isLoading}
            label="Back"
            className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-1/2 h-9"
          /> 
        </div>
      </div>
    </div>
  );
};

export default AddUser;
