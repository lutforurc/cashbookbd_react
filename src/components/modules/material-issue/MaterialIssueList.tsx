import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiCheckSquare } from 'react-icons/fi';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import SearchInput from '../../utils/fields/SearchInput';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import Pagination from '../../utils/utils-functions/Pagination';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getMaterialIssues } from './materialIssueSlice';

interface MaterialIssueListProps {
  refreshKey?: number;
}

const MaterialIssueList = ({ refreshKey = 0 }: MaterialIssueListProps) => {
  const dispatch = useDispatch<any>();
  const materialIssue = useSelector((s: any) => s.materialIssue);

  const [search, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number | string>(10);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    dispatch(getMaterialIssues({ page, perPage, search }));
  }, [dispatch, page, perPage, refreshKey]);

  const handleSearch = () => {
    setSearchLoading(true);
    setCurrentPage(1);
    setPage(1);
    dispatch(getMaterialIssues({ page: 1, perPage, search }));
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

  const totalPages = Number(materialIssue?.pagination?.lastPage || 1);
  const tableData = Array.isArray(materialIssue?.data) ? materialIssue.data : [];

  const columns = [
    {
      key: 'sl',
      header: 'Sl',
      headerClass: 'text-center w-16',
      cellClass: 'text-center w-16',
      render: (_row: any, index: number) => <span>{index + 1}</span>,
    },
    {
      key: 'issue_no',
      header: 'Issue No',
      headerClass: 'w-32',
      cellClass: 'w-32',
      render: (row: any) => <span>{row?.issue_no || '-'}</span>,
    },
    {
      key: 'issue_date',
      header: 'Date',
      headerClass: 'w-32',
      cellClass: 'w-32',
      render: (row: any) => <span>{row?.issue_date || '-'}</span>,
    },
    {
      key: 'project',
      header: 'Project / Site',
      render: (row: any) => <span>{row?.project_name || '-'}</span>,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (row: any) => <span>{row?.warehouse_name || '-'}</span>,
    },
    {
      key: 'received_by',
      header: 'Received By',
      render: (row: any) => <span>{row?.received_by || '-'}</span>,
    },
    {
      key: 'item_count',
      header: 'Items',
      headerClass: 'text-right w-20',
      cellClass: 'text-right w-20',
      render: (row: any) => <span>{Number(row?.item_count || 0)}</span>,
    },
    {
      key: 'total_qty',
      header: 'Total Qty',
      headerClass: 'text-right w-28',
      cellClass: 'text-right w-28',
      render: (row: any) => <span>{thousandSeparator(Number(row?.total_qty || 0))}</span>,
    },
  ];

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Issue List</h3>

      <div className="flex overflow-x-auto justify-between mb-2">
        <div className="flex">
          <SelectOption onChange={handleSelectChange} className="mr-1 md:mr-2" />
          <SearchInput search={search} setSearchValue={setSearchValue} className="text-nowrap" />
          <ButtonLoading
            onClick={handleSearch}
            buttonLoading={searchLoading}
            label="Search"
            className="whitespace-nowrap"
            icon={<FiCheckSquare />}
          />
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {materialIssue?.isLoading ? <Loader /> : ''}
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

export default MaterialIssueList;
