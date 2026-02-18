import React, { useEffect, useState } from 'react'
import HelmetTitle from '../../utils/others/HelmetTitle'
import { useDispatch, useSelector } from 'react-redux';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import OrderDropdown from '../../utils/utils-functions/OrderDropdown';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { orderType } from '../../utils/fields/DataConstant';
import { FiRefreshCcw } from 'react-icons/fi';
import { getAverageOrderPrice } from './ordersSlice';
import { toast } from 'react-toastify';
import checkNumber from '../../utils/utils-functions/numberCheck';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

const AveragePrice = (user: any) => {
    const categoryData = useSelector((state) => state.category);
    const branchDdlData = useSelector((state) => state.branchDdl);
    const orders = useSelector((state) => state.orders);
    const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
    const [dropdownData, setDropdownData] = useState<any[]>([]);
    const [buttonLoading, setButtonLoading] = useState(false);
    const [isSelected, setIsSelected] = useState<number | string>('');
    const [ddlCategory, setDdlCategory] = useState<any[]>([]);
    const [reportType, setReportType] = useState('');
    const [categoryId, setCategoryId] = useState<number | string | null>(null);
    const [orderData, setOrderData] = useState<{ isLoading: boolean; data?: any } | null>(null);
    const [averageData, setAverageData] = useState<averageData>({
        branchId: '',
        orderNumber: '',
        reportType: '',
    });

    interface averageData {
        branchId: string;
        orderNumber: string;
        reportType: string;
    }

    interface OptionType {
        value: string;
        label: string;
        additionalDetails: string;
    }
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(getDdlProtectedBranch());
        setIsSelected(user.user.branch_id);
        setAverageData({ ...averageData, branchId: user.user.branch_id });

        if (Array.isArray(categoryData)) {
            setDdlCategory(categoryData); // Use data if it's an array
            setCategoryId(ddlCategory[0]?.id);
        } else {
            setDdlCategory([]); // Fallback to empty array
        }

    }, []);

    const handleBranchChange = (e: any) => {
        setAverageData({ ...averageData, branchId: e.target.value });
    };


    useEffect(() => {
        setOrderData({ isLoading: orders.isLoading, data: orders.data });
    }, [orders?.data]);


    const handleActionButtonClick = (e: any) => {
        setButtonLoading(true);
        setButtonLoading(false);

        dispatch(getAverageOrderPrice(averageData, function (message) {
            if (message) {
                toast.info(message);
            }
        }));

    };

    useEffect(() => {
        if (
            branchDdlData?.protectedData?.data &&
            branchDdlData?.protectedData?.transactionDate
        ) {
            setDropdownData(branchDdlData?.protectedData?.data);
            setAverageData({ ...averageData, branchId: user.user.branch_id });
        } else {
        }
    }, [branchDdlData?.protectedData?.data]);

    const selectedOrderOptionHandler = (option: any) => {
        const key = 'orderNumber'; // Set the desired key dynamically
        setAverageData({ ...averageData, [key]: option.value });
    }

    const handleReportTypeChange = (e: any) => {
        const reportType = 'reportType'; // Set the desired key dynamically
        setAverageData({ ...averageData, [reportType]: e.target.value });
    }

    return (
        <>
            <HelmetTitle title={'Average Price'} />
            <div className="flex justify-between mb-2">
                {selectedOption && (
                    <div className="mt-4">
                        <p>Selected:</p>
                        <p className="">{selectedOption.label}</p>
                    </div>
                )}
                <div className="flex flex-col justify-center gap-1 w-full xl:w-2/4 ms-auto me-auto">
                    <div>
                        <div>
                            {' '}
                            <label htmlFor="">Select Branch</label>
                        </div>
                        <div className='w-full'>
                            {branchDdlData.isLoading == true ? <Loader /> : ''}
                            <BranchDropdown
                                onChange={handleBranchChange}
                                className="w-60 font-medium text-sm h-8"
                                branchDdl={dropdownData}
                            />
                        </div>
                    </div>
                    <div className=''>
                        <label htmlFor="">Select Order</label>
                        <OrderDropdown onSelect={selectedOrderOptionHandler} heightPx='32px' />
                    </div>
                    <div className=''>
                        <div>
                            {categoryData.isLoading == true ? <Loader /> : ''}
                            <DropdownCommon id="category_type_id"
                                name={'category_type_id'}
                                label="Report Type"
                                onChange={handleReportTypeChange}
                                className="h-8 bg-transparent"
                                data={orderType} />
                        </div>
                    </div>
                    <div className='w-full'>
                        <ButtonLoading
                            onClick={handleActionButtonClick}
                            buttonLoading={buttonLoading}
                            label="Run"
                            className="mt-0 md:mt-2 w-full h-8"
                            icon={<FiRefreshCcw className="text-white text-lg ml-2  mr-2" />}
                        />
                    </div>
                </div>
            </div>
            <div className='flex flex-col justify-center mt-4 gap-2 xl:w-2/4 ms-auto me-auto'>
                {orders?.isLoading == true ? <Loader /> : ''}
                {orderData?.data?.total_purchase_product ? (
                    <>
                        <div className='text-sm'>
                            <div className="grid items-center justify-center uppercase text-black dark:text-white font-bold decoration-double underline">
                                {orderData?.data?.total_purchase_product} Purchase Cost
                            </div>
                            <div className="grid grid-cols-2 gap-2 border-b-[1px] border-black dark:border-white pb-1 pt-1 text-black dark:text-white">
                                <div className="">
                                    {orderData?.data?.order_number ? (
                                        <a
                                            href={`/accounts/cash/receive/${orderData?.data?.order_number}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline">
                                            Total Quantity
                                        </a>
                                    ) : (
                                        'Total Quantity'
                                    )}


                                </div>
                                <div className="text-right">
                                    {thousandSeparator(orderData?.data?.total_purchase_qty, 0)}{" "}
                                    {orderData?.data?.product_unit}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 border-b-[1px] border-black dark:border-white pb-1 pt-1 text-black dark:text-white">
                                <div className="">Total Cost</div>
                                <div className="text-right">
                                    {thousandSeparator(
                                        orderData?.data?.total_purchase_cost,
                                        0
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 border-b-[1px] border-black dark:border-white pb-1 pt-1 text-black dark:text-white">
                                <div className="">Average Per Unit</div>
                                <div className="text-right">
                                    {thousandSeparator(
                                        (orderData?.data?.total_purchase_cost) /
                                        orderData?.data?.total_purchase_qty,
                                        3
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className='text-sm'>
                            <div className="mt-2 decoration-double grid underline items-center justify-center uppercase text-black dark:text-white font-bold">
                                {orderData?.data?.total_purchase_product} Increase / Decrease
                            </div>
                            <div className="">
                                <div className="grid grid-cols-2 gap-2 border-b-[1px] border-black dark:border-white pb-1 pt-1 text-black dark:text-white">
                                    <div className="">
                                        Total increase quantity
                                    </div>
                                    <div className="text-right">
                                        {orderData?.data?.total_increase_qty ? thousandSeparator(orderData?.data?.total_increase_qty, 0) : '-'}
                                        {orderData?.data?.total_increase_qty ? " " + orderData?.data?.product_unit : ""}
                                    </div>
                                </div>
                            </div>
                            <div className="">
                                <div className="grid grid-cols-2 gap-2 border-b-[1px] border-black dark:border-white pb-1 pt-1 text-black dark:text-white">
                                    <div className="">Total decrease quantity</div>
                                    <div className="text-right">
                                        {orderData?.data?.total_decrease_qty ? thousandSeparator(orderData?.data?.total_decrease_qty, 0) : '-'}
                                        {orderData?.data?.total_decrease_qty ? " " + orderData?.data?.product_unit : ""}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='text-sm'>
                            <div className="mt-2 decoration-double grid underline items-center justify-center uppercase text-black dark:text-white font-bold">
                                {orderData?.data?.total_purchase_product} Others Cost
                            </div>
                            { }
                            <div className="">
                                {orderData?.data?.others_expense && (
                                    orderData?.data?.others_expense.map((item: any) => (
                                        <>
                                            <div className="grid grid-cols-2 gap-2 border-b-[1px] border-black dark:border-white pb-1 pt-1 text-black dark:text-white">
                                                <div className="">{item.name}</div>
                                                <div className="text-right">
                                                    {thousandSeparator(item.debit, 0)}{" "}
                                                </div>
                                            </div>
                                        </>
                                    ))
                                )}
                                <div className="grid grid-cols-2 gap-2 border-b-[1px] border-black dark:border-white pb-1 pt-1 text-black dark:text-white">
                                    <div className="">Grand Total Cost</div>
                                    <div className="text-right">
                                        {thousandSeparator(
                                            orderData?.data?.grand_total_expense,
                                            0
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 border-b-[1px] border-black dark:border-white pb-1 pt-1 text-black dark:text-white">
                                    <div className="">Net per unit</div>
                                    <div className="text-right">
                                        {thousandSeparator(
                                            (orderData?.data?.grand_total_expense) /
                                            orderData?.data?.total_purchase_qty,
                                            3
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (<div className='mb-10 grid items-center justify-center'>No Purchase Details Found</div>)}






            </div>
        </>
    )
}

export default AveragePrice
