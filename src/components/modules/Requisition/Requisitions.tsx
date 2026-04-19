import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import SearchInput from '../../utils/fields/SearchInput';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import Pagination from '../../utils/utils-functions/Pagination';
import Link from '../../utils/others/Link';
import { FiBook, FiEdit2, FiTrash2 } from 'react-icons/fi';
import OrderTypes from '../../utils/utils-functions/OrderTypes';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getOrders } from '../orders/ordersSlice';
import RequisitionTypes from '../../utils/utils-functions/RequisitionTypes';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import InputDatePicker from '../../utils/fields/DatePicker';
import { getRequisitions } from './requisitionSlice';
import { formatDate } from '../../utils/utils-functions/formatDate';

const Requisitions = (user: any) => {
  const branchDdlData = useSelector((state) => state.branchDdl);
  const requisitionData = useSelector((state) => state.requisition);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const dispatch = useDispatch();
  const [totalPages, setTotalPages] = useState(0);
  const [tableData, setTableData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [requisitionType, setRequisitionType] = useState('');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
  const [endDate, setEndDate] = useState<Date | null>(null); // Define state with type


  useEffect(() => {
    dispatch(getRequisitions({ page, perPage, search, requisitionType, branchId, startDate, endDate }));
    // setTableData(requisitionData?.data?.data);
  }, []);

  useEffect(() => {
    dispatch(getRequisitions({ page, perPage, search, requisitionType, branchId, startDate, endDate }));
    // setTotalPages(Math.ceil(requisitionData?.total / perPage));
    // setTableData(requisitionData?.data?.data);
  }, [page, perPage, branchId, requisitionType]);

  useEffect(() => {
    if (branchDdlData?.protectedData?.data && branchDdlData?.protectedData?.transactionDate) {
      setDropdownData(branchDdlData?.protectedData?.data);
    }
  }, [branchDdlData?.protectedData?.data]);
  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const handleSearchButton = (e: any) => {
    setCurrentPage(1);
    setPage(1);
    dispatch(getRequisitions({ page, perPage, search, requisitionType, branchId, startDate, endDate }));
    if (requisitionData?.data?.total >= 0) {
      setTotalPages(Math.ceil(requisitionData?.data?.total / perPage));
      setTableData(requisitionData?.data?.data);
    }
  };
  const handleSelectChange = (page: any) => {
    setPerPage(page.target.value);
    setPage(1);
    setCurrentPage(1);
    setTotalPages(Math.ceil(requisitionData?.data?.total / perPage));
    setTableData(requisitionData?.data?.data);
  };
  const handlePageChange = (page: any) => {
    setPerPage(perPage);
    setPage(page);
    setCurrentPage(page);
    setTotalPages(Math.ceil(requisitionData?.data?.last_page));
    setTableData(requisitionData?.data?.data);
  };

  const handleRequisitionChange = (e: any) => {
    setRequisitionType(e.target.value);
  };
  useEffect(() => {
    setTableData(requisitionData?.data?.data);
    setTotalPages(Math.ceil(requisitionData?.data?.last_page));
  }, [requisitionData?.data?.data]);
  const handleStartDate = (e: any) => {
    setStartDate(e);
  };
  const handleEndDate = (e: any) => {
    setEndDate(e);
  };
  const columns = [
    {
      key: 'id',
      header: 'Sl. No.',
      headerClass: 'text-center w-16',
      cellClass: 'text-center w-16',
    },

    {
      key: 'req_no',
      headerClass: 'w-40',
      cellClass: 'w-40',
      header: (
        <p>
          <span className="block">Req. No</span>
          <span className="block">Req. Date</span>
        </p>
      ),
      render: (data: any) => (
        <p>
          <span className="block">{data.req_no}</span>
          <span className="block">{formatDate(data.vr_date)}</span>
        </p>
      ),
    },
    {
      key: 'requisition_end_date',
      headerClass: 'w-40',
      cellClass: 'w-40',
      header: (
        <p>
          <span className="block">Req. Std. Date</span>
          <span className="block">Req. End Date</span>
        </p>
      ),
      render: (data: any) => (
        <p>
          <span className="block">{formatDate(data.requisition_start_date)}</span>
          <span className="block">{formatDate(data.requisition_end_date)}</span>
        </p>
      ),
    },


    {
      key: 'notes',
      header: (
        <p>
          <span className="block">Project</span>
          <span className="block">Note</span>
        </p>
      ),
      render: (data: any) => (
        <p>
          <span className="block">{data.project}</span>
          <span className="block">{data.notes}</span>
        </p>
      ),
    },

    {
      key: 'req_total',
      headerClass: 'w-40',
      cellClass: 'w-40',
      header: (
        <div className='text-right'>
          <span className="block">Req. Amount</span>
          <span className="block">Req. App. Amt</span>
        </div>
      ),
      render: (data: any) => (
        <div className="text-right">
          <span className="block">{thousandSeparator(data.req_total, 0)}</span>
          <span className="block">{thousandSeparator(data.approved_total, 0)}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center w-40',
      cellClass: 'w-40',
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
      <HelmetTitle title={'Requisition List'} />
      <div className='mb-3'></div>
      <div className="flex overflow-x-auto justify-between mb-2">
        <div className="flex">
          <SelectOption
            onChange={handleSelectChange}
            className="mr-1 md:mr-2"
          />
          <BranchDropdown
            defaultValue={user?.user?.branch_id}
            onChange={handleBranchChange}
            className="w-60 font-medium text-sm p-1.5 mr-2"
            branchDdl={dropdownData}
          />
          <div className='w-full mr-2'>
            <InputDatePicker
              setCurrentDate={handleStartDate}
              className="font-medium text-sm w-full h-9"
              placeholder="Start Date"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
            />
          </div>
          <div className='w-full mr-2'>
            <InputDatePicker
              setCurrentDate={handleEndDate}
              className="font-medium text-sm w-full h-9 mr-1 md:mr-2"
              placeholder="End Date"
              selectedDate={endDate}
              setSelectedDate={setEndDate}

            />
          </div>
          <RequisitionTypes id="requisition_type" onChange={handleRequisitionChange} className="mr-1 md:mr-2" />
          <SearchInput
            search={search}
            setSearchValue={setSearchValue}
            className="text-nowrap w-full"
          />
          <ButtonLoading
            onClick={handleSearchButton}
            buttonLoading={buttonLoading}
            label="Search"
            className="whitespace-nowrap"
          />
          <Link to="/requisition/create" className="text-nowrap ml-2">
            New Requisition
          </Link>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {requisitionData.isLoading == true ? <Loader /> : ''}
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
  );
};

export default Requisitions;
