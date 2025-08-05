import {
  ORDER_AVERAGE_PRICE_ERROR,
  ORDER_AVERAGE_PRICE_PENDING,
  ORDER_AVERAGE_PRICE_SUCCESS,
  ORDER_EDIT_ERROR,
  ORDER_EDIT_PENDING,
  ORDER_EDIT_SUCCESS,
  ORDER_LIST_ERROR,
  ORDER_LIST_PENDING,
  ORDER_LIST_SUCCESS,
  ORDER_STORE_ERROR,
  ORDER_STORE_PENDING,
  ORDER_STORE_SUCCESS,
  ORDER_UPDATE_ERROR,
  ORDER_UPDATE_PENDING,
  ORDER_UPDATE_SUCCESS,
} from '../../constant/constant/constant';
import httpService from '../../services/httpService';
import { API_ORDERS_AVERAGE_URL, API_ORDERS_DDL_URL, API_ORDERS_LIST_URL, API_ORDERS_STORE_URL } from '../../services/apiRoutes';
import { getToken } from '../../../features/authReducer';





interface orderParam {
  page: number;
  perPage: number;
  search: string;
}

interface orderStoreData {
  product_name: string;
  product_description: string;
  category_id: string;
  product_type: string;
  purchase_price: string;
  sales_price: string;
  unit_id: string;
  order_level: string;
}


// Live searching for Order
export const getDdlOrders = (search = '') => async (dispatch: any) => {
  try {
    const token = getToken();
    const response = await fetch(API_ORDERS_DDL_URL + `?q=${search}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
    const data = await response.json();
    dispatch({ type: 'SET_ORDERS_DDL_DATA', payload: data });
    return { payload: data.data.data }; // Ensure this is returned

  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};


interface orderParam {
  page: number;
  perPage: number;
  search: string;
  orderType: string;
}

export const getOrders = ({ page, perPage, search = '', orderType = '' }: orderParam) =>
  (dispatch: any) => {
    dispatch({ type: ORDER_LIST_PENDING });
    httpService.get(API_ORDERS_LIST_URL + `?page=${page}&per_page=${perPage}&search=${search}&order_type=${orderType}`)
      .then((res) => {
        let _data = res.data;
        if (_data.success) {
          dispatch({
            type: ORDER_LIST_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: ORDER_LIST_ERROR,
            payload: _data.error.message,
          });
        }
      })
      .catch((err) => {
        dispatch({
          type: ORDER_LIST_ERROR,
          payload: 'Something went wrongs!',
        });
      });
  };


interface formData {
  branch_id: string;
  order_for: string;
  product_id: string;
  order_number: string;
  delivery_location: string;
  order_date: number;
  last_delivery_date: string;
  order_rate: string;
  total_order: string;
  order_type: string;
  note: string;
}
export const storeOrder = (data: formData, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: ORDER_STORE_PENDING });
  httpService.post(API_ORDERS_STORE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: ORDER_STORE_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: ORDER_STORE_ERROR,
          payload: _data.error.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: ORDER_STORE_ERROR,
        payload: 'Something went wrong.',
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};




const initialState = {
  isLoading: false,
  isUpdate: false,
  errors: null,
  data: {},
  editData: {},
  isSave: false,
};



interface averageData {
  branchId: string;
  orderNumber: string;
  reportType: string;
}


export const getAverageOrderPrice = (data: averageData, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: ORDER_AVERAGE_PRICE_PENDING });
  httpService.post(API_ORDERS_AVERAGE_URL, data)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: ORDER_AVERAGE_PRICE_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: ORDER_AVERAGE_PRICE_ERROR,
          payload: _data.error.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: ORDER_AVERAGE_PRICE_ERROR,
        payload: 'Something went wrongs!',
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};


const orderReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case ORDER_UPDATE_PENDING:
      return {
        ...state,
        isLoading: true,
        isUpdate: false,
        editData: {},
      };
    case ORDER_STORE_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
      };

    case ORDER_LIST_PENDING:
    case ORDER_EDIT_PENDING:
    case ORDER_AVERAGE_PRICE_PENDING:
      return {
        ...state,
        isLoading: true,
        isUpdate: false,
      };

    case ORDER_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        errors: {},
      };

    case ORDER_UPDATE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isUpdate: true,
        updateData: action.payload,
      };
    case ORDER_EDIT_SUCCESS:
      return {
        ...state,
        isLoading: false,
        editData: action.payload,
      };
    case ORDER_LIST_SUCCESS:
    case ORDER_AVERAGE_PRICE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case ORDER_UPDATE_ERROR:
      return {
        ...state,
        isLoading: false,
        isUpdate: false,
        errors: action.payload,
      };

    case ORDER_STORE_ERROR:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        errors: action.payload,
      };

    case ORDER_LIST_ERROR:
    case ORDER_AVERAGE_PRICE_ERROR:
    case ORDER_EDIT_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default orderReducer;
