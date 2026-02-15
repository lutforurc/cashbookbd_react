import {
  API_LOGIN_URL,
  API_CSRF_COOKIES,
  API_AUTH_CHECK_URL,
} from '../components/services/apiRoutes';
import Cookies from 'js-cookie';
import httpService from '../components/services/httpService';
import { Dispatch, AnyAction } from 'redux';
import { userCurrentBranch } from '../components/modules/branch/branchSlice';
import { getSettings } from '../components/modules/settings/settingsSlice';

type AuthError = { message: string } | null;

type AuthState = {
  isLoading: boolean;
  isLoggedIn: boolean;
  me: any;
  errors: AuthError;
};

export const getToken = () => Cookies.get('_trio_lead_token');

export const storeToken = (token: string, remember?: boolean | string) => {
  const rememberBool = remember === true || remember === 'true' || remember === '1';

  Cookies.set('_trio_lead_token', token, {
    secure: true,
    sameSite: 'strict',
    ...(rememberBool ? { expires: 30 } : {}), // remember হলে 30 days
  });
};

export const removeData = () => {
  Cookies.remove('_trio_lead_token');
  Cookies.remove('laravel_session');
  Cookies.remove('XSRF-TOKEN');
  localStorage.removeItem('settings');
};

// actions
interface InitialLoginData {
  email: string;
  password: string;
  remember?: boolean | string;
  callback?: (response: any) => void;
}

export const login = ({ email, password, remember, callback }: InitialLoginData) => async (dispatch: any) => {
    dispatch({ type: 'AUTH/login/pending' });

    try {
      await httpService.get(API_CSRF_COOKIES);

      const response = await httpService.post(
        API_LOGIN_URL,
        { email, password },
        {
          xsrfHeaderName: 'X-XSRF-TOKEN',
          withCredentials: true,
        },
      );

      if (response?.status === 200 && response?.data?.success) {
        storeToken(response.data.data.token, remember);

        dispatch({
          type: 'AUTH/login/success',
          payload: response.data.data.user,
        });

        if (typeof callback === 'function') callback(response);
        return;
      }

      removeData();
      dispatch({
        type: 'AUTH/login/error',
        payload: { message: response?.data?.message ?? 'Invalid username or password.' },
      });
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        error?.message ??
        'Invalid username or password.';

      removeData();
      dispatch({
        type: 'AUTH/login/error',
        payload: { message: msg },
      });
    }
  };

export const authCheck = () => async (dispatch: Dispatch<AnyAction>) => {
  const token = getToken();
  if (!token) return;

  dispatch({ type: 'AUTH/login/pending' });

  try {
    const response = await httpService.get(API_AUTH_CHECK_URL);

    if (response.status === 200) {
      dispatch({ type: 'AUTH/login/success', payload: response.data });
      dispatch(userCurrentBranch() as any);
      dispatch(getSettings() as any);
      return;
    }

    removeData();
    dispatch({
      type: 'AUTH/login/error',
      payload: { message: 'Please login to continue.' },
    });
  } catch (error: any) {
    removeData();
    dispatch({
      type: 'AUTH/login/error',
      payload: { message: 'Please login to continue.' },
    });
  }
};

export const logout = () => (dispatch: any) => {
  removeData();
  dispatch({ type: 'AUTH/logout/success' });
  window.location.href = '/login';
};

// Reducer
const initialState: AuthState = {
  isLoading: false,
  isLoggedIn: false,
  me: {},
  errors: null,
};

const normalizeError = (payload: any): AuthError => {
  if (!payload) return { message: 'Login failed. Please try again.' };
  if (typeof payload === 'string') return { message: payload };
  if (typeof payload?.message === 'string') return { message: payload.message };
  if (typeof payload?.message?.message === 'string') return { message: payload.message.message };
  return { message: 'Login failed. Please try again.' };
};

const authReducer = (state = initialState, action: any): AuthState => {
  switch (action.type) {
    case 'AUTH/login/pending':
      return { ...state, isLoading: true, errors: null };

    case 'AUTH/login/success':
      return { ...state, isLoading: false, isLoggedIn: true, me: action.payload, errors: null };

    case 'AUTH/login/error':
      return { ...state, isLoading: false, isLoggedIn: false, me: {}, errors: normalizeError(action.payload) };

    case 'AUTH/logout/success':
      return { ...state, isLoading: false, isLoggedIn: false, me: {}, errors: null };

    default:
      return state;
  }
};

export default authReducer;
