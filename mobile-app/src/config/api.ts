import { Platform } from 'react-native';

const fallbackApiUrl = 'https://aft.cashbookbd.com';
const webDevProxyUrl = process.env.EXPO_PUBLIC_API_PROXY_URL;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const resolveApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  if (Platform.OS === 'web' && process.env.NODE_ENV !== 'production' && webDevProxyUrl) {
    return webDevProxyUrl;
  }

  return fallbackApiUrl;
};

export const API_REMOTE_URL = trimTrailingSlash(
  resolveApiUrl(),
);

export const API_BASE_URL = `${API_REMOTE_URL}/api`;
export const API_CSRF_COOKIES = `${API_REMOTE_URL}/sanctum/csrf-cookie`;

export const endpoints = {
  login: `${API_BASE_URL}/login`,
  me: `${API_BASE_URL}/me`,
  dashboard: `${API_BASE_URL}/dashboard/data`,
  settings: `${API_BASE_URL}/settings/get-settings`,
};
