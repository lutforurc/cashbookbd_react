import React from 'react';
import {
  BRANCH_STORE_ERROR,
  DASHBOARD_DATA_ERROR,
  DASHBOARD_DATA_PENDING,
  DASHBOARD_DATA_SUCCESS,
  RECEIVED_REMITTANCE_DATA_ERROR,
  RECEIVED_REMITTANCE_DATA_PENDING,
  RECEIVED_REMITTANCE_DATA_SUCCESS,
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


// export const RECEIVED_REMITTANCE_DATA_PENDING = 'RECEIVED/REMITTANCE/data/pending';
// export const RECEIVED_REMITTANCE_DATA_SUCCESS = 'RECEIVED/REMITTANCE/data/success';
// export const RECEIVED_REMITTANCE_DATA_ERROR = 'RECEIVED/REMITTANCE/data/error';

export const receivedRemittance = (data: any, callback: any) => (dispatch: any) => {
  dispatch({ type: RECEIVED_REMITTANCE_DATA_PENDING });
  httpService
    .post(API_RECEIVED_REMITTANCE_URL, data)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: RECEIVED_REMITTANCE_DATA_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: RECEIVED_REMITTANCE_DATA_ERROR,
          payload: _data.error.message,
        });
      }
      if ('function' === typeof callback) {
        callback(_data);
      }
    })
    .catch((er) => {
      dispatch({
        type: RECEIVED_REMITTANCE_DATA_ERROR,
        payload: 'Something went wrong.',
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
