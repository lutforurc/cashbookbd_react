import { useEffect, useMemo, useState } from 'react';
import { FIELD_OPTION, FIELD_SELECT } from '../../../theme/fieldStyles';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { FiRefreshCw, FiSend, FiTrash2 } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import Loader from '../../../common/Loader';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import httpService from '../../services/httpService';
import { API_ADMIN_NOTIFICATIONS_URL } from '../../services/apiRoutes';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { getRoles } from '../user-management/userManagementSlice';
import { Select, Textarea } from '../../utils/fields/FormControls';

type Tone = 'info' | 'warning' | 'danger' | 'success';
type Audience = 'global' | 'company' | 'branch' | 'role' | 'user';

type AdminNotification = {
  id: number;
  title: string;
  message: string;
  tone: Tone;
  audience_type: Audience;
  company_id: number | null;
  branch_id: number | null;
  role_id: number | null;
  user_id: number | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  read_count: number;
};

const TONES: { value: Tone; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Danger' },
  { value: 'success', label: 'Success' },
];

// Only the audiences the platform can target today. Company and User need a
// picker the app does not have yet; add them here once those dropdowns exist.
const AUDIENCES: { value: Audience; label: string }[] = [
  { value: 'global', label: 'Global — everyone' },
  { value: 'branch', label: 'Branch' },
  { value: 'role', label: 'Role' },
];

const toneClass: Record<Tone, string> = {
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : '-';
};

const labelClass =
  'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200';

