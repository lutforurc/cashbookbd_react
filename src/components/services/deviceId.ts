/**
 * Stable per-browser identifier sent as X-Device-Id.
 *
 * The API treats one device id as one device slot, so logging in again from
 * this browser reuses its slot instead of consuming another one. Without the
 * header the server falls back to hashing user agent + IP, which changes
 * whenever the network does — so keep this value stable and long-lived.
 *
 * Deliberately in localStorage, not a cookie: it must survive logout, which
 * clears the auth cookies.
 */
const DEVICE_ID_KEY = '_trio_lead_device_id';

const randomId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    /* fall through to the non-crypto path below */
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
};

export const getDeviceId = (): string => {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const created = randomId();
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    // Private mode / storage disabled: still send something well-formed so the
    // request succeeds. The slot just will not be stable across reloads.
    return randomId();
  }
};

export default getDeviceId;
