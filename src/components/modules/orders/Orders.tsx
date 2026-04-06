import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getOrders } from './ordersSlice';
import { useNavigate } from 'react-router-dom';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import SearchInput from '../../utils/fields/SearchInput';
import { ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import Pagination from '../../utils/utils-functions/Pagination';
import Link from '../../utils/others/Link';
import { FiBook, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import OrderTypes from '../../utils/utils-functions/OrderTypes';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import OrdersPrint from './OrdersPrint';
import { useReactToPrint } from 'react-to-print';
import InputElement from '../../utils/fields/InputElement';

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickFirstNumber = (source: any, keys: string[]) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
};

const Orders = () => {
  const orders = useSelector((state) => state.orders);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [totalPages, setTotalPages] = useState(0);
  const [tableData, setTableData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [printRowsPerPage, setPrintRowsPerPage] = useState(12);
  const [printFontSize, setPrintFontSize] = useState(12);
  const [search, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [orderType, setOrderType] = useState('');
  const [selectedLinkedOrder, setSelectedLinkedOrder] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

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
  const handlePrintRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value, 10);
    setPrintRowsPerPage(Number.isFinite(value) && value > 0 ? value : 12);
  };
  const handlePrintFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value, 10);
    setPrintFontSize(Number.isFinite(value) && value > 0 ? value : 12);
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

  const derivedSummary = useMemo(() => {
    return (Array.isArray(tableData) ? tableData : []).reduce(
      (acc, row: any) => {
        acc.totalOrder += toNumber(row?.total_order);
        acc.baseOrderQuantity += toNumber(
          row?.base_order_quantity ?? row?.reference_order?.total_order,
        );
        acc.linkedQuantity += toNumber(row?.linked_quantity);
        acc.remainingQuantity += toNumber(row?.remaining_quantity);
        return acc;
      },
      {
        totalOrder: 0,
        baseOrderQuantity: 0,
        linkedQuantity: 0,
        remainingQuantity: 0,
      },
    );
  }, [tableData]);

  const apiSummarySource = useMemo(() => {
    return (
      orders?.data?.summary ??
      orders?.data?.totals ??
      orders?.data?.meta?.summary ??
      orders?.data?.meta?.totals ??
      null
    );
  }, [orders?.data]);

  const summary = useMemo(() => {
    return {
      totalOrder:
        pickFirstNumber(apiSummarySource, ['total_order', 'trx_quantity', 'order_quantity']) ??
        derivedSummary.totalOrder,
      baseOrderQuantity:
        pickFirstNumber(apiSummarySource, ['base_order_quantity', 'reference_order_quantity']) ??
        derivedSummary.baseOrderQuantity,
      linkedQuantity:
        pickFirstNumber(apiSummarySource, ['linked_quantity', 'total_linked_quantity']) ??
        derivedSummary.linkedQuantity,
      remainingQuantity:
        pickFirstNumber(apiSummarySource, ['remaining_quantity', 'total_remaining_quantity']) ??
        derivedSummary.remainingQuantity,
      fromApi: Boolean(apiSummarySource),
    };
  }, [apiSummarySource, derivedSummary]);

  const footerRows = useMemo(
    () => [
      [
        {
          label: summary.fromApi ? 'Grand Total' : 'Page Summary',
          colSpan: 4,
          className: 'text-right',
        },
        {
          label: `Order Qty ${thousandSeparator(summary.totalOrder, 0)}`,
          className: 'text-right',
        },
        {
          label: `Base Qty ${thousandSeparator(summary.baseOrderQuantity, 0)}`,
          className: 'text-right',
        },
        {
          label: (
            <p className="text-right">
              <span className="block">{`Linked Qty ${thousandSeparator(summary.linkedQuantity, 0)}`}</span>
              <span className="block">{`Remaining Qty ${thousandSeparator(summary.remainingQuantity, 0)}`}</span>
            </p>
          ),
          className: 'text-right',
        },
        {
          label: '',
        },
      ],
    ],
    [summary],
  );

  const orderTypeLabel = useMemo(() => {
    if (orderType === '1') return 'Purchase Order';
    if (orderType === '2') return 'Sales Order';
    return 'All';
  }, [orderType]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Orders List Print',
    removeAfterPrint: true,
  });

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
          <span className="block">{thousandSeparator(data.trx_quantity, 0)}</span>
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
              className="block text-left hover:underline font-semibold text-green-500 dark:text-yellow-300"
              onClick={() => openLinkedOrdersModal(data)}
            >
              <span className=''> {data.order_number}</span>
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
          <button onClick={() => { }} className="text-blue-500">
            <FiBook className="cursor-pointer" />
          </button>
          <button onClick={() => navigate(`/orders/edit/${data.id}`, { state: { order: data } })} className="text-blue-500  ml-2">
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
        <div className="flex items-end gap-2 overflow-x-auto">
          <SelectOption
            onChange={handleSelectChange}
            className="h-9 shrink-0"
          />
          <OrderTypes onChange={handleOrderChange} className="h-9 shrink-0" />
          <div className="flex flex-nowrap items-end shrink-0 min-w-[320px]">
            <SearchInput
              search={search}
              setSearchValue={setSearchValue}
              className="text-nowrap h-9 min-w-[220px]"
            />
            <ButtonLoading
              onClick={handleSearchButton}
              buttonLoading={buttonLoading}
              label="Search"
              className="whitespace-nowrap h-9"
            />
          </div>
          <div className="ml-2">
            <InputElement
              id="printRowsPerPage"
              name="printRowsPerPage"
              label=""
              value={String(printRowsPerPage)}
              onChange={handlePrintRowsChange}
              type="text"
              className="h-9 w-14"
            />
          </div>
          <div className="ml-2">
            <InputElement
              id="printFontSize"
              name="printFontSize"
              label=""
              value={String(printFontSize)}
              onChange={handlePrintFontSizeChange}
              type="text"
              className="h-9 w-14"
            />
          </div>
          <PrintButton
            onClick={handlePrint}
            label="Print"
            className="ml-2 pt-[0.45rem] pb-[0.45rem] h-9 whitespace-nowrap"
          />
        </div>
        <Link to="/orders/add-order" className="text-nowrap">
          New orders
        </Link>
      </div>

      <div className="relative overflow-x-auto">
        {orders.isLoading == true ? <Loader /> : ''}
        <Table columns={columns} data={tableData} className="" footerRows={footerRows} />

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

      <div className="hidden">
        <OrdersPrint
          ref={printRef}
          rows={tableData || []}
          title="Orders List Print"
          searchText={search}
          orderTypeLabel={orderTypeLabel}
          summary={summary}
          rowsPerPage={Number(printRowsPerPage)}
          fontSize={Number(printFontSize)}
        />
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
          <div className="w-full max-w-3xl border border-slate-200 bg-slate-50 shadow-2xl ring-1 ring-black/5 dark:border-slate-600 dark:bg-slate-800 dark:ring-white/10">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-700">
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
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 dark:text-gray-300 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:focus:ring-red-500/30"
                aria-label="Close linked orders modal"
                onClick={closeLinkedOrdersModal}
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 dark:bg-slate-800">
              <div className="mb-3 text-sm text-gray-700 dark:text-gray-300">
                Total Linked Orders:{' '}
                {thousandSeparator(
                  selectedLinkedOrder.linked_order_count ??
                  selectedLinkedOrder.linked_orders_count ??
                  0,
                  0,
                )}
              </div>

              <div className="overflow-x-auto border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900">
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
