import { PURCHASE_LEDGER_DATA_LIST_ERROR, PURCHASE_LEDGER_DATA_LIST_PENDING, PURCHASE_LEDGER_DATA_LIST_SUCCESS } from '../../../constant/constant/constant';
import { API_REPORT_PURCHASE_LEDGER_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

interface ledgerParam {
  branchId: number | null;
  ledgerId: number | null;
  productId: number | null;
  startDate: string;
  endDate: string;
}

export const getPurchaseLedger = ({ branchId, ledgerId, productId, startDate, endDate }: ledgerParam) =>
  (dispatch: any) => {
    dispatch({ type: PURCHASE_LEDGER_DATA_LIST_PENDING });
    httpService
      .get(API_REPORT_PURCHASE_LEDGER_URL + `?branch_id=${branchId}&ledger_id=${ledgerId}&item_id=${productId}&startdate=${startDate}&enddate=${endDate}&delay=1`,
      )
      .then((res) => {
        let _data = res.data;
        if (_data.success) {
          dispatch({
            type: PURCHASE_LEDGER_DATA_LIST_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: PURCHASE_LEDGER_DATA_LIST_ERROR,
            payload: _data.error.message,
          });
        }
      })
      .catch(() => {
        dispatch({
          type: PURCHASE_LEDGER_DATA_LIST_ERROR,
          payload: 'Something went wrong',
        });
      });
  };
const initialState = {
  isLoading: false,
  errors: {},
  data: {},
};
const purchaseLedgerReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case PURCHASE_LEDGER_DATA_LIST_PENDING:
      return {
        data: {}, //...state,
        isLoading: true,
      };
    case PURCHASE_LEDGER_DATA_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case PURCHASE_LEDGER_DATA_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default purchaseLedgerReducer;
