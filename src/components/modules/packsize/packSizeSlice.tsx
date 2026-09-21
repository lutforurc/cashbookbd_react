import React, { Dispatch } from 'react';
import {
  PACK_SIZE_LIST_DDL_ERROR,
  PACK_SIZE_LIST_DDL_PENDING,
  PACK_SIZE_LIST_DDL_SUCCESS,
  PACK_SIZE_LIST_ERROR,
  PACK_SIZE_LIST_PENDING,
  PACK_SIZE_LIST_SUCCESS,
  PACK_SIZE_STORE_ERROR,
  PACK_SIZE_STORE_PENDING,
  PACK_SIZE_STORE_SUCCESS,
} from '../../constant/constant/constant';
import httpService from '../../services/httpService';
import {
  API_PACK_SIZE_DDL_URL,
  API_PACK_SIZE_DELETE_URL,
  API_PACK_SIZE_LIST_URL,
  API_PACK_SIZE_STORE_URL,
} from '../../services/apiRoutes';

interface packSizeParam {
  page: number;
  perPage: number;
  search: string;
}

export const getPackSize =
  ({ page, perPage, search = '' }: packSizeParam) =>
  (dispatch: any) => {
    dispatch({ type: PACK_SIZE_LIST_PENDING });
    httpService
      .get(
        API_PACK_SIZE_LIST_URL +
          `?page=${page}&per_page=${perPage}&search=${search}`,
      )
      .then((res) => {
        let _data = res.data;
        if (_data.success) {
          dispatch({
            type: PACK_SIZE_LIST_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: PACK_SIZE_LIST_ERROR,
            payload: _data.error.message,
          });
        }
      })
      .catch((err) => {
        dispatch({
          type: PACK_SIZE_LIST_ERROR,
          payload: 'Could not load pack sizes. Please try again.',
        });
      });
  };

export const getPackSizeDdl = () => async (dispatch: Dispatch<any>) => {
  dispatch({ type: PACK_SIZE_LIST_DDL_PENDING });

  try {
    const res = await httpService.get(API_PACK_SIZE_DDL_URL);
    const _data = res.data;

    if (_data.success) {
      dispatch({
        type: PACK_SIZE_LIST_DDL_SUCCESS,
        payload: _data.data,
      });
    } else {
      dispatch({
        type: PACK_SIZE_LIST_DDL_ERROR,
        payload: _data.error.message,
      });
    }
  } catch (err) {
    dispatch({
      type: PACK_SIZE_LIST_DDL_ERROR,
      payload: 'Something went wrong!',
    });
  }
};

export const storePackSize = (data: any, callback?: (message: string, success?: boolean) => void) => (dispatch: any) => {
  dispatch({ type: PACK_SIZE_STORE_PENDING });

  httpService
    .post(API_PACK_SIZE_STORE_URL, data)
    .then((res) => {
      const _data = res.data;

      if (_data.success) {
        dispatch({
          type: PACK_SIZE_STORE_SUCCESS,
          payload: _data.data?.data ?? null,
        });

        if (typeof callback === 'function') {
          callback(_data.message ?? 'Pack size created successfully.', true);
        }
      } else {
        dispatch({
          type: PACK_SIZE_STORE_ERROR,
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
        type: PACK_SIZE_STORE_ERROR,
        payload: errorMessage,
      });

      if (typeof callback === 'function') {
        callback(errorMessage, false);
      }
    });
};

export const deletePackSize =
  (id: number | string, callback?: (message: string, success?: boolean) => void) =>
  (dispatch: any) => {
    dispatch({ type: PACK_SIZE_STORE_PENDING });

    httpService
      .post(`${API_PACK_SIZE_DELETE_URL}/${id}`)
      .then((res) => {
        const _data = res.data;

        if (_data.success) {
          dispatch({ type: PACK_SIZE_STORE_SUCCESS, payload: null });
          if (typeof callback === 'function') {
            callback(_data.message ?? 'Pack size deleted successfully.', true);
          }
        } else {
          dispatch({
            type: PACK_SIZE_STORE_ERROR,
            payload: _data.message ?? 'Unable to delete pack size.',
          });
          if (typeof callback === 'function') {
            callback(_data.message ?? 'Unable to delete pack size.', false);
          }
        }
      })
      .catch((err) => {
        const errorMessage = err?.response?.data?.message || 'Something went wrong.';
        dispatch({ type: PACK_SIZE_STORE_ERROR, payload: errorMessage });
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

const packSizeReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case PACK_SIZE_LIST_PENDING:
    case PACK_SIZE_LIST_DDL_PENDING:
      return {
        ...state,
        isLoading: true,
      };

    case PACK_SIZE_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        listData: action.payload,
      };

    case PACK_SIZE_LIST_DDL_SUCCESS:
      return {
        ...state,
        isLoading: false,
        ddlData: action.payload,
      };

    case PACK_SIZE_LIST_ERROR:
    case PACK_SIZE_LIST_DDL_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };

    default:
      return state;
  }
};

export default packSizeReducer;
