import { Dispatch } from 'react';
import {
  COAL3_LIST_ERROR, COAL3_LIST_PENDING, COAL3_LIST_SUCCESS,
} from '../../../constant/constant/constant';
import { API_CHART_OF_ACCOUNTS_L3_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

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
  coal4: { label: 'Select Ledger', value: 'null' },
};


export const getCategoryDdl = () => async (dispatch: Dispatch<any>) => {
  dispatch({ type: CATEGORY_LIST_DDL_PENDING });

  try {
    const res = await httpService.get(API_CATEGORY_DDL_URL); // Await the API call
    const _data = res.data;

    if (_data.success) {
      dispatch({
        type: CATEGORY_LIST_DDL_SUCCESS,
        payload: _data.data, // Dispatch success with payload
      });
    } else {
      dispatch({
        type: CATEGORY_LIST_DDL_ERROR,
        payload: _data.error.message, // Dispatch error from API
      });
    }
  } catch (err) {
    dispatch({
      type: CATEGORY_LIST_DDL_ERROR,
      payload: 'Something went wrong!', // Dispatch error if API fails
    });
  }
};
const coal3Reducer = (state = initialState, action: any) => {
  switch (action.type) {

    case COAL3_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
        data: {},
      };

    case COAL3_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case COAL3_LIST_ERROR:
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
