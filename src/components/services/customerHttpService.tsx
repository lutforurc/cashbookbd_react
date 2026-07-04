import axios from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';
import { API_BASE_URL } from './apiRoutes';

// Customer portal uses its own Sanctum token, separate from the admin token
// (_trio_lead_token). The shared httpService only ever attaches the admin
// token, so authenticated customer calls need this dedicated instance.
const CUSTOMER_TOKEN_COOKIE = '_trio_lead_customer_token';

const getCustomerToken = () => Cookies.get(CUSTOMER_TOKEN_COOKIE);

const customerHttpService = axios.create({
    baseURL: API_BASE_URL,
});

customerHttpService.interceptors.request.use(function (config) {
    const token = getCustomerToken();
    config.xsrfHeaderName = 'X-XSRF-TOKEN';
    config.withCredentials = true;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const clearCustomerSession = () => {
    Cookies.remove(CUSTOMER_TOKEN_COOKIE, { path: '/' });
    Cookies.remove('laravel_session');
    Cookies.remove('XSRF-TOKEN');
};

// One redirect even if several requests 401 at once.
let sessionExpiredHandled = false;

customerHttpService.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error?.response) {
            const isCancelled =
                (typeof axios.isCancel === 'function' && axios.isCancel(error)) ||
                error?.code === 'ERR_CANCELED';
            if (!isCancelled) {
                toast.error('Network error — please check your connection and try again.', {
                    toastId: 'customer-network-error',
                });
            }
            return Promise.reject(error);
        }

        const status = error.response.status;
        const onLoginPage =
            typeof window !== 'undefined' && window.location.pathname === '/customer/login';

        // Expired/invalid customer token → back to the customer login page.
        if (status === 401 && getCustomerToken() && !onLoginPage) {
            if (!sessionExpiredHandled) {
                sessionExpiredHandled = true;
                clearCustomerSession();
                toast.error('Your session has expired. Please log in again.', {
                    toastId: 'customer-session-expired',
                });
                setTimeout(() => {
                    window.location.href = '/customer/login';
                }, 600);
            }
            return Promise.reject(error);
        }

        return Promise.reject(error);
    },
);

export default customerHttpService;
