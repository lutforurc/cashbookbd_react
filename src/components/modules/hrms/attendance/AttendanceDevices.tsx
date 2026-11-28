import React, { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiClock,
  FiDownload,
  FiEdit2,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiUpload,
  FiUserPlus,
  FiUsers,
  FiWifi,
  FiX,
} from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import Loader from '../../../../common/Loader';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import EmployeeDropdownSearch from '../../../utils/utils-functions/EmployeeDropdownSearch';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import httpService from '../../../services/httpService';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import {
  API_HRMS_ATTENDANCE_DEVICES_URL,
  API_HRMS_ATTENDANCE_DEVICE_COMMANDS_URL,
  API_HRMS_ATTENDANCE_DEVICE_COMMAND_URL,
  API_HRMS_ATTENDANCE_DEVICE_EMPLOYEES_URL,
  API_HRMS_ATTENDANCE_DEVICE_PUNCHES_URL,
  API_HRMS_ATTENDANCE_DEVICE_STATUS_URL,
  API_HRMS_ATTENDANCE_DEVICE_STORE_URL,
  API_HRMS_ATTENDANCE_DEVICE_UPDATE_URL,
  API_HRMS_ATTENDANCE_MAPPING_DELETE_URL,
  API_HRMS_ATTENDANCE_MAPPING_UPDATE_URL,
  API_HRMS_ATTENDANCE_MAPPING_COPY_URL,
  API_HRMS_ATTENDANCE_DEVICE_SETTINGS_URL,
  API_HRMS_ATTENDANCE_MAPPING_URL,
  API_HRMS_ATTENDANCE_PUNCHES_REBUILD_URL,
} from '../../../services/apiRoutes';

/**
 * The face terminals, and who is enrolled on each of them.
 *
 * ⚠️ THE SERIAL NUMBER IS WHAT THE TERMINAL PROVES ITSELF WITH. It is the only
 * thing a device sends that identifies it, so the box says so in plain words:
 * a serial typed with a character wrong is a terminal whose punches are refused
 * and whose absence is only noticed at the end of the month.
 *
 * ⚠️ Mapping a code is retroactive. The office usually enrols the faces before
 * it gets round to matching them here, and the server keeps those early punches
 * precisely so this screen can claim them -- the count comes back with the
 * mapping so the person who did it can see that yesterday was recovered too.
 */

const deviceTypes = [
  { id: 'biometric', name: 'Biometric / Face' },
  { id: 'mobile', name: 'Mobile' },
  { id: 'web', name: 'Web' },
  { id: 'gps', name: 'GPS' },
  { id: 'other', name: 'Other' },
];

const emptyForm = {
  id: '',
  device_name: '',
  serial_no: '',
  device_code: '',
  device_type: 'biometric',
  branch_id: '',
  ip_address: '',
  comm_key: '',
  status: 1,
};

const listFrom = (response: any) => {
  const value = response?.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  if (Array.isArray(value?.data)) return value.data.data ?? value.data;
  if (Array.isArray(value)) return value;
  return [];
};

const itemFrom = (response: any) => response?.data?.data?.data ?? response?.data?.data ?? null;

/**
 * How far the terminal's clock has drifted, in words.
 *
 * ⚠️ MEASURED ON THE LAST RECORD IT SENT: the device stamps the punch, we stamp
 * when it arrived. Two minutes apart is a healthy push and says nothing; hours
 * mean every attendance time from that terminal is wrong by that much, and no
 * amount of correcting rows will fix tomorrow.
 */
