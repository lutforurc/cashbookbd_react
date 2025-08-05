import { SALES_LEDGER_DATA_LIST_ERROR, SALES_LEDGER_DATA_LIST_PENDING, SALES_LEDGER_DATA_LIST_SUCCESS } from '../../../constant/constant/constant';
import { API_REPORT_SALES_LEDGER_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

interface ledgerParam {
  branchId: number | null;
  ledgerId: number | null;
  productId: number | null;
  startDate: string;
  endDate: string;
}

export const getSalesLedger = ({ branchId, ledgerId, productId, startDate, endDate }: ledgerParam) =>
  (dispatch: any) => {
    dispatch({ type: SALES_LEDGER_DATA_LIST_PENDING });
    httpService.get(API_REPORT_SALES_LEDGER_URL + `?branch_id=${branchId}&ledger_id=${ledgerId}&item_id=${productId}&startdate=${startDate}&enddate=${endDate}&delay=1`,)
      .then((res) => {
        let _data = res.data;
        if (_data.success) {
          dispatch({
            type: SALES_LEDGER_DATA_LIST_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: SALES_LEDGER_DATA_LIST_ERROR,
            payload: _data.error.message,
          });
        }
      })
      .catch(() => {
        dispatch({
          type: SALES_LEDGER_DATA_LIST_ERROR,
          payload: 'Something went wrong',
        });
      });
  };
const initialState = {
  isLoading: false,
  errors: {},
  data: {},
};
const salesLedgerReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case SALES_LEDGER_DATA_LIST_PENDING:
      return {
        data: {}, //...state,
        isLoading: true,
      };
    case SALES_LEDGER_DATA_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case SALES_LEDGER_DATA_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default salesLedgerReducer;
