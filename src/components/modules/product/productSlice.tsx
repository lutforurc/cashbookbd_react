import {
  PRODUCT_EDIT_ERROR,
  PRODUCT_EDIT_PENDING,
  PRODUCT_EDIT_SUCCESS,
  PRODUCT_LIST_DDL_ERROR,
  PRODUCT_LIST_DDL_PENDING,
  PRODUCT_LIST_DDL_SUCCESS,
  PRODUCT_LIST_ERROR,
  PRODUCT_LIST_PENDING,
  PRODUCT_LIST_SUCCESS,
  PRODUCT_STORE_ERROR,
  PRODUCT_STORE_PENDING,
  PRODUCT_STORE_SUCCESS,
  PRODUCT_UPDATE_BY_RATE_ERROR,
  PRODUCT_UPDATE_BY_RATE_PENDING,
  PRODUCT_UPDATE_BY_RATE_SUCCESS,
  PRODUCT_UPDATE_ERROR,
  PRODUCT_UPDATE_PENDING,
  PRODUCT_UPDATE_SUCCESS,
} from '../../constant/constant/constant';
import httpService from '../../services/httpService';
import {
  API_PRODUCT_DDL_LIST_URL,
  API_PRODUCT_EDIT_URL,
  API_PRODUCT_LIST_URL,
  API_PRODUCT_STORE_URL,
  API_PRODUCT_UPDATE_BY_RATE_URL,
  API_PRODUCT_UPDATE_URL,
} from '../../services/apiRoutes';
import { getToken } from '../../../features/authReducer';

interface productParam {
  page: number;
  perPage: number;
  search: string;
}
interface productStoreData {
  product_name: string;
  product_description: string;
  category_id: string;
  product_type: string;
  purchase_price: string;
  sales_price: string;
  unit_id: string;
  order_level: string;
}
export const getProduct =
  ({ page, perPage, search = '' }: productParam) =>
    (dispatch: any) => {
      dispatch({ type: PRODUCT_LIST_PENDING });

      httpService
        .get(
          API_PRODUCT_LIST_URL +
          `?page=${page}&per_page=${perPage}&search=${search}`,
        )
        .then((res) => {
          let _data = res.data;
          if (_data.success) {
            dispatch({
              type: PRODUCT_LIST_SUCCESS,
              payload: _data.data.data,
            });
          } else {
            dispatch({
              type: PRODUCT_LIST_ERROR,
              payload: _data.error.message,
            });
          }
        })
        .catch((err) => {
          dispatch({
            type: PRODUCT_LIST_ERROR,
            payload: 'Something went wrongs!',
          });
        });
    };

export const updateProductQtyRate = (
  data: {
    product_id: number;
    branch_id: number;
    qty: number;
    rate: number;
    serial_no: string;
  }
) => async (dispatch: any) => {

  dispatch({ type: PRODUCT_UPDATE_BY_RATE_PENDING });

  try {
    const res = await httpService.post(API_PRODUCT_UPDATE_BY_RATE_URL, data);

    dispatch({
      type: PRODUCT_UPDATE_BY_RATE_SUCCESS,
      payload: res.data.data,
    });

    return res.data;
  } catch (error) {
    dispatch({
      type: PRODUCT_UPDATE_BY_RATE_ERROR,
    });

    throw error; // component catch করবে
  }
};


export const getDdlProduct =
  (search = '') =>
    async (dispatch: any) => {
      try {
        const token = getToken();
        const response = await fetch(API_PRODUCT_DDL_LIST_URL + `?q=${search}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        dispatch({ type: 'SET_PRODUCT_DDL_DATA', payload: data });
        return { payload: data.data.data }; // Ensure this is returned
      } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
      }
    };

export const storeProduct = (data: productStoreData, callback: any) => (dispatch: any) => {
  dispatch({ type: PRODUCT_STORE_PENDING });
  httpService.post(API_PRODUCT_STORE_URL, data)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: PRODUCT_STORE_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: PRODUCT_STORE_ERROR,
          payload: _data.error.message,
        });
      }
      if ('function' === typeof callback) {
        callback(_data);
      }
    })
    .catch((er) => {
      dispatch({
        type: PRODUCT_STORE_ERROR,
        payload: 'Something went wrong.',
      });
    });
};



export const updateProduct = (data: any, callback: any) => (dispatch: any) => {
  dispatch({ type: PRODUCT_UPDATE_PENDING });
  httpService.post(API_PRODUCT_UPDATE_URL, data)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: PRODUCT_UPDATE_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: PRODUCT_UPDATE_ERROR,
          payload: _data.error.message,
        });
      }
      if ('function' === typeof callback) {
        callback(_data);
      }
    })
    .catch((er) => {
      dispatch({
        type: PRODUCT_UPDATE_ERROR,
        payload: 'Something went wrong.',
      });
    });
};

export const editProduct = (id: number) => (dispatch: any) => {
  dispatch({ type: PRODUCT_EDIT_PENDING });
  httpService
    .get(API_PRODUCT_EDIT_URL + `${id}`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: PRODUCT_EDIT_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: PRODUCT_EDIT_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: PRODUCT_EDIT_ERROR,
        payload: 'Something went wrong',
      });
    });
};

const initialState = {
  errors: null,
  data: {},
  dataByRate: {},
  editData: {},
  updateData: {},
  isLoading: false,
  isUpdate: false,
  isSave: false,
};

const productReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case PRODUCT_UPDATE_PENDING:
    case PRODUCT_EDIT_PENDING:
    case PRODUCT_UPDATE_PENDING:
    case PRODUCT_UPDATE_BY_RATE_PENDING:
      return {
        ...state,
        isLoading: true,
        isUpdate: false,
        editData: {},
      };
    case PRODUCT_STORE_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
      };

    case PRODUCT_EDIT_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isUpdate: false,
        editData: action.payload,
      };
    case PRODUCT_UPDATE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isUpdate: false,
        updateData: action.payload,
      };

    case PRODUCT_LIST_PENDING:
    case PRODUCT_LIST_DDL_PENDING:
    case PRODUCT_EDIT_PENDING:
      return {
        ...state,
        isLoading: true,
        isUpdate: false,
      };

    case PRODUCT_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        errors: {},
      };

    case PRODUCT_UPDATE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isUpdate: true,
        updateData: action.payload,
      };
    case PRODUCT_EDIT_SUCCESS:
      return {
        ...state,
        isLoading: false,
        editData: action.payload,
      };
    case PRODUCT_LIST_SUCCESS:
    case PRODUCT_LIST_DDL_SUCCESS:

      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case PRODUCT_UPDATE_BY_RATE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        dataByRate: action.payload,
      };
    case PRODUCT_UPDATE_ERROR:
      return {
        ...state,
        isLoading: false,
        isUpdate: false,
        errors: action.payload,
      };

    case PRODUCT_STORE_ERROR:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        errors: action.payload,
      };

    case PRODUCT_LIST_ERROR:
    case PRODUCT_LIST_DDL_ERROR:
    case PRODUCT_EDIT_ERROR:
    case PRODUCT_EDIT_ERROR:
    case PRODUCT_UPDATE_ERROR:
    case PRODUCT_UPDATE_BY_RATE_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
        updateData: {},
        editData: {},

      };
    default:
      return state;
  }
};

export default productReducer;
