import { SALES_TRADING_EDIT_ERROR, SALES_TRADING_EDIT_PENDING, SALES_TRADING_EDIT_SUCCESS, SALES_TRADING_STORE_ERROR, SALES_TRADING_STORE_PENDING, SALES_TRADING_STORE_SUCCESS, SALES_TRADING_UPDATE_ERROR, SALES_TRADING_UPDATE_PENDING, SALES_TRADING_UPDATE_SUCCESS } from '../../../constant/constant/constant';
import httpService from '../../../services/httpService';
import { API_TRADING_SALES_EDIT_URL, API_TRADING_SALES_STORE_URL, API_TRADING_SALES_UPDATE_URL } from '../../../services/apiRoutes';

interface Product {
  id: number;
  product: number;
  product_name: string;
  unit: string;
  qty: number;
  price: number;
  bag?: string;
  warehouse: string;
  variance?: string;
  variance_type?: string;
}

interface formData {
  mtmId: string;
  account: string;
  accountName: string;
  receivedAmt: string;
  discountAmt: number;
  vehicleNumber: string;
  notes: string;
  currentProduct: { index?: number } | null; // Initialize `currentProduct` with optional index
  searchInvoice: string;
  products: Product[];
}

export const generalSalesStore = (data: formData, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: SALES_TRADING_STORE_PENDING });
  httpService.post(API_TRADING_SALES_STORE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: SALES_TRADING_STORE_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: SALES_TRADING_STORE_ERROR,
          payload: _data.error.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: SALES_TRADING_STORE_ERROR,
        payload: 'Something went wrong.',
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};

export const generalSalesUpdate = (data: formData, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: SALES_TRADING_UPDATE_PENDING });
  httpService.post(API_TRADING_SALES_UPDATE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: SALES_TRADING_UPDATE_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: SALES_TRADING_UPDATE_ERROR,
          payload: _data.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: SALES_TRADING_UPDATE_ERROR,
        payload: err.message,
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};

interface editData {
  invoiceNo: string;
}


export const generalSalesEdit = (data: editData, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: SALES_TRADING_EDIT_PENDING });
  httpService.post(API_TRADING_SALES_EDIT_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: SALES_TRADING_EDIT_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: SALES_TRADING_EDIT_ERROR,
          payload: _data.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: SALES_TRADING_EDIT_ERROR,
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

const generalSalesSlice = (state = initialState, action: any) => {
  switch (action.type) {
    case SALES_TRADING_STORE_PENDING:
    case SALES_TRADING_UPDATE_PENDING:
    case SALES_TRADING_EDIT_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
        isEdit: false,
        isUpdated: false,
      };

    case SALES_TRADING_STORE_SUCCESS:
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

    case SALES_TRADING_EDIT_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isEdit: true,
        isSave: false,
        isUpdated: false,
        data: action.payload,
        errors: null,
      };


    case SALES_TRADING_STORE_ERROR:
    case SALES_TRADING_EDIT_ERROR:
    case SALES_TRADING_UPDATE_ERROR:
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

export default generalSalesSlice;
