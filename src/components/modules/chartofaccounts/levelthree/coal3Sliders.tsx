import { Dispatch } from 'react';
import {
  COAL3_BY_COAL4_LIST_ERROR,
  COAL3_BY_COAL4_LIST_PENDING,
  COAL3_BY_COAL4_LIST_SUCCESS,
  COAL3_LIST_ERROR, COAL3_LIST_PENDING, COAL3_LIST_SUCCESS,
} from '../../../constant/constant/constant';
import { API_CHART_OF_ACCOUNTS_L3_URL, API_COAL3_ID_BY_L4_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

interface coal3Param {
  page: number;
  perPage: number;
  search: string;
  /** The level-1 head the list is narrowed to, or empty for the whole chart. */
  coal1Id?: string | number | null;
  /** The level-2 head, or empty for every level 2 under the level 1. */
  coal2Id?: string | number | null;
}
interface coal3Param {
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

export const getCoal3 = ({ page, perPage, search = '', coal1Id = '', coal2Id = '' }: coal3Param) => (dispatch: any) => {
  const requestId = ++latestRequestId;

  dispatch({ type: COAL3_LIST_PENDING });
  // Both filters ride on the list call: the server narrows the query with them
  // and paginates the narrowed set, so the page count and the rows always
  // describe the same selection.
  httpService.get(
    API_CHART_OF_ACCOUNTS_L3_URL
      + `?page=${page}&per_page=${perPage}&search=${search}&coal1_id=${coal1Id ?? ''}&coal2_id=${coal2Id ?? ''}`,
  )
    .then((res) => {
      // A newer request has already been sent; its answer is the one to keep.
      if (requestId !== latestRequestId) return;

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
      if (requestId !== latestRequestId) return;
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