const clockSkewLabel = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return '';
  const abs = Math.abs(Number(seconds));
  if (abs < 120) return '';

  const value =
    abs >= 3600
      ? `${Math.floor(abs / 3600)}h ${Math.round((abs % 3600) / 60)}m`
      : `${Math.round(abs / 60)}m`;

  return Number(seconds) > 0 ? `${value} behind` : `${value} ahead`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Never';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const AttendanceDevices = ({ user }: any) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<any>();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState(userBranchId);
  const [form, setForm] = useState<any>({ ...emptyForm, branch_id: userBranchId });
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // The mapping panel: which terminal is open, who is on it, and what is being
  // added to it.
  const [mappingDevice, setMappingDevice] = useState<any>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingCode, setMappingCode] = useState('');
  const [mappingEmployee, setMappingEmployee] = useState<any>(null);
  const [mappingSaving, setMappingSaving] = useState(false);
  // The row being corrected, if any. Editing reuses the form above, so a code
  // does not have to be unmapped and re-added just to fix a typo.
  const [editingMapping, setEditingMapping] = useState<any>(null);

  /**
   * Two tabs, because the screen answers two questions: which terminals are
   * registered, and what the branch wants done with what they send.
   */
  const [tab, setTab] = useState<'devices' | 'settings'>('devices');
  const [settings, setSettings] = useState<any>({
    auto_approve: false,
    retention_days: 0,
    server_enrollment: false,
    multi_device_template: false,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  /**
   * The punch panel: the raw records the terminal sent, and what has been asked
   * of it. This is the screen for the morning after a device was installed --
   * device time beside received time is the only way to tell a wrong clock from
   * a lost record from a code nobody owns.
   */
  const [punchDevice, setPunchDevice] = useState<any>(null);
  const [punches, setPunches] = useState<any[]>([]);
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchFrom, setPunchFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  });
  const [punchTo, setPunchTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [commands, setCommands] = useState<any[]>([]);
  const [commandSaving, setCommandSaving] = useState('');

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  const loadDevices = async (branch = branchId) => {
    setLoading(true);
    try {
      const response = await httpService.get(API_HRMS_ATTENDANCE_DEVICES_URL, {
        params: branch ? { branch_id: branch } : {},
      });
      setRows(listFrom(response));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load the devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices(branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const startNew = () => {
    setForm({ ...emptyForm, branch_id: branchId || userBranchId });
    setFormOpen(true);
  };

  const startEdit = (device: any) => {
    setForm({
      id: device.id,
      device_name: device.device_name || '',
      serial_no: device.serial_no || '',
      device_code: device.device_code || '',
      device_type: device.device_type || 'biometric',
      branch_id: device.branch_id ?? '',
      ip_address: device.ip_address || '',
      comm_key: device.comm_key || '',
      status: Number(device.status) === 1 ? 1 : 0,
    });
    setFormOpen(true);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const saveDevice = async () => {
    if (!form.device_name.trim()) {
      toast.error('Device name is required');
      return;
    }
    if (!form.serial_no.trim()) {
      toast.error('Serial number is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        device_name: form.device_name.trim(),
        serial_no: form.serial_no.trim(),
        device_code: form.device_code || null,
        device_type: form.device_type || 'biometric',
        branch_id: form.branch_id || null,
        ip_address: form.ip_address || null,
        comm_key: form.comm_key || null,
        status: Number(form.status) === 1 ? 1 : 0,
      };

      const response = form.id
        ? await httpService.post(`${API_HRMS_ATTENDANCE_DEVICE_UPDATE_URL}${form.id}`, payload)
        : await httpService.post(API_HRMS_ATTENDANCE_DEVICE_STORE_URL, payload);

      if (response?.data?.success === false) {
        toast.error(response.data.message || 'The device could not be saved');
        return;
      }

      toast.success(response?.data?.message || 'Device saved');
      setFormOpen(false);
      setForm({ ...emptyForm, branch_id: branchId || userBranchId });
      loadDevices();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'The device could not be saved');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (device: any) => {
    try {
      const next = Number(device.status) === 1 ? 0 : 1;
      await httpService.post(`${API_HRMS_ATTENDANCE_DEVICE_STATUS_URL}${device.id}`, { status: next });
      toast.success(next === 1 ? 'Device switched on' : 'Device switched off');
      loadDevices();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not change the device');
    }
  };

  const openMappings = async (device: any) => {
    setMappingDevice(device);
    setMappings([]);
    setMappingCode('');
    setMappingEmployee(null);
    setEditingMapping(null);
    await loadMappings(device.id);
  };

  const loadMappings = async (deviceId: number | string) => {
    setMappingLoading(true);
    try {
      const response = await httpService.get(`${API_HRMS_ATTENDANCE_DEVICE_EMPLOYEES_URL}${deviceId}/employees`);
      setMappings(listFrom(response));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load the employees on this device');
    } finally {
      setMappingLoading(false);
    }
  };

  const addMapping = async () => {
    if (!mappingDevice) return;
    if (!mappingCode.trim()) {
      toast.error('The device code for this employee is required');
      return;
    }
    if (!mappingEmployee?.value) {
      toast.error('Choose the employee this code belongs to');
      return;
    }

    setMappingSaving(true);
    try {
      const response = editingMapping
        ? await httpService.post(`${API_HRMS_ATTENDANCE_MAPPING_UPDATE_URL}${editingMapping.id}`, {
            device_employee_code: mappingCode.trim(),
            employee_id: mappingEmployee.value,
          })
        : await httpService.post(`${API_HRMS_ATTENDANCE_MAPPING_URL}${mappingDevice.id}/map`, {
            device_employee_code: mappingCode.trim(),
            employee_id: mappingEmployee.value,
          });

      if (response?.data?.success === false) {
        toast.error(response.data.message || 'The code could not be mapped');
        return;
      }

      const rebuilt = response?.data?.data?.data?.days_rebuilt;
      toast.success(
        editingMapping
          ? 'Mapping updated. The punches this code already sent now belong to the employee named here, and their days were rebuilt.'
          : rebuilt
            ? `Mapped. ${rebuilt} earlier day${rebuilt === 1 ? '' : 's'} rebuilt from the punches already on file.`
            : 'Mapped',
      );
      setMappingCode('');
      setMappingEmployee(null);
      setEditingMapping(null);
      await loadMappings(mappingDevice.id);
      loadDevices();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'The code could not be mapped');
    } finally {
      setMappingSaving(false);
    }
  };

  /** Load an existing mapping into the form above, for a correction. */
  const startEditMapping = (mapping: any) => {
    setEditingMapping(mapping);
    setMappingCode(mapping.device_employee_code || '');
    setMappingEmployee(
      mapping.employee_id
        ? { value: mapping.employee_id, label: mapping.employee_name || `Employee ${mapping.employee_id}` }
        : null,
    );
  };

  const cancelEditMapping = () => {
    setEditingMapping(null);
    setMappingCode('');
    setMappingEmployee(null);
  };

  const removeMapping = async (mapping: any) => {
    try {
      await httpService.post(`${API_HRMS_ATTENDANCE_MAPPING_DELETE_URL}${mapping.id}`);
      toast.success('Mapping removed');
      if (mappingDevice) await loadMappings(mappingDevice.id);
      loadDevices();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not remove the mapping');
    }
  };

  // -------------------------------------------------------- device settings

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await httpService.get(API_HRMS_ATTENDANCE_DEVICE_SETTINGS_URL, {
        params: branchId ? { branch_id: branchId } : {},
      });
      const value = itemFrom(response);
      if (value) setSettings(value);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load the device settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'settings') loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, branchId]);

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const response = await httpService.post(API_HRMS_ATTENDANCE_DEVICE_SETTINGS_URL, {
        branch_id: branchId || null,
        auto_approve: settings.auto_approve ? 1 : 0,
        retention_days: Number(settings.retention_days || 0),
      });

      if (response?.data?.success === false) {
        toast.error(response.data.message || 'The settings could not be saved');
        return;
      }

      toast.success('Device settings saved');
      const value = itemFrom(response);
      if (value) setSettings((prev: any) => ({ ...prev, ...value }));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'The settings could not be saved');
    } finally {
      setSettingsSaving(false);
    }
  };

  /**
   * Put this code and employee on the branch's other terminals.
   *
   * ⚠️ THE FACE IS NOT COPIED. Each terminal still enrols the person itself;
   * what travels is the code and the name, so a punch from any device lands on
   * the same employee.
   */
  const copyMapping = async (mapping: any) => {
    if (!mappingDevice) return;

    const others = rows.filter((device) => Number(device.id) !== Number(mappingDevice.id)).map((device) => Number(device.id));

    if (!others.length) {
      toast.info('No other device is registered yet');
      return;
    }

    try {
      const response = await httpService.post(`${API_HRMS_ATTENDANCE_MAPPING_COPY_URL}${mapping.id}`, {
        device_ids: others,
      });

      if (response?.data?.success === false) {
        toast.error(response.data.message || 'The code could not be copied');
        return;
      }

      toast.success(response?.data?.message || 'Copied');
      await loadMappings(mappingDevice.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'The code could not be copied');
    }
  };

  // ----------------------------------------------------------- punch panel

  const openPunches = async (device: any) => {
    setPunchDevice(device);
    setPunches([]);
    setCommands([]);
    await Promise.all([loadPunches(device.id), loadCommands(device.id)]);
  };

  const loadPunches = async (deviceId: number | string) => {
    setPunchLoading(true);
    try {
      const response = await httpService.get(`${API_HRMS_ATTENDANCE_DEVICE_PUNCHES_URL}${deviceId}/punches`, {
        params: { date_from: punchFrom, date_to: punchTo },
      });
      setPunches(listFrom(response));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load the punches');
    } finally {
      setPunchLoading(false);
    }
  };

  const loadCommands = async (deviceId: number | string) => {
    try {
      const response = await httpService.get(`${API_HRMS_ATTENDANCE_DEVICE_COMMANDS_URL}${deviceId}/commands`);
      setCommands(listFrom(response));
    } catch {
      // A site a patch behind has no command queue; the panel still shows
      // punches, and the two buttons will say what happened on their own.
      setCommands([]);
    }
  };

  const queueCommand = async (
    action: 'sync_clock' | 'pull' | 'check' | 'delete_user' | 'send_user' | 'send_all',
    deviceEmployeeCode?: string,
  ) => {
    // Either panel can raise a command: the punch panel, or the employee list
    // when a face is being taken off the terminal.
    const device = punchDevice ?? mappingDevice;
    if (!device) return;

    setCommandSaving(action);
    try {
      const response = await httpService.post(`${API_HRMS_ATTENDANCE_DEVICE_COMMAND_URL}${device.id}/command`, {
        action,
        date_from: action === 'pull' ? punchFrom : undefined,
        date_to: action === 'pull' ? punchTo : undefined,
        device_employee_code: action === 'delete_user' || action === 'send_user' ? deviceEmployeeCode : undefined,
      });

      if (response?.data?.success === false) {
        toast.error(response.data.message || 'The command could not be queued');
        return;
      }

      toast.success(
        action === 'send_user' || action === 'send_all'
          ? response?.data?.message
          : action === 'pull'
          ? 'Queued. The terminal will send its records the next time it calls in.'
          : action === 'sync_clock'
            ? 'Queued. The clock is set the next time the terminal calls in.'
            : action === 'delete_user'
              ? `Queued. Code ${deviceEmployeeCode} is removed from the terminal on its next call — the attendance already recorded stays.`
              : 'Queued. The terminal answers on its next call.',
      );
      if (punchDevice) {
        await loadCommands(punchDevice.id);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'The command could not be queued');
    } finally {
      setCommandSaving('');
    }
  };

  /**
   * Rewrite the day rows for the chosen dates from the punches on file.
   *
   * ⚠️ NOTHING IS ASKED OF THE DEVICE. The evidence is already in hand; this
   * only makes the stored days agree with it again -- the way back from a late
   * mapping, an offline week, or a rule that turned out wrong.
   */
  const rebuildDays = async () => {
    if (!punchDevice) return;

    setCommandSaving('rebuild');
    try {
      const response = await httpService.post(API_HRMS_ATTENDANCE_PUNCHES_REBUILD_URL, {
        date_from: punchFrom,
        date_to: punchTo,
        device_id: punchDevice.id,
      });

      if (response?.data?.success === false) {
        toast.error(response.data.message || 'The days could not be rebuilt');
        return;
      }

      toast.success(response?.data?.message || 'Days rebuilt');
      await loadPunches(punchDevice.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'The days could not be rebuilt');
    } finally {
      setCommandSaving('');
    }
  };

  const summary = useMemo(
    () => [
      { label: 'Devices', value: rows.length },
      { label: 'Online Now', value: rows.filter((row) => Number(row.status) === 1).length },
      { label: 'Employees Enrolled', value: rows.reduce((sum, row) => sum + Number(row.mapped_employees || 0), 0) },
      { label: 'Punches Kept', value: rows.reduce((sum, row) => sum + Number(row.punch_total || 0), 0) },
    ],
    [rows],
  );

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (_row: any, index: number) => index + 1,
    },
    {
      key: 'device_name',
      header: 'Device',
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">{row.device_name || '-'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.device_code || 'No device code'}</div>
        </div>
      ),
    },
    {
      key: 'serial_no',
      header: 'Serial No.',
      render: (row: any) => <span className="font-mono text-xs">{row.serial_no || '-'}</span>,
    },
    {
      key: 'device_type',
      header: 'Type',
      render: (row: any) =>
        deviceTypes.find((type) => type.id === row.device_type)?.name || row.device_type || '-',
    },
    { key: 'branch_name', header: 'Branch', render: (row: any) => row.branch_name || '-' },
    {
      key: 'mapped_employees',
      header: 'Employees',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => Number(row.mapped_employees || 0),
    },
    {
      key: 'punch_total',
      header: 'Punches',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => Number(row.punch_total || 0),
    },
    {
      key: 'last_seen_at',
      header: 'Last Contact',
      render: (row: any) => {
        const skew = clockSkewLabel(row.clock_skew_seconds);

        return (
          <div>
            <span className={row.last_seen_at ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}>
              {formatDateTime(row.last_seen_at)}
            </span>
            {row.is_offline ? (
              <div
                className="text-xs font-semibold text-danger"
                title="The terminal has not called in for more than 15 minutes"
              >
                {row.minutes_since_seen === null ? 'Never called in' : `Offline ${row.minutes_since_seen}m`}
              </div>
            ) : null}
            {skew ? (
              <div className="text-xs font-semibold text-danger" title="The device clock does not agree with the server">
                Clock {skew}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            Number(row.status) === 1
              ? 'bg-success/10 text-success'
              : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
          }`}
        >
          {Number(row.status) === 1 ? 'On' : 'Off'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => openPunches(row)}
            title="Punches and commands"
            className="inline-flex h-8 w-8 items-center justify-center rounded bg-slate-500 text-white hover:bg-slate-400"
          >
            <FiActivity size={14} />
          </button>
          <button
            type="button"
            onClick={() => startEdit(row)}
            title="Edit device"
            className="inline-flex h-8 w-8 items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600"
          >
            <FiEdit2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => openMappings(row)}
            title="Employees on this device"
            className="inline-flex h-8 w-8 items-center justify-center rounded bg-primary text-white hover:opacity-90"
          >
            <FiUsers size={14} />
          </button>
          <button
            type="button"
            onClick={() => toggleStatus(row)}
            title={Number(row.status) === 1 ? 'Switch off' : 'Switch on'}
            className={`inline-flex h-8 w-8 items-center justify-center rounded text-white ${
              Number(row.status) === 1 ? 'bg-danger hover:opacity-90' : 'bg-success hover:opacity-90'
            }`}
          >
            <FiWifi size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Attendance Devices" />
      {loading && <Loader />}

      <div className="mb-3 flex gap-1 border-b border-[rgb(var(--c-border))]">
        {[
          { key: 'devices', label: 'Devices' },
          { key: 'settings', label: 'Device Settings' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key as 'devices' | 'settings')}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === item.key
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <div className="border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">Device Settings</h3>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            These apply to the branch chosen above. Leave the branch on “All Branches” to set them for the whole
            company; a branch with no answer of its own follows the company.
          </p>

          {settingsLoading ? (
            <Loader />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="border border-[rgb(var(--c-border))] p-3">
                  <DropdownCommon
                    id="auto_approve"
                    name="auto_approve"
                    label="Auto-approve device punches"
                    value={settings.auto_approve ? '1' : '0'}
                    data={[
                      { id: '1', name: 'Yes — approve as they land' },
                      { id: '0', name: 'No — wait for an admin' },
                    ]}
                    onChange={(event: any) =>
                      setSettings((prev: any) => ({ ...prev, auto_approve: event.target.value === '1' }))
                    }
                    className="font-medium"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    On: a punch is approved the moment the terminal sends it, carrying its real status (present /
                    late / half day). Off: every device row waits in Manual Attendance for an admin, as it does now.
                  </p>
                </div>

                <div className="border border-[rgb(var(--c-border))] p-3">
                  <InputElement
                    id="retention_days"
                    name="retention_days"
                    label="Keep punches for (days)"
                    type="number"
                    value={String(settings.retention_days ?? 0)}
                    onChange={(event: any) =>
                      setSettings((prev: any) => ({ ...prev, retention_days: event.target.value }))
                    }
                    className="w-full md:w-40"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    0 = keep every punch forever. The attendance rows are never deleted — only the raw log expires,
                    in a nightly job. A punch log is the evidence behind a day’s pay; set this only when the branch
                    has decided how long it is worth keeping.
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <ButtonLoading
                  onClick={saveSettings}
                  buttonLoading={settingsSaving}
                  disabled={settingsSaving}
                  label="Save Settings"
                  icon={<FiSave />}
                  className="px-5"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="border border-[rgb(var(--c-border))] p-3">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Enrollment from the server
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Not built, on purpose. Faces are enrolled on the terminal itself, so no face template or photo
                    ever reaches this server — the position the pilot was planned around. Pushing templates from
                    here would change that, and the law on biometric data.
                  </p>
                </div>
                <div className="border border-[rgb(var(--c-border))] p-3">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    The same employee on several terminals
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    A code and its employee can be copied to the branch’s other devices from the employee list
                    (Copy on each row). Each terminal still has to enrol the face itself — templates are never moved
                    between devices through this server.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className={tab === 'devices' ? '' : 'hidden'}>
      <div className="mb-3 border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch</label>
            <BranchDropdown
              name="branch_id"
              branchDdl={[{ id: '', name: 'All Branches' }, ...branches]}
              value={branchId}
              onChange={(event: any) => setBranchId(event.target.value)}
              className="w-full p-2 text-sm font-medium"
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button
              type="button"
              onClick={() => loadDevices()}
              className="inline-flex items-center justify-center bg-slate-700 px-5 text-sm font-medium text-white hover:bg-slate-600"
            >
              <FiRefreshCcw className="mr-2" /> Refresh
            </Button>
            <Button
              type="button"
              onClick={startNew}
              className="inline-flex items-center justify-center bg-primary px-5 text-sm font-medium text-white hover:opacity-90"
            >
              <FiPlus className="mr-2" /> Register Device
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-4 py-3">
            <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{item.label}</div>
            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-[rgb(var(--c-text))]">{item.value}</div>
          </div>
        ))}
      </div>

      {formOpen && (
        <div className="mb-3 border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
              {form.id ? 'Edit Device' : 'Register a Device'}
            </h3>
            <button type="button" onClick={() => setFormOpen(false)} className="text-slate-500 hover:text-slate-700">
              <FiX />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <InputElement
              id="device_name"
              name="device_name"
              label="Device Name"
              value={form.device_name}
              onChange={handleChange}
              placeholder="Main gate SenseFace 7B"
              className="w-full"
            />
            <InputElement
              id="serial_no"
              name="serial_no"
              label="Serial Number (on the device)"
              value={form.serial_no}
              onChange={handleChange}
              placeholder="e.g. SF7B-2401-00231"
              className="w-full"
            />
            <InputElement
              id="device_code"
              name="device_code"
              label="Device Code (optional)"
              value={form.device_code}
              onChange={handleChange}
              placeholder="GATE-1"
              className="w-full"
            />
            <DropdownCommon
              id="device_type"
              name="device_type"
              label="Type"
              value={form.device_type}
              data={deviceTypes}
              onChange={handleChange}
              className="font-medium"
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch</label>
              <BranchDropdown
                name="branch_id"
                branchDdl={[{ id: '', name: 'Select Branch' }, ...branches]}
                value={form.branch_id}
                onChange={handleChange}
                className="w-full p-2 text-sm font-medium"
              />
            </div>
            <InputElement
              id="ip_address"
              name="ip_address"
              label="Local IP (optional)"
              value={form.ip_address}
              onChange={handleChange}
              placeholder="192.168.1.201"
              className="w-full"
            />
            <InputElement
              id="comm_key"
              name="comm_key"
              label="Comm Key (optional)"
              value={form.comm_key}
              onChange={handleChange}
              placeholder="Only if the device has one"
              className="w-full"
            />
            <DropdownCommon
              id="status"
              name="status"
              label="Status"
              value={String(form.status)}
              data={[
                { id: '1', name: 'On' },
                { id: '0', name: 'Off' },
              ]}
              onChange={handleChange}
              className="font-medium"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <ButtonLoading
              onClick={saveDevice}
              buttonLoading={saving}
              disabled={saving}
              label="Save Device"
              icon={<FiSave />}
              className="px-5"
            />
            <Button
              type="button"
              onClick={() => setFormOpen(false)}
              className="inline-flex items-center justify-center bg-slate-500 px-5 text-sm font-medium text-white hover:bg-slate-600"
            >
              Cancel
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            On the terminal: Menu → Comm → Cloud Server / ADMS. Server address is this office's own API
            host, and the serial number above must match the one under Menu → About.
          </p>
        </div>
      )}

      {mappingDevice && (
        <div className="mb-3 border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
              Employees on {mappingDevice.device_name}
            </h3>
            <button type="button" onClick={() => setMappingDevice(null)} className="text-slate-500 hover:text-slate-700">
              <FiX />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap items-end gap-2">
            <InputElement
              id="device_employee_code"
              name="device_employee_code"
              label="Device Code"
              value={mappingCode}
              onChange={(event: any) => setMappingCode(event.target.value)}
              placeholder="The id typed on the terminal"
              className="w-full md:w-52"
            />
            <div className="w-full md:w-72">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Employee</label>
              <EmployeeDropdownSearch
                name="employee_id"
                value={mappingEmployee}
                placeholder="Search employee"
                onSelect={(option: any) => setMappingEmployee(option)}
                className=""
              />
            </div>
            <ButtonLoading
              onClick={addMapping}
              buttonLoading={mappingSaving}
              disabled={mappingSaving}
              label={editingMapping ? 'Update' : 'Map'}
              icon={editingMapping ? <FiSave /> : <FiUserPlus />}
              className="px-4"
            />
            {editingMapping && (
              <Button
                type="button"
                onClick={cancelEditMapping}
                className="inline-flex items-center justify-center bg-slate-500 px-4 text-sm font-medium text-white hover:bg-slate-600"
              >
                Cancel
              </Button>
            )}
            <ButtonLoading
              onClick={() => queueCommand('send_all')}
              buttonLoading={commandSaving === 'send_all'}
              disabled={commandSaving === 'send_all' || mappings.length === 0}
              label={t('attendanceDevice.sendAll')}
              icon={<FiUpload />}
              className="px-4"
              title={t('attendanceDevice.sendAllTitle')}
            />
          </div>

          {editingMapping && (
            <p className="mb-2 text-xs font-medium text-warning">
              Editing code <span className="font-mono">{editingMapping.device_employee_code}</span> — the punches it
              already sent will move to the employee chosen above, and their days will be rebuilt.
            </p>
          )}

          {mappingLoading && <Loader />}

          <Table
            columns={[
              { key: 'device_employee_code', header: 'Device Code' },
              { key: 'employee_name', header: 'Employee' },
              { key: 'employee_serial', header: 'Employee Serial', headerClass: 'text-center', cellClass: 'text-center' },
              {
                key: 'actions',
                header: 'Action',
                headerClass: 'text-center',
                cellClass: 'text-center',
                render: (row: any) => (
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEditMapping(row)}
                      className="inline-flex items-center rounded bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-600"
                      title="Correct this mapping — code or employee"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => copyMapping(row)}
                      className="inline-flex items-center rounded bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
                      title="Copy this code and employee to the branch's other devices — each still enrols the face itself"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMapping(row)}
                      className="inline-flex items-center rounded bg-danger px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
                      title="Remove the mapping in the software; the device keeps the face"
                    >
                      Unmap
                    </button>
                    <button
                      type="button"
                      onClick={() => queueCommand('send_user', row.device_employee_code)}
                      disabled={commandSaving === 'send_user'}
                      className="inline-flex items-center rounded bg-success px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      title={t('attendanceDevice.sendTitle')}
                    >
                      {t('attendanceDevice.sendToDevice')}
                    </button>
                    <button
                      type="button"
                      onClick={() => queueCommand('delete_user', row.device_employee_code)}
                      disabled={commandSaving === 'delete_user'}
                      className="inline-flex items-center rounded bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
                      title="Delete the face from the terminal itself — attendance already recorded stays"
                    >
                      Delete on Device
                    </button>
                  </div>
                ),
              },
            ]}
            data={mappings}
            perPage={20}
            noDataMessage="Nobody is mapped on this device yet"
          />
        </div>
      )}

      {punchDevice && (
        <div className="mb-3 border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
              Punches — {punchDevice.device_name}
            </h3>
            <button type="button" onClick={() => setPunchDevice(null)} className="text-slate-500 hover:text-slate-700">
              <FiX />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap items-end gap-2">
            <InputElement
              id="punch_from"
              name="punch_from"
              label="From"
              type="date"
              value={punchFrom}
              onChange={(event: any) => setPunchFrom(event.target.value)}
              className="w-full md:w-44"
            />
            <InputElement
              id="punch_to"
              name="punch_to"
              label="To"
              type="date"
              value={punchTo}
              onChange={(event: any) => setPunchTo(event.target.value)}
              className="w-full md:w-44"
            />
            <Button
              type="button"
              onClick={() => loadPunches(punchDevice.id)}
              className="inline-flex items-center justify-center bg-slate-700 px-4 text-sm font-medium text-white hover:bg-slate-600"
            >
              <FiRefreshCcw className="mr-2" /> Load
            </Button>
            <ButtonLoading
              onClick={() => queueCommand('sync_clock')}
              buttonLoading={commandSaving === 'sync_clock'}
              disabled={commandSaving === 'sync_clock'}
              label="Sync Clock"
              icon={<FiClock />}
              className="px-4"
            />
            <ButtonLoading
              onClick={() => queueCommand('pull')}
              buttonLoading={commandSaving === 'pull'}
              disabled={commandSaving === 'pull'}
              label="Pull Punches"
              icon={<FiDownload />}
              className="px-4"
            />
            <ButtonLoading
              onClick={rebuildDays}
              buttonLoading={commandSaving === 'rebuild'}
              disabled={commandSaving === 'rebuild'}
              label="Rebuild Days"
              icon={<FiRefreshCcw />}
              className="px-4"
            />
          </div>

          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            The terminal cannot be reached directly — a command waits here until it next calls in, then takes effect.
            Pull Punches asks it to re-send the records it is holding for the dates above.
          </p>

          {punchLoading && <Loader />}

          <Table
            columns={[
              {
                key: 'serial_no',
                header: 'Sl. No.',
                headerClass: 'text-center',
                cellClass: 'text-center',
                render: (_row: any, index: number) => index + 1,
              },
              { key: 'device_employee_code', header: 'Device Code' },
              {
                key: 'employee_name',
                header: 'Employee',
                render: (row: any) => row.employee_name || <span className="text-danger">Unmatched</span>,
              },
              { key: 'punch_at', header: 'Device Time', render: (row: any) => formatDateTime(row.punch_at) },
              { key: 'received_at', header: 'Received', render: (row: any) => formatDateTime(row.received_at) },
              { key: 'verify_mode', header: 'Verify', headerClass: 'text-center', cellClass: 'text-center' },
            ]}
            data={punches}
            perPage={20}
            noDataMessage="No punches from this device in that range"
          />

          <div className="mt-3">
            <div className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Command History</div>
            <Table
              columns={[
                {
                  key: 'action',
                  header: 'Command',
                  render: (row: any) => (
                    <div>
                      <div className="font-semibold">{row.action}</div>
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400">{row.command}</div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row: any) => (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        row.status === 'done'
                          ? 'bg-success/10 text-success'
                          : row.status === 'failed'
                            ? 'bg-danger/10 text-danger'
                            : row.status === 'sent'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {row.status}
                    </span>
                  ),
                },
                { key: 'sent_at', header: 'Sent', render: (row: any) => formatDateTime(row.sent_at) },
                { key: 'acked_at', header: 'Answered', render: (row: any) => formatDateTime(row.acked_at) },
              ]}
              data={commands}
              perPage={5}
              noDataMessage="Nothing has been asked of this device yet"
            />
          </div>
        </div>
      )}

      <div className="border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))]">
        <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">Attendance Devices</h3>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {rows.length} devices
          </span>
        </div>
        <Table columns={columns} data={rows} perPage={20} noDataMessage="No attendance device is registered yet" />
      </div>
      </div>
    </div>
  );
};

export default AttendanceDevices;
