import { PURCHASE_ELECTRONICS_EDIT_ERROR, PURCHASE_ELECTRONICS_EDIT_PENDING, PURCHASE_ELECTRONICS_EDIT_SUCCESS, PURCHASE_ELECTRONICS_STORE_ERROR, PURCHASE_ELECTRONICS_STORE_PENDING, PURCHASE_ELECTRONICS_STORE_SUCCESS, PURCHASE_ELECTRONICS_UPDATE_ERROR, PURCHASE_ELECTRONICS_UPDATE_PENDING, PURCHASE_ELECTRONICS_UPDATE_SUCCESS } from '../../../constant/constant/constant';
import httpService from '../../../services/httpService';
import { API_CONSTRUCTION_PURCHASE_EDIT_URL, API_CONSTRUCTION_PURCHASE_STORE_URL, API_CONSTRUCTION_PURCHASE_UPDATE_URL, API_ELECTRONICS_PURCHASE_EDIT_URL, API_ELECTRONICS_PURCHASE_STORE_URL, API_ELECTRONICS_PURCHASE_UPDATE_URL } from '../../../services/apiRoutes';

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
  account: string;
  accountName: string;
  invoice_no: string;
  invoice_date: string;
  paymentAmt: string;
  discountAmt: number;
  vehicleNumber: string;
  notes: string;
  products: Product[];
}

export const electronicsPurchaseStore = (data: formData, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: PURCHASE_ELECTRONICS_STORE_PENDING });
  httpService.post(API_ELECTRONICS_PURCHASE_STORE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: PURCHASE_ELECTRONICS_STORE_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: PURCHASE_ELECTRONICS_STORE_ERROR,
          payload: _data.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: PURCHASE_ELECTRONICS_STORE_ERROR,
        payload: err.message,
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};


export const electronicsPurchaseUpdate = (data: formData, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: PURCHASE_ELECTRONICS_UPDATE_PENDING });
  httpService.post(API_ELECTRONICS_PURCHASE_UPDATE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: PURCHASE_ELECTRONICS_UPDATE_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: PURCHASE_ELECTRONICS_UPDATE_ERROR,
          payload: _data.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: PURCHASE_ELECTRONICS_UPDATE_ERROR,
        payload: err.message,
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};

interface editData {
  invoiceNo: string;
  voucherType: string;
}

export const electronicsPurchaseEdit = (data: editData, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: PURCHASE_ELECTRONICS_EDIT_PENDING });
  httpService.post(API_ELECTRONICS_PURCHASE_EDIT_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: PURCHASE_ELECTRONICS_EDIT_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: PURCHASE_ELECTRONICS_EDIT_ERROR,
          payload: _data.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: PURCHASE_ELECTRONICS_EDIT_ERROR,
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


const electronicsPurchaseSlice = (state = initialState, action: any) => {
  switch (action.type) {
    case PURCHASE_ELECTRONICS_STORE_PENDING:
    case PURCHASE_ELECTRONICS_UPDATE_PENDING:
    case PURCHASE_ELECTRONICS_EDIT_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
        isEdit: false,
        isUpdated: false,
      };

    case PURCHASE_ELECTRONICS_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        isEdit: false,
        isUpdated: false,
        data: action.payload,
        errors: null,
      };

    case PURCHASE_ELECTRONICS_UPDATE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        isEdit: false,
        isUpdated: true,
        data: action.payload,
        errors: null,
      };

    case PURCHASE_ELECTRONICS_EDIT_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isEdit: true,
        isSave: false,
        isUpdated: false,
        data: action.payload,
        errors: null,
      };
    case PURCHASE_ELECTRONICS_STORE_ERROR:
    case PURCHASE_ELECTRONICS_EDIT_ERROR:
    case PURCHASE_ELECTRONICS_UPDATE_ERROR:
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

export default electronicsPurchaseSlice;
