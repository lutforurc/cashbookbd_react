import React, { Dispatch } from 'react';
import {
  PRODUCT_GROUP_LIST_DDL_ERROR,
  PRODUCT_GROUP_LIST_DDL_PENDING,
  PRODUCT_GROUP_LIST_DDL_SUCCESS,
  PRODUCT_GROUP_LIST_ERROR,
  PRODUCT_GROUP_LIST_PENDING,
  PRODUCT_GROUP_LIST_SUCCESS,
  PRODUCT_GROUP_STORE_ERROR,
  PRODUCT_GROUP_STORE_PENDING,
  PRODUCT_GROUP_STORE_SUCCESS,
} from '../../constant/constant/constant';
import httpService from '../../services/httpService';
import {
  API_PRODUCT_GROUP_DDL_URL,
  API_PRODUCT_GROUP_DELETE_URL,
  API_PRODUCT_GROUP_LIST_URL,
  API_PRODUCT_GROUP_STORE_URL,
} from '../../services/apiRoutes';

interface productGroupParam {
  page: number;
  perPage: number;
  search: string;
}

export const getProductGroup =
  ({ page, perPage, search = '' }: productGroupParam) =>
  (dispatch: any) => {
    dispatch({ type: PRODUCT_GROUP_LIST_PENDING });
    httpService
      .get(
        API_PRODUCT_GROUP_LIST_URL +
          `?page=${page}&per_page=${perPage}&search=${search}`,
      )
      .then((res) => {
        let _data = res.data;
        if (_data.success) {
          dispatch({
            type: PRODUCT_GROUP_LIST_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: PRODUCT_GROUP_LIST_ERROR,
            payload: _data.error.message,
          });
        }
      })
      .catch((err) => {
        dispatch({
          type: PRODUCT_GROUP_LIST_ERROR,
          payload: 'Something went wrongs!',
        });
      });
  };

export const getProductGroupDdl = () => async (dispatch: Dispatch<any>) => {
  dispatch({ type: PRODUCT_GROUP_LIST_DDL_PENDING });

  try {
    const res = await httpService.get(API_PRODUCT_GROUP_DDL_URL);
    const _data = res.data;

    if (_data.success) {
      dispatch({
        type: PRODUCT_GROUP_LIST_DDL_SUCCESS,
        payload: _data.data,
      });
    } else {
      dispatch({
        type: PRODUCT_GROUP_LIST_DDL_ERROR,
        payload: _data.error.message,
      });
    }
  } catch (err) {
    dispatch({
      type: PRODUCT_GROUP_LIST_DDL_ERROR,
      payload: 'Something went wrong!',
    });
  }
};

export const storeProductGroup = (data: any, callback?: (message: string, success?: boolean) => void) => (dispatch: any) => {
  dispatch({ type: PRODUCT_GROUP_STORE_PENDING });

  httpService
    .post(API_PRODUCT_GROUP_STORE_URL, data)
    .then((res) => {
      const _data = res.data;

      if (_data.success) {
        dispatch({
          type: PRODUCT_GROUP_STORE_SUCCESS,
          payload: _data.data?.data ?? null,
        });

        if (typeof callback === 'function') {
          callback(_data.message ?? 'Product group created successfully.', true);
        }
      } else {
        dispatch({
          type: PRODUCT_GROUP_STORE_ERROR,
          payload: _data.error?.message ?? 'Unexpected error.',
        });

        if (typeof callback === 'function') {
          callback(_data.message ?? 'Unexpected error.', false);
        }
      }
    })
    .catch((err) => {
      const errorMessage = err?.response?.data?.message || 'Something went wrong.';

      dispatch({
        type: PRODUCT_GROUP_STORE_ERROR,
        payload: errorMessage,
      });

      if (typeof callback === 'function') {
        callback(errorMessage, false);
      }
    });
};

export const deleteProductGroup =
  (id: number | string, callback?: (message: string, success?: boolean) => void) =>
  (dispatch: any) => {
    dispatch({ type: PRODUCT_GROUP_STORE_PENDING });

    httpService
      .post(`${API_PRODUCT_GROUP_DELETE_URL}/${id}`)
      .then((res) => {
        const _data = res.data;

        if (_data.success) {
          dispatch({ type: PRODUCT_GROUP_STORE_SUCCESS, payload: null });
          if (typeof callback === 'function') {
            callback(_data.message ?? 'Product group deleted successfully.', true);
          }
        } else {
          dispatch({
            type: PRODUCT_GROUP_STORE_ERROR,
            payload: _data.message ?? 'Unable to delete product group.',
          });
          if (typeof callback === 'function') {
            callback(_data.message ?? 'Unable to delete product group.', false);
          }
        }
      })
      .catch((err) => {
        const errorMessage = err?.response?.data?.message || 'Something went wrong.';
        dispatch({ type: PRODUCT_GROUP_STORE_ERROR, payload: errorMessage });
        if (typeof callback === 'function') {
          callback(errorMessage, false);
        }
      });
  };

const initialState = {
  isLoading: false,
  errors: null,
  listData: [],
  ddlData: [],
  data: {},
};

const productGroupReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case PRODUCT_GROUP_LIST_PENDING:
    case PRODUCT_GROUP_LIST_DDL_PENDING:
      return {
        ...state,
        isLoading: true,
      };

    case PRODUCT_GROUP_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        listData: action.payload,
      };

    case PRODUCT_GROUP_LIST_DDL_SUCCESS:
      return {
        ...state,
        isLoading: false,
        ddlData: action.payload,
      };

    case PRODUCT_GROUP_LIST_ERROR:
    case PRODUCT_GROUP_LIST_DDL_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };

    default:
      return state;
  }
};

export default productGroupReducer;
