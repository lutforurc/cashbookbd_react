import {
  COAL2_LIST_ERROR, COAL2_LIST_PENDING, COAL2_LIST_SUCCESS,
} from '../../../constant/constant/constant';
import { API_CHART_OF_ACCOUNTS_L2_URL, API_CHART_OF_ACCOUNTS_L3_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

interface coal2Param {
  page: number;
  perPage: number;
  search: string;
}

export const getCoal2 = ({ page, perPage, search = '' }: coal2Param) => (dispatch: any) => {
  dispatch({ type: COAL2_LIST_PENDING });
  httpService.get(API_CHART_OF_ACCOUNTS_L2_URL + `?page=${page}&per_page=${perPage}&search=${search}`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: COAL2_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: COAL2_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: COAL2_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};

interface coal2Param {
  name: string | null;
}


const initialState = {
  isLoading: false,
  errors: null,
  data: { label: 'Select Ledger', value: 'null' },
};

const coal2Reducer = (state = initialState, action: any) => {
  switch (action.type) {

    case COAL2_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
        data: {},
      };

    case COAL2_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case COAL2_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default coal2Reducer;