const AdminNotifications = () => {
  const dispatch = useDispatch();
  const branchDdl = useSelector((state: any) => state.branchDdl);
  const roleState = useSelector((state: any) => state.userManagement);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<Tone>('info');
  const [audience, setAudience] = useState<Audience>('global');
  const [branchId, setBranchId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  const branches = Array.isArray(branchDdl?.protectedData?.data)
    ? branchDdl.protectedData.data
    : [];
  // getRoles stores a { success, data: { data: [...] } } envelope, not a bare
  // array, so the role list lives at roles.data.data (see Roles.tsx).
  const roles = Array.isArray(roleState?.roles?.data?.data)
    ? roleState.roles.data.data
    : [];

  const branchNameById = useMemo(() => {
    const map: Record<string, string> = {};
    branches.forEach((branch: any) => {
      map[String(branch.id)] = branch.name;
    });
    return map;
  }, [branches]);

  const roleNameById = useMemo(() => {
    const map: Record<string, string> = {};
    roles.forEach((role: any) => {
      map[String(role.id)] = role.name;
    });
    return map;
  }, [roles]);

  const loadNotifications = async () => {
    setLoadingList(true);
    try {
      const response = await httpService.get(API_ADMIN_NOTIFICATIONS_URL);
      const rows = response?.data?.data?.data?.notifications;
      setNotifications(Array.isArray(rows) ? rows : []);
    } catch {
      setNotifications([]);
      toast.error('Could not load sent notifications.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(getRoles() as any);
    loadNotifications();
  }, []);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setTone('info');
    setAudience('global');
    setBranchId('');
    setRoleId('');
    setExpiresAt(null);
  };

  const handleSend = async () => {
    if (!title.trim()) {
      toast.info('Please enter a title.');
      return;
    }
    if (!message.trim()) {
      toast.info('Please enter a message.');
      return;
    }
    if (audience === 'branch' && !branchId) {
      toast.info('Please select a branch.');
      return;
    }
    if (audience === 'role' && !roleId) {
      toast.info('Please select a role.');
      return;
    }

    const payload: Record<string, any> = {
      title: title.trim(),
      message: message.trim(),
      tone,
      audience_type: audience,
      expires_at: expiresAt ? dayjs(expiresAt).format('YYYY-MM-DD') : null,
    };
    if (audience === 'branch') payload.branch_id = Number(branchId);
    if (audience === 'role') payload.role_id = Number(roleId);

    setSending(true);
    try {
      const response = await httpService.post(API_ADMIN_NOTIFICATIONS_URL, payload);
      toast.success(response?.data?.message || 'Notification sent successfully.');
      resetForm();
      loadNotifications();
    } catch (error: any) {
      // The server explains a missing target with a 422 message; surface it.
      toast.error(
        error?.response?.data?.message || 'Notification could not be sent.',
      );
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this notification for everyone it reached?')) {
      return;
    }
    setDeletingId(id);
    try {
      const response = await httpService.delete(
        `${API_ADMIN_NOTIFICATIONS_URL}/${id}`,
      );
      toast.success(response?.data?.message || 'Notification deleted successfully.');
      setNotifications((current) => current.filter((row) => row.id !== id));
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Notification could not be deleted.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const audienceText = (row: AdminNotification) => {
    switch (row.audience_type) {
      case 'branch':
        return `Branch — ${branchNameById[String(row.branch_id)] || `#${row.branch_id}`}`;
      case 'role':
        return `Role — ${roleNameById[String(row.role_id)] || `#${row.role_id}`}`;
      case 'company':
        return `Company — #${row.company_id}`;
      case 'user':
        return `User — #${row.user_id}`;
      default:
        return 'Global — everyone';
    }
  };

  return (
    <div className="text-slate-900 dark:text-[rgb(var(--c-text))]">
      <HelmetTitle title="Admin Notifications" />

      {/* A. Compose */}
      <div className="mb-6 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
          Compose Notification
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>
              Title <span className="text-rose-500">*</span>
            </label>
            <InputElement
 id="admin-notif-title"
 name="title"
 label=""
 value={title}
 placeholder="Short headline (max 200 characters)"
 className="w-full!"
 onChange={(e: any) => setTitle(e.target.value.slice(0, 200))}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>
              Message <span className="text-rose-500">*</span>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you want everyone to know?"
              rows={3}
              className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-[rgb(var(--c-text))] outline-none focus:border-blue-500 dark:border-form-strokedark dark:bg-transparent dark:text-[rgb(var(--c-text))]"
            />
          </div>

          <div>
            <label className={labelClass}>Tone</label>
            <Select
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className={`${FIELD_SELECT} w-full rounded-sm px-3 text-sm`}
            >
              {TONES.map((item) => (
                <option key={item.value} value={item.value} className={FIELD_OPTION}>
                  {item.label}
                </option>
              ))}
            </Select>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${toneClass[tone]}`}
            >
              {title.trim() || 'Preview'}
            </span>
          </div>

          <div>
            <label className={labelClass}>Audience</label>
            <Select
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              className={`${FIELD_SELECT} w-full rounded-sm px-3 text-sm`}
            >
              {AUDIENCES.map((item) => (
                <option key={item.value} value={item.value} className={FIELD_OPTION}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          {audience === 'branch' && (
            <div>
              <label className={labelClass}>
                Branch <span className="text-rose-500">*</span>
              </label>
              {branchDdl?.isLoading ? <Loader /> : null}
              <BranchDropdown
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="h-10 w-full p-2 text-sm font-medium"
                branchDdl={branches}
              />
            </div>
          )}

          {audience === 'role' && (
            <div>
              <label className={labelClass}>
                Role <span className="text-rose-500">*</span>
              </label>
              <Select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className={`${FIELD_SELECT} w-full rounded-sm px-3 text-sm`}
              >
                <option value="" className={FIELD_OPTION}>
                  Select role
                </option>
                {roles.map((role: any) => (
                  <option key={role.id} value={role.id} className={FIELD_OPTION}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className={labelClass}>Expires at (optional)</label>
            <InputDatePicker
 selectedDate={expiresAt}
 setSelectedDate={setExpiresAt}
 setCurrentDate={setExpiresAt}
 placeholder="Never expires"
 className="w-full text-sm font-medium"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <ButtonLoading
            onClick={handleSend}
            buttonLoading={sending}
            label={sending ? 'Sending...' : 'Send'}
            icon={<FiSend />}
            className="px-6"
          />
        </div>
      </div>

      {/* B. Sent list */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-strokedark">
          <h2 className="text-lg font-bold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
            Sent Notifications
          </h2>
          <Button
            type="button"
            onClick={loadNotifications}
            className="flex w-8 items-center justify-center rounded-sm border border-stroke text-slate-500 transition hover:border-primary hover:text-primary dark:border-strokedark dark:text-slate-300"
            aria-label="Refresh list"
          >
            <FiRefreshCw className={loadingList ? 'animate-spin' : ''} />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-600 dark:bg-meta-4 dark:text-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Tone</th>
                <th className="px-4 py-3 text-left">Audience</th>
                <th className="px-4 py-3 text-right">Read</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-strokedark">
              {loadingList && notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : notifications.length > 0 ? (
                notifications.map((row) => (
                  <tr key={row.id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                        {row.title}
                      </div>
                      <div className="mt-0.5 max-w-md truncate text-xs text-slate-500 dark:text-slate-400">
                        {row.message}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${toneClass[row.tone] || toneClass.info}`}
                      >
                        {row.tone}
                      </span>
                    </td>
                    <td className="px-4 py-3">{audienceText(row)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">
                      {row.read_count ?? 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.expires_at ? formatDateTime(row.expires_at) : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="inline-flex w-8 items-center justify-center rounded-sm text-rose-500 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-900/20"
                        aria-label={`Delete ${row.title}`}
                      >
                        <FiTrash2 />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No notifications sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;
