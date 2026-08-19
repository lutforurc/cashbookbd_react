import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { FiMonitor, FiX } from 'react-icons/fi';
import { ActiveDevice, DeviceLimitBlock, releaseDeviceAtLogin } from '../../../features/authReducer';
import { Button } from '../../../pages/UiElements/CustomButtons';

type Props = {
  block: NonNullable<DeviceLimitBlock>;
  loginId: string;
  password: string;
  /** Called after a slot is freed, so the caller can retry the login. */
  onReleased: () => void;
  onCancel: () => void;
};

const formatWhen = (value: string | null): string => {
  if (!value) return 'Never used';
  const parsed = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const DeviceLimitNotice: React.FC<Props> = ({ block, loginId, password, onReleased, onCancel }) => {
  const dispatch = useDispatch();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = (device: ActiveDevice) => {
    setError(null);
    setBusyId(device.id);

    dispatch(
      releaseDeviceAtLogin({
        loginId,
        password,
        tokenId: device.id,
        onSuccess: () => {
          setBusyId(null);
          onReleased();
        },
        onError: (message) => {
          setBusyId(null);
          setError(message);
        },
      }) as any,
    );
  };

  return (
    <div className="rounded-lg border border-warning bg-warning/10 p-4 text-left">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h4 className="font-semibold text-black dark:text-white">Device limit reached</h4>
        <Button
          type="button"
          onClick={onCancel}
          aria-label="Dismiss"
          className="text-body hover:text-black dark:hover:text-white"
        >
          <FiX />
        </Button>
      </div>

      <p className="mb-3 text-sm text-body">
        {block.message}
        {block.deviceLimit !== null && (
          <> Your plan allows {block.deviceLimit} device{block.deviceLimit === 1 ? '' : 's'} per user.</>
        )}
      </p>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <ul className="mb-3 flex flex-col gap-2">
        {block.devices.map((device) => (
          <li
            key={device.id}
            className="flex items-center justify-between gap-3 rounded border border-stroke bg-white px-3 py-2 dark:border-strokedark dark:bg-boxdark"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FiMonitor className="shrink-0 text-body" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-black dark:text-white">{device.name}</p>
                <p className="truncate text-xs text-body">
                  {device.ip ? `${device.ip} · ` : ''}
                  Last used {formatWhen(device.last_used_at)}
                </p>
              </div>
            </div>

            <Button
              type="button"
              disabled={busyId !== null}
              onClick={() => handleSignOut(device)}
              className="shrink-0 rounded bg-danger px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
            >
              {busyId === device.id ? 'Signing out…' : 'Sign out'}
            </Button>
          </li>
        ))}
      </ul>

      <p className="text-xs text-body">
        Sign out of one device to continue, or upgrade your plan for more devices.
      </p>
    </div>
  );
};

export default DeviceLimitNotice;
