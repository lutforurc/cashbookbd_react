import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../../common/Loader';
import SelectOption from '../../utils/utils-functions/SelectOption';
import Pagination from '../../utils/utils-functions/Pagination';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import { fetchTransactionHistories } from './historySlice';
import { chartDate, chartDateTime } from '../../utils/utils-functions/formatDate';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';

const ChangeList = ({ user }: any) => {
  const branchList = useSelector((state) => state.branchList);
  const historyState = useSelector((state) => state.history);
  const branchDdlData = useSelector((state) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [branchId, setBranchId] = useState<string | number>(user?.branch_id ?? "");
  const [dropdownData, setDropdownData] = useState<any[]>([]);



  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user?.branch_id);
  }, []);



  useEffect(() => {
    if (branchDdlData?.protectedData?.data) if (branchDdlData?.protectedData?.data) {

      const baseData = branchDdlData.protectedData.data;

      if (settings?.data?.branch?.branch_types_id === 1) {
        setDropdownData([
          { id: "", name: 'All Projects' },
          ...baseData,
        ]);
      } else {
        setDropdownData(baseData);
      }
    }
  }, [branchDdlData?.protectedData?.data]);


  useEffect(() => {
    // dispatch(getBranch({ page, perPage, searchValue }));
    if (historyState?.transactionHistories?.total) {
      setTotalPages(Math.ceil(historyState?.transactionHistories?.total / perPage));
    }
    dispatch(fetchTransactionHistories({ page, per_page: perPage, branchId: branchId ? Number(branchId) : undefined }));
  }, [page, perPage, branchId, historyState?.transactionHistories?.total]);


  const handlePageChange = (page: any) => {
    setPerPage(perPage);
    setPage(page);
    setCurrentPage(page);
    setTotalPages(Math.ceil(branchList.data.total / perPage));
  };

  const handleSelectChange = (page: any) => {
    setPerPage(page.target.value);
    setPage(1);
    setCurrentPage(1);
    setTotalPages(Math.ceil(branchList.data.total / page.target.value));
  };


  const columns = [
    {
      key: 'serial_no',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'main_transaction',
      header: 'Vr No',
      render: (row: any) => (
        <div>
          {row.main_transaction?.vr_no || ''}
        </div>
      ),
    },
    {
      key: 'vr_date',
      header: 'Vr Date',
      render: (row: any) => (
        <div>
          {chartDate(row.main_transaction?.vr_date)}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <div>
          {row.action.charAt(0).toUpperCase() + row.action.slice(1)}
        </div>
      ),
    },
    {
      key: 'action_time',
      header: 'Action Time',
      render: (row: any) => (
        <div>
          {chartDateTime(row.created_at)}
        </div>
      ),
    },
    {
      key: 'action_by',
      header: 'Action By',
      render: (row: any) => (
        <div>
          {row.action_by_user?.name || ''}
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (row: any) => (
        <div>
          {row.branch?.name || ''}
        </div>
      ),
    },
    {
      key: 'status_label',
      header: 'status',
    }
  ];

  return (
    <div className=''>
      <HelmetTitle title={'Log Changes'} />
      <div className="flex mb-1">
        <SelectOption onChange={handleSelectChange} className='mr-2' />
        <BranchDropdown
          defaultValue={branchId?.toString()}
          onChange={(e: any) => {
            const value = e.target.value;
            setBranchId(value === "" ? "" : Number(value));
          }}
          className="!w-64 font-medium text-sm p-2 mr-2 "
        branchDdl={dropdownData}
        />
      </div>
      <div className="relative no-scrollbar">
        <div className="relative h-full">
          {historyState.loading == true ? <Loader /> : ''}
          <Table columns={columns} data={historyState?.transactionHistories?.data || []} className="" />
        </div>
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

export default ChangeList;
