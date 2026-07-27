import httpService from '../../services/httpService';
import { getDeviceId } from '../../services/deviceId';
import {
  API_ADMIN_IN_APP_MESSAGE_UPLOAD_URL,
  API_ADMIN_IN_APP_MESSAGE_URL,
  API_IN_APP_MESSAGE_EVENTS_URL,
  API_IN_APP_MESSAGE_SYNC_URL,
} from '../../services/apiRoutes';
import {
  InAppEventName,
  InAppMessage,
  InAppMessageAdminRow,
  InAppMessageEvent,
  InAppTrigger,
} from './types';

const EVENT_QUEUE_KEY = 'cashbook-in-app-message-events';
const SESSION_TRIGGER_KEY = 'cashbook-in-app-message-session';

/* ============================ CLIENT ============================ */

/**
 * A browser has no "app launch" of its own, so the first page load of a browser
 * session counts as LOGIN and every later reload as APP_OPEN. sessionStorage is
 * the right lifetime here: it dies with the tab, exactly like an app process.
 */
export const resolveTrigger = (): InAppTrigger => {
  try {
    if (!sessionStorage.getItem(SESSION_TRIGGER_KEY)) {
      sessionStorage.setItem(SESSION_TRIGGER_KEY, '1');
      return 'LOGIN';
    }
  } catch {
    /* storage disabled — fall through to APP_OPEN */
  }

  return 'APP_OPEN';
};

export const syncInAppMessages = async (
  trigger: InAppTrigger,
  branchId?: number,
): Promise<InAppMessage[]> => {
  const response = await httpService.get(API_IN_APP_MESSAGE_SYNC_URL, {
    params: {
      platform: 'web',
      trigger,
      device_id: getDeviceId(),
      branch_id: branchId || undefined,
    },
  });

  const messages = response?.data?.data?.data?.messages;
  return Array.isArray(messages) ? messages : [];
};

const readQueue = (): InAppMessageEvent[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(EVENT_QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (events: InAppMessageEvent[]) => {
  try {
    // Keep the queue bounded; the oldest impressions matter least.
    localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(events.slice(-100)));
  } catch {
    /* storage disabled — events for this session are simply lost */
  }
};

/**
 * Records one event. Queued first, then flushed, so a failed request (offline,
 * server down) is retried on the next event or the next app load instead of
 * silently losing an impression the frequency cap depends on.
 */
export const recordInAppEvent = async (
  messageId: number,
  event: InAppEventName,
  actionTarget?: string | null,
): Promise<void> => {
  const queued = readQueue();
  queued.push({
    message_id: messageId,
    event,
    platform: 'web',
    device_id: getDeviceId(),
    action_target: actionTarget || null,
    occurred_at: new Date().toISOString(),
  });
  writeQueue(queued);

  await flushInAppEvents();
};

export const flushInAppEvents = async (): Promise<void> => {
  const pending = readQueue();
  if (!pending.length) return;

  try {
    await httpService.post(API_IN_APP_MESSAGE_EVENTS_URL, { events: pending });
    writeQueue([]);
  } catch {
    // Leave the queue in place; the next event or app load retries it.
  }
};

/* ============================= ADMIN ============================= */

export const listAdminInAppMessages = async (): Promise<InAppMessageAdminRow[]> => {
  const response = await httpService.get(API_ADMIN_IN_APP_MESSAGE_URL);
  const messages = response?.data?.data?.data?.messages;
  return Array.isArray(messages) ? messages : [];
};

export const getAdminInAppMessage = async (id: number | string) => {
  const response = await httpService.get(`${API_ADMIN_IN_APP_MESSAGE_URL}/${id}`);
  return response?.data?.data?.data?.message ?? null;
};

export const saveAdminInAppMessage = async (payload: any, id?: number | string) => {
  const url = id
    ? `${API_ADMIN_IN_APP_MESSAGE_URL}/${id}`
    : API_ADMIN_IN_APP_MESSAGE_URL;
  const response = await httpService.post(url, payload);
  return response?.data;
};

export const deleteAdminInAppMessage = async (id: number | string) => {
  const response = await httpService.delete(`${API_ADMIN_IN_APP_MESSAGE_URL}/${id}`);
  return response?.data;
};

export const uploadInAppMessageImage = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append('image', file);

  const response = await httpService.post(API_ADMIN_IN_APP_MESSAGE_UPLOAD_URL, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response?.data?.data?.data?.image_url ?? '';
};
