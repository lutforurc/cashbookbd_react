import React from 'react';

import httpService from '../../../services/httpService';
import { API_REPORT_CASHBOOK_URL } from '../../../services/apiRoutes';
import {
  CASHBOOK_DATA_LIST_ERROR,
  CASHBOOK_DATA_LIST_PENDING,
  CASHBOOK_DATA_LIST_SUCCESS,
} from '../../../constant/constant/constant';

interface cashBookParam {
  branchId: number;
  startDate: string;
  endDate: string;
}

export const getCashBook =({ branchId, startDate, endDate }: cashBookParam) =>(dispatch: any) => {
    dispatch({ type: CASHBOOK_DATA_LIST_PENDING });

    httpService.get(API_REPORT_CASHBOOK_URL +`?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}`)
      .then((res) => {
        let _data = res.data;
        if (_data.success) {
          dispatch({
            type: CASHBOOK_DATA_LIST_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: CASHBOOK_DATA_LIST_ERROR,
            payload: _data.error.message,
          });
        }
      })
      .catch((err) => {
        dispatch({
          type: CASHBOOK_DATA_LIST_ERROR,
          payload: 'Something went wrongs!',
        });
      });
  };

const initialState = {
  isLoading: false,
  errors: null,
  data: {},
};

const cashBookReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case CASHBOOK_DATA_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
      };
    case CASHBOOK_DATA_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };
    case CASHBOOK_DATA_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default cashBookReducer;
