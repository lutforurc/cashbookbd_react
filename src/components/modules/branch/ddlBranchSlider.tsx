import {
  ALL_BRANCH_LIST_ERROR,
  ALL_BRANCH_LIST_PENDING,
  ALL_BRANCH_LIST_SUCCESS,
  DDL_PROTECTED_BRANCH_LIST_ERROR,
  DDL_PROTECTED_BRANCH_LIST_PENDING,
  DDL_PROTECTED_BRANCH_LIST_SUCCESS,
} from '../../constant/constant/constant';
import {
  API_ALL_DDL_BRANCH_URL,
  API_ALL_DDL_PROTECTED_BRANCH_URL,
} from '../../services/apiRoutes';
import httpService from '../../services/httpService';

export const getDdlAllBranch = () => (dispatch: any) => {
  dispatch({ type: ALL_BRANCH_LIST_PENDING });
  httpService.get(API_ALL_DDL_BRANCH_URL)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: ALL_BRANCH_LIST_SUCCESS,
          payload: _data.data,
        });
      } else {
        dispatch({
          type: ALL_BRANCH_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      console.error("Request failed:", err); // Log catch block errors
      dispatch({
        type: ALL_BRANCH_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};

export const getDdlProtectedBranch = () => (dispatch: any) => {
  dispatch({ type: DDL_PROTECTED_BRANCH_LIST_PENDING });

  httpService
    .get(API_ALL_DDL_PROTECTED_BRANCH_URL)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: DDL_PROTECTED_BRANCH_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: DDL_PROTECTED_BRANCH_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: DDL_PROTECTED_BRANCH_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};

const initialState = {
  isLoading: false,
  errors: null,
  data: {},
  protectedData: {},
};

const branchDdlReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case ALL_BRANCH_LIST_PENDING:
    case DDL_PROTECTED_BRANCH_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
      };
    case ALL_BRANCH_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload, // Assign to `data` instead of `protectedData`
      };
    case DDL_PROTECTED_BRANCH_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        protectedData: action.payload,
      };


    case ALL_BRANCH_LIST_ERROR:
    case DDL_PROTECTED_BRANCH_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default branchDdlReducer;
