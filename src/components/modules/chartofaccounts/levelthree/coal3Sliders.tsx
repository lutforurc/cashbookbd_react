import { Dispatch } from 'react';
import {
  COAL3_BY_COAL4_LIST_ERROR,
  COAL3_BY_COAL4_LIST_PENDING,
  COAL3_BY_COAL4_LIST_SUCCESS,
  COAL3_LIST_ERROR, COAL3_LIST_PENDING, COAL3_LIST_SUCCESS,
} from '../../../constant/constant/constant';
import { API_CHART_OF_ACCOUNTS_L3_URL, API_COAL3_ID_BY_L4_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';
import { data } from 'jquery';

interface coal3Param {
  page: number;
  perPage: number;
  search: string;
}
interface coal3Param {
  name: string | null;
}

export const getCoal3 = ({ page, perPage, search = '' }: coal3Param) => (dispatch: any) => {
  dispatch({ type: COAL3_LIST_PENDING });
  httpService.get(API_CHART_OF_ACCOUNTS_L3_URL + `?page=${page}&per_page=${perPage}&search=${search}`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: COAL3_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: COAL3_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: COAL3_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};




const initialState = {
  isLoading: false,
  errors: null,
  data: { label: 'Select Ledger', value: 'null' },
  coal4: {  },
};


export const getCoal3ByCoal4 = (id: number | null) => async (dispatch: any) => {
  dispatch({ type: COAL3_BY_COAL4_LIST_PENDING });
  await httpService.get(`${API_COAL3_ID_BY_L4_URL}${id}`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: COAL3_BY_COAL4_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: COAL3_BY_COAL4_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((error) => {
      dispatch({
        type: COAL3_BY_COAL4_LIST_ERROR,
        payload: error || 'Something went wrong',
      });
    });
};
const coal3Reducer = (state = initialState, action: any) => {
  switch (action.type) {

    case COAL3_LIST_PENDING:
    case COAL3_BY_COAL4_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
        data: {},
        coal4: {},
      };

    case COAL3_LIST_SUCCESS:
    case COAL3_BY_COAL4_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      }; 
    case COAL3_BY_COAL4_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: {},
        coal4: action.payload,
      };

    case COAL3_LIST_ERROR:
    case COAL3_BY_COAL4_LIST_ERROR:
      return {
        ...state, 
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default coal3Reducer;
