import {
  CASH_RECEIVED_EDIT_ERROR,
  CASH_RECEIVED_EDIT_PENDING,
  CASH_RECEIVED_EDIT_SUCCESS,
  CASH_RECEIVED_STORE_ERROR,
  CASH_RECEIVED_STORE_PENDING,
  CASH_RECEIVED_STORE_SUCCESS,
  CASH_RECEIVED_UPDATE_ERROR,
  CASH_RECEIVED_UPDATE_PENDING,
  CASH_RECEIVED_UPDATE_SUCCESS,
} from '../../../constant/constant/constant';
import httpService from '../../../services/httpService';

import { API_CASH_RECEIVED_EDIT_URL, API_CASH_RECEIVED_UPDATE_URL, API_CASH_RECEIVED_URL } from '../../../services/apiRoutes';


export const storeCashReceived = (data: any) => (dispatch: any) => {
  dispatch({ type: CASH_RECEIVED_STORE_PENDING });
  httpService.post(API_CASH_RECEIVED_URL, data)
    .then((res) => {

      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: CASH_RECEIVED_STORE_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: CASH_RECEIVED_STORE_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch(() => {
      dispatch({
        type: CASH_RECEIVED_STORE_ERROR,
        payload: 'Something went wrong.',
      });
    });
};


interface editTransaction {
  transactionNo: string;
}




export const editCashReceived = (data: editTransaction, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: CASH_RECEIVED_EDIT_PENDING });
  httpService.post(API_CASH_RECEIVED_EDIT_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: CASH_RECEIVED_EDIT_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: CASH_RECEIVED_EDIT_ERROR,
          payload: _data.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: CASH_RECEIVED_EDIT_ERROR,
        payload: err.message,
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};


export const updateCashReceived = (data: any, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: CASH_RECEIVED_UPDATE_PENDING });
  httpService.post(API_CASH_RECEIVED_UPDATE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: CASH_RECEIVED_UPDATE_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: CASH_RECEIVED_UPDATE_ERROR,
          payload: _data.error.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: CASH_RECEIVED_UPDATE_ERROR,
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


const cashReceivedReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case CASH_RECEIVED_STORE_PENDING:
    case CASH_RECEIVED_EDIT_PENDING:
    case CASH_RECEIVED_UPDATE_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
        isEdit: false,
        isUpdated: false,
      };

    case CASH_RECEIVED_EDIT_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        isEdit: true,
        isUpdated: false,
        data: action.payload,
        errors: {},
      };
    case CASH_RECEIVED_UPDATE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        isEdit: false,
        isUpdated: true,
        data: action.payload,
        errors: {},
      };

    case CASH_RECEIVED_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        isEdit: false,
        isUpdated: false,
        data: action.payload,
        errors: {},
      };

    case CASH_RECEIVED_EDIT_ERROR:
    case CASH_RECEIVED_UPDATE_ERROR:
    case CASH_RECEIVED_STORE_ERROR:
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

export default cashReceivedReducer;
