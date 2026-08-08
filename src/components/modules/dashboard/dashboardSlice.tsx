import React from 'react';
import {
  BRANCH_STORE_ERROR,
  DASHBOARD_DATA_ERROR,
  DASHBOARD_DATA_PENDING,
  DASHBOARD_DATA_SUCCESS,
  DASHBOARD_SUMMARY_ERROR,
  DASHBOARD_SUMMARY_PENDING,
  DASHBOARD_SUMMARY_SUCCESS,
  RECEIVED_REMITTANCE_DATA_ERROR,
  RECEIVED_REMITTANCE_DATA_PENDING,
  RECEIVED_REMITTANCE_DATA_SUCCESS,
} from '../../constant/constant/constant';
import httpService from '../../services/httpService';
import {
  API_DASHBOARD_SUMMARY_URL,
  API_DASHBOARD_URL,
  API_RECEIVED_REMITTANCE_URL,
} from '../../services/apiRoutes';

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
        payload: 'Dashboard data could not be loaded. Please try again.',
      });
    });
};



/**
 * KPI tiles, receivable ageing and low stock. One request rather than one per
 * tile — the server assembles and caches them together.
 */
export const getDashboardSummary = () => (dispatch: any) => {
  dispatch({ type: DASHBOARD_SUMMARY_PENDING });

  httpService
    .get(API_DASHBOARD_SUMMARY_URL)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: DASHBOARD_SUMMARY_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: DASHBOARD_SUMMARY_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch(() => {
      dispatch({
        type: DASHBOARD_SUMMARY_ERROR,
        payload: 'Dashboard summary could not be loaded. Please try again.',
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
  // Kept beside the main payload rather than in its own store slice so the
  // summary can fail without blanking the cards that already work.
  summary: {
    isLoading: false,
    errors: null,
    data: null,
  },
};

const dashboardReducer = (state = dashboardData, action: any) => {
  switch (action.type) {
    case DASHBOARD_SUMMARY_PENDING:
      return {
        ...state,
        summary: { ...state.summary, isLoading: true, errors: null },
      };
    case DASHBOARD_SUMMARY_SUCCESS:
      return {
        ...state,
        summary: { isLoading: false, errors: null, data: action.payload },
      };
    case DASHBOARD_SUMMARY_ERROR:
      return {
        ...state,
        summary: { ...state.summary, isLoading: false, errors: action.payload },
      };
    case DASHBOARD_DATA_PENDING:
      return {
        ...state,
        data: {},
        errors: null,
        isLoading: true,
      };
    case DASHBOARD_DATA_SUCCESS:
      return {
        ...state,
        isLoading: false,
        errors: null,
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
