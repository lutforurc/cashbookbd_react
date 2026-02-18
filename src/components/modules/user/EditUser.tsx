import React, { useEffect, useState } from 'react'
import { Link, useParams } from "react-router-dom";
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { useDispatch, useSelector } from 'react-redux';
import { getDdlAllBranch } from '../branch/ddlBranchSlider';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';
import PasswordElement from '../../utils/fields/PasswordElement';
import { editUser, updateUser } from './userSlice';
import { getRoles } from '../roles/rolesSlice';
import { toast } from 'react-toastify';

const EditUser = (user: any) => {
    const dispatch = useDispatch();
    const branchDdlData = useSelector((state:any) => state.branchDdl);
    const roles = useSelector((state:any) => state.roles);
    const showUser = useSelector((state:any) => state.users);
    const [dropdownData, setDropdownData] = useState<any[]>([]);

    const { id } = useParams<{ id: string }>();

    useEffect(() => {
        dispatch(getDdlAllBranch());
        dispatch(getRoles());
    }, []);
    useEffect(() => {
        dispatch(editUser(id));
    }, []);

  
    useEffect(() => {
        setDropdownData(branchDdlData?.data?.data);
    }, [branchDdlData]);

    const [formData, setFormData] = useState({
        usr_id         : id,
        name           : '',
        email          : '',
        description    : '',
        password       : '',
        confirmPassword: '',
        lang           : '',
        branch_id      : '',
        role_id        : '',
    });

    useEffect(() => {
        if (showUser.editData) {
            setFormData((prevData) => ({
                ...prevData,
                name: showUser.editData.name || '',
                email: showUser.editData.email || '',
                role_id: showUser.editData.role_id || '',
                lang: showUser.editData.lang || '',
                branch_id: showUser.editData.branch_id || '',  // Add this line
            }));
        }
    }, [showUser.editData]);



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
        dispatch( updateUser( formData ) )
        if (showUser?.updateData) { 
            toast.success(showUser?.updateData);
            setTimeout(() => {
                window.history.back();
            }, 1000);
        }
    }

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
                        <span>{showUser.editData.email || formData.email}</span>
                    </div>
                </div>

                <InputElement
                    id="name"
                    value={formData.name}
                    name="name"
                    placeholder={'Update User Name'}
                    label={'User Name'}
                    className={''}
                    onChange={handleOnChange}
                />
                <DropdownCommon
                    id="role_id"
                    name={'role_id'}
                    label="Select Role" 
                    defaultValue={formData?.role_id || ""}
                    onChange={handleOnChange}
                    className="h-[2.60rem]"
                    data={roles?.roles?.data?.data || []}  // Fetch and pass role options
                />

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
                    className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-1/2"
                />
                <ButtonLoading
                    onClick={handleBack}
                    buttonLoading={showUser.isLoading}
                    label="Back"
                    className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-1/2"
                />
                </div>


            </div>


        </div>
    );

}

export default EditUser; 