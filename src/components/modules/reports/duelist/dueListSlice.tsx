import React from 'react';
import httpService from '../../../services/httpService';
import { API_REPORT_DUE_LIST_URL } from '../../../services/apiRoutes';
import { DUE_LIST_DATA_ERROR, DUE_LIST_DATA_PENDING, DUE_LIST_DATA_SUCCESS } from '../../../constant/constant/constant';

interface cashBookParam {
  branchId: number;
  endDate: string;
  /** A `cust_party_infos.party_type_id`, or '' / null / undefined for every party. */
  partyTypeId?: string | number | null;
}

/**
 * ⚠️ Which request is the current one.
 *
 * The screen fires a fresh call the moment the classification (or the branch
 * and date) changes, and a slower earlier call can land after a faster later
 * one. Without this the older answer -- for a filter the reader has already
 * moved off -- would overwrite the newer rows and the table would show one
 * classification under another's label. Every dispatch is tagged, and only the
 * latest tag is allowed through.
 */
let latestRequestId = 0;

export const getDueList = ({ branchId, endDate, partyTypeId }: cashBookParam) => (dispatch: any) => {
  const requestId = ++latestRequestId;

  dispatch({ type: DUE_LIST_DATA_PENDING });

  const params: Record<string, string | number> = {
    branch_id: branchId,
    enddate: endDate,
  };
  // Absent rather than empty: the server's own "no filter" is the missing
  // param, and an empty string would have to be special-cased there too.
  if (partyTypeId !== '' && partyTypeId !== null && partyTypeId !== undefined) {
    params.party_type_id = partyTypeId;
  }

  httpService.get(API_REPORT_DUE_LIST_URL, { params })
    .then((res) => {
      // A newer request has already been sent; its answer is the one to keep.
      if (requestId !== latestRequestId) return;

      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: DUE_LIST_DATA_SUCCESS,
          payload: _data.data.data.original,
        });
      } else {
        dispatch({
          type: DUE_LIST_DATA_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      if (requestId !== latestRequestId) return;
      dispatch({
        type: DUE_LIST_DATA_ERROR,
        payload: 'Something went wrongs!',
      });
    });
};

const initialState = {
  isLoading: false,
  errors: null,
  data: {},
};

const dueListReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case DUE_LIST_DATA_PENDING:
      return {
        ...state,
        isLoading: true,
      };
    case DUE_LIST_DATA_SUCCESS:
      return {
        ...state,
        isLoading: false,
        errors: null,
        data: action.payload,
      };
    case DUE_LIST_DATA_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
        // ⚠️ The rows go too. A failed or empty answer for one classification
        // must not leave the previous classification's rows sitting under the
        // new label -- that is the one error a reader cannot see.
        data: {},
      };
    default:
      return state;
  }
};

export default dueListReducer;
