import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { FiRefreshCw, FiUsers } from 'react-icons/fi';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import httpService from '../../services/httpService';
import { API_ONLINE_USERS_URL } from '../../services/apiRoutes';
import { toast } from 'react-toastify';

interface OnlineUser {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  branch?: string;
  company?: string;
  role?: string;
  last_seen_at?: string;
}

const OnlineUsers = () => {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [count, setCount] = useState(0);
  const [thresholdMinutes, setThresholdMinutes] = useState(3);
  const [loading, setLoading] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string>('');

  const fetchOnlineUsers = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const response = await httpService.get(API_ONLINE_USERS_URL);
      const payload = response?.data?.data || {};
      const onlineUsers = Array.isArray(payload.users) ? payload.users : [];
      setUsers(onlineUsers.map((user: OnlineUser, index: number) => ({
        ...user,
        serial: index + 1,
      })));
      setCount(Number(payload.count || 0));
      setThresholdMinutes(Number(payload.threshold_minutes || 3));
      setLastRefreshAt(dayjs().format('DD/MM/YYYY hh:mm A'));
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to load online users.');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchOnlineUsers();
    const timer = window.setInterval(() => fetchOnlineUsers(false), 60000);
    return () => window.clearInterval(timer);
  }, [fetchOnlineUsers]);

  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'status',
      header: 'Status',
      render: () => (
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Online
        </span>
      ),
    },
    {
      key: 'name',
      header: 'User Name',
    },
    {
      key: 'branch',
      header: 'Working Branch',
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'role',
      header: 'Role',
      render: (row: OnlineUser) => <span>{row.role || '-'}</span>,
    },
    {
      key: 'last_seen_at',
      header: 'Last Seen',
      render: (row: OnlineUser) => (
        <span>{row.last_seen_at ? dayjs(row.last_seen_at).format('DD/MM/YYYY hh:mm A') : '-'}</span>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Online Users" />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            <FiUsers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Online Users: {count}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Active within last {thresholdMinutes} minutes{lastRefreshAt ? `, refreshed ${lastRefreshAt}` : ''}
            </p>
          </div>
        </div>

        <ButtonLoading
          onClick={() => fetchOnlineUsers()}
          buttonLoading={loading}
          label="Refresh"
          className="whitespace-nowrap"
          icon={<FiRefreshCw />}
        />
      </div>

      <div className="relative overflow-x-auto overflow-y-hidden">
        {loading ? <Loader /> : null}
        <Table columns={columns as any} data={users} noDataMessage="No users are online right now." />
      </div>
    </div>
  );
};

export default OnlineUsers;
