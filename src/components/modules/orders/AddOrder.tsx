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
import OrderItemsGrid, { OrderLine, makeOrderLine } from './OrderItemsGrid'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import useCtrlS from '../../utils/hooks/useCtrlS'
import DropdownCommon from '../../utils/utils-functions/DropdownCommon'
import { ORDER_STATUS } from '../../constant/constant/variables'
import httpService from '../../services/httpService'
import { API_ORDERS_DDL_URL } from '../../services/apiRoutes'
// import Link from '../../../utils/others/Link';

const normalizeSuggestionItems = (items: any) =>
    Array.isArray(items)
        ? items
            .map((item: any) => String(item ?? '').trim())
            .filter((item: string, index: number, arr: string[]) => item && arr.indexOf(item) === index)
        : [];

const getOrderSuggestionValue = (row: any, field: 'order_number' | 'delivery_location' | 'notes') => {
    if (field === 'order_number') return row?.order_number || row?.label || '';
    if (field === 'delivery_location') return row?.delivery_location || row?.label_6 || '';
    return row?.notes || row?.label_9 || '';
};

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
    const settings = useSelector((state: any) => state.settings);
    // Branch-level setting: this branch puts several products on one order.
    // Off (the default) keeps the original single-product form exactly as it was.
    const multiProductOrder =
        Number(settings?.data?.branch?.multi_product_order) === 1;
    const [items, setItems] = useState<OrderLine[]>([makeOrderLine()]);
    const [dropdownData, setDropdownData] = useState<any[]>([]);
    const [orderDate, setOrderDate] = useState<Date | null>(null); // Define state with type
    const [lastDeliveryDate, setLastDeliveryDate] = useState<Date | null>(null); // Define state with type
    const [buttonLoading, setButtonLoading] = useState(false);
    const [referenceOrderFocusTrigger, setReferenceOrderFocusTrigger] = useState(0);
    const [orderFieldSuggestions, setOrderFieldSuggestions] = useState<Record<string, string[]>>({
        order_number: [],
        delivery_location: [],
        notes: [],
    });
    const [orderSuggestionRows, setOrderSuggestionRows] = useState<Record<string, any[]>>({
        order_number: [],
        delivery_location: [],
        notes: [],
    });

    const toValidDate = (value: string | null | undefined) => {
        if (!value || !String(value).trim()) {
            return null;
        }

        const parsedDate = dayjs(value);
        return parsedDate.isValid() ? parsedDate.toDate() : null;
    };

    interface FormData {
        branch_id: string;
        order_for: string;
        order_for_text: string;
        product_id: string;
        product_name: string;
        status: string;
        order_number: string;
        ref_order_id: string;
        ref_order_text: string;
        delivery_location: string | null;
        order_date: string | null;
        last_delivery_date: string | null;
        order_rate: string | null;
        contract_order_qty: string | null;
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
        contract_order_qty: '',
        total_order: '',
        order_type: '',
        status: '1',
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
            contract_order_qty: locationOrder?.contract_order_qty?.toString?.() ?? prev.contract_order_qty,
            total_order: locationOrder?.total_order?.toString?.() ?? prev.total_order,
            order_type: locationOrder?.order_type?.toString?.() ?? prev.order_type,
            status: locationOrder?.status?.toString?.() ?? prev.status,
            notes: locationOrder?.notes ?? prev.notes,
        }));

        setOrderDate(toValidDate(locationOrder?.order_date));
        setLastDeliveryDate(toValidDate(locationOrder?.last_delivery_date));
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

    const applyMatchedOrderSuggestion = (
        field: 'order_number' | 'delivery_location' | 'notes',
        value: string | null,
        rows: any[],
    ) => {
        const normalizedValue = String(value ?? '').trim().toLowerCase();
        if (!normalizedValue) return;

        const matchedRow = rows.find((row) =>
            String(getOrderSuggestionValue(row, field)).trim().toLowerCase() === normalizedValue,
        );

        if (!matchedRow) return;

        const matchedNote = getOrderSuggestionValue(matchedRow, 'notes');
        const matchedDeliveryLocation = getOrderSuggestionValue(matchedRow, 'delivery_location');

        setFormData((prev) => ({
            ...prev,
            notes: matchedNote || prev.notes,
            delivery_location:
                field === 'order_number' && matchedDeliveryLocation
                    ? matchedDeliveryLocation
                    : prev.delivery_location,
        }));
    };

    const loadOrderFieldSuggestions = async (field: 'order_number' | 'delivery_location' | 'notes', value: string | null) => {
        const query = String(value ?? '').trim();
        if (!query) {
            setOrderFieldSuggestions((prev) => ({ ...prev, [field]: [] }));
            setOrderSuggestionRows((prev) => ({ ...prev, [field]: [] }));
            return;
        }

        try {
            const response = await httpService.get(API_ORDERS_DDL_URL, {
                params: {
                    q: query,
                },
            });
            const rows = Array.isArray(response?.data?.data?.data)
                ? response.data.data.data
                : [];
            const suggestionItems = rows.map((row: any) => getOrderSuggestionValue(row, field));

            setOrderFieldSuggestions((prev) => ({
                ...prev,
                [field]: normalizeSuggestionItems(suggestionItems),
            }));
            setOrderSuggestionRows((prev) => ({
                ...prev,
                [field]: rows,
            }));
            applyMatchedOrderSuggestion(field, query, rows);
        } catch (error) {
            setOrderFieldSuggestions((prev) => ({ ...prev, [field]: [] }));
            setOrderSuggestionRows((prev) => ({ ...prev, [field]: [] }));
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadOrderFieldSuggestions('order_number', formData.order_number);
        }, 250);

        return () => window.clearTimeout(timer);
    }, [formData.branch_id, formData.order_number]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadOrderFieldSuggestions('delivery_location', formData.delivery_location);
        }, 250);

        return () => window.clearTimeout(timer);
    }, [formData.branch_id, formData.delivery_location]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadOrderFieldSuggestions('notes', formData.notes);
        }, 250);

        return () => window.clearTimeout(timer);
    }, [formData.branch_id, formData.notes]);

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
            ref_order_text:
                editData?.ref_order_text ??
                editData?.reference_order?.order_number ??
                editData?.ref_order_number ??
                '',
            delivery_location: editData?.delivery_location ?? '',
            order_date: editData?.order_date ?? '',
            last_delivery_date: editData?.last_delivery_date ?? '',
            order_rate: editData?.order_rate?.toString?.() ?? '',
            contract_order_qty: editData?.contract_order_qty?.toString?.() ?? '',
            total_order: editData?.total_order?.toString?.() ?? '',
            order_type: editData?.order_type?.toString?.() ?? '',
            status: editData?.status?.toString?.() ?? '1',
            notes: editData?.notes ?? '',
        });


        // Product lines. An order saved before the split, or by a single-product
        // branch, comes back with exactly one — which is a valid grid too.
        const savedItems = Array.isArray(editData?.items) ? editData.items : [];
        setItems(
            savedItems.length
                ? savedItems.map((item: any) =>
                    makeOrderLine({
                        id: Number(item.id) || undefined,
                        product_id: item.product_id?.toString?.() ?? '',
                        product_name: item.product_name ?? '',
                        order_rate: item.order_rate?.toString?.() ?? '',
                        total_order: item.total_order?.toString?.() ?? '',
                        contract_order_qty: item.contract_order_qty?.toString?.() ?? '',
                        delivered_qty: Number(item.delivered_qty) || 0,
                    }),
                )
                : [
                    makeOrderLine({
                        product_id: editData?.product_id?.toString?.() ?? '',
                        product_name: editData?.product_name ?? '',
                        order_rate: editData?.order_rate?.toString?.() ?? '',
                        total_order: editData?.total_order?.toString?.() ?? '',
                        contract_order_qty: editData?.contract_order_qty?.toString?.() ?? '',
                    }),
                ],
        );

        setOrderDate(toValidDate(editData?.order_date));
        setLastDeliveryDate(toValidDate(editData?.last_delivery_date));
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

        if (name === 'order_number' || name === 'delivery_location' || name === 'notes') {
            applyMatchedOrderSuggestion(name, value, orderSuggestionRows[name] || []);
        }
    };

    const handleOrderDate = (e: any) => {
        const startD = e ? dayjs(e).format('YYYY-MM-DD') : '';
        const key = 'order_date'; // Set the desired key dynamically
        setFormData({ ...formData, [key]: startD });
    };

    const handleLastDeliveryDate = (e: any) => {
        const startD = e ? dayjs(e).format('YYYY-MM-DD') : '';
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
            contract_order_qty: '',
            total_order: '',
            order_type: '',
            notes: '',
            status: '1',
        });
        setItems([makeOrderLine()]);
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

        if (!formData.order_date || !String(formData.order_date).trim()) {
            toast.error('Order date is required.');
            const orderDateElement = document.getElementById('order_date');
            if (orderDateElement) {
                orderDateElement.focus();
            }
            return;
        }

        if (!formData.order_type || !String(formData.order_type).trim()) {
            toast.error('Please select Order Type');
            focusNextField('order_type');
            return;
        }

        // Multi-product branches send their grid; single-product branches send
        // exactly the payload they always have, so nothing changes for them.
        const filledLines = items.filter((line) => line.product_id);

        if (multiProductOrder) {
            if (!filledLines.length) {
                toast.error('Please add at least one product.');
                return;
            }

            // Zero is a legitimate quantity — an order can be raised against a
            // contract before the figure is agreed. Only a negative one is not.
            const badQty = filledLines.find((line) => Number(line.total_order) < 0);
            if (badQty) {
                toast.error(`Order quantity cannot be negative for ${badQty.product_name || 'a product'}.`);
                return;
            }

            const productIds = filledLines.map((line) => line.product_id);
            if (new Set(productIds).size !== productIds.length) {
                toast.error('The same product cannot be added twice on one order.');
                return;
            }
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
            contract_order_qty: formData.contract_order_qty || null,
            total_order: formData.total_order,
            order_type: formData.order_type,
            status: formData.status || '1',
            notes: formData.notes,
            ...(multiProductOrder
                ? {
                    items: filledLines.map((line) => ({
                        product_id: line.product_id,
                        order_rate: line.order_rate || 0,
                        total_order: line.total_order,
                        contract_order_qty: line.contract_order_qty || null,
                    })),
                }
                : {}),
        };

        setButtonLoading(true);
        const action = isEditMode ? updateOrder : storeOrder;
        dispatch(action(payload, function (response) {
            setButtonLoading(false);
            if (response?.message) {
                toast.info(response.message);
            }
            if (response?.success && !isEditMode) {
                resetOrder();
            }
            if (response?.success && isEditMode) {
                navigate('/order/order-list', { state: { restoreOrdersList: true } });
            }
        }));
    };

    const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prevFormData) => ({
            ...prevFormData,
            [name]: value,
        }));

    };

    const focusNextField = (nextFieldId: string) => {
        const nextElement = document.getElementById(nextFieldId);
        if (nextElement) {
            window.setTimeout(() => {
                nextElement.focus();
            }, 0);
        }
    };

    useCtrlS(handleSave);
    return (
        <div>
            <HelmetTitle title={isEditMode ? 'Edit Order' : 'Create Order'} />
            {/* The whole order header is one four-column grid. Most fields take
                half the width (span 2); the four that used to sit two-to-a-half
                take a quarter (span 1). Hidden fields are simply not rendered,
                so the grid closes up instead of leaving a hole. */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 mb-3 md:grid-cols-4">
                <div className="md:col-span-2">
                    <div>
                        {' '}
                        <label htmlFor="">Select Branch</label>
                    </div>
                    <div className='w-full'>
                        {branchDdlData.isLoading == true ? <Loader /> : ''}
                        <BranchDropdown
                            id="branch_id"
                            onChange={handleBranchChange}
                            className="w-full font-medium text-sm px-2 h-10"
                            branchDdl={dropdownData}
                            value={formData.branch_id}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    focusNextField('order_for');
                                }
                            }}
                        />
                    </div>
                </div>
                <div className='md:col-span-2'>
                    <label htmlFor="">Order For</label>
                    <DdlMultiline id="order_for" onSelect={selectedLedgerOptionHandler} acType={''} value={selectedOrderFor}
                        className='h-10'

                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                focusNextField('product_id');
                            }
                        }}

                    />
                </div>
                {/* In multi-product mode the products live in the grid below, so
                    this cell is not rendered at all and the grid closes up. */}
                {multiProductOrder ? null : (
                    <div className="md:col-span-2">
                        <label htmlFor="">Select Product</label>
                        <ProductDropdown onSelect={selectedProductOptionHandler}
                            value={selectedProduct} id='product_id' name='product_id'
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    focusNextField('order_number');
                                }
                            }}
                            className='h-10'
                        />

                    </div>
                )}
                <div className="md:col-span-2">
                    <InputElement id="order_number"
                        value={formData.order_number}
                        name="order_number"
                        placeholder={'Enter Order Number'}
                        label={'Enter Order Number'}
                        className={'h-10'}
                        list="order-number-suggestions"
                        autoComplete="off"
                        onChange={handleOrderChange}

                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                focusNextField('delivery_location');
                            }
                        }}

                    />
                </div>
                <datalist id="order-number-suggestions">
                    {orderFieldSuggestions.order_number.map((item) => (
                        <option key={item} value={item} />
                    ))}
                </datalist>
                <div className="md:col-span-2">
                    <InputElement id="delivery_location"
                        value={formData.delivery_location || ''}

                        name="delivery_location"
                        placeholder={'Delivery Location'}
                        label={'Delivery Location'}
                        className={'h-10'}
                        list="order-delivery-location-suggestions"
                        autoComplete="off"
                        onChange={handleOrderChange}

                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                focusNextField('order_date');
                            }
                        }}

                    />
                </div>
                <datalist id="order-delivery-location-suggestions">
                    {orderFieldSuggestions.delivery_location.map((item) => (
                        <option key={item} value={item} />
                    ))}
                </datalist>
                <div className='w-full md:col-span-2'>
                    <label htmlFor="">Order Date</label>
                    <InputDatePicker
                        id='order_date'
                        name='order_date'
                        setCurrentDate={handleOrderDate}
                        className=" w-full px-1.5 h-10"
                        selectedDate={orderDate}
                        setSelectedDate={setOrderDate}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                e.currentTarget.blur();
                                focusNextField('last_delivery_date');
                            }
                        }}
                    />
                </div>
                <div className='w-full md:col-span-2'>
                    <label htmlFor="">Last Delivery Date</label>
                    <InputDatePicker
                        id='last_delivery_date'
                        name='last_delivery_date'
                        setCurrentDate={handleLastDeliveryDate}
                        className=" w-full px-1.5 h-10"
                        selectedDate={lastDeliveryDate}
                        setSelectedDate={setLastDeliveryDate}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                e.currentTarget.blur();
                                focusNextField('total_order');
                            }
                        }}
                    />
                </div>
                {multiProductOrder ? null : (
                    // A fragment, not a wrapper: both fields stay cells of the
                    // outer grid rather than sharing one.
                    <>
                        <InputElement id="total_order"
                            value={formData.total_order || ""}
                            name="total_order"
                            placeholder={'Total Order Qty'}
                            label={'Total Order Qty'}
                            className={'h-10'}
                            onChange={handleOrderChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    focusNextField('order_rate');
                                }
                            }}
                        />
                        <InputElement id="order_rate"
                            value={formData.order_rate || ''}
                            name="order_rate"
                            placeholder={'Order Rate'}
                            label={'Order Rate'}
                            className={'h-10'}
                            onChange={handleOrderChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    focusNextField('contract_order_qty');
                                }
                            }}
                        />

                    </>
                )}
                {multiProductOrder ? null : (
                    <InputElement id="contract_order_qty"
                        value={formData.contract_order_qty || ""}
                        name="contract_order_qty"
                        placeholder={'Contract Order Qty'}
                        label={'Contract Order Qty'}
                        className={'h-10'}
                        onChange={handleOrderChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                focusNextField('order_type');
                            }
                        }}
                    />
                )}

                {/* Single-product mode pairs this with Contract Order Qty, so it
                    takes a quarter. With the product fields gone it would leave
                    a gap beside Note, so it widens to a half. */}
                <div className={multiProductOrder ? 'md:col-span-2' : ''}>
                    <label className='mb-0 block'>Order Type</label>
                    <OrderTypes
                        onChange={handleSelectChange}
                        className='h-10 w-full'
                        value={formData.order_type}
                        id='order_type'
                        name='order_type'
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                e.currentTarget.blur();
                                focusNextField('notes');
                            }
                        }}
                    />
                </div>
                <div className="md:col-span-2">
                    <InputElement
                        id="notes"
                        value={formData.notes || ''}
                        name="notes"
                        placeholder={'Note'}
                        label={'Note'}
                        className={'h-10'}
                        list="order-note-suggestions"
                        autoComplete="off"
                        onChange={handleOrderChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                e.currentTarget.blur();
                                focusNextField('ref_order_id');
                                setReferenceOrderFocusTrigger((prev) => prev + 1);
                            }
                        }}
                    />
                </div>
                <datalist id="order-note-suggestions">
                    {orderFieldSuggestions.notes.map((item) => (
                        <option key={item} value={item} />
                    ))}
                </datalist>
                <div className="md:col-span-2">
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
                        heightPx="2.5rem"
                        orderType={referenceOrderType}
                        refDirection="reference"
                        isDisabled={!referenceOrderType}
                        focusTrigger={referenceOrderFocusTrigger}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                e.currentTarget.blur();
                                focusNextField('status');
                            }
                        }}
                    />
                </div>
                <div className="md:col-span-2">
                    <DropdownCommon
                        id="status"
                        name={'status'}
                        label="Order Status"
                        onChange={handleOnSelectChange}
                        className="h-10 bg-transparent"
                        value={formData?.status?.toString() ?? ''}
                        data={ORDER_STATUS}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                e.currentTarget.blur();
                                focusNextField('save_btn');
                            }
                        }}
                    />

                </div>
            </div>

            {multiProductOrder ? (
                <OrderItemsGrid
                    lines={items}
                    onChange={setItems}
                    disabled={buttonLoading}
                    focusNextField={focusNextField}
                />
            ) : null}

            <div className="grid grid-cols-3 gap-x-1 gap-y-1 w-2/4 md:w-2/5 mx-auto">
                <ButtonLoading
                    id='save_btn'
                    name='save_btn'
                    onClick={handleSave}
                    buttonLoading={buttonLoading}
                    label={isEditMode ? "Update" : "Save"}
                    className="whitespace-nowrap text-center mr-0 p-2"
                    icon={<FiSave className="text-white text-lg ml-2  mr-2" />}
                />
                <ButtonLoading
                    id='reset_btn'
                    name='reset_btn'
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
