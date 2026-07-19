import axios from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';
import { API_BASE_URL } from './apiRoutes';
import { getDeviceId } from './deviceId';

const AUTH_TOKEN_COOKIE = '_trio_lead_token';

const getStoredToken = () => Cookies.get(AUTH_TOKEN_COOKIE);

axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

const httpService = axios.create({
    baseURL: API_BASE_URL
});

httpService.interceptors.request.use(function (config) {
    const token = getStoredToken();
    config.xsrfHeaderName = 'X-XSRF-TOKEN';
    config.withCredentials = true;
    // Identifies this browser as one device slot against the plan's limit.
    config.headers['X-Device-Id'] = getDeviceId();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Clear all client-side auth/session state (mirrors authReducer.removeData()).
const clearSession = () => {
    Cookies.remove(AUTH_TOKEN_COOKIE, { path: '/' });
    Cookies.remove('laravel_session');
    Cookies.remove('XSRF-TOKEN');
    try {
        localStorage.removeItem('settings');
    } catch {
        /* ignore storage access errors */
    }
};

// Guard so a burst of concurrent 401s triggers only one redirect.
let sessionExpiredHandled = false;

httpService.interceptors.response.use(
    (response) => response,
    (error) => {
        // No response object = network failure, timeout, CORS, or a cancelled request.
        if (!error?.response) {
            const isCancelled = (typeof axios.isCancel === 'function' && axios.isCancel(error)) || error?.code === 'ERR_CANCELED';
            if (!isCancelled) {
                toast.error('Network error — please check your connection and try again.', {
                    toastId: 'network-error',
                });
            }
            return Promise.reject(error);
        }

        const status = error.response.status;
        const onLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';

        // 401 while a token exists means the session/token expired → force re-login.
        // (No token, or already on /login, means it's a normal auth failure the
        // login flow handles itself — don't hijack it.)
        if (status === 401 && getStoredToken() && !onLoginPage) {
            if (!sessionExpiredHandled) {
                sessionExpiredHandled = true;
                clearSession();
                toast.error('Your session has expired. Please log in again.', {
                    toastId: 'session-expired',
                });
                setTimeout(() => {
                    window.location.href = '/login';
                }, 600);
            }
            return Promise.reject(error);
        }

        // The device-limit 403 is a normal outcome of logging in, not a
        // permission failure — the login screen renders its own device
        // chooser for it, so don't show the generic toast over the top.
        const isDeviceLimit = error.response?.data?.error?.code === 10010;

        // Authenticated but not allowed — components rarely handle 403 distinctly.
        if (status === 403 && !isDeviceLimit) {
            toast.error(error.response?.data?.message || 'You do not have permission to perform this action.', {
                toastId: 'forbidden',
            });
            return Promise.reject(error);
        }

        // 4xx (validation, not-found) and 5xx stay with the caller, which shows
        // its own context-specific message. Just pass the error through.
        return Promise.reject(error);
    },
);

export default httpService;
