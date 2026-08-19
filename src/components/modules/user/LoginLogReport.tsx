import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { FiRefreshCcw, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';

import Loader from '../../../common/Loader';
import { formatMobile, useMobileFormat } from '../../utils/utils-functions/mobileFormat';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import httpService from '../../services/httpService';
import { API_USER_LOGIN_LOG_URL } from '../../services/apiRoutes';
import InputDatePicker from '../../utils/fields/DatePicker';
import SearchInput from '../../utils/fields/SearchInput';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table, { Column } from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import SelectOption from '../../utils/utils-functions/SelectOption';

const dateTime = (value?: string | null) =>
  value ? dayjs(value).format('DD/MM/YYYY hh:mm A') : '';

/**
 * How long a session lasted, in words rather than in minutes -- "7h 25m" is
 * read at a glance where 445 has to be worked out.
 *
 * A session never signed out of has no length. It says so, rather than counting
 * up to now as though the user were still at their desk.
 */
const duration = (minutes?: number | null) => {
  if (minutes === null || minutes === undefined) return null;
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

const LoginLogReport: React.FC = () => {
  const mobileFormat = useMobileFormat();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  // A request that failed is not the same as a period with no logins, and the
  // table must not read as the second when it was the first.
  const [loadError, setLoadError] = useState('');

  const loadData = async (override?: Record<string, any>) => {
    const params = {
      page,
      per_page: perPage,
      search: search.trim() || undefined,
      date_from: dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : undefined,
      date_to: dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : undefined,
      ...(override ?? {}),
    };

    setLoading(true);
    setLoadError('');
    try {
      const response = await httpService.get(API_USER_LOGIN_LOG_URL, { params });
      const paginated = response?.data?.data?.data ?? {};

      setRows(paginated?.data ?? []);
      setTotal(paginated?.total ?? 0);
      setTotalPages(Math.ceil((paginated?.total ?? 0) / perPage));
    } catch (error: any) {
      // 404 here means the API is serving cached routes and has not picked the
      // endpoint up; saying so beats an empty table that blames the period.
      const status = error?.response?.status;
      const message =
        status === 404
          ? 'The login history endpoint was not found. Clear the API route cache and try again.'
          : error?.response?.data?.message || 'Could not load the login history.';

      setLoadError(message);
      toast.info(message);
      setRows([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  const handleSearch = () => {
    setPage(1);
    loadData({ page: 1 });
  };

  const handleReset = () => {
    setSearch('');
    setDateFrom(null);
    setDateTo(null);
    setPage(1);
    loadData({ page: 1, search: undefined, date_from: undefined, date_to: undefined });
  };

  const columns: Column[] = useMemo(
    () => [
      {
        key: 'serial',
        header: 'Sl. No.',
        headerClass: 'text-center',
        cellClass: 'text-center w-20',
        render: (row: any) => row.serial,
      },
      {
        key: 'user_name',
        header: 'User',
        cellClass: 'text-left',
        render: (row: any) => (
          <div>
            <div className="font-medium">{row.user_name || '-'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {row.email || formatMobile(row.phone, mobileFormat) || ''}
            </div>
          </div>
        ),
      },
      {
        key: 'company',
        header: 'Company / Branch',
        cellClass: 'text-left',
        render: (row: any) => (
          <div>
            <div>{row.company || '-'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{row.branch || ''}</div>
          </div>
        ),
      },
      {
        key: 'in_time',
        header: 'Logged In',
        cellClass: 'text-left',
        render: (row: any) => dateTime(row.in_time),
      },
      {
        key: 'out_time',
        header: 'Logged Out',
        cellClass: 'text-left',
        // Still signed in, or simply never signed out -- the log cannot tell
        // the two apart, so it claims neither.
        render: (row: any) =>
          row.out_time ? (
            dateTime(row.out_time)
          ) : (
            <span className="text-xs text-amber-600 dark:text-amber-400">Not signed out</span>
          ),
      },
      {
        key: 'duration_minutes',
        header: 'Duration',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => duration(row.duration_minutes) ?? '-',
      },
      {
        key: 'ip_address',
        header: 'IP Address',
        cellClass: 'text-left',
        render: (row: any) => row.ip_address || '-',
      },
      {
        key: 'computer_name',
        header: 'Device',
        cellClass: 'text-left',
        render: (row: any) => row.computer_name || '-',
      },
    ],
    [],
  );

  return (
    <div>
      <HelmetTitle title="Login History" />

      <div className="rounded border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-black dark:text-white">Login History</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            When each user signed in, from which address and on what device.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <div>
            <label className="block text-sm">From</label>
            <InputDatePicker
 className="w-full text-sm font-medium"
 selectedDate={dateFrom}
 setSelectedDate={setDateFrom}
 setCurrentDate={setDateFrom}
            />
          </div>

          <div>
            <label className="block text-sm">To</label>
            <InputDatePicker
 className="w-full text-sm font-medium"
 selectedDate={dateTo}
 setSelectedDate={setDateTo}
 setCurrentDate={setDateTo}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm">Search</label>
            <SearchInput
 search={search}
 setSearchValue={setSearch}
 className="w-full text-sm"
            />
          </div>

          <div className="flex items-end gap-2">
            <ButtonLoading
              onClick={handleSearch}
              buttonLoading={loading}
              label="Search"
              className="h-8.5 flex-1 bg-primary text-sm text-white"
              icon={<FiSearch />}
            />
            <ButtonLoading
              onClick={handleReset}
              buttonLoading={false}
              label="Reset"
              className="h-8.5 flex-1 text-sm"
              icon={<FiRefreshCcw />}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <SelectOption
            onChange={(event: any) => {
              setPerPage(Number(event.target.value) || 20);
              setPage(1);
            }}
            className="w-20"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {total} login{total === 1 ? '' : 's'}
          </span>
        </div>

        {loadError ? (
          <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
            {loadError}
          </div>
        ) : null}

        <div className="mt-2">
          {loading ? (
            <Loader />
          ) : (
            <Table
              columns={columns}
              data={rows}
              className=""
              noDataMessage={
                loadError ? 'Nothing could be loaded' : 'No login recorded for this period'
              }
            />
          )}
        </div>

        {totalPages > 1 ? (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            handlePageChange={(next: any) => setPage(next)}
          />
        ) : null}
      </div>
    </div>
  );
};

export default LoginLogReport;
