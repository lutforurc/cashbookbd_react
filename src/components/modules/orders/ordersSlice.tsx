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





interface OrderSearchFilters {
  orderType?: string;
  excludeId?: string | number;
  refDirection?: 'reference' | 'linked';
}

// Live searching for Order
export const getDdlOrders =
  (search = '', filters: OrderSearchFilters = {}) =>
  async (dispatch: any) => {
  try {
    const token = getToken();
    const params = new URLSearchParams();
    params.set('q', search);

    if (filters.orderType) {
      params.set('order_type', filters.orderType);
    }

    const response = await fetch(`${API_ORDERS_DDL_URL}?${params.toString()}`,
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
  orderFor?: string | number;
}

export const getOrders = ({
  page,
  perPage,
  search = '',
  orderType = '',
  orderFor = '',
}: orderParam) =>
  (dispatch: any) => {
    dispatch({ type: ORDER_LIST_PENDING });
    httpService.get(
      API_ORDERS_LIST_URL +
        `?page=${page}&per_page=${perPage}&search=${search}&order_type=${orderType}&order_for=${orderFor}`,
    )
      .then((res) => {
        let _data = res.data;
        if (_data.success) {
          const payloadRoot = _data.data ?? {};
          const listPayload = payloadRoot.data ?? payloadRoot;
          const normalizedPayload =
            listPayload && typeof listPayload === 'object'
              ? {
                ...listPayload,
                summary:
                  payloadRoot.summary ??
                  payloadRoot.totals ??
                  payloadRoot.meta?.summary ??
                  payloadRoot.meta?.totals ??
                  listPayload.summary ??
                  listPayload.totals ??
                  null,
              }
              : listPayload;

          dispatch({
            type: ORDER_LIST_SUCCESS,
            payload: normalizedPayload,
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
  ref_order_id?: string;
  delivery_location: string;
  order_date: number;
  last_delivery_date: string;
  order_rate: string;
  total_order: string;
  order_type: string;
  notes: string;
}
export const storeOrder = (data: formData, callback?: (response: any) => void) => (dispatch: any) => {
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
          callback(_data);
        }
      } else {
        dispatch({
          type: ORDER_STORE_ERROR,
          payload: _data.error.message,
        });
        if ('function' == typeof callback) {
          callback(_data);
        }
      }
    })
    .catch((err) => {
      const fallbackMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Something went wrong.';
      dispatch({
        type: ORDER_STORE_ERROR,
        payload: fallbackMessage,
      });
      if ('function' == typeof callback) {
        callback({ success: false, message: fallbackMessage });
      }
    });
};

export const editOrder = (id: string | number, callback?: (response: any) => void) => (dispatch: any) => {
  dispatch({ type: ORDER_EDIT_PENDING });
  httpService.get(`${API_ORDERS_LIST_URL}?id=${id}`)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: ORDER_EDIT_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: ORDER_EDIT_ERROR,
          payload: _data.error.message,
        });
        callback?.(_data);
      }
    })
    .catch((err) => {
      const fallbackMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Something went wrong.';
      dispatch({
        type: ORDER_EDIT_ERROR,
        payload: fallbackMessage,
      });
      callback?.({ success: false, message: fallbackMessage });
    });
};

export const updateOrder = (data: any, callback?: (response: any) => void) => (dispatch: any) => {
  dispatch({ type: ORDER_UPDATE_PENDING });
  httpService.post(API_ORDERS_STORE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: ORDER_UPDATE_SUCCESS,
          payload: _data.data.data,
        });
        callback?.(_data);
      } else {
        dispatch({
          type: ORDER_UPDATE_ERROR,
          payload: _data.error.message,
        });
        callback?.(_data);
      }
    })
    .catch((err) => {
      const fallbackMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Something went wrong.';
      dispatch({
        type: ORDER_UPDATE_ERROR,
        payload: fallbackMessage,
      });
      callback?.({ success: false, message: fallbackMessage });
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
