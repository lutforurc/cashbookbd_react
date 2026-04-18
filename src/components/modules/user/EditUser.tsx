import React, { useEffect, useState } from 'react'
import { Link, useParams } from "react-router-dom";
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { useDispatch, useSelector } from 'react-redux';
import { getDdlAllBranch } from '../branch/ddlBranchSlider';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';
import PasswordElement from '../../utils/fields/PasswordElement';
import { editUser, updateUser } from './userSlice';
import { getRoles } from '../roles/rolesSlice';
import { toast } from 'react-toastify';
import { getSettings } from '../settings/settingsSlice';
import { authCheck } from '../../../features/authReducer';
import MultiSelectDropdown from '../../utils/utils-functions/MultiSelectDropdown';
import { FiArrowLeft, FiCheckSquare } from 'react-icons/fi';

type MultiOption = {
    value: string | number;
    label: string;
};

const EditUser = (user: any) => {
    const dispatch = useDispatch();
    const branchDdlData = useSelector((state: any) => state.branchDdl);
    const roles = useSelector((state: any) => state.roles);
    const showUser = useSelector((state: any) => state.users);
    const [dropdownData, setDropdownData] = useState<any[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<MultiOption[]>([]);

    const { id } = useParams<{ id: string }>();

    useEffect(() => {
        dispatch(getDdlAllBranch());
        dispatch(getRoles());
    }, []);
    useEffect(() => {
        dispatch(editUser(id));
    }, []);


    useEffect(() => {
        if (Array.isArray(branchDdlData?.data)) {
            setDropdownData(branchDdlData.data);
            return;
        }

        if (Array.isArray(branchDdlData?.data?.data)) {
            setDropdownData(branchDdlData.data.data);
            return;
        }

        setDropdownData([]);
    }, [branchDdlData?.data]);

    const [formData, setFormData] = useState({
        usr_id: id,
        name: '',
        email: '',
        phone: '',
        description: '',
        password: '',
        confirmPassword: '',
        lang: '',
        branch_id: '',
        role_id: '',
    });

    const roleOptions: MultiOption[] = (roles?.roles?.data?.data || []).map((item: any) => ({
        value: String(item.id),
        label: item.name,
    }));

    useEffect(() => {
        if (showUser.editData) {
            setFormData((prevData) => ({
                ...prevData,
                name: showUser.editData.name || '',
                email: showUser.editData.email || '',
                phone: showUser.editData.phone || '',
                role_id: String(showUser.editData.role_id || ''),
                lang: showUser.editData.lang || '',
                branch_id: String(showUser.editData.branch_id || ''),
            }));
        }
    }, [showUser.editData]);

    useEffect(() => {
        const incomingRoleIdsRaw = Array.isArray(showUser?.editData?.role_ids)
            ? showUser.editData.role_ids
            : Array.isArray(showUser?.editData?.roles)
                ? showUser.editData.roles.map((r: any) => r?.id ?? r?.role_id ?? r)
                : showUser?.editData?.role_id
                    ? [showUser.editData.role_id]
                    : [];

        const incomingRoleIds = incomingRoleIdsRaw.map((item: any) => String(item));
        const preselected = roleOptions.filter((option) =>
            incomingRoleIds.includes(String(option.value))
        );

        setSelectedRoles(preselected);
    }, [showUser?.editData, roles?.roles?.data?.data]);

    useEffect(() => {
        setFormData((prevData) => ({
            ...prevData,
            role_id: selectedRoles[0] ? String(selectedRoles[0].value) : '',
        }));
    }, [selectedRoles]);

    const handleRolesChange = (items: MultiOption[]) => {
        setSelectedRoles(items);
    };



    const handleOnChange = (e) => {
        const { value, type, name } = e.target;

        // Handle dropdown separately
        if (e.target.tagName === "SELECT") {
            setFormData({
                ...formData,
                [name]: e.target.value, // Ensure only value is stored
            });
            return;
        }

        switch (type) {
            case 'checkbox':
                setFormData({
                    ...formData,
                    [name]: e.target.checked,
                });
                break;
            default:
                setFormData({
                    ...formData,
                    [name]: value,
                });
        }
    };

    const handleUserUpdate = (e: any) => {
        e.preventDefault();
        if (selectedRoles.length === 0) {
            toast.error('Please select at least one role.');
            return;
        }

        const roleIds = selectedRoles.map((item) => Number(item.value));

        const payload = {
            ...formData,
            role_id: Number(selectedRoles[0].value),
            role_ids: roleIds,
        };

        dispatch(updateUser(payload) as any);
    };

    useEffect(() => {
        if (!showUser?.updateData) return;
        toast.success(showUser.updateData);
        (async () => {
            await dispatch(authCheck() as any);        // ✅ update complete হওয়ার পরে
            // await dispatch(getSettings() as any);
            // একটাই রাখুন: reload বা back
            window.location.reload();
            // window.history.back();
        })();
    }, [showUser?.updateData]);

    const handleBack = () => {
        window.history.back();
    }

    return (
        <div>
            <HelmetTitle title={'Edit User'} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <div>
                        {''}
                        <label htmlFor="">Email Address</label>
                    </div>
                    <div>
                        <span>{showUser.editData.email || formData.email || '-'}</span>
                    </div>
                </div>
                <InputElement
                    id="phone"
                    value={formData.phone}
                    name="phone"
                    placeholder={'Enter mobile number'}
                    label={'Mobile Number'}
                    className={''}
                    onChange={handleOnChange}
                />

                <InputElement
                    id="name"
                    value={formData.name}
                    name="name"
                    placeholder={'Update User Name'}
                    label={'User Name'}
                    className={''}
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
                </div>
                <div>
                    <div>
                        {''}
                        <label htmlFor="">Select Branch</label>
                    </div>
                    <div>
                        {branchDdlData.isLoading || showUser.isLoading == true ? <Loader /> : ''}
                        <BranchDropdown
                            name="branch_id"
                            onChange={(selectedValue) =>
                                handleOnChange({ target: { name: "branch_id", value: selectedValue.target.value } })
                            }
                            className="w-full font-medium text-sm p-1.5 h-11"
                            branchDdl={dropdownData}
                            defaultValue={formData?.branch_id || ""}
                        />
                    </div>
                </div>
                <InputElement
                    id="lang"
                    value={formData.lang}
                    name="lang"
                    placeholder={'Enter language name'}
                    label={'lang Name'}
                    className={'py-2'}
                    onChange={handleOnChange}
                />
                <PasswordElement
                    id="password"
                    value={formData.password}
                    name="password"
                    placeholder={'Enter password'}
                    label={'Password'}
                    className={''}
                    onChange={handleOnChange}
                />
                <PasswordElement
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    name="confirmPassword"
                    placeholder={'Enter confirm password'}
                    label={'Confirm Password'}
                    className={''}
                    onChange={handleOnChange}
                />
                <div className='flex gap-2'>
                    <ButtonLoading
                        onClick={handleUserUpdate}
                        buttonLoading={showUser.isLoading}
                        label="Update"
                        icon={<FiCheckSquare />}
                        className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-1/2"
                    />
                    <ButtonLoading
                        onClick={handleBack}
                        buttonLoading={showUser.isLoading}
                        label="Back"
                        icon={<FiArrowLeft />}
                        className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-1/2"
                    />
                </div>


            </div>


        </div>
    );

}

export default EditUser; 
