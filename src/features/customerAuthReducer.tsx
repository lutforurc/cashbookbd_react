import {
  API_CSRF_COOKIES,
  API_CUSTOMER_AUTH_CHECK_URL,
  API_CUSTOMER_LOGIN_URL,
  API_CUSTOMER_LOGOUT_URL,
  API_CUSTOMER_CHANGE_PASSWORD_URL,
} from '../components/services/apiRoutes';
import ROUTES from '../components/services/appRoutes';
import Cookies from 'js-cookie';
import customerHttpService from '../components/services/customerHttpService';
import { Dispatch, AnyAction } from 'redux';

export const getCustomerToken = () => {
  return Cookies.get('_trio_lead_customer_token');
};

export const storeCustomerToken = (token: string) => {
  Cookies.set('_trio_lead_customer_token', token, { secure: true });
};

export const removeData = () => {
  Cookies.remove('_trio_lead_customer_token');
  Cookies.remove('laravel_session');
  Cookies.remove('XSRF-TOKEN');
  localStorage.removeItem('settings');
};

// actions
interface initialLoginData {
  mobile: string;
  password: string;
  callback?: any;
  onError?: (message: string) => void;
}
export const customerLogin =
  ({ mobile, password, callback, onError }: initialLoginData) =>
    (dispatch: any) => {
      dispatch({ type: 'AUTH/CUSTOMER/login/pending' });

      customerHttpService.get(API_CSRF_COOKIES).then((res) => {
        customerHttpService
          .post(
            API_CUSTOMER_LOGIN_URL,
            { mobile, password },
            {
              xsrfHeaderName: 'X-XSRF-TOKEN',
              withCredentials: true,
            },
          )
          .then((response) => {
            if (response.status === 200 && response.data.success) {
              storeCustomerToken(response.data.data.token);
              dispatch({
                type: 'AUTH/CUSTOMER/login/success',
                payload: response.data,
              });
              if ('function' == typeof callback) {
                callback(response);
              }
            } else {
              removeData();
              const message = response.data?.message || 'Invalid mobile number or password';
              dispatch({
                type: 'AUTH/CUSTOMER/login/error',
                payload: { message },
              });
              if ('function' == typeof onError) onError(message);
            }
          })
          .catch((error) => {
            const message =
              error?.response?.data?.message || 'Invalid mobile number or password.';
            dispatch({
              type: 'AUTH/CUSTOMER/login/error',
              payload: { message },
            });
            removeData();
            if ('function' == typeof onError) onError(message);
          });
      });
    };

export const customerCheck = (): any => (dispatch: Dispatch<AnyAction>) => {
  // Check if the token is available
  const token = getCustomerToken();

  if (!token) {
    // No token — session restore is done, we're simply logged out.
    dispatch({ type: 'AUTH/CUSTOMER/checked' });
    return;
  }

  dispatch({ type: 'AUTH/CUSTOMER/login/pending' });
  customerHttpService.get(API_CUSTOMER_AUTH_CHECK_URL)
    .then((response) => {
      if (response.status === 200) {
        dispatch({ type: 'AUTH/CUSTOMER/login/success', payload: response.data });
      } else {
        removeData();
        dispatch({
          type: 'AUTH/CUSTOMER/login/error',
          payload: { message: 'Please login to continue.' },
        });
      }
    })
    .catch((error) => {
      dispatch({
        type: 'AUTH/CUSTOMER/login/error',
        payload: { message: 'Please login to continue.' },
      });
      removeData();
    });
};

// Change the customer's portal password (also clears the forced-change flag).
export const changeCustomerPassword =
  ({ current_password, password, password_confirmation, callback, onError }: {
    // Omitted while the account is still on its default (mobile) password; the
    // API asks for it only once a real password is set. See CustomerChangePassword.
    current_password?: string;
    password: string;
    password_confirmation: string;
    callback?: () => void;
    onError?: (message: string) => void;
  }) =>
    (dispatch: any) => {
      customerHttpService
        .post(API_CUSTOMER_CHANGE_PASSWORD_URL, { current_password, password, password_confirmation })
        .then((response) => {
          if (response.status === 200 && response.data.success) {
            dispatch({ type: 'AUTH/CUSTOMER/passwordChanged' });
            if ('function' == typeof callback) callback();
          } else {
            const message = response.data?.message || 'Failed to change password';
            if ('function' == typeof onError) onError(message);
          }
        })
        .catch((error) => {
          const message = error?.response?.data?.message || 'Failed to change password';
          if ('function' == typeof onError) onError(message);
        });
    };

export const logout = () => (dispatch: any) => {
  // Best-effort server-side token revocation; clear locally regardless.
  customerHttpService.post(API_CUSTOMER_LOGOUT_URL).catch(() => {});
  removeData();
  dispatch({ type: 'AUTH/CUSTOMER/logout/success' });
  window.location.href = ROUTES.customerLogin;
};

// Reducuer
const initialState = {
  isLoading: false,
  isLoggedIn: false,
  authChecked: false, // becomes true once the initial session restore resolves
  mustChange: false, // true while the customer is on the default (mobile) password
  me: {},
  errors: {},
};

const customerAuthReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case 'AUTH/CUSTOMER/login/pending':
      return {
        ...state,
        isLoading: true,
      };
    case 'AUTH/CUSTOMER/login/success':
      return {
        ...state,
        isLoading: false,
        isLoggedIn: true,
        authChecked: true,
        mustChange: Boolean(action.payload?.data?.must_change_password),
        me: action.payload,
        errors: {},
      };
    case 'AUTH/CUSTOMER/passwordChanged':
      return {
        ...state,
        mustChange: false,
      };
    case 'AUTH/CUSTOMER/login/error':
      return {
        ...state,
        isLoading: false,
        isLoggedIn: false,
        authChecked: true,
        me: {},
        errors: action.payload,
      };
    case 'AUTH/CUSTOMER/checked':
      return {
        ...state,
        authChecked: true,
      };
    case 'AUTH/CUSTOMER/logout/success':
      return {
        ...state,
        isLoading: false,
        isLoggedIn: false,
        authChecked: true,
        me: {},
        errors: {},
      };
    default:
      return state;
  }
};
export default customerAuthReducer;
