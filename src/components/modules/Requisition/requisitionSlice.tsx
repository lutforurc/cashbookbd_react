import { getToken } from "../../../features/authReducer";
import { REQUISITION_COMPARISON_LIST_ERROR, REQUISITION_COMPARISON_LIST_PENDING, REQUISITION_COMPARISON_LIST_SUCCESS, REQUISITION_DATA_LIST_ERROR, REQUISITION_DATA_LIST_PENDING, REQUISITION_DATA_LIST_SUCCESS, REQUISITION_DATA_STORE_ERROR, REQUISITION_DATA_STORE_PENDING, REQUISITION_DATA_STORE_SUCCESS } from "../../constant/constant/constant";
import { API_REQUISITION_COMPARISONS_URL, API_REQUISITION_ITEMS_URL, API_REQUISITION_LIST_URL, API_REQUISITION_STORE_URL } from "../../services/apiRoutes";
import httpService from "../../services/httpService";

interface ledgerParam {
  branchId: number | null;
  startDate: string;
  endDate: string;
}


interface Product {
  id: number;
  product: number;
  product_name: string;
  remarks?: string;
  unit: string;
  day: string;
  qty: string;
  price: string;
}


interface formData {
  account: string;     
  requisitionAmt: string;  
  notes: string;
  startDate: string;
  endDate: string;
  products: Product[];
}
interface RequisitionState {
  isLoading: boolean;
  errors: string | null;
  data: any;
  storeData?: any;
  comparisonData?: any;
}

const initialState: RequisitionState = {
  isLoading: false,
  errors: null,
  data: {},
  storeData: {},
  comparisonData: {},
};

export const requisitionComparison = ({ branchId, startDate, endDate }: ledgerParam) => (dispatch: any) => {
  dispatch({ type: REQUISITION_COMPARISON_LIST_PENDING });
  httpService.get(API_REQUISITION_COMPARISONS_URL +`?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}&delay=1`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: REQUISITION_COMPARISON_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: REQUISITION_COMPARISON_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch(() => {
      dispatch({
        type: REQUISITION_COMPARISON_LIST_ERROR,
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


export const requisitionStore = (data: formData, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: REQUISITION_DATA_STORE_PENDING });
  httpService.post(API_REQUISITION_STORE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: REQUISITION_DATA_STORE_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      } else {
        dispatch({
          type: REQUISITION_DATA_STORE_ERROR,
          payload: _data.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: REQUISITION_DATA_STORE_ERROR,
        payload: err.message,
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};

export const getRequisitions = (params: any) => (dispatch: any) => {
  dispatch({ type: REQUISITION_DATA_LIST_PENDING });

  httpService.post(API_REQUISITION_LIST_URL, params)
    .then((res) => {
      const _data = res.data;
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
        payload: 'Something went wrong!',
      });
    });
};


const requisitionReducer = (state: RequisitionState = initialState, action: any): RequisitionState => {
  switch (action.type) {
    case REQUISITION_DATA_LIST_PENDING:
      case REQUISITION_DATA_STORE_PENDING:
      case REQUISITION_COMPARISON_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
        errors: null, // Optionally reset errors on request start
        data: {},
        storeData: {},
        comparisonData: {},
      };

    case REQUISITION_DATA_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
        errors: null, // Clear errors on success
      };
    case REQUISITION_DATA_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        storeData: action.payload,
        errors: null, // Clear errors on success
      };
    case REQUISITION_COMPARISON_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        comparisonData: action.payload, 
        errors: null, // Clear errors on success
      };

    case REQUISITION_DATA_LIST_ERROR:
    case REQUISITION_DATA_STORE_ERROR:
    case REQUISITION_COMPARISON_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        data: {},
        storeData: {},
        comparisonData: {},
        errors: action.payload,
      };

    default:
      return state;
  }
};

export default requisitionReducer;
