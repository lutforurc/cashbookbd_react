import React, { Dispatch } from 'react';
import {
  CATEGORY_EDIT_ERROR,
  CATEGORY_EDIT_PENDING,
  CATEGORY_EDIT_SUCCESS,
  CATEGORY_LIST_DDL_ERROR,
  CATEGORY_LIST_DDL_PENDING,
  CATEGORY_LIST_DDL_SUCCESS,
  CATEGORY_LIST_ERROR,
  CATEGORY_LIST_PENDING,
  CATEGORY_LIST_SUCCESS,
  CATEGORY_STORE_ERROR,
  CATEGORY_STORE_PENDING,
  CATEGORY_STORE_SUCCESS,
  CATEGORY_UPDATE_ERROR,
  CATEGORY_UPDATE_PENDING,
  CATEGORY_UPDATE_SUCCESS,
} from '../../constant/constant/constant';
import httpService from '../../services/httpService';
import {
  API_CATEGORY_DDL_URL,
  API_CATEGORY_LIST_URL,
  API_CATEGORY_STORE_URL,
} from '../../services/apiRoutes';

interface categoryParam {
  page: number;
  perPage: number;
  search: string;
}

export const getCategory =
  ({ page, perPage, search = '' }: categoryParam) =>
  (dispatch: any) => {
    dispatch({ type: CATEGORY_LIST_PENDING });
    httpService
      .get(
        API_CATEGORY_LIST_URL +
          `?page=${page}&per_page=${perPage}&search=${search}`,
      )
      .then((res) => {
        let _data = res.data;
        if (_data.success) {
          dispatch({
            type: CATEGORY_LIST_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: CATEGORY_LIST_ERROR,
            payload: _data.error.message,
          });
        }
      })
      .catch((err) => {
        dispatch({
          type: CATEGORY_LIST_ERROR,
          payload: 'Something went wrongs!',
        });
      });
  };

export const getCategoryDdl = () => async (dispatch: Dispatch<any>) => {
  dispatch({ type: CATEGORY_LIST_DDL_PENDING });

  try {
    const res = await httpService.get(API_CATEGORY_DDL_URL); // Await the API call
    const _data = res.data;

    if (_data.success) {
      dispatch({
        type: CATEGORY_LIST_DDL_SUCCESS,
        payload: _data.data.data, // Dispatch success with payload
      });
    } else {
      dispatch({
        type: CATEGORY_LIST_DDL_ERROR,
        payload: _data.error.message, // Dispatch error from API
      });
    }
  } catch (err) {
    dispatch({
      type: CATEGORY_LIST_DDL_ERROR,
      payload: 'Something went wrong!', // Dispatch error if API fails
    });
  }
};

export const storeCategory = (data: any, callback?: (message: string, success?: boolean) => void) => (dispatch: any) => {
  dispatch({ type: CATEGORY_STORE_PENDING });

  httpService
    .post(API_CATEGORY_STORE_URL, data)
    .then((res) => {
      const _data = res.data;

      if (_data.success) {
        dispatch({
          type: CATEGORY_STORE_SUCCESS,
          payload: _data.data?.data ?? null,
        });

        if (typeof callback === 'function') {
          callback(_data.message ?? 'Category created successfully.', true);
        }
      } else {
        dispatch({
          type: CATEGORY_STORE_ERROR,
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
        type: CATEGORY_STORE_ERROR,
        payload: errorMessage,
      });

      if (typeof callback === 'function') {
        callback(errorMessage, false);
      }
    });
};


const initialState = {
  isLoading: false,
  errors: null,
  data: {},
};

const categoryReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case CATEGORY_UPDATE_PENDING:
      return {
        ...state,
        isLoading: true,
        isUpdate: false,
        editData: {},
      };
    case CATEGORY_STORE_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
      };

    case CATEGORY_LIST_PENDING:
    case CATEGORY_LIST_DDL_PENDING:
    case CATEGORY_EDIT_PENDING:
      return {
        ...state,
        isLoading: true,
        isUpdate: false,
      };

    case CATEGORY_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        errors: {},
      };

    case CATEGORY_UPDATE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isUpdate: true,
        updateData: action.payload,
      };
    case CATEGORY_EDIT_SUCCESS:
      return {
        ...state,
        isLoading: false,
        editData: action.payload,
      };
    case CATEGORY_LIST_SUCCESS:
    case CATEGORY_LIST_DDL_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case CATEGORY_UPDATE_ERROR:
      return {
        ...state,
        isLoading: false,
        isUpdate: false,
        errors: action.payload,
      };

    case CATEGORY_STORE_ERROR:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        errors: action.payload,
      };

    case CATEGORY_LIST_ERROR:
    case CATEGORY_EDIT_ERROR:
    case CATEGORY_LIST_DDL_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default categoryReducer;
