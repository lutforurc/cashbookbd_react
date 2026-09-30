import {
  COAL2_LIST_ERROR, COAL2_LIST_PENDING, COAL2_LIST_SUCCESS,
} from '../../../constant/constant/constant';
import { API_CHART_OF_ACCOUNTS_L2_URL, API_CHART_OF_ACCOUNTS_L3_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

interface coal2Param {
  page: number;
  perPage: number;
  search: string;
  /** The level-1 head the list is narrowed to, or empty for the whole chart. */
  coal1Id?: string | number | null;
}

export const getCoal2 = ({ page, perPage, search = '', coal1Id = '' }: coal2Param) => (dispatch: any) => {
  dispatch({ type: COAL2_LIST_PENDING });
  // `coal1_id` rides on the list call rather than a call of its own: the server
  // narrows the query with it and paginates the narrowed set, so the page count
  // and the rows always describe the same selection.
  httpService.get(API_CHART_OF_ACCOUNTS_L2_URL + `?page=${page}&per_page=${perPage}&search=${search}&coal1_id=${coal1Id ?? ''}`)
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

/**
 * The level-2 heads under one level-1 head, for a dependent dropdown.
 *
 * Returns its rows to the caller rather than parking them in `coal2`: that
 * slice belongs to the L2 screen's own paginated list, and a dropdown filling
 * it would fight the list for the same state. The server narrows by
 * `coal1_id`, so the options are exactly that head's level 2s.
 */
export const getCoal2DdlByCoal1 = (coal1Id: string | number) => async () => {
  const res = await httpService.get(
    `${API_CHART_OF_ACCOUNTS_L2_URL}?page=1&per_page=500&search=&coal1_id=${coal1Id}`,
  );
  const payload = res?.data?.data?.data;
  return Array.isArray(payload?.data) ? payload.data : [];
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
