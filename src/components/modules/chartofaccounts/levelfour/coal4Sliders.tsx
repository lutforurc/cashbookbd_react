import {
  COAL4_DDL_LIST_ERROR,
  COAL4_DDL_LIST_PENDING, COAL4_DDL_LIST_SUCCESS,
  COAL4_LIST_ERROR, COAL4_LIST_PENDING,
  COAL4_LIST_SUCCESS,
} from '../../../constant/constant/constant';
import { API_CHART_OF_ACCOUNTS_DDL_L4_URL, API_CHART_OF_ACCOUNTS_L4_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';


interface coal4Param {
  page: number;
  perPage: number;
  search: string;
}

export const getCoal4 = ({ page, perPage, search = '' }: coal4Param) => (dispatch: any) => {
  dispatch({ type: COAL4_LIST_PENDING });
  return httpService.get(API_CHART_OF_ACCOUNTS_L4_URL + `?page=${page}&per_page=${perPage}&search=${search}`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: COAL4_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: COAL4_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: COAL4_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};

interface coal4Param {
  name: string | null;
}

export const getCoal4Ddl = (searchName: string | null) => async (dispatch: any) => {
  dispatch({ type: COAL4_DDL_LIST_PENDING });
  await httpService.get(API_CHART_OF_ACCOUNTS_DDL_L4_URL + `?searchName=${searchName}&delay=0`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: COAL4_DDL_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: COAL4_DDL_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: COAL4_DDL_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};

const initialState = {
  isLoading: false,
  errors: null,
  data: { label: 'Select Ledger', value: 'null' },
};

const coal4Reducer = (state = initialState, action: any) => {
  switch (action.type) {
    case COAL4_DDL_LIST_PENDING:
    case COAL4_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
        data: {},
      };
    case COAL4_DDL_LIST_SUCCESS:
    case COAL4_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };
    case COAL4_DDL_LIST_ERROR:
    case COAL4_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default coal4Reducer;
