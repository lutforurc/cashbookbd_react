import React, { useEffect, useState } from 'react';
import { FiSave, FiRefreshCcw, FiArrowLeft } from 'react-icons/fi';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import Link from '../../../utils/others/Link';
import { status } from '../../../utils/fields/DataConstant';

import { ProjectItem } from './types';
import { getInitialProject } from './initial';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';

const AddEditProject = (user: any) => {
    const dispatch = useDispatch();
    const { id, areaId } = useParams();
    const projectState = useSelector((state: any) => state.projectList);
    const branchDdlData = useSelector((state) => state.branchDdl);
    const [branchId, setBranchId] = useState<number | null>(null);
    const [dropdownData, setDropdownData] = useState<any[]>([]);
      const [ledgerId, setLedgerAccount] = useState<number | null>(null);

    // ✅ initial state ONLY from initial.ts
    const [formData, setFormData] = useState<ProjectItem>(
        getInitialProject(areaId)
    );

    const [buttonLoading, setButtonLoading] = useState(false);

    // EDIT MODE
    useEffect(() => {
        // if (id) dispatch(editProject(id));
    }, [id]);

    useEffect(() => {
        dispatch(getDdlProtectedBranch());
        // setIsSelected(user.user.branch_id);
        setBranchId(user.user.branch_id);
        // setBranchPad(user?.user?.branch_id.toString().padStart(4, '0'));
    }, []);


    useEffect(() => {
        if (
            branchDdlData?.protectedData?.data &&
            branchDdlData?.protectedData?.transactionDate
        ) {
            setDropdownData(branchDdlData?.protectedData?.data);
            setBranchId(user.user.branch_id);
        } else {
        }
    }, [branchDdlData?.protectedData?.data]);

    // Populate form on edit
    useEffect(() => {
        if (projectState?.editData?.project) {
            setFormData(projectState.editData.project);
        }
    }, [projectState?.editData]);

    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        // id ? dispatch(updateProject(formData)) : dispatch(storeProject(formData));
    };

    const handleReset = () => {
        setFormData(getInitialProject(areaId));
    };
    const handleBranchChange = (e: any) => {
        setBranchId(e.target.value);
    };

    const selectedLedgerOptionHandler = (option: any) => {
        setLedgerAccount(option.value);
    };



    return (
        <>
            <HelmetTitle title={id ? 'Edit Project' : 'Add Project'} />

            {/* {projectState.isLoading && <Loader />} */}

            {/* BASIC INFO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <div>
                    <div>
                        {' '}
                        <label htmlFor="">Select Branch</label>
                    </div>
                    <div className="w-full">
                        {branchDdlData.isLoading == true ? <Loader /> : ''}
                        <BranchDropdown
                            defaultValue={user?.user?.branch_id}
                            onChange={handleBranchChange}
                            className="w-60 font-medium text-sm h-[2.45rem] "
                            branchDdl={dropdownData}
                        />
                    </div>
                </div>
                <DropdownCommon
                    id="area"
                    name="area"
                    label="Select Location"
                    data={[]}
                    defaultValue={formData.status?.toString()}
                    className="h-[2.45rem] bg-transparent"
                    onChange={handleSelectChange}
                />
                <div className="">
                    <label htmlFor="">Select Land Owner</label>
                    <DdlMultiline onSelect={selectedLedgerOptionHandler} acType={''} className='h-1' />
                </div>
                <InputElement
                    id="name"
                    name="name"
                    label="Project / Land Name"
                    placeholder="Enter Project Name"
                    value={formData.name}
                    onChange={handleOnChange}
                />
                <InputElement
                    id="area_sqft"
                    name="area_sqft"
                    label="Area (Sq. Ft)"
                    placeholder="Enter Area Size"
                    value={formData.area_sqft}
                    onChange={handleOnChange}
                />

            </div>

            {/* LOCATION & PURCHASE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <InputElement
                    id="location_details"
                    name="location_details"
                    label="Location Details"
                    placeholder="Detailed location info"
                    value={formData.location_details}
                    onChange={handleOnChange}
                />
                <InputElement
                    id="purchase_price"
                    name="purchase_price"
                    label="Purchase Price"
                    placeholder="0.00"
                    value={formData.purchase_price}
                    onChange={handleOnChange}
                />
                <div className="w-full">
                    <label htmlFor="">Purchase Date</label>
                    <InputDatePicker
                        //   setCurrentDate={handleStartDate}
                        className="font-medium text-sm w-full h-9"
                    //   selectedDate={startDate}
                    //   setSelectedDate={setStartDate}
                    />
                </div>
            </div>

            {/* SALE INFO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <InputElement
                    id="sale_price"
                    name="sale_price"
                    label="Sale Price"
                    placeholder="0.00"
                    value={formData.sale_price ?? ''}
                    onChange={handleOnChange}
                />
                <div className="w-full">
                    <label htmlFor="">Sales Date</label>
                    <InputDatePicker
                        //   setCurrentDate={handleStartDate}
                        className="font-medium text-sm w-full h-9"
                    //   selectedDate={startDate}
                    //   setSelectedDate={setStartDate}
                    />
                </div>
            </div>

            {/* NOTES */}
            <div className="grid grid-cols-1 mb-2">
                <InputElement
                    id="notes"
                    name="notes"
                    label="Notes"
                    placeholder="Optional notes"
                    value={formData.notes}
                    onChange={handleOnChange}
                />
            </div>
            <DropdownCommon
                id="status"
                name="status"
                label="Select Status"
                data={status}
                defaultValue={formData.status?.toString()}
                className="h-[2.1rem] bg-transparent"
                onChange={handleSelectChange}
            />

            {/* ACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                <ButtonLoading
                    onClick={handleSave}
                    buttonLoading={buttonLoading}
                    label={id ? 'Update' : 'Save'}
                    icon={<FiSave className="ml-2 text-lg" />}
                />
                <ButtonLoading
                    onClick={handleReset}
                    buttonLoading={false}
                    label="Reset"
                    icon={<FiRefreshCcw className="ml-2 text-lg" />}
                />
                <Link
                    to={`/real-estate/areas/${areaId}/projects`}
                    className="flex items-center justify-center"
                >
                    <FiArrowLeft className="mr-2" /> Back
                </Link>
            </div>
        </>
    );
};

export default AddEditProject;
