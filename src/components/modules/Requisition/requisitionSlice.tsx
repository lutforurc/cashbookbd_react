import { getToken } from "../../../features/authReducer";
import { REQUISITION_DATA_LIST_ERROR, REQUISITION_DATA_LIST_PENDING, REQUISITION_DATA_LIST_SUCCESS } from "../../constant/constant/constant";
import { API_REQUISITION_COMPARISONS_URL, API_REQUISITION_ITEMS_URL } from "../../services/apiRoutes";
import httpService from "../../services/httpService";

interface ledgerParam {
  branchId: number | null;
  startDate: string;
  endDate: string;
}
   


export const requisitionComparison = ({ branchId, startDate, endDate }: ledgerParam) => (dispatch: any) => {
  dispatch({ type: REQUISITION_DATA_LIST_PENDING });
  httpService.get(API_REQUISITION_COMPARISONS_URL +`?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}&delay=1`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: REQUISITION_DATA_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: REQUISITION_DATA_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch(() => {
      dispatch({
        type: REQUISITION_DATA_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};


export const requisitionItem = (search = '') => async (dispatch: any) => {
  try {
    const token = getToken(); 
    const response = await fetch(API_REQUISITION_ITEMS_URL + `?q=${search}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
    const data = await response.json();
    dispatch({ type: 'REQUISITION_ITEMS_DROPDOWN', payload: data });
    return { payload: data.data.data };
  } catch (error) { 
    throw error;
  }
};

interface LedgerState {
  isLoading: boolean;
  errors: string | null;
  data: any;
}

const initialState: LedgerState = {
  isLoading: false,
  errors: null,
  data: {},
};
const ledgerReducer = (
  state: LedgerState = initialState,
  action: any
): LedgerState => {
  switch (action.type) {
    case REQUISITION_DATA_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
        errors: null, // Optionally reset errors on request start
      };

    case REQUISITION_DATA_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
        errors: null, // Clear errors on success
      };

    case REQUISITION_DATA_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        data: {},
        errors: action.payload,
      };

    default:
      return state;
  }
};

export default ledgerReducer;
