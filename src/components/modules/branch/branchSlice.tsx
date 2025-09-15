import React from 'react';
import {
  BRANCH_EDIT_ERROR,
  BRANCH_EDIT_PENDING,
  BRANCH_EDIT_SUCCESS,
  BRANCH_LIST_ERROR,
  BRANCH_LIST_PENDING,
  BRANCH_LIST_SUCCESS,
  BRANCH_STATUS_ERROR,
  BRANCH_STATUS_PENDING,
  BRANCH_STATUS_SUCCESS,
  BRANCH_STORE_ERROR,
  BRANCH_STORE_PENDING,
  BRANCH_STORE_SUCCESS,
  BRANCH_UPDATE_ERROR,
  BRANCH_UPDATE_PENDING,
  BRANCH_UPDATE_SUCCESS,
  USER_CURRENT_BRANCH_ERROR,
  USER_CURRENT_BRANCH_PENDING,
  USER_CURRENT_BRANCH_SUCCESS,
} from '../../constant/constant/constant';
import httpService from '../../services/httpService';
import {
  API_BRANCH_EDIT_URL,
  API_BRANCH_LIST_URL,
  API_BRANCH_STATUS_URL,
  API_BRANCH_STORE_URL,
  API_BRANCH_UPDATE_URL,
  API_USER_CURRENT_BRANCH_URL,
} from '../../services/apiRoutes';

interface branchListParam {
  page: number;
  perPage: number;
  search: string;
}

export const userCurrentBranch = () => (dispatch: any) => {
  dispatch({ type: USER_CURRENT_BRANCH_PENDING });
  httpService.get(API_USER_CURRENT_BRANCH_URL)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: USER_CURRENT_BRANCH_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: USER_CURRENT_BRANCH_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: USER_CURRENT_BRANCH_ERROR,
        payload: 'Something went wrong',
      });
    });

}
export const getBranch = ({ page, perPage, search = '' }: branchListParam) => (dispatch: any) => {
  dispatch({ type: BRANCH_LIST_PENDING });

  httpService.get(API_BRANCH_LIST_URL + `?page=${page}&per_page=${perPage}&search=${search}`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: BRANCH_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: BRANCH_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: BRANCH_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};

export const updateBranch = (data: any, callback: any) => (dispatch: any) => {
  dispatch({ type: BRANCH_UPDATE_PENDING });
  httpService
    .post(API_BRANCH_UPDATE_URL, data)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: BRANCH_UPDATE_SUCCESS,
          payload: _data.message,
        });
      } else {
        dispatch({
          type: BRANCH_UPDATE_ERROR,
          payload: _data.error.message,
        });
      }
      if ('function' === typeof callback) {
        callback(_data);
      }
    })
    .catch((err) => {
      dispatch({
        type: BRANCH_UPDATE_ERROR,
        payload: err,
      });
    });
};

export const editBranch = (id: number) => (dispatch: any) => {
  dispatch({ type: BRANCH_EDIT_PENDING });
  httpService
    .get(API_BRANCH_EDIT_URL + `${id}`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: BRANCH_EDIT_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: BRANCH_EDIT_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: BRANCH_EDIT_ERROR,
        payload: 'Something went wrong',
      });
    });
};

 

export const branchStatus = (id: number, enabled: boolean) => async (dispatch: any) => {
  dispatch({ type: BRANCH_STATUS_PENDING });

  try {
    const res = await httpService.post(`${API_BRANCH_STATUS_URL}`, {
      id: id,
      status: enabled, // Laravel expects `status` in request body
    });

    const _data = res.data;

    if (_data.success) {
      const updatedData = { ..._data.data.branch, status: enabled };

      dispatch({
        type: BRANCH_STATUS_SUCCESS,
        payload: updatedData,
      });
    } else {
      dispatch({
        type: BRANCH_STATUS_ERROR,
        payload: _data.error?.message || 'Something went wrong',
      });
    }
  } catch (err) {
    dispatch({
      type: BRANCH_STATUS_ERROR,
      payload: 'Something went wrong',
    });
  }
};


export const storeBranch = (data: any, callback: any) => (dispatch: any) => {
  dispatch({ type: BRANCH_STORE_PENDING });
  httpService
    .post(API_BRANCH_STORE_URL, data)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: BRANCH_STORE_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: BRANCH_STORE_ERROR,
          payload: _data.error.message,
        });
      }
      if ('function' === typeof callback) {
        callback(_data);
      }
    })
    .catch((er) => {
      dispatch({
        type: BRANCH_STORE_ERROR,
        payload: 'Something went wrong.',
      });
    });
};

const initialState = {
  isLoading: false,
  errors: null,
  data: {},
  editData: {},
  currentBranch: {},
};

const branchReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case BRANCH_UPDATE_PENDING:
      return {
        ...state,
        isLoading: true,
        isUpdate: false,
        editData: {},
      };
    case BRANCH_STORE_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
      };

    case BRANCH_LIST_PENDING:
    case BRANCH_EDIT_PENDING:
    case USER_CURRENT_BRANCH_PENDING:
      return {
        ...state,
        isLoading: true,
        isUpdate: false,
      };

    case BRANCH_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        errors: {},
      };

    case BRANCH_UPDATE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isUpdate: true,
        updateData: action.payload,
      };
    case BRANCH_EDIT_SUCCESS:
      return {
        ...state,
        isLoading: false,
        editData: action.payload,
      };
    case BRANCH_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        editData: {},
        data: action.payload,
      };

    case USER_CURRENT_BRANCH_SUCCESS:
      return {
        ...state,
        isLoading: false,
        currentBranch: action.payload,
      };

    case BRANCH_UPDATE_ERROR:
      return {
        ...state,
        isLoading: false,
        isUpdate: false,
        errors: action.payload,
      };

    case BRANCH_STORE_ERROR:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        errors: action.payload,
      };

    case BRANCH_LIST_ERROR:
    case USER_CURRENT_BRANCH_ERROR:
    case BRANCH_EDIT_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default branchReducer;
