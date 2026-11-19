import React, { useEffect, useMemo, useState } from 'react';
import {
  FiEdit2,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiUserPlus,
  FiUsers,
  FiWifi,
  FiX,
} from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

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
  API_HRMS_ATTENDANCE_DEVICE_EMPLOYEES_URL,
  API_HRMS_ATTENDANCE_DEVICE_STATUS_URL,
  API_HRMS_ATTENDANCE_DEVICE_STORE_URL,
  API_HRMS_ATTENDANCE_DEVICE_UPDATE_URL,
  API_HRMS_ATTENDANCE_MAPPING_DELETE_URL,
  API_HRMS_ATTENDANCE_MAPPING_URL,
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
      const response = await httpService.post(`${API_HRMS_ATTENDANCE_MAPPING_URL}${mappingDevice.id}/map`, {
        device_employee_code: mappingCode.trim(),
        employee_id: mappingEmployee.value,
      });

      if (response?.data?.success === false) {
        toast.error(response.data.message || 'The code could not be mapped');
        return;
      }

      const rebuilt = response?.data?.data?.data?.days_rebuilt;
      toast.success(
        rebuilt
          ? `Mapped. ${rebuilt} earlier day${rebuilt === 1 ? '' : 's'} rebuilt from the punches already on file.`
          : 'Mapped',
      );
      setMappingCode('');
      setMappingEmployee(null);
      await loadMappings(mappingDevice.id);
      loadDevices();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'The code could not be mapped');
    } finally {
      setMappingSaving(false);
    }
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
      render: (row: any) => (
        <span className={row.last_seen_at ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}>
          {formatDateTime(row.last_seen_at)}
        </span>
      ),
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
              label="Map"
              icon={<FiUserPlus />}
              className="px-4"
            />
          </div>

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
                  <button
                    type="button"
                    onClick={() => removeMapping(row)}
                    className="inline-flex items-center rounded bg-danger px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Remove
                  </button>
                ),
              },
            ]}
            data={mappings}
            perPage={20}
            noDataMessage="Nobody is mapped on this device yet"
          />
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
  );
};

export default AttendanceDevices;
