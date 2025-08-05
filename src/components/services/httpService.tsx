import axios from 'axios';
import { getToken } from '../../features/authReducer';
import { API_BASE_URL } from './apiRoutes';

axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

const httpService = axios.create({
    baseURL: API_BASE_URL
});

httpService.interceptors.request.use(function (config) {
    const token = getToken();
    config.xsrfHeaderName = 'X-XSRF-TOKEN';
    config.withCredentials = true;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default httpService;
