import {
  USER_EDIT_ERROR, USER_EDIT_PENDING, USER_EDIT_SUCCESS,USER_LIST_ERROR,USER_LIST_PENDING,
  USER_LIST_SUCCESS,USER_STORE_ERROR,USER_STORE_PENDING,USER_STORE_SUCCESS,USER_UPDATE_ERROR,USER_UPDATE_PENDING,USER_UPDATE_SUCCESS,
} from '../../constant/constant/constant';

import {API_USER_EDIT_URL, API_USER_LIST_URL,API_USER_STORE_URL,API_USER_UPDATE_URL,} from '../../services/apiRoutes';
import httpService from '../../services/httpService';

interface userListParam {
  page: number;
  perPage: number;
  search: string;
}
export const getUser = ({ page, perPage, search = '' }: userListParam) =>
  (dispatch: any) => {
    dispatch({ type: USER_LIST_PENDING });
    httpService.get(API_USER_LIST_URL +`?page=${page}&per_page=${perPage}&search=${search}`)
      .then((res) => {
        let _data = res.data;
        if (_data.success) {
          dispatch({
            type: USER_LIST_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: USER_LIST_ERROR,
            payload: _data.error.message,
          });
        }
      })
      .catch((err) => {
        dispatch({
          type: USER_LIST_ERROR,
          payload: 'Something went wrong',
        });
      });
  };

export const editUser = (id: number) => (dispatch: any) => {
  dispatch({ type: USER_EDIT_PENDING });
  httpService.get(API_USER_EDIT_URL + `${id}`)
  .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: USER_EDIT_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: USER_EDIT_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: USER_EDIT_ERROR,
        payload: 'Something went wrong',
      });
    });
};

export const updateUser = (data: any, callback: any) => (dispatch: any) => {
  dispatch({ type: USER_UPDATE_PENDING });
  httpService
    .post(API_USER_UPDATE_URL, data)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: USER_UPDATE_SUCCESS,
          payload: _data.message,
        });
      } else {
        dispatch({
          type: USER_UPDATE_ERROR,
          payload: _data.error.message,
        });
      }
      if ('function' === typeof callback) {
        callback(_data);
      }
    })
    .catch((err) => {
      dispatch({
        type: USER_UPDATE_ERROR,
        payload: err,
      });
    });
};

export const storeUser = (data: any, callback: any) => (dispatch: any) => {
  dispatch({ type: USER_STORE_PENDING });
  httpService
    .post(API_USER_STORE_URL, data)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: USER_STORE_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: USER_STORE_ERROR,
          payload: _data.error.message,
        });
      }
      if ('function' === typeof callback) {
        callback(_data);
      }
    })
    .catch((er) => {
      dispatch({
        type: USER_STORE_ERROR,
        payload: 'Something went wrong.',
      });
    });
};

const initialState = {
  isLoading: false,
  errors: null,
  data: {},
  editData: {},
};

const userReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case USER_UPDATE_PENDING:
      return {
        ...state,
        isLoading: true,
        isUpdate: false, 
      };
    case USER_STORE_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
      };

    case USER_LIST_PENDING:
    case USER_EDIT_PENDING:
      return {
        ...state,
        isLoading: true,
        isUpdate: false,
      };

    case USER_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        errors: {},
      };

    case USER_UPDATE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isUpdate: true, 
        updateData: action.payload,
      };
    case USER_EDIT_SUCCESS:
      return {
        ...state,
        isLoading: false,
        editData: action.payload,
      };
    case USER_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case USER_UPDATE_ERROR:
      return {
        ...state,
        isLoading: false,
        isUpdate: false,
        errors: action.payload,
      };

    case USER_STORE_ERROR:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        errors: action.payload,
      };

    case USER_LIST_ERROR:
    case USER_EDIT_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default userReducer;
