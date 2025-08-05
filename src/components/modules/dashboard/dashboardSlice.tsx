import React from 'react';
import {
  DASHBOARD_DATA_ERROR,
  DASHBOARD_DATA_PENDING,
  DASHBOARD_DATA_SUCCESS,
} from '../../constant/constant/constant';
import httpService from '../../services/httpService';
import { API_DASHBOARD_URL } from '../../services/apiRoutes';

export const getDashboard = () => (dispatch: any) => {
  dispatch({ type: DASHBOARD_DATA_PENDING });

  httpService
    .get(API_DASHBOARD_URL)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: DASHBOARD_DATA_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: DASHBOARD_DATA_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: DASHBOARD_DATA_ERROR,
        payload: 'Something went wrongs!',
      });
    });
};

const dashboardData = {
  isLoading: false,
  errors: null,
  data: [],
};

const dashboardReducer = (state = dashboardData, action: any) => {
  switch (action.type) {
    case DASHBOARD_DATA_PENDING:
      return {
        ...state,
        data: {},
        isLoading: true,
      };
    case DASHBOARD_DATA_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };
    case DASHBOARD_DATA_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default dashboardReducer;
