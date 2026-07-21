import React from 'react';

import httpService from '../../../services/httpService';
import { API_REPORT_BANKBOOK_URL } from '../../../services/apiRoutes';
import {
  BANKBOOK_DATA_LIST_ERROR,
  BANKBOOK_DATA_LIST_PENDING,
  BANKBOOK_DATA_LIST_SUCCESS,
} from '../../../constant/constant/constant';

interface bankBookParam {
  branchId: number;
  startDate: string;
  endDate: string;
}

export const getBankBook =({ branchId, startDate, endDate }: bankBookParam) =>(dispatch: any) => {
    dispatch({ type: BANKBOOK_DATA_LIST_PENDING });

    httpService.get(API_REPORT_BANKBOOK_URL +`?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}`)
      .then((res) => {
        let _data = res.data;
        if (_data.success) {
          dispatch({
            type: BANKBOOK_DATA_LIST_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: BANKBOOK_DATA_LIST_ERROR,
            payload: _data.error.message,
          });
        }
      })
      .catch((err) => {
        dispatch({
          type: BANKBOOK_DATA_LIST_ERROR,
          payload: 'Something went wrongs!',
        });
      });
  };

const initialState = {
  isLoading: false,
  errors: null,
  data: {},
};

const bankBookReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case BANKBOOK_DATA_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
      };
    case BANKBOOK_DATA_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };
    case BANKBOOK_DATA_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default bankBookReducer;
