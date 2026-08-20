import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { chartDateTime } from '../../utils/utils-functions/formatDate';
import { formatMobile, useMobileFormat } from '../../utils/utils-functions/mobileFormat';
import { getSmsLogs } from './smsSlice';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import SearchInput from '../../utils/fields/SearchInput';
import Pagination from '../../utils/utils-functions/Pagination';
import { FiCheckSquare } from 'react-icons/fi';

const SendSms = (user: any) => {
  const mobileFormat = useMobileFormat();
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const smsState = useSelector((state: any) => state.sms);
  const auth = useSelector((state: any) => state.auth);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [branchId, setBranchId] = useState<string>(auth?.me?.branch_id?.toString() || '');
  const [appliedBranchId, setAppliedBranchId] = useState<string>(auth?.me?.branch_id?.toString() || '');
  const [appliedMobile, setAppliedMobile] = useState<string>('');
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1); 
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
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
    setCurrentPage(nextPage);
    setPage(nextPage);
  };


  const columns = [
    { key: 'serial_no', header: 'Sl.', headerClass: 'text-center', cellClass: 'text-center' },
    {
      key: 'recipient_name',
      header: 'Name',
      // Narrow and wrapping, like the message. A customer name can run to forty
      // characters -- "Newhope Animal Feed Mill Ltd-(Unit-3)" -- and on one line
      // it pushed everything after it off the screen.
      cellClass: 'w-[13%] min-w-[8rem] whitespace-normal! break-words align-top',
      // Ahead of the number, because that is the question being asked of this
      // screen: not "what number was texted" but "did the mill get their
      // receipt". The server fills it from the party the message was about, or
      // from the customer list when the number belongs to exactly one customer;
      // where it can vouch for neither it sends nothing, and a dash is honester
      // than a guess.
      render: (row: any) => <div>{row?.recipient_name || '-'}</div>,
    },
    {
      key: 'mobile',
      header: 'Mobile',
      // The log is read, not dialled -- the number the gateway was given is
      // stored as it was sent and only its reading changes here.
      render: (row: any) => <div>{formatMobile(row?.mobile, mobileFormat) || '-'}</div>,
    },
    {
      key: 'message',
      header: 'Message',
      // Held to a third of the table and allowed to wrap. A message is a
      // sentence, and the shared table truncates every cell to one line -- so
      // this column alone was 90 characters wide, pushing status and dates off
      // the right edge and leaving the row unreadable anyway.
      cellClass: 'w-[34%] min-w-[16rem] whitespace-normal! break-words align-top',
      headerClass: 'text-left',
    },
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
    setCurrentPage(1);
    setPerPage(page.target.value);
    setPage(1);
  };
  const handleSearchButton = () => {
    setAppliedMobile(search.trim());
    setAppliedBranchId(branchId.trim());
    setCurrentPage(1);
    setPage(1);
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
                  className="whitespace-nowrap"
                  icon={<FiCheckSquare />}
                />
              </div>
            </div>
            <div className="ml-auto">
              <div className="w-full">
                <BranchDropdown
 defaultValue={user?.user?.branch_id}
 onChange={handleBranchChange}
 className="w-60! font-medium text-sm p-1.5 "
 branchDdl={dropdownData}
                />
              </div>
            </div>
          </div>
        </div>

        {/* The old rows stay legible under a wash while the next page comes, so
            the reader keeps their place; the table says "No data found" itself
            once the answer is in and there is nothing in it. */}
        <div className="relative">
          <div className={smsState?.loading ? 'pointer-events-none opacity-40 transition-opacity' : 'transition-opacity'}>
            <Table columns={columns} data={tableData} />
          </div>
          {smsState?.loading ? (
            <div className="absolute inset-0 flex items-start justify-center pt-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" />
            </div>
          ) : null}
        </div>
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
    </>
  );
};

export default SendSms;
