import { COAL1_LIST_ERROR, COAL1_LIST_PENDING, COAL1_LIST_SUCCESS } from '../../../constant/constant/constant';
import { API_CHART_OF_ACCOUNTS_L1_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

interface coal1Param {
  page: number;
  perPage: number;
  search: string;
}

export const getCoal1 = ({ page, perPage, search = '' }: coal1Param) => (dispatch: any) => {
  dispatch({ type: COAL1_LIST_PENDING });
  httpService.get(API_CHART_OF_ACCOUNTS_L1_URL + `?page=${page}&per_page=${perPage}&search=${search}`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: COAL1_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: COAL1_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: COAL1_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};

interface coal1Param {
  name: string | null;
}


const initialState = {
  isLoading: false,
  errors: null,
  data: { label: 'Select Ledger', value: 'null' },
};

const coal1Reducer = (state = initialState, action: any) => {
  switch (action.type) {

    case COAL1_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
        data: {},
      };

    case COAL1_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case COAL1_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default coal1Reducer;
