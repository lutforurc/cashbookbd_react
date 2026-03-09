import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiArrowLeft, FiSearch } from 'react-icons/fi';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Link from '../../utils/others/Link';
import Loader from '../../../common/Loader';
import Table from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { chartDateTime } from '../../utils/utils-functions/formatDate';
import { getSmsLogs } from './smsSlice';
import InputElement from '../../utils/fields/InputElement';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import SearchInput from '../../utils/fields/SearchInput';

const SendSms = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const smsState = useSelector((state: any) => state.sms);
  const auth = useSelector((state: any) => state.auth);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [branchId, setBranchId] = useState<string>(auth?.me?.branch_id?.toString() || '');
  const [mobile, setMobile] = useState<string>('');
  const [appliedBranchId, setAppliedBranchId] = useState<string>(auth?.me?.branch_id?.toString() || '');
  const [appliedMobile, setAppliedMobile] = useState<string>('');
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    // setIsSelected(user.user.branch_id);
    // setBranchId(user.user.branch_id);
    // setBranchPad(user?.user?.branch_id.toString().padStart(4, '0'));
  }, []);

  useEffect(() => {
    if (branchDdlData?.protectedData?.data) {
      setDropdownData(branchDdlData?.protectedData?.data);
    } else {
    }
  }, [branchDdlData?.protectedData?.data]);

  useEffect(() => {
    dispatch(
      getSmsLogs({
        page,
        per_page: perPage,
        branch_id: appliedBranchId ? Number(appliedBranchId) : null,
        mobile: appliedMobile,
      }) as any,
    );
  }, [dispatch, page, perPage, appliedBranchId, appliedMobile]);

  const totalPages = useMemo(() => Number(smsState?.pagination?.last_page || 1), [smsState]);

  const tableData = useMemo(() => {
    const items = smsState?.logs || [];
    return items.map((item: any, index: number) => ({
      ...item,
      serial_no: (page - 1) * perPage + index + 1,
    }));
  }, [smsState?.logs, page, perPage]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value) || 10;
    setPerPage(value);
    setPage(1);
  };

  const handleApplyFilter = () => {
    setAppliedBranchId(branchId.trim());
    setAppliedMobile(mobile.trim());
    setPage(1);
  };

  const columns = [
    { key: 'serial_no', header: 'Sl.', headerClass: 'text-center', cellClass: 'text-center' },
    { key: 'mobile', header: 'Mobile' },
    { key: 'message', header: 'Message' },
    { key: 'provider', header: 'Provider', headerClass: 'text-center', cellClass: 'text-center' },
    { key: 'status', header: 'Status', headerClass: 'text-center', cellClass: 'text-center' },
    { key: 'attempts', header: 'Attempts', headerClass: 'text-center', cellClass: 'text-center' },
    {
      key: 'sent_at',
      header: 'Sent At',
      render: (row: any) => <div>{row.sent_at ? chartDateTime(row.sent_at) : '-'}</div>,
    },
    {
      key: 'created_at',
      header: 'Created At',
      render: (row: any) => <div>{row.created_at ? chartDateTime(row.created_at) : '-'}</div>,
    },
  ];

  const handleSelectChange = (page: any) => {
    setPerPage(page.target.value);
    setPage(1);
    // setCurrentPage(1);
    // setTotalPages(Math.ceil(userList.data.total / page.target.value));
    // setTableData(userList.data.data);
  };
  const handleSearchButton = () => {
    setCurrentPage(1);
    setPage(1);
    // dispatch(getUser({ page: 1, perPage, search })); // Use 'search' instead
  };


  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  return (
    <>
      <HelmetTitle title="SMS Logs" />
      <div>
        <div className="mb-2">
          <div className="flex w-full flex-wrap items-end justify-between gap-2">
            <div className="flex flex-wrap items-end gap-2">
              <SelectOption onChange={handleSelectChange} />
              <div className="flex">
                <SearchInput
                  search={search}
                  setSearchValue={setSearch}
                  className="text-nowrap"
                />
                <ButtonLoading
                  onClick={handleSearchButton}
                  label="Search"
                  className="whitespace-nowrap h-9"
                  icon=""
                />
              </div>
            </div>
            <div className="ml-auto">
              <div className="w-full">
                <BranchDropdown
                  defaultValue={user?.user?.branch_id}
                  onChange={handleBranchChange}
                  className="!w-60 font-medium text-sm p-1.5 h-9"
                  branchDdl={dropdownData}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          {smsState?.loading ? <Loader /> : ''}
          <Table columns={columns} data={tableData} />
        </div>

        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Total: {smsState?.pagination?.total || 0}
        </div>

        {totalPages > 1 ? (
          <Pagination
            currentPage={smsState?.pagination?.current_page || page}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        ) : (
          ''
        )}
      </div>
    </>
  );
};

export default SendSms;
