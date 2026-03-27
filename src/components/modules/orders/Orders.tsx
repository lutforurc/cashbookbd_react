import React, { useEffect, useState } from 'react';
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
import { render } from 'react-dom';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

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
  const [selectedLinkedOrder, setSelectedLinkedOrder] = useState<any | null>(null);

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
  };
  const openLinkedOrdersModal = (row: any) => {
    setSelectedLinkedOrder(row);
  };
  const closeLinkedOrdersModal = () => {
    setSelectedLinkedOrder(null);
  };
  useEffect(() => {
    setTableData(orders?.data?.data);
  }, [orders?.data]);

  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'order_for',
      header: 'Order for',
    },
    {
      key: 'product_name',
      header: (
        <p>
            <span className="block">Product</span>
            <span className="block">Trx. Qty</span>
        </p>
      ),
        render: (data: any) => (
            <p>
            <span className="block">{data.product_name}</span>
            <span className="block">{ thousandSeparator(data.trx_quantity, 0)}</span>
            </p>
        ),
    },

    {
      key: 'order_number',
      header: (
        <p>
          <span className="block">Order No.</span>
          <span className="block">Order Date</span>
        </p>
      ),
    //   headerClass: 'text-right',
    //   cellClass: 'text-right',
      render: (data: any) => (
        <p>
          {(data.linked_order_count ?? data.linked_orders_count ?? 0) > 0 ? (
            <button
              type="button"
              className="block text-left text-blue-600 hover:underline"
              onClick={() => openLinkedOrdersModal(data)}
            >
              {data.order_number}
            </button>
          ) : (
            <span className="block">{data.order_number}</span>
          )}
          <span className="block">{data.order_date}</span>
        </p>
      ),
    },
    {
      key: 'order_rate',
      header: (
        <p className="text-right">
          <span className="block">Order Rate</span>
          <span className="block">Order Qty</span>
        </p>
      ),
      render: (data: any) => (
        <p className="text-right">
          <span className="block">{data.order_rate}</span>
          <span className="block">
            {thousandSeparator(data.total_order, 0)}
          </span>
        </p>
      ),
    },
    {
      key: 'reference_order',
      header: (
        <p>
          <span className="block">Reference Order</span>
          <span className="block">Base Qty</span>
        </p>
      ),
      render: (data: any) => (
        <p>
          <span className="block">
            {data.reference_order?.order_number || data.ref_order_number || '-'}
          </span>
          <span className="block">
            {data.base_order_quantity != null || data.reference_order?.total_order != null
              ? thousandSeparator(
                  data.base_order_quantity ?? data.reference_order?.total_order ?? 0,
                  0,
                )
              : '-'}
          </span>
        </p>
      ),
    },
    {
      key: 'linked_summary',
      header: (
        <p className="text-right">
          <span className="block">Linked Orders</span>
          <span className="block">Linked Qty</span>
          <span className="block">Remaining Qty</span>
        </p>
      ),
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (data: any) => (
        <p className="text-right">
          <span className="block">
            {data.linked_order_count != null || data.linked_orders_count != null
              ? thousandSeparator(data.linked_order_count ?? data.linked_orders_count ?? 0, 0)
              : '-'}
          </span>
          <span className="block">
            {data.linked_quantity != null
              ? thousandSeparator(data.linked_quantity, 0)
              : '-'}
          </span>
          <span className="block">
            {data.remaining_quantity != null
              ? thousandSeparator(data.remaining_quantity, 0)
              : '-'}
          </span>
        </p>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      render: (data: any) => (
        <div className="flex justify-center items-center">
          <button onClick={() => {}} className="text-blue-500">
            <FiBook className="cursor-pointer" />
          </button>
          <button onClick={() => {}} className="text-blue-500  ml-2">
            <FiEdit2 className="cursor-pointer" />
          </button>
          <button onClick={() => {}} className="text-red-500 ml-2">
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

      {selectedLinkedOrder && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-3"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeLinkedOrdersModal();
            }
          }}
        >
          <div className="w-full max-w-3xl rounded-sm bg-white shadow-lg dark:bg-gray-800">
            <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Linked Orders
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Order No: {selectedLinkedOrder.order_number}
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-red-500 hover:underline"
                onClick={closeLinkedOrdersModal}
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <div className="mb-3 text-sm text-gray-700 dark:text-gray-300">
                Total Linked Orders:{' '}
                {thousandSeparator(
                  selectedLinkedOrder.linked_order_count ??
                    selectedLinkedOrder.linked_orders_count ??
                    0,
                  0,
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
                  <thead className="bg-gray-200 text-xs uppercase dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-center">Sl. No.</th>
                      <th className="px-3 py-2">Company Name</th>
                      <th className="px-3 py-2 text-right">Order Qty</th>
                      <th className="px-3 py-2 text-right">Order Rate</th>
                      <th className="px-3 py-2 text-right">Delivery Qty</th>
                      <th className="px-3 py-2 text-right">Remaining Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(selectedLinkedOrder.linked_orders) &&
                    selectedLinkedOrder.linked_orders.length > 0 ? (
                      selectedLinkedOrder.linked_orders.map((item: any, index: number) => (
                        <tr
                          key={item.id ?? index}
                          className="border-b bg-white dark:border-gray-700 dark:bg-gray-800"
                        >
                          <td className="px-3 py-2 text-center">
                            {item.serial ?? index + 1}
                          </td>
                          <td className="px-3 py-2">
                            {item.company_name || '-'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {thousandSeparator(item.order_qty ?? 0, 0)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {thousandSeparator(item.order_rate ?? 0, 2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {thousandSeparator(item.delivery_qty ?? 0, 0)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {thousandSeparator(item.remaining_qty ?? 0, 0)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-4 text-center text-gray-500 dark:text-gray-400"
                        >
                          No linked orders found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
