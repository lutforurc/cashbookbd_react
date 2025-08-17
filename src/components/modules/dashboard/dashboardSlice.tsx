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
import { API_DASHBOARD_URL, API_RECEIVED_REMITTANCE_URL } from '../../services/apiRoutes';

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



export const dispatchRemittance = (data: any, callback: any) => async (dispatch: any) => {
  dispatch({ type: RECEIVED_REMITTANCE_DATA_PENDING });

  try {
    // Await the HTTP post request
    const res = await httpService.post(API_RECEIVED_REMITTANCE_URL, data);
    const _data = res.data;

    if (_data.success) {
      dispatch({
        type: RECEIVED_REMITTANCE_DATA_SUCCESS,
        payload: _data.data.data,
      });

      // Success: Call the callback with success = true and message
      if (typeof callback === 'function') {
        callback(_data.message, true);
      }
      return _data;  // Return response if needed in the calling function
    } else {
      dispatch({
        type: RECEIVED_REMITTANCE_DATA_ERROR,
        payload: _data.error.message,
      });

      // Failure: Call the callback with success = false and error message
      if (typeof callback === 'function') {
        callback(_data.message, false);
      }
      return _data;  // Return response for failure handling
    }
  } catch (error) {
    dispatch({
      type: RECEIVED_REMITTANCE_DATA_ERROR,
      payload: 'Something went wrong.',
    });

    // Failure: Call the callback with a generic error message and failure status
    if (typeof callback === 'function') {
      callback('Something went wrong.', false);
    }

    return { success: false, message: 'Something went wrong.' };  // Return error info
  }
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
