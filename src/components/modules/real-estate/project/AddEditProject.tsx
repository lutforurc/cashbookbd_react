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
import { fetchAreaDdl } from '../area/projectAreaSlice';
import ProjectAreaDropdown from '../../../utils/utils-functions/ProjectAreaDropdown';
import { projectStore } from './projectSlice';
import { toast } from 'react-toastify';

const AddEditProject = (user: any) => {
    const dispatch = useDispatch();
    const { id, areaId } = useParams();
    const projectState = useSelector((state: any) => state.projectList);

    const branchDdlData = useSelector((state) => state.branchDdl);
    const [branchId, setBranchId] = useState<number | null>(null);
    const [dropdownData, setDropdownData] = useState<any[]>([]);
    const [ledgerId, setLedgerAccount] = useState<number | null>(null);
    const [salesDate, setSalesDate] = useState<Date | null>(null); // Define state with type
    const [purchaseDate, setPurchaseDate] = useState<Date | null>(null); // Define state with type

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
        dispatch(fetchAreaDdl());

        const branch = user?.user?.branch_id;

        if (branch) {
            setBranchId(branch);

            setFormData((prev) => ({
                ...prev,
                branch_id: branch, // 🔥 MUST
            }));
        }
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

    const handleSave = async () => {
        console.log("FINAL PAYLOAD", formData); // 🔍 MUST CHECK

        setButtonLoading(true);

        const resultAction = await dispatch(projectStore(formData));

        setButtonLoading(false);

        if (projectStore.fulfilled.match(resultAction)) {
            toast.success("Project created successfully");
        } else {
            toast.error("Failed to create project");

        }
    };

    const handleReset = () => {
        setFormData(getInitialProject(areaId));
    };
    const handleBranchChange = (e: any) => {
        const value = e.target.value;
        setBranchId(value);

        setFormData((prev) => ({
            ...prev,
            branch_id: value,
        }));
    };

    const handleAreaSelect = (option: any) => {
        setFormData((prev) => ({
            ...prev,
            area_id: option.value,
        }));
    };

    const selectedLedgerOptionHandler = (option: any) => {
        setLedgerAccount(option.value);

        setFormData((prev) => ({
            ...prev,
            customer_id: option.value,
        }));
    };


    const handleSalesDate = (date: Date | null) => {
        setSalesDate(date);
        setFormData((prev) => ({
            ...prev,
            sale_date: date
                ? date.toISOString().split("T")[0]
                : "",
        }));
    };
    const handlePurchaseDate = (date: Date | null) => {
        setPurchaseDate(date);
        setFormData((prev) => ({
            ...prev,
            purchase_date: date
                ? date.toISOString().split("T")[0]
                : "",
        }));
    };


    return (
        <>
            <HelmetTitle title={id ? 'Edit Project' : 'Add New Project'} />

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
                <div className="">
                    <label htmlFor="">Select Location</label>
                    <ProjectAreaDropdown onSelect={handleAreaSelect} />
                </div>
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
                    id="location_details"
                    name="location_details"
                    label="Location Details"
                    placeholder="Detailed location info"
                    value={formData.location_details}
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
                    id="purchase_price"
                    name="purchase_price"
                    label="Purchase Price"
                    placeholder="0.00"
                    value={formData.purchase_price}
                    onChange={handleOnChange}
                />
                <InputElement
                    id="sale_price"
                    name="sale_price"
                    label="Sale Price"
                    placeholder="0.00"
                    value={formData.sale_price ?? ''}
                    onChange={handleOnChange}
                />
                <InputElement
                    id="notes"
                    name="notes"
                    label="Notes"
                    placeholder="Optional notes"
                    value={formData.notes}
                    onChange={handleOnChange}
                />
            </div>

            {/* SALE INFO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <div className="w-full">
                    <label htmlFor="">Purchase Date</label>
                    <InputDatePicker
                        setCurrentDate={handlePurchaseDate}
                        className="font-medium text-sm w-full h-8.5"
                        selectedDate={purchaseDate}
                        setSelectedDate={setPurchaseDate}
                    />
                </div>
                <div className="w-full">
                    <label htmlFor="">Sales Date</label>
                    <InputDatePicker
                        setCurrentDate={handleSalesDate}
                        className="font-medium text-sm w-full h-9"
                        selectedDate={salesDate}
                        setSelectedDate={setSalesDate}
                    />
                </div>
                <DropdownCommon
                    id="status"
                    name="status"
                    label="Select Status"
                    data={status}
                    defaultValue={formData.status?.toString()}
                    className="h-[2.2rem] bg-transparent"
                    onChange={handleSelectChange}
                />
            </div>

           
            {/* ACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                <ButtonLoading
                    onClick={handleSave}
                    buttonLoading={buttonLoading}
                    label={id ? 'Update' : 'Save'}
                    className='h-9'
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
