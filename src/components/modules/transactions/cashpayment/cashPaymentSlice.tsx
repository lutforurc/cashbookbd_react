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

import {
  API_CASH_PAYMENT_EDIT_URL,
  API_CASH_PAYMENT_STORE_URL,
  API_CASH_PAYMENT_UPDATE_URL,
  API_HEAD_OFFICE_CASH_PAYMENT_EDIT_URL,
  API_HEAD_OFFICE_CASH_PAYMENT_STORE_URL,
  API_HEAD_OFFICE_CASH_PAYMENT_UPDATE_URL,
} from '../../../services/apiRoutes';


export const storeCashPayment = (data: any) => (dispatch: any) => {
  dispatch({ type: CASH_PAYMENT_STORE_PENDING });
  // ⚠️ RETURNED, so the screen learns how it ended. It used to dispatch and
  // say nothing back, and a refusal -- a closed year (§42), a missing head --
  // went into `errors` in the store where no screen ever read it: the
  // voucher silently did not save and the clerk tried again.
  return httpService.post(API_CASH_PAYMENT_STORE_URL, data)
    .then((res) => {

      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: CASH_PAYMENT_STORE_SUCCESS,
          payload: _data.data.data,
        });

        return { success: true, message: _data.message };
      }

      const message = _data.error?.message || _data.message || 'Could not save the voucher.';
      dispatch({
        type: CASH_PAYMENT_STORE_ERROR,
        payload: message,
      });

      return { success: false, message };
    })
    .catch((err) => {
      const message = err?.response?.data?.message || err?.message || 'Something went wrong.';
      dispatch({
        type: CASH_PAYMENT_STORE_ERROR,
        payload: message,
      });

      return { success: false, message };
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

export const storeHeadOfficeCashPayment = (data: any) => (dispatch: any) => {
  dispatch({ type: CASH_PAYMENT_STORE_PENDING });
  // ⚠️ RETURNED, so the screen learns how it ended. It used to dispatch and
  // say nothing back, and a refusal -- a closed year (§42), a missing head --
  // went into `errors` in the store where no screen ever read it: the
  // voucher silently did not save and the clerk tried again.
  return httpService.post(API_HEAD_OFFICE_CASH_PAYMENT_STORE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: CASH_PAYMENT_STORE_SUCCESS,
          payload: _data.data.data,
        });

        return { success: true, message: _data.message };
      }

      const message = _data.error?.message || _data.message || 'Could not save the voucher.';
      dispatch({
        type: CASH_PAYMENT_STORE_ERROR,
        payload: message,
      });

      return { success: false, message };
    })
    .catch((err) => {
      const message = err?.response?.data?.message || err?.message || 'Something went wrong.';
      dispatch({
        type: CASH_PAYMENT_STORE_ERROR,
        payload: message,
      });

      return { success: false, message };
    });
};

export const editHeadOfficeCashPayment = (data: editTransaction, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: CASH_PAYMENT_EDIT_PENDING });
  httpService.post(API_HEAD_OFFICE_CASH_PAYMENT_EDIT_URL, data)
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
          payload: _data.error?.message || _data.message,
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

export const updateHeadOfficeCashPayment = (data: any, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: CASH_PAYMENT_UPDATE_PENDING });
  httpService.post(API_HEAD_OFFICE_CASH_PAYMENT_UPDATE_URL, data)
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
          payload: _data.error?.message || _data.message,
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
