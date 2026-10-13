import {
  COAL4_BY_ID_ERROR,
  COAL4_BY_ID_PENDING,
  COAL4_BY_ID_SUCCESS,
  COAL4_DDL_LIST_ERROR,
  COAL4_DDL_LIST_PENDING, COAL4_DDL_LIST_SUCCESS,
  COAL4_LIST_ERROR, COAL4_LIST_PENDING,
  COAL4_LIST_SUCCESS,
} from '../../../constant/constant/constant';
import { API_CHART_OF_ACCOUNTS_BY_ID_L4_URL, API_CHART_OF_ACCOUNTS_DDL_L4_URL, API_CHART_OF_ACCOUNTS_L4_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';


interface coal4Param {
  page: number;
  perPage: number;
  search: string;
  /** The level-1 head the list is narrowed to, or empty for the whole chart. */
  coal1Id?: string | number | null;
  /** The level-2 head under that level 1, or empty for all of its level 2s. */
  coal2Id?: string | number | null;
}

const initialState = {
  isLoading: false,
  errors: null,
  data: { label: 'Select Ledger', value: 'null' },
  coal4ById: {  },
};

interface coal4Param {
  name: string | null;
}


/**
 * ⚠️ Which request is the current one.
 *
 * The screen fires a fresh call the moment either dropdown changes, and a
 * slower earlier call can land after a faster later one. Without this the older
 * answer -- for a selection the reader has already moved off -- would overwrite
 * the newer rows, and the table would show one head's accounts under another
 * head's label. Every dispatch is tagged, and only the latest tag is let
 * through.
 */
let latestRequestId = 0;

export const getCoal4 = ({ page, perPage, search = '', coal1Id = '', coal2Id = '' }: coal4Param) => (dispatch: any) => {
  const requestId = ++latestRequestId;

  dispatch({ type: COAL4_LIST_PENDING });
  // Both filters ride on the list call rather than a call of their own: the
  // server narrows the query with them and paginates the narrowed set, so the
  // page count and the rows always describe the same selection.
  return httpService.get(API_CHART_OF_ACCOUNTS_L4_URL + `?page=${page}&per_page=${perPage}&search=${search}&coal1_id=${coal1Id ?? ''}&coal2_id=${coal2Id ?? ''}`)
    .then((res) => {
      // A newer request has already been sent; its answer is the one to keep.
      if (requestId !== latestRequestId) return;

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
      if (requestId !== latestRequestId) return;
      dispatch({
        type: COAL4_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};


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



export const getCoal4ById = (id: number | null) => async (dispatch: any) => {
  dispatch({ type: COAL4_BY_ID_PENDING });
  await httpService.get(`${API_CHART_OF_ACCOUNTS_BY_ID_L4_URL}${id}`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: COAL4_BY_ID_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: COAL4_BY_ID_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((error) => {
      dispatch({
        type: COAL4_BY_ID_ERROR,
        payload: error || 'Something went wrong',
      });
    });
};

const coal4Reducer = (state = initialState, action: any) => {
  switch (action.type) {
    case COAL4_DDL_LIST_PENDING:
    case COAL4_LIST_PENDING:
    case COAL4_BY_ID_PENDING:
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


    case COAL4_BY_ID_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: {},
        coal4ById: action.payload,
      };
    case COAL4_DDL_LIST_ERROR:
    case COAL4_LIST_ERROR:
    case COAL4_BY_ID_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
        data: {},
        coal4ById: {},
      };
    default:
      return state;
  }
};

export default coal4Reducer;
