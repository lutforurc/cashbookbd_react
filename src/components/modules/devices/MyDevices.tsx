import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiMonitor, FiRefreshCw } from 'react-icons/fi';
import httpService from '../../services/httpService';
import { API_DEVICES_URL, API_DEVICE_REVOKE_URL } from '../../services/apiRoutes';
import Breadcrumb from '../../Breadcrumbs/Breadcrumb';
import { logout } from '../../../features/authReducer';
import { useDispatch } from 'react-redux';

type Device = {
  id: number;
  name: string;
  ip: string | null;
  last_used_at: string | null;
  created_at: string | null;
  is_current: boolean;
};

const formatWhen = (value: string | null): string => {
  if (!value) return 'Never';
  const parsed = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const MyDevices: React.FC = () => {
  const dispatch = useDispatch();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceLimit, setDeviceLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchDevices = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const response = await httpService.get(API_DEVICES_URL);
      setDevices(response?.data?.data?.devices ?? []);
      setDeviceLimit(response?.data?.data?.device_limit ?? null);
    } catch {
      toast.error('Could not load your devices.', { toastId: 'devices-load' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleSignOut = async (device: Device) => {
    setBusyId(device.id);
    try {
      await httpService.delete(`${API_DEVICE_REVOKE_URL}/${device.id}`);

      // Signing out the device you are on ends this session too.
      if (device.is_current) {
        toast.info('Signed out of this device.');
        dispatch(logout() as any);
        return;
      }

      toast.success(`Signed out of ${device.name}.`);
      fetchDevices(false);
    } catch {
      toast.error('Could not sign that device out.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Breadcrumb pageName="My Devices" />

      <div className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-medium text-black dark:text-white">Signed-in devices</h3>
            <p className="text-sm text-body">
              {deviceLimit === null
                ? 'Your plan allows unlimited devices per user.'
                : `Your plan allows ${deviceLimit} device${deviceLimit === 1 ? '' : 's'} per user — ${devices.length} in use.`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchDevices()}
            className="flex items-center gap-2 rounded border border-stroke px-3 py-2 text-sm hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-body">Loading…</p>
        ) : devices.length === 0 ? (
          <p className="py-6 text-center text-sm text-body">No active devices found.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {devices.map((device) => (
              <li
                key={device.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-stroke px-4 py-3 dark:border-strokedark"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FiMonitor className="shrink-0 text-body" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-black dark:text-white">
                      {device.name}
                      {device.is_current && (
                        <span className="rounded bg-success px-2 py-0.5 text-xs font-normal text-white">
                          This device
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-body">
                      {device.ip ? `${device.ip} · ` : ''}
                      Signed in {formatWhen(device.created_at)} · Last used {formatWhen(device.last_used_at)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => handleSignOut(device)}
                  className="shrink-0 rounded bg-danger px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {busyId === device.id ? 'Signing out…' : device.is_current ? 'Sign out' : 'Sign out remotely'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default MyDevices;
