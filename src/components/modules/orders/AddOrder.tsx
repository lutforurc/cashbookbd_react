import React, { useEffect, useState } from 'react'
import HelmetTitle from '../../utils/others/HelmetTitle'
import Loader from '../../../common/Loader'
import BranchDropdown from '../../utils/utils-functions/BranchDropdown'
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider'
import { useDispatch, useSelector } from 'react-redux'
import DdlMultiline from '../../utils/utils-functions/DdlMultiline'
import ProductDropdown from '../../utils/utils-functions/ProductDropdown'
import InputElement from '../../utils/fields/InputElement'
import InputDatePicker from '../../utils/fields/DatePicker'
import dayjs from 'dayjs';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons'
import { FiHome, FiRefreshCcw, FiSave } from 'react-icons/fi'
import Link from '../../utils/others/Link'
import { storeOrder } from './ordersSlice'
import OrderTypes from '../../utils/utils-functions/OrderTypes'
import { toast } from 'react-toastify'
// import Link from '../../../utils/others/Link';

const AddOrder = (user: any) => {
    const dispatch = useDispatch();
    // const [branchId, setBranchId] = useState<number | null>(null);
    const [isSelected, setIsSelected] = useState<number | string>('');
    const branchDdlData = useSelector((state) => state.branchDdl);
    const [dropdownData, setDropdownData] = useState<any[]>([]);
    const [ledgerId, setLedgerAccount] = useState<number | null>(null);
    const [orderDate, setOrderDate] = useState<Date | null>(null); // Define state with type
    const [lastDeliveryDate, setLastDeliveryDate] = useState<Date | null>(null); // Define state with type
    const [buttonLoading, setButtonLoading] = useState(false);

    interface FormData {
        branch_id: string;
        order_for: string;
        product_id: string;
        order_number: string;
        delivery_location: string | null;
        order_date: string | null;
        last_delivery_date: string | null;
        order_rate: string | null;
        total_order: string | null;
        order_type: string;
        note: string | null;
    }




    const [formData, setFormData] = useState<FormData>({
        branch_id: '',
        order_for: '',
        product_id: '',
        order_number: '',
        delivery_location: '',
        order_date: '',
        last_delivery_date: '',
        order_rate: '',
        total_order: '',
        order_type: '',
        note: '',
    });

    useEffect(() => {
        dispatch(getDdlProtectedBranch());
        setIsSelected(user.user.branch_id);
        setFormData({ ...formData, ['branch_id']: user.user.branch_id });
    }, []);

    const handleBranchChange = (e: any) => {
        setFormData({ ...formData, ['branch_id']: e.target.value });
    };

    useEffect(() => {
        if (
            branchDdlData?.protectedData?.data &&
            branchDdlData?.protectedData?.transactionDate
        ) {
            setDropdownData(branchDdlData?.protectedData?.data);
            setFormData({ ...formData, ['branch_id']: user.user.branch_id });
            // setBranchId(user.user.branch_id);
        } else {
        }
    }, [branchDdlData?.protectedData?.data]);

    const selectedLedgerOptionHandler = (option: any) => {
        setFormData({ ...formData, ['order_for']: option.value });
    };
    const selectedProductOptionHandler = (option: any) => {
        setFormData({ ...formData, ['product_id']: option.value });
    };

    const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        console.log(name, value);
        setFormData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleOrderDate = (e: any) => {
        const startD = dayjs(e).format('YYYY-MM-DD'); // Adjust format as needed
        const key = 'order_date'; // Set the desired key dynamically
        setFormData({ ...formData, [key]: startD });
    };

    const handleLastDeliveryDate = (e: any) => {
        const startD = dayjs(e).format('YYYY-MM-DD'); // Adjust format as needed
        const key = 'last_delivery_date'; // Set the desired key dynamically
        setFormData({ ...formData, [key]: startD });

        console.log(formData);
    };

    const resetOrder = () => {
        setFormData((prevFormData) => ({
            ...prevFormData,
            products: [], // Reset only the products array
        }));
    };

    const handleSelectChange = (e: any) => {
        const key = 'order_type'; // Set the desired key dynamically
        setFormData({ ...formData, [key]: e.target.value });
    };
    const handleSave = () => {
        console.log(formData);
        // Check Required fields are not empty
        // const validationMessages = validateForm(formData, invoiceMessage);
        // if (validationMessages) {
        //     toast.info(validationMessages);
        //     return;
        // }

        // if (!formData.account || formData.products.length === 0) {
        //     toast.error("Please add products information!");
        //     return;
        // }

        dispatch(storeOrder(formData, function (message) {
            if (message) {
                toast.info(message);
            }
        }));
    };

    return (
        <div>
            <HelmetTitle title={'Create Order'} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8 mb-3">
                <div>
                    <div>
                        {' '}
                        <label htmlFor="">Select Branch</label>
                    </div>
                    <div className='w-full'>
                        {branchDdlData.isLoading == true ? <Loader /> : ''}
                        <BranchDropdown
                            onChange={handleBranchChange}
                            className="w-60 font-medium text-sm p-2 "
                            branchDdl={dropdownData}
                        />
                    </div>
                </div>
                <div className=''>
                    <label htmlFor="">Order For</label>
                    <DdlMultiline onSelect={selectedLedgerOptionHandler} acType={''} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8 mb-3">
                <div>
                    <label htmlFor="">Select Product</label>
                    <ProductDropdown onSelect={selectedProductOptionHandler} />
                </div>
                <InputElement id="order_number"
                    value={formData.order_number}
                    name="order_number"
                    placeholder={'Enter Order Number'}
                    label={'Enter Order Number'}
                    className={'py-1.5'}
                    onChange={handleOrderChange}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8 mb-3">
                <InputElement id="delivery_location"
                    value={formData.delivery_location}
                    name="delivery_location"
                    placeholder={'Delivery Location'}
                    label={'Delivery Location'}
                    className={'py-1.5'}
                    onChange={handleOrderChange}
                />
                <div className='w-full'>
                    <label htmlFor="">Order Date</label>
                    <InputDatePicker
                        setCurrentDate={handleOrderDate}
                        className=" w-full p-1.5"
                        selectedDate={orderDate}
                        setSelectedDate={setOrderDate}
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8 mb-3">
                <div className='w-full'>
                    <label htmlFor="">Last Delivery Date</label>
                    <InputDatePicker
                        setCurrentDate={handleLastDeliveryDate}
                        className=" w-full p-1.5"
                        selectedDate={lastDeliveryDate}
                        setSelectedDate={setLastDeliveryDate}
                    />
                </div>
                <InputElement id="order_rate"
                    value={formData.order_rate}
                    name="order_rate"
                    placeholder={'Order Rate'}
                    label={'Order Rate'}
                    className={'py-1.5'}
                    onChange={handleOrderChange}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8 mb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                    <InputElement id="total_order"
                        value={formData.total_order}
                        name="total_order"
                        placeholder={'Total Order Qty'}
                        label={'Total Order Qty'}
                        className={'py-1.5'}
                        onChange={handleOrderChange}
                    />
                    <div>
                        <label className='mb-0 block'>Order Type</label>
                        <OrderTypes onChange={handleSelectChange} className='h-9 w-full' />
                    </div>
                </div>
                <InputElement id="note"
                    value={formData.note}
                    name="note"
                    placeholder={'Note'}
                    label={'Note'}
                    className={'py-1.5'}
                    onChange={handleOrderChange}
                />
            </div>
            <div className="grid grid-cols-3 gap-x-1 gap-y-1 w-2/4 md:w-2/5 mx-auto">
                <ButtonLoading
                    onClick={handleSave}
                    buttonLoading={buttonLoading}
                    label="Save"
                    className="whitespace-nowrap text-center mr-0"
                    icon={<FiSave className="text-white text-lg ml-2  mr-2" />}
                />
                <ButtonLoading
                    onClick={resetOrder}
                    buttonLoading={buttonLoading}
                    label="Reset"
                    className="whitespace-nowrap text-center mr-0"
                    icon={<FiRefreshCcw className="text-white text-lg ml-2  mr-2" />}
                />
                <Link to="/dashboard" className="text-nowrap justify-center mr-0">
                    <FiHome className="text-white text-lg ml-2  mr-2" />
                    <span className='hidden md:block'>{'Home'}</span>
                </Link>
            </div>
        </div>
    )
}

export default AddOrder
