import {
  API_CSRF_COOKIES,
  API_CUSTOMER_AUTH_CHECK_URL,
  API_CUSTOMER_LOGIN_URL,
} from '../components/services/apiRoutes';
import Cookies from 'js-cookie';
import httpService from '../components/services/httpService';
import { Dispatch, AnyAction } from 'redux';
// import httpService from "../services/httpService";

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
  // password: string;
  // remember: string;
  callback: any;
}
export const customerLogin =
  ({ mobile, callback }: initialLoginData) =>
    (dispatch: any) => {
      dispatch({ type: 'AUTH/CUSTOMER/login/pending' });

      httpService.get(API_CSRF_COOKIES).then((res) => {
        httpService
          .post(
            API_CUSTOMER_LOGIN_URL,
            { mobile: mobile },
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
              dispatch({
                type: 'AUTH/CUSTOMER/login/error',
                payload: { message: 'Invalid username or password' },
              });
            }
          })
          .catch((error) => {
            dispatch({
              type: 'AUTH/CUSTOMER/login/error',
              payload: { message: 'Invalid username or password.' },
            });
            removeData();
          });
      });
    };

export const customerCheck = (): any => (dispatch: Dispatch<AnyAction>) => {
  // Check if the token is available
  const token = getCustomerToken();

  if (!token) {
    return;
  }

 dispatch({ type: 'AUTH/CUSTOMER/login/pending' });
  httpService.get(API_CUSTOMER_AUTH_CHECK_URL)
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

export const logout = () => (dispatch: any) => {
  removeData(); 
  dispatch({ type: 'AUTH/CUSTOMER/logout/success' });
  window.location.href = "/login";
};

// Reducuer
const initialState = {
  isLoading: false,
  isLoggedIn: false,
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
        me: action.payload,
        errors: {},
      };
    case 'AUTH/CUSTOMER/login/error':
      return {
        ...state,
        isLoading: false,
        isLoggedIn: false,
        me: {},
        errors: action.payload,
      };
    case 'AUTH/CUSTOMER/logout/success':
      return {
        ...state,
        isLoading: false,
        isLoggedIn: false,
        me: {},
        errors: {},
      };
    default:
      return state;
  }
};
export default customerAuthReducer;
