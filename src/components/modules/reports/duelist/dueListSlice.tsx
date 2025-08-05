import React from 'react';
import httpService from '../../../services/httpService';
import { API_REPORT_DUE_LIST_URL } from '../../../services/apiRoutes';
import { DUE_LIST_DATA_ERROR, DUE_LIST_DATA_PENDING, DUE_LIST_DATA_SUCCESS } from '../../../constant/constant/constant';

interface cashBookParam {
  branchId: number;
  endDate: string;
}

export const getDueList = ({ branchId, endDate }: cashBookParam) => (dispatch: any) => {
  dispatch({ type: DUE_LIST_DATA_PENDING });
  httpService.get(API_REPORT_DUE_LIST_URL + `?branch_id=${branchId}&enddate=${endDate}`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: DUE_LIST_DATA_SUCCESS,
          payload: _data.data.data.original,
        });
      } else {
        dispatch({
          type: DUE_LIST_DATA_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: DUE_LIST_DATA_ERROR,
        payload: 'Something went wrongs!',
      });
    });
};

const initialState = {
  isLoading: false,
  errors: null,
  data: {},
};

const dueListReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case DUE_LIST_DATA_PENDING:
      return {
        ...state,
        isLoading: true,
      };
    case DUE_LIST_DATA_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };
    case DUE_LIST_DATA_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default dueListReducer;
