import {  SALES_ELECTRONICS_STORE_ERROR, SALES_ELECTRONICS_STORE_PENDING, SALES_ELECTRONICS_STORE_SUCCESS, SALES_TRADING_UPDATE_ERROR, SALES_TRADING_UPDATE_PENDING, SALES_TRADING_UPDATE_SUCCESS, SALES_ELECTRONICS_EDIT_PENDING, SALES_ELECTRONICS_EDIT_SUCCESS, SALES_ELECTRONICS_EDIT_ERROR, SALES_ELECTRONICS_UPDATE_PENDING, SALES_ELECTRONICS_UPDATE_SUCCESS, SALES_ELECTRONICS_UPDATE_ERROR, SALES_ELECTRONICS_INVOICE_PRINT_PENDING, SALES_ELECTRONICS_INVOICE_PRINT_SUCCESS, SALES_ELECTRONICS_INVOICE_PRINT_ERROR } from '../../../constant/constant/constant';
import httpService from '../../../services/httpService';
import { API_ELECTRONICS_SALES_EDIT_URL, API_ELECTRONICS_SALES_INVOICE_PRINT_URL, API_ELECTRONICS_SALES_STORE_URL, API_ELECTRONICS_SALES_UPDATE_URL } from '../../../services/apiRoutes';

interface Product {
    id: number;
    product: number;
    product_name: string;
    serial_no: string;
    unit: string;
    qty: number;
    price: number; 
    warehouse: string;
}

interface formData {
  mtmId: string;
  account: string;
  accountName: string;
  receivedAmt: string;
  discountAmt: number;   
  notes: string;
  currentProduct: { index?: number } | null; // Initialize `currentProduct` with optional index
  searchInvoice: string;
  products: Product[];
}


// Ready for electronics sales store action
// The callback is handed the whole answer as well as the message, because not
// every unsuccessful save is a failure: a stock shortage comes back with
// success false and a question to put to the operator, and the screen can only
// tell that from the body.
export const electronicsSalesStore = (data: formData, callback?: (message: string, response?: any) => void) => (dispatch: any) => {
  dispatch({ type: SALES_ELECTRONICS_STORE_PENDING });
  httpService.post(API_ELECTRONICS_SALES_STORE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: SALES_ELECTRONICS_STORE_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message, _data);
        }
      } else if (_data.stock_shortage) {
        // Nothing has gone wrong and nothing was saved -- the screen is about
        // to ask. The pending state still has to be brought down, or the
        // spinner turns for ever behind the question and Cancel leaves it
        // turning; the empty payload is what keeps a red banner from appearing
        // behind a question that has not been answered yet.
        dispatch({
          type: SALES_ELECTRONICS_STORE_ERROR,
          payload: '',
        });
        if ('function' == typeof callback) {
          callback('', _data);
        }
      } else {
        dispatch({
          type: SALES_ELECTRONICS_STORE_ERROR,
          payload: _data?.error?.message ?? _data?.message ?? 'Something went wrong.',
        });
        if ('function' == typeof callback) {
          callback(_data.message, _data);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: SALES_ELECTRONICS_STORE_ERROR,
        payload: 'Something went wrong.',
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};


// Not ready for electronics sales update action
// The second argument carries whatever the save answered with. A sale that was
// settled after being sold on credit comes back renumbered, and the screen has
// to be told its new number -- the box is still holding the old one.
export const electronicsSalesUpdate = (data: formData, callback?: (message: string, saved?: any) => void) => (dispatch: any) => {
  dispatch({ type: SALES_ELECTRONICS_UPDATE_PENDING });
  httpService.post(API_ELECTRONICS_SALES_UPDATE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: SALES_ELECTRONICS_UPDATE_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message, _data.data?.data);
        }
      } else {
        dispatch({
          type: SALES_ELECTRONICS_UPDATE_ERROR,
          payload: _data.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: SALES_ELECTRONICS_UPDATE_ERROR,
        payload: err.message,
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};

interface editData {
  invoiceDate: string;
  invoiceNo: string;
}

type PrintData = {
  mt?: string | number;
  voucher_no?: string;
  status?: number;
  include_deleted?: boolean;
  recycle_bin?: boolean;
};

 
// Not ready for electronics sales edit action
export const electronicsSalesEdit = (data: editData, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: SALES_ELECTRONICS_EDIT_PENDING });
  httpService.post(API_ELECTRONICS_SALES_EDIT_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: SALES_ELECTRONICS_EDIT_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: SALES_ELECTRONICS_EDIT_ERROR,
          payload: _data.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: SALES_ELECTRONICS_EDIT_ERROR,
        payload: err.message,
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};

// Not ready for electronics sales print action
export const electronicsSalesPrint = (data: PrintData, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: SALES_ELECTRONICS_INVOICE_PRINT_PENDING });
  httpService.post(API_ELECTRONICS_SALES_INVOICE_PRINT_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: SALES_ELECTRONICS_INVOICE_PRINT_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: SALES_ELECTRONICS_INVOICE_PRINT_ERROR,
          payload: _data.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: SALES_ELECTRONICS_INVOICE_PRINT_ERROR,
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
  errors: null,
};

const electronicsSalesSlice = (state = initialState, action: any) => {
  switch (action.type) {
    case SALES_ELECTRONICS_STORE_PENDING:
    case SALES_TRADING_UPDATE_PENDING:
    case SALES_ELECTRONICS_EDIT_PENDING:
    case SALES_ELECTRONICS_INVOICE_PRINT_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
        isEdit: false,
        isUpdated: false,
      };

    case SALES_ELECTRONICS_STORE_SUCCESS:
    case SALES_ELECTRONICS_INVOICE_PRINT_SUCCESS:

      return {
        ...state,
        isLoading: false,
        isSave: true,
        isEdit: false,
        isUpdated: false,
        data: action.payload,
        errors: null,
      };

    case SALES_TRADING_UPDATE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        isEdit: false,
        isUpdated: true,
        data: action.payload,
        errors: null,
      };

    case SALES_ELECTRONICS_EDIT_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isEdit: true,
        isSave: false,
        isUpdated: false,
        data: action.payload,
        errors: null,
      };


    case SALES_ELECTRONICS_STORE_ERROR:
    case SALES_ELECTRONICS_EDIT_ERROR:
    case SALES_TRADING_UPDATE_ERROR:
    case SALES_ELECTRONICS_INVOICE_PRINT_ERROR:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        isEdit: false,
        isUpdated: false,
        errors: action.payload // || action.error || {}, // Expecting error details here
      };
    default:
      return state;
  }
};

export default electronicsSalesSlice;
