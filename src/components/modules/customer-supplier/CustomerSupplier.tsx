import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiBook, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getCoal4 } from '../chartofaccounts/levelfour/coal4Sliders';
import HelmetTitle from '../../utils/others/HelmetTitle';
import SelectOption from '../../utils/utils-functions/SelectOption';
import SearchInput from '../../utils/fields/SearchInput';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import Pagination from '../../utils/utils-functions/Pagination';
import Table from '../../utils/others/Table';
import Link from '../../utils/others/Link';
import { getCustomer } from './customerSlice';

const CustomerSupplier = () => {
  const coal4 = useSelector((state) => state.coal4);
  const customers = useSelector((state) => state.customers);
  const dispatch = useDispatch();
  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    setIsDataLoading(true);
    dispatch(getCustomer({ page, perPage, search })).finally(() =>
      setIsDataLoading(false),
    );
  }, [page, perPage]);

  useEffect(() => {
    if (customers.customer?.data) {
      setTableData(customers.customer.data);
      setTotalPages(customers.customer.last_page || 0);
      setCurrentPage(customers.customer.current_page || 1);
    }
  }, [customers.customer]);

  const handleSearchButton = () => {
    setPage(1);
  };

  const handleSelectChange = (e: any) => {
    setPerPage(Number(e.target.value));
    setPage(1);
  };
  const handlePageChange = (newPage: any) => {
    setPage(newPage);
  };

  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      width: '100px',
    },
    {
      key: 'name',
      header: 'Name',
    },
    {
      key: 'manual_address',
      header: 'Address',
    },
    {
      key: 'mobile',
      header: 'Mobile',
      render: (data: any) => {
        const mobile = data.mobile;
        // Format if it's exactly 11 digits and starts with 01
        if (/^01\d{9}$/.test(mobile)) {
          return `${mobile.slice(0, 5)}-${mobile.slice(5)}`; // e.g. 01325-599938
        }
        return mobile || 'N/A';
      },
    },
    {
      key: 'action',
      header: 'Action',
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
      <HelmetTitle title={'List Customers'} />
      <div className="flex overflow-x-auto justify-between mb-1">
        <div className="flex">
          <SelectOption
            onChange={handleSelectChange}
            className="mr-1 md:mr-2"
          />
          <SearchInput
            search={search}
            setSearchValue={setSearchValue}
            className="text-nowrap"
          />
          <ButtonLoading
            onClick={handleSelectChange}
            buttonLoading={buttonLoading}
            label="Search"
            className="whitespace-nowrap"
          />
        </div>
        <Link to="/customer-supplier/create" className="text-nowrap">
          New Customer
        </Link>
      </div>
      <div className="relative overflow-x-auto overflow-y-hidden">
        {customers.loading ? <Loader /> : null}
        <Table columns={columns} data={tableData} className="" />
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
  );
};

export default CustomerSupplier;
