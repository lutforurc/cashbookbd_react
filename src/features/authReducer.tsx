import {
  API_LOGIN_URL,
  API_LOGOUT_URL,
  API_CSRF_COOKIES,
  API_AUTH_CHECK_URL,
  API_LOGIN_RELEASE_DEVICE_URL,
} from '../components/services/apiRoutes';
import Cookies from 'js-cookie';
import httpService from '../components/services/httpService';
import { Dispatch, AnyAction } from 'redux';
import { userCurrentBranch } from '../components/modules/branch/branchSlice';
import { getSettings } from '../components/modules/settings/settingsSlice';

type AuthError = { message: string } | null;

export type ActiveDevice = {
  id: number;
  name: string;
  ip: string | null;
  last_used_at: string | null;
  created_at: string | null;
};

// Set when the API rejects a login because the plan's device limit is full.
export type DeviceLimitBlock = {
  message: string;
  deviceLimit: number | null;
  devices: ActiveDevice[];
} | null;

type AuthState = {
  isLoading: boolean;
  isLoggedIn: boolean;
  me: any;
  errors: AuthError;
  deviceLimit: DeviceLimitBlock;
};

// Server error code for "plan device limit reached".
const DEVICE_LIMIT_CODE = 10010;

export const getToken = () => Cookies.get('_trio_lead_token');

export const storeToken = (token: string, remember?: boolean | string) => {
  const rememberBool = remember === true || remember === 'true' || remember === '1';
  // Secure cookies are silently dropped by browsers on http origins (except
  // localhost) — e.g. a LAN IP or an http *.test domain. That would stop the
  // token (and therefore "Remember me") from persisting, so only mark the
  // cookie Secure when the page is actually served over https.
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';

  Cookies.set('_trio_lead_token', token, {
    path: '/',
    secure: isSecure,
    sameSite: 'lax',
    ...(rememberBool ? { expires: 30 } : {}), // remember → 30 days, else session cookie
  });
};

export const removeData = () => {
  Cookies.remove('_trio_lead_token', { path: '/' });
  Cookies.remove('laravel_session');
  Cookies.remove('XSRF-TOKEN');
  localStorage.removeItem('settings');
};

// actions
interface InitialLoginData {
  loginId: string;
  password: string;
  remember?: boolean | string;
  callback?: (response: any) => void;
}

export const login = ({ loginId, password, remember, callback }: InitialLoginData) => async (dispatch: any) => {
    dispatch({ type: 'AUTH/login/pending' });

    try {
      await httpService.get(API_CSRF_COOKIES);

      const response = await httpService.post(
        API_LOGIN_URL,
        {
          email: loginId,
          phone: loginId,
          mobile: loginId,
          password,
        },
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
      const payload = error?.response?.data;

      // Plan device limit reached — surface the active devices so the user can
      // sign one out instead of being told their password is wrong.
      if (error?.response?.status === 403 && payload?.error?.code === DEVICE_LIMIT_CODE) {
        removeData();
        dispatch({
          type: 'AUTH/login/deviceLimit',
          payload: {
            message: payload?.error?.message ?? 'Device limit reached for your plan.',
            deviceLimit: payload?.data?.device_limit ?? null,
            devices: payload?.data?.devices ?? [],
          },
        });
        return;
      }

      const msg =
        payload?.message ??
        payload?.error?.message ??
        payload?.error ??
        error?.message ??
        'Invalid username or password.';

      removeData();
      dispatch({
        type: 'AUTH/login/error',
        payload: { message: typeof msg === 'string' ? msg : 'Invalid username or password.' },
      });
    }
  };

/**
 * Frees a device slot from the login screen, where the user has no token yet.
 * Credentials are re-verified server-side.
 */
export const releaseDeviceAtLogin =
  ({
    loginId,
    password,
    tokenId,
    onSuccess,
    onError,
  }: {
    loginId: string;
    password: string;
    tokenId: number;
    onSuccess?: () => void;
    onError?: (message: string) => void;
  }) =>
  async (dispatch: any) => {
    try {
      const response = await httpService.post(API_LOGIN_RELEASE_DEVICE_URL, {
        email: loginId,
        phone: loginId,
        mobile: loginId,
        password,
        token_id: tokenId,
      });

      if (response?.data?.success) {
        dispatch({ type: 'AUTH/login/deviceReleased', payload: tokenId });
        if (typeof onSuccess === 'function') onSuccess();
        return;
      }

      if (typeof onError === 'function') {
        onError(response?.data?.error?.message ?? 'Could not sign that device out.');
      }
    } catch (error: any) {
      if (typeof onError === 'function') {
        onError(
          error?.response?.data?.error?.message ?? 'Could not sign that device out.',
        );
      }
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
  // Best-effort server-side token revocation; clear locally regardless.
  // Without this the Sanctum token stays valid forever (tokens have no
  // expiry), so a "logged out" device would keep holding its device slot.
  if (getToken()) {
    httpService.post(API_LOGOUT_URL).catch(() => {});
  }
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
  deviceLimit: null,
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
      return { ...state, isLoading: true, errors: null, deviceLimit: null };

    case 'AUTH/login/success':
      return { ...state, isLoading: false, isLoggedIn: true, me: action.payload, errors: null, deviceLimit: null };

    case 'AUTH/login/error':
      return { ...state, isLoading: false, isLoggedIn: false, me: {}, errors: normalizeError(action.payload), deviceLimit: null };

    case 'AUTH/login/deviceLimit':
      return { ...state, isLoading: false, isLoggedIn: false, me: {}, errors: null, deviceLimit: action.payload };

    case 'AUTH/login/deviceReleased':
      return state.deviceLimit
        ? {
            ...state,
            deviceLimit: {
              ...state.deviceLimit,
              devices: state.deviceLimit.devices.filter((d) => d.id !== action.payload),
            },
          }
        : state;

    case 'AUTH/login/deviceLimitDismissed':
      return { ...state, deviceLimit: null };

    case 'AUTH/logout/success':
      return { ...state, isLoading: false, isLoggedIn: false, me: {}, errors: null, deviceLimit: null };

    default:
      return state;
  }
};

export default authReducer;
