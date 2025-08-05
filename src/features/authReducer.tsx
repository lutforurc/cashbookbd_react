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
// import httpService from "../services/httpService";

export const getToken = () => {
  return Cookies.get('_trio_lead_token');
};

export const storeToken = (token: string) => {
  Cookies.set('_trio_lead_token', token, { secure: true });
};

export const removeData = () => {
  Cookies.remove('_trio_lead_token');
  Cookies.remove('laravel_session');
  Cookies.remove('XSRF-TOKEN');
  localStorage.removeItem('settings');
};

// actions
interface initialLoginData {
  email: string;
  password: string;
  remember: string;
  callback: any;
}
export const login =
  ({ email, password, remember, callback }: initialLoginData) =>
    (dispatch: any) => {
      dispatch({ type: 'AUTH/login/pending' });

      httpService.get(API_CSRF_COOKIES).then((res) => {
        httpService
          .post(
            API_LOGIN_URL,
            { email: email, password: password },
            {
              xsrfHeaderName: 'X-XSRF-TOKEN',
              withCredentials: true,
            },
          )
          .then((response) => {
            if (response.status === 200 && response.data.success) {
              storeToken(response.data.data.token);
              dispatch({
                type: 'AUTH/login/success',
                payload: response.data.data.user,
              });
              if ('function' == typeof callback) {
                callback(response);
              }
            } else {
              removeData();
              dispatch({
                type: 'AUTH/login/error',
                payload: { message: 'Invalid username or password' },
              });
            }
          })
          .catch((error) => {
            dispatch({
              type: 'AUTH/login/error',
              payload: { message: 'Invalid username or password.' },
            });
            removeData();
          });
      });
    };

export const authCheck = (): any => (dispatch: Dispatch<AnyAction>) => {
  // Check if the token is available
  const token = getToken();

  if (!token) {
    return;
  }

 dispatch({ type: 'AUTH/login/pending' });
  httpService.get(API_AUTH_CHECK_URL)
    .then((response) => {
      if (response.status === 200) {
        dispatch({ type: 'AUTH/login/success', payload: response.data });
        dispatch(userCurrentBranch());
        dispatch(getSettings());
      } else {
        removeData();
        dispatch({
          type: 'AUTH/login/error',
          payload: { message: 'Please login to continue.' },
        });
      }
    })
    .catch((error) => {
      dispatch({
        type: 'AUTH/login/error',
        payload: { message: 'Please login to continue.' },
      });
      removeData();
    });
};

export const logout = () => (dispatch: any) => {
  removeData(); 
  dispatch({ type: 'AUTH/logout/success' });
  // Optionally, reload the page to reset state completely
  window.location.href = "/login";
};

// Reducuer
const initialState = {
  isLoading: false,
  isLoggedIn: false,
  me: {},
  errors: {},
};

const authReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case 'AUTH/login/pending':
      return {
        ...state,
        isLoading: true,
      };
    case 'AUTH/login/success':
      return {
        ...state,
        isLoading: false,
        isLoggedIn: true,
        me: action.payload,
        errors: {},
      };
    case 'AUTH/login/error':
      return {
        ...state,
        isLoading: false,
        isLoggedIn: false,
        me: {},
        errors: action.payload,
      };
    case 'AUTH/logout/success':
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
export default authReducer;
