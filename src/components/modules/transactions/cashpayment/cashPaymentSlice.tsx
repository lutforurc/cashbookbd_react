import {
  CASH_PAYMENT_EDIT_ERROR,
  CASH_PAYMENT_EDIT_PENDING,
  CASH_PAYMENT_EDIT_SUCCESS,
  CASH_PAYMENT_STORE_ERROR,
  CASH_PAYMENT_STORE_PENDING,
  CASH_PAYMENT_STORE_SUCCESS,
  CASH_PAYMENT_UPDATE_ERROR,
  CASH_PAYMENT_UPDATE_PENDING,
  CASH_PAYMENT_UPDATE_SUCCESS,
} from '../../../constant/constant/constant';
import httpService from '../../../services/httpService';

import { API_CASH_PAYMENT_EDIT_URL, API_CASH_PAYMENT_STORE_URL, API_CASH_PAYMENT_UPDATE_URL } from '../../../services/apiRoutes';


export const storeCashPayment = (data: any) => (dispatch: any) => {
  dispatch({ type: CASH_PAYMENT_STORE_PENDING });
  httpService.post(API_CASH_PAYMENT_STORE_URL, data)
    .then((res) => {

      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: CASH_PAYMENT_STORE_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: CASH_PAYMENT_STORE_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch(() => {
      dispatch({
        type: CASH_PAYMENT_STORE_ERROR,
        payload: 'Something went wrong.',
      });
    });
};


interface editTransaction {
  transactionNo: string;
}

export const editCashPayment = (data: editTransaction, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: CASH_PAYMENT_EDIT_PENDING });
  httpService.post(API_CASH_PAYMENT_EDIT_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: CASH_PAYMENT_EDIT_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: CASH_PAYMENT_EDIT_ERROR,
          payload: _data.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: CASH_PAYMENT_EDIT_ERROR,
        payload: err.message,
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};


export const updateCashPayment = (data: any, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: CASH_PAYMENT_UPDATE_PENDING });
  httpService.post(API_CASH_PAYMENT_UPDATE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: CASH_PAYMENT_UPDATE_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: CASH_PAYMENT_UPDATE_ERROR,
          payload: _data.error.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: CASH_PAYMENT_UPDATE_ERROR,
        payload: err.message,
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};


const initialState = {
  isLoading: false,
  isSave: false,
  isEdit: false,
  isUpdated: false,
  data: {},
  errors: {},
};

const cashPaymentReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case CASH_PAYMENT_STORE_PENDING:
    case CASH_PAYMENT_EDIT_PENDING:
    case CASH_PAYMENT_UPDATE_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
        isEdit: false,
        isUpdated: false,
      };

    case CASH_PAYMENT_EDIT_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        isEdit: true,
        isUpdated: false,
        data: action.payload,
        errors: {},
      };

    case CASH_PAYMENT_UPDATE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        isEdit: false,
        isUpdated: true,
        data: action.payload,
        errors: {},
      };

    case CASH_PAYMENT_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        isEdit: false,
        isUpdated: false,
        data: action.payload,
        errors: {},
      };

    // Fix for handling errors correctly
    case CASH_PAYMENT_STORE_ERROR:
    case CASH_PAYMENT_EDIT_ERROR:
    case CASH_PAYMENT_UPDATE_ERROR: // Fixed this case
      return {
        ...state,
        isLoading: false, // Ensure loading stops on error
        isSave: false,
        isEdit: false,
        isUpdated: false,
        errors: action.payload,
      };

    default:
      return state;
  }
};

export default cashPaymentReducer;
