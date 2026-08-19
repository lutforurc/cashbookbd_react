import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiRefreshCcw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

import HelmetTitle from '../../utils/others/HelmetTitle';
import Loader from '../../../common/Loader';
import Table from '../../utils/others/Table';
import ActionButtons from '../../utils/fields/ActionButton';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import routes from '../../services/appRoutes';
import { deleteAdminInAppMessage, listAdminInAppMessages } from './inAppMessageService';
import { InAppMessageAdminRow } from './types';

const statusClass: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
};

const audienceLabel = (row: InAppMessageAdminRow) => {
  if (row.audience_type === 'global') return 'Everyone';
  const target =
    row.company_id ?? row.branch_id ?? row.role_id ?? row.user_id ?? '-';
  return `${row.audience_type} #${target}`;
};

const AdminInAppMessages: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<InAppMessageAdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmId, setShowConfirmId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await listAdminInAppMessages();
      setRows(list.map((row, index) => ({ ...row, serial_no: index + 1 } as any)));
    } catch (error: any) {
      toast.info(
        error?.response?.data?.message || error?.message || 'Failed to load campaigns',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      const response = await deleteAdminInAppMessage(id);
      toast.success(response?.message || 'Campaign deleted successfully');
      load();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to delete campaign',
      );
    }
  };

  const columns = [
    {
      key: 'serial_no',
      header: '#',
      width: '60px',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'title',
      header: 'Campaign',
      render: (row: InAppMessageAdminRow) => (
        <div className="flex items-start gap-2">
          {row.image_url ? (
            <img src={row.image_url} alt="" className="h-9 w-9 rounded object-cover" />
          ) : null}
          <div className="min-w-0">
            <div className="font-semibold">{row.title}</div>
            <div className="truncate text-xs text-gray-500 dark:text-gray-400">
              {row.body || '-'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'layout',
      header: 'Layout / Trigger',
      render: (row: InAppMessageAdminRow) => (
        <>
          <div>{row.layout}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.trigger_event}
          </div>
        </>
      ),
    },
    {
      key: 'audience_type',
      header: 'Audience / Platform',
      render: (row: InAppMessageAdminRow) => (
        <>
          <div>{audienceLabel(row)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.platform}</div>
        </>
      ),
    },
    {
      key: 'display_limit',
      header: 'Frequency',
      render: (row: InAppMessageAdminRow) => (
        <>
          <div>{row.display_limit ? `${row.display_limit} time(s)` : 'Unlimited'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.min_interval_hours ? `every ${row.min_interval_hours}h` : 'no gap'}
            {row.require_ack ? ' · must ack' : ''}
          </div>
        </>
      ),
    },
    {
      key: 'starts_at',
      header: 'Schedule',
      render: (row: InAppMessageAdminRow) => (
        <>
          <div>{row.starts_at ? dayjs(row.starts_at).format('DD/MM/YYYY') : 'Now'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.ends_at ? dayjs(row.ends_at).format('DD/MM/YYYY') : 'No end'}
          </div>
        </>
      ),
    },
    {
      key: 'impressions',
      header: 'Delivery',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: InAppMessageAdminRow) => (
        <>
          <div>
            {row.impressions} shown · {row.reached_users} user(s)
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.clicks} click · {row.dismissals} dismiss · {row.acked_users} ack
          </div>
        </>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: InAppMessageAdminRow) => (
        <span
          className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
            statusClass[row.status] || statusClass.draft
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: InAppMessageAdminRow) => (
        <ActionButtons
          row={row}
          showEdit
          handleEdit={() =>
            navigate(routes.admin_in_app_message_edit.replace(':id', String(row.id)))
          }
          showDelete
          handleDelete={() => handleDelete(row.id)}
          showConfirmId={showConfirmId}
          setShowConfirmId={setShowConfirmId}
        />
      ),
    },
  ];

  return (
    <>
      <HelmetTitle title="In-App Messages" />
      {loading ? <Loader /> : null}

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-5">
        <ButtonLoading
          onClick={() => navigate(routes.admin_in_app_message_create)}
          buttonLoading={false}
          label="New Campaign"
          className="mr-0 h-8.5 whitespace-nowrap text-center"
          icon={<FiPlus className="ml-2 mr-2 text-lg" />}
        />
        <ButtonLoading
          onClick={load}
          buttonLoading={false}
          label="Refresh"
          className="mr-0 h-8.5 whitespace-nowrap text-center"
          icon={<FiRefreshCcw className="ml-2 mr-2 text-lg" />}
        />
      </div>

      <div className="bg-white dark:bg-boxdark">
        <Table columns={columns} data={rows || []} />
      </div>
    </>
  );
};

export default AdminInAppMessages;
