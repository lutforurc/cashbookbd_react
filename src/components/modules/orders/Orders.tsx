import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { getOrders } from './ordersSlice';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import SearchInput from '../../utils/fields/SearchInput';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import Pagination from '../../utils/utils-functions/Pagination';
import Link from '../../utils/others/Link';
import { FiBook, FiEdit2, FiTrash2 } from 'react-icons/fi';
import checkNumber from '../../utils/utils-functions/numberCheck';
import OrderTypes from '../../utils/utils-functions/OrderTypes';

const Orders = () => {
    const orders = useSelector((state) => state.orders);
    const dispatch = useDispatch();
    const [totalPages, setTotalPages] = useState(0);
    const [tableData, setTableData] = useState<any[]>([]);
    const [buttonLoading, setButtonLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [search, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [orderType, setOrderType] = useState('');


    useEffect(() => {
        dispatch(getOrders({ page, perPage, search, orderType }));
        setTotalPages(Math.ceil(orders?.data?.total / perPage));
        setTableData(orders?.data?.data);
    }, [page, perPage, orderType, orders?.data?.total]);


    const handleSearchButton = (e: any) => {
        setCurrentPage(1);
        setPage(1);
        dispatch(getOrders({ page, perPage, search, orderType }));
        if (orders?.data?.total >= 0) {
            setTotalPages(Math.ceil(orders?.data?.total / perPage));
            setTableData(orders?.data?.data);
        }
    };
    const handleSelectChange = (page: any) => {
        setPerPage(page.target.value);
        setPage(1);
        setCurrentPage(1);
        setTotalPages(Math.ceil(orders?.data?.total / perPage));
        setTableData(orders?.data?.data);
    };
    const handlePageChange = (page: any) => {
        setPerPage(perPage);
        setPage(page);
        setCurrentPage(page);
        setTotalPages(Math.ceil(orders?.data?.last_page));
        setTableData(orders.data.data);
    };

    const handleOrderChange = (e: any) => {
        setOrderType(e.target.value);
    }
    useEffect(() => {
        setTableData(orders?.data?.data);
    }, [orders?.data]);

    const columns = [
        {
            key: 'serial',
            header: 'Sl. No.',
            is_serial: true,
            is_date: false,
            is_number: false,
        },
        {
            key: 'product_name',
            header: 'Product & Clients',
            is_serial: false,
            is_date: false,
            is_number: false,
            render: (product_name: string, row: { order_for: string }) => (
                <>
                    {product_name ? <span className="text-sm text-green-600"> {product_name}</span> : ''}
                    <span className="text-sm text-gray-500 dark:text-gray-500 block">{row.order_for}</span>
                </>
            ),
        },
        {
            key: 'order_number',
            header: 'Order No. & Date',
            is_serial: false,
            is_date: false,
            is_number: false,
            render: (order_number: string, row: { order_date: string }) => (
                <>
                    {order_number ? <span className="text-sm text-green-600"> {order_number}</span> : ''}
                    <span className="text-sm text-gray-500 dark:text-gray-500 block">{row.order_date}</span>
                </>
            ),
        },
        {
            key: 'order_rate',
            header: 'Order Rate & Order Qty.',
            is_serial: false,
            is_date: false,
            is_number: true,
            render: (order_rate: string, row: { total_order: string }) => (
                <div className='text-right'>

                    {order_rate ? <span className="text-sm "> {order_rate}</span> : ''}
                    <span className="text-sm text-gray-500 dark:text-gray-500 block">{checkNumber(row.total_order)}</span>

                </div>
            ),
        },

        {
            key: 'trx_quantity',
            header: 'Trx Qty.',
            is_serial: false,
            is_date: false,
            is_number: true,
        },
        {
            key: 'action',
            header: 'Action',
            is_serial: true,
            is_date: false,
            is_number: false,
            render: (data: any) => (
                <div className="flex justify-center items-center">
                    <button onClick={() => { }} className="text-blue-500">
                        <FiBook className="cursor-pointer" />
                    </button>
                    <button onClick={() => { }} className="text-blue-500  ml-2">
                        <FiEdit2 className="cursor-pointer" />
                    </button>
                    <button onClick={() => { }} className="text-red-500 ml-2">
                        <FiTrash2 className="cursor-pointer" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <HelmetTitle title={'Orders List'} />
            <div className="flex overflow-x-auto justify-between mb-1">
                <div className="flex">
                    <SelectOption
                        onChange={handleSelectChange}
                        className="mr-1 md:mr-2"
                    />
                    <OrderTypes onChange={handleOrderChange} className="mr-1 md:mr-2" />
                    <SearchInput
                        search={search}
                        setSearchValue={setSearchValue}
                        className="text-nowrap"
                    />
                    <ButtonLoading
                        onClick={handleSearchButton}
                        buttonLoading={buttonLoading}
                        label="Search"
                        className="whitespace-nowrap"
                    />
                </div>
                <Link to="/orders/add-order" className="text-nowrap">
                    New orders
                </Link>
            </div>

            <div className="relative overflow-x-auto">
                {orders.isLoading == true ? <Loader /> : ''}
                <Table columns={columns} data={tableData} className="" />

                {/* Pagination Controls */}
                {totalPages > 1 ? (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        handlePageChange={handlePageChange}
                    />
                ) : (
                    ''
                )}
            </div>

        </div>
    )
}

export default Orders
