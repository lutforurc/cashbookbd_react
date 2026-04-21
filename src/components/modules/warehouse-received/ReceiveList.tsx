import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import SearchInput from '../../utils/fields/SearchInput';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import Pagination from '../../utils/utils-functions/Pagination';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getBranchReceived } from './warehouseReceivedSlice';

interface ReceiveListProps {
  refreshKey?: number;
}

const pickFirst = (row: any, keys: string[]) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '') {
      return row[key];
    }
  }
  return '';
};

const ReceiveList = ({ refreshKey = 0 }: ReceiveListProps) => {
  const dispatch = useDispatch<any>();
  const received = useSelector((s: any) => s.branchReceived);

  const [search, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number | string>(10);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    dispatch(getBranchReceived({ page, perPage, search }));
  }, [dispatch, page, perPage, refreshKey]);

  const handleSearch = () => {
    setSearchLoading(true);
    setCurrentPage(1);
    setPage(1);
    dispatch(getBranchReceived({ page: 1, perPage, search }));
    setTimeout(() => setSearchLoading(false), 150);
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value;
    setPerPage(selected === '' ? '' : Number(selected));
    setCurrentPage(1);
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    setCurrentPage(nextPage);
  };

  const totalPages = Number(received?.pagination?.lastPage || 1);
  const tableData = Array.isArray(received?.data) ? received.data : [];

  const columns = [
    {
      key: 'sl',
      header: 'Sl',
      headerClass: 'text-center w-16',
      cellClass: 'text-center w-16',
      render: (row: any) => <span>{pickFirst(row, ['sl', 'serial', 'id'])}</span>,
    },
    {
      key: 'vr_no',
      header: 'Voucher',
      headerClass: 'w-40',
      cellClass: 'w-40',
      render: (row: any) => (
        <span>{pickFirst(row, ['vr_no', 'receive_no', 'transfer_no', 'voucher_no']) || '-'}</span>
      ),
    },
    {
      key: 'transfer_date',
      header: 'Date',
      headerClass: 'w-36',
      cellClass: 'w-36',
      render: (row: any) => (
        <span>{pickFirst(row, ['receive_date', 'transfer_date', 'date', 'vr_date']) || '-'}</span>
      ),
    },
    {
      key: 'from_branch',
      header: 'From',
      headerClass: 'w-56',
      cellClass: 'w-56',
      render: (row: any) => (
        <span>{pickFirst(row, ['from_branch_name', 'from_branch', 'branch_from']) || '-'}</span>
      ),
    },
    {
      key: 'to_branch',
      header: 'To',
      headerClass: 'w-56',
      cellClass: 'w-56',
      render: (row: any) => (
        <span>{pickFirst(row, ['to_branch_name', 'to_branch', 'branch_to']) || '-'}</span>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (row: any) => <span>{pickFirst(row, ['product_name', 'product']) || '-'}</span>,
    },
    {
      key: 'qty',
      header: 'Qty',
      headerClass: 'text-right w-24',
      cellClass: 'text-right w-24',
      render: (row: any) => (
        <span>{thousandSeparator(Number(pickFirst(row, ['qty', 'quantity']) || 0))}</span>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-right w-28',
      cellClass: 'text-right w-28',
      render: (row: any) => (
        <span>{thousandSeparator(Number(pickFirst(row, ['rate', 'unit_price']) || 0))}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      headerClass: 'text-right w-30',
      cellClass: 'text-right w-30',
      render: (row: any) => {
        const qty = Number(pickFirst(row, ['qty', 'quantity']) || 0);
        const rate = Number(pickFirst(row, ['rate', 'unit_price']) || 0);
        return <span>{thousandSeparator(qty * rate)}</span>;
      },
    },
  ];

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Receive List</h3>

      <div className="flex overflow-x-auto justify-between mb-2">
        <div className="flex">
          <SelectOption onChange={handleSelectChange} className="mr-1 md:mr-2" />
          <SearchInput search={search} setSearchValue={setSearchValue} className="text-nowrap" />
          <ButtonLoading
            onClick={handleSearch}
            buttonLoading={searchLoading}
            label="Search"
            className="whitespace-nowrap"
          />
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {received?.isLoading ? <Loader /> : ''}
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

export default ReceiveList;
