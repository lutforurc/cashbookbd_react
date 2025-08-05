import React from 'react';

import httpService from '../../../services/httpService';
import { API_DATE_WISE_TOTAL_URL } from '../../../services/apiRoutes';
import {
  DATE_WISE_TOTAL_ERROR,
  DATE_WISE_TOTAL_PENDING,
  DATE_WISE_TOTAL_SUCCESS,
} from '../../../constant/constant/constant';

interface dateWiseTotalParam {
  branchId: number;
  startDate: string;
  endDate: string;
}

export const getDateWiseTotal =
  ({ branchId, startDate, endDate }: dateWiseTotalParam) =>
  (dispatch: any) => {
    dispatch({ type: DATE_WISE_TOTAL_PENDING });

    httpService
      .get(
        API_DATE_WISE_TOTAL_URL +
          `?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}`,
      )
      .then((res) => {
        let _data = res.data;
        if (_data.success) {
          dispatch({
            type: DATE_WISE_TOTAL_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: DATE_WISE_TOTAL_ERROR,
            payload: _data.error.message,
          });
        }
      })
      .catch((err) => {
        dispatch({
          type: DATE_WISE_TOTAL_ERROR,
          payload: 'Something went wrongs!',
        });
      });
  };

const initialState = {
  isLoading: false,
  errors: null,
  data: {},
};

const dateWiseTotalReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case DATE_WISE_TOTAL_PENDING:
      return {
        ...state,
        isLoading: true,
      };
    case DATE_WISE_TOTAL_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };
    case DATE_WISE_TOTAL_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default dateWiseTotalReducer;
