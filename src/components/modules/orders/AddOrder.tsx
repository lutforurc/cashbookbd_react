import React, { useEffect, useMemo, useState } from 'react'
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
import { editOrder, storeOrder, updateOrder } from './ordersSlice'
import OrderTypes from '../../utils/utils-functions/OrderTypes'
import { toast } from 'react-toastify'
import OrderDropdown from '../../utils/utils-functions/OrderDropdown'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
// import Link from '../../../utils/others/Link';

const AddOrder = (user: any) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const ordersState = useSelector((state) => state.orders);
    const locationOrder = (location.state as any)?.order;
    // const [branchId, setBranchId] = useState<number | null>(null);
    const branchDdlData = useSelector((state) => state.branchDdl);
    const [dropdownData, setDropdownData] = useState<any[]>([]);
    const [orderDate, setOrderDate] = useState<Date | null>(null); // Define state with type
    const [lastDeliveryDate, setLastDeliveryDate] = useState<Date | null>(null); // Define state with type
    const [buttonLoading, setButtonLoading] = useState(false);

    interface FormData {
        branch_id: string;
        order_for: string;
        order_for_text: string;
        product_id: string;
        product_name: string;
        order_number: string;
        ref_order_id: string;
        ref_order_text: string;
        delivery_location: string | null;
        order_date: string | null;
        last_delivery_date: string | null;
        order_rate: string | null;
        total_order: string | null;
        order_type: string;
        notes: string | null;
    }




    const [formData, setFormData] = useState<FormData>({
        branch_id: '',
        order_for: '',
        order_for_text: '',
        product_id: '',
        product_name: '',
        order_number: '',
        ref_order_id: '',
        ref_order_text: '',
        delivery_location: '',
        order_date: '',
        last_delivery_date: '',
        order_rate: '',
        total_order: '',
        order_type: '',
        notes: '',
    });

    const initialBranchId = user?.user?.branch_id?.toString?.() ?? '';

    useEffect(() => {
        dispatch(getDdlProtectedBranch());
    }, [dispatch]);

    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            branch_id: prev.branch_id || initialBranchId,
        }));
    }, [initialBranchId]);

    useEffect(() => {
        if (id) {
            dispatch(editOrder(id, function (response) {
                if (response?.message) {
                    toast.info(response.message);
                }
            }));
        }
    }, [dispatch, id]);

    useEffect(() => {
        if (!isEditMode || !locationOrder?.id) {
            return;
        }

        setFormData((prev) => ({
            branch_id: locationOrder?.branch_id?.toString?.() || prev.branch_id || initialBranchId,
            order_for: locationOrder?.customer_id?.toString?.() || prev.order_for || '',
            order_for_text:
                locationOrder?.order_for ||
                locationOrder?.customer_name ||
                prev.order_for_text ||
                '',
            product_id: locationOrder?.product_id?.toString?.() || prev.product_id || '',
            product_name:
                locationOrder?.product_name ||
                locationOrder?.product?.name ||
                locationOrder?.product ||
                prev.product_name ||
                '',
            order_number: locationOrder?.order_number ?? prev.order_number,
            ref_order_id: locationOrder?.ref_order_id?.toString?.() || prev.ref_order_id || '',
            ref_order_text:
                locationOrder?.reference_order?.order_number ||
                locationOrder?.ref_order_number ||
                prev.ref_order_text ||
                '',
            delivery_location: locationOrder?.delivery_location ?? prev.delivery_location,
            order_date: locationOrder?.order_date ?? prev.order_date,
            last_delivery_date: locationOrder?.last_delivery_date ?? prev.last_delivery_date,
            order_rate: locationOrder?.order_rate?.toString?.() ?? prev.order_rate,
            total_order: locationOrder?.total_order?.toString?.() ?? prev.total_order,
            order_type: locationOrder?.order_type?.toString?.() ?? prev.order_type,
            notes: locationOrder?.notes ?? prev.notes,
        }));

        setOrderDate(locationOrder?.order_date ? dayjs(locationOrder.order_date).toDate() : null);
        setLastDeliveryDate(
            locationOrder?.last_delivery_date ? dayjs(locationOrder.last_delivery_date).toDate() : null,
        );
    }, [initialBranchId, isEditMode, locationOrder]);

    const handleBranchChange = (e: any) => {
        setFormData({ ...formData, ['branch_id']: e.target.value });
    };

    useEffect(() => {
        if (
            branchDdlData?.protectedData?.data &&
            branchDdlData?.protectedData?.transactionDate
        ) {
            setDropdownData(branchDdlData?.protectedData?.data);
        } else {
        }
    }, [branchDdlData?.protectedData?.data]);

    useEffect(() => {
        const editData = ordersState?.editData;
        if (!isEditMode || !editData?.id) {
            return;
        }

        setFormData({
            branch_id: editData?.branch_id?.toString?.() ?? '',
            order_for: editData?.order_for?.toString?.() ?? '',
            order_for_text:
                editData?.order_for_name ??
                editData?.customer_name ??
                editData?.order_for ??
                '',
            product_id: editData?.product_id?.toString?.() ?? '',
            product_name:
                editData?.product_name ??
                editData?.product?.name ??
                editData?.product ??
                '',
            order_number: editData?.order_number ?? '',
            ref_order_id: editData?.ref_order_id?.toString?.() ?? '',
            ref_order_text: editData?.ref_order_text ?? '',
            delivery_location: editData?.delivery_location ?? '',
            order_date: editData?.order_date ?? '',
            last_delivery_date: editData?.last_delivery_date ?? '',
            order_rate: editData?.order_rate?.toString?.() ?? '',
            total_order: editData?.total_order?.toString?.() ?? '',
            order_type: editData?.order_type?.toString?.() ?? '',
            notes: editData?.notes ?? '',
        });

        setOrderDate(editData?.order_date ? dayjs(editData.order_date).toDate() : null);
        setLastDeliveryDate(
            editData?.last_delivery_date ? dayjs(editData.last_delivery_date).toDate() : null,
        );
    }, [isEditMode, ordersState?.editData]);

    const selectedOrderFor = useMemo(() => {
        if (!formData.order_for) return null;
        return {
            value: formData.order_for,
            label: formData.order_for_text || formData.order_for,
        };
    }, [formData.order_for, formData.order_for_text]);

    const selectedProduct = useMemo(() => {
        if (!formData.product_id) return null;
        return {
            value: formData.product_id,
            label:
                formData.product_name ||
                ordersState?.editData?.product_name ||
                ordersState?.editData?.product?.name ||
                locationOrder?.product_name ||
                locationOrder?.product?.name ||
                formData.product_id,
        };
    }, [
        formData.product_id,
        formData.product_name,
        locationOrder?.product,
        locationOrder?.product_name,
        ordersState?.editData?.product,
        ordersState?.editData?.product_name,
    ]);

    const selectedLedgerOptionHandler = (option: any) => {
        setFormData((prevState) => ({
            ...prevState,
            order_for: option?.value?.toString?.() || '',
            order_for_text: option?.label || '',
        }));
    };
    const selectedProductOptionHandler = (option: any) => {
        setFormData((prevState) => ({
            ...prevState,
            product_id: option?.value?.toString?.() || '',
            product_name: option?.label || '',
        }));
    };
    const selectedReferenceOrderHandler = (option: any) => {
        setFormData((prevState) => ({
            ...prevState,
            ref_order_id: option?.value || '',
            ref_order_text: option?.label || '',
        }));
    };

    const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
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
    };

    const resetOrder = () => {
        setFormData({
            branch_id: initialBranchId,
            order_for: '',
            order_for_text: '',
            product_id: '',
            product_name: '',
            order_number: '',
            ref_order_id: '',
            ref_order_text: '',
            delivery_location: '',
            order_date: '',
            last_delivery_date: '',
            order_rate: '',
            total_order: '',
            order_type: '',
            notes: '',
        });
        setOrderDate(null);
        setLastDeliveryDate(null);
    };

    const handleSelectChange = (e: any) => {
        const nextOrderType = e.target.value;
        setFormData((prevState) => ({
            ...prevState,
            order_type: nextOrderType,
            ref_order_id: '',
            ref_order_text: '',
        }));
    };

    const getOppositeOrderType = (orderType: string) => {
        if (orderType === '1') return '2';
        if (orderType === '2') return '1';
        return '';
    };

    const referenceOrderType = getOppositeOrderType(formData.order_type);

    const handleSave = () => {
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

        if (formData.ref_order_id && !referenceOrderType && (formData.order_type === '1' || formData.order_type === '2')) {
            toast.info('Referenced order must be the opposite order type.');
            return;
        }

        const payload = {
            ...(isEditMode ? { id } : {}),
            branch_id: formData.branch_id,
            order_for: formData.order_for,
            product_id: formData.product_id,
            order_number: formData.order_number,
            ref_order_id: formData.ref_order_id || null,
            delivery_location: formData.delivery_location,
            order_date: formData.order_date,
            last_delivery_date: formData.last_delivery_date,
            order_rate: formData.order_rate,
            total_order: formData.total_order,
            order_type: formData.order_type,
            notes: formData.notes,
        };

        setButtonLoading(true);
        const action = isEditMode ? updateOrder : storeOrder;
        dispatch(action(payload, function (response) {
            setButtonLoading(false);
            if (response?.message) {
                toast.info(response.message);
            }
            if (response?.success && isEditMode) {
                navigate('/order/order-list');
            }
        }));
    };

    return (
        <div>
            <HelmetTitle title={isEditMode ? 'Edit Order' : 'Create Order'} />
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
                            value={formData.branch_id}
                        />
                    </div>
                </div>
                <div className=''>
                    <label htmlFor="">Order For</label>
                    <DdlMultiline onSelect={selectedLedgerOptionHandler} acType={''} value={selectedOrderFor}

                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const nextElement = document.getElementById('product_id');
                                if (nextElement) {
                                    nextElement.focus();
                                }
                            }
                        }}

                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8 mb-3">
                <div>
                    <label htmlFor="">Select Product</label>
                    <ProductDropdown onSelect={selectedProductOptionHandler} 
                    value={selectedProduct} id='product_id' name='product_id'
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const nextElement = document.getElementById('order_number');
                                if (nextElement) {
                                    nextElement.focus();
                                }
                            }
                        }}
                        className='h-10'
                        />

                </div>
                <InputElement id="order_number"
                    value={formData.order_number}
                    name="order_number"
                    placeholder={'Enter Order Number'}
                    label={'Enter Order Number'}
                    className={'py-1.5'}
                    onChange={handleOrderChange}

                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const nextElement = document.getElementById('delivery_location');
                            if (nextElement) {
                                nextElement.focus();
                            }
                        }
                    }}

                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8 mb-3">
                <InputElement id="delivery_location"
                    value={formData.delivery_location || ''}

                    name="delivery_location"
                    placeholder={'Delivery Location'}
                    label={'Delivery Location'}
                    className={'py-1.5'}
                    onChange={handleOrderChange}

                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const nextElement = document.getElementById('order_date');
                            if (nextElement) {
                                nextElement.focus();
                            }
                        }
                    }}

                />
                <div className='w-full'>
                    <label htmlFor="">Order Date</label>
                    <InputDatePicker
                        id='order_date'
                        name='order_date'
                        setCurrentDate={handleOrderDate}
                        className=" w-full p-1.5"
                        selectedDate={orderDate}
                        setSelectedDate={setOrderDate}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const nextElement = document.getElementById('last_delivery_date');
                                if (nextElement) {
                                    nextElement.focus();
                                }
                            }
                        }}
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8 mb-3">
                <div className='w-full'>
                    <label htmlFor="">Last Delivery Date</label>
                    <InputDatePicker
                        id='last_delivery_date'
                        name='last_delivery_date'
                        setCurrentDate={handleLastDeliveryDate}
                        className=" w-full p-1.5"
                        selectedDate={lastDeliveryDate}
                        setSelectedDate={setLastDeliveryDate}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const nextElement = document.getElementById('order_rate');
                                if (nextElement) {
                                    nextElement.focus();
                                }
                            }
                        }}
                    />
                </div>
                <InputElement id="order_rate"
                    value={formData.order_rate || ''}
                    name="order_rate"
                    placeholder={'Order Rate'}
                    label={'Order Rate'}
                    className={'py-1.5'}
                    onChange={handleOrderChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const nextElement = document.getElementById('total_order');
                            if (nextElement) {
                                nextElement.focus();
                            }
                        }
                    }}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8 mb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                    <InputElement id="total_order"
                        value={formData.total_order || ""}
                        name="total_order"
                        placeholder={'Total Order Qty'}
                        label={'Total Order Qty'}
                        className={'py-1.5'}
                        onChange={handleOrderChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const nextElement = document.getElementById('order_type');
                                if (nextElement) {
                                    nextElement.focus();
                                }
                            }
                        }}
                    />
                    <div>
                        <label className='mb-0 block'>Order Type</label>
                        <OrderTypes
                            onChange={handleSelectChange}
                            className='h-9 w-full'
                            value={formData.order_type}
                            id='order_type'
                            name='order_type'
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.blur();
                                    const nextElement = document.getElementById('notes');
                                    if (nextElement) {
                                        window.setTimeout(() => {
                                            nextElement.focus();
                                        }, 0);
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
                <InputElement id="notes"
                    value={formData.notes || ''}
                    name="notes"
                    placeholder={'Note'}
                    label={'Note'}
                    className={'py-1.5'}
                    onChange={handleOrderChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();

                            window.setTimeout(() => {
                                const selectInput = document.getElementById('ref_order_id');
                                const selectControl =
                                    selectInput?.closest('.cash-react-select-container')?.querySelector('.cash-react-select__control') ||
                                    document.querySelector('.cash-react-select-container .cash-react-select__control');
                                const nextElement = selectControl || selectInput;

                                if (nextElement instanceof HTMLElement) {
                                    nextElement.focus();
                                    nextElement.click();
                                }
                            }, 0);
                        }
                    }}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8 mb-3">
                <div>
                    <label htmlFor="">Reference Order</label>
                    <OrderDropdown
                        id="ref_order_id"
                        name="ref_order_id"
                        onSelect={selectedReferenceOrderHandler}
                        value={
                            formData.ref_order_id
                                ? {
                                    value: formData.ref_order_id,
                                    label: formData.ref_order_text,
                                }
                                : null
                        }
                        orderType={referenceOrderType}
                        refDirection="reference"
                        isDisabled={!referenceOrderType}
                    />
                </div>
                {/* <div className='flex items-end'>
                    <p className='text-sm text-gray-600 dark:text-gray-300'>
                        {formData.order_type === '1' && 'Purchase orders can reference sales orders.'}
                        {formData.order_type === '2' && 'Sales orders can reference purchase orders.'}
                        {formData.order_type !== '1' && formData.order_type !== '2' && 'Select order type first if you want to link this order to another order.'}
                    </p>
                </div> */}
            </div>
            <div className="grid grid-cols-3 gap-x-1 gap-y-1 w-2/4 md:w-2/5 mx-auto">
                <ButtonLoading
                    onClick={handleSave}
                    buttonLoading={buttonLoading}
                    label={isEditMode ? "Update" : "Save"}
                    className="whitespace-nowrap text-center mr-0 p-2"
                    icon={<FiSave className="text-white text-lg ml-2  mr-2" />}
                />
                <ButtonLoading
                    onClick={resetOrder}
                    buttonLoading={buttonLoading}
                    label="Reset"
                    className="whitespace-nowrap text-center mr-0 p-2"
                    icon={<FiRefreshCcw className="text-white text-lg ml-2  mr-2" />}
                />
                <Link to="/order/order-list" className="text-nowrap justify-center mr-0 p-2">
                    <FiHome className="text-white text-lg ml-2  mr-2" />
                    <span className='hidden md:block'>{'Back'}</span>
                </Link>
            </div>
        </div>
    )
}

export default AddOrder
