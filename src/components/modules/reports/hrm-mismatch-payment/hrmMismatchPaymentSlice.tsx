import {
  HRM_MISMATCH_PAYMENT_LIST_ERROR,
  HRM_MISMATCH_PAYMENT_LIST_PENDING,
  HRM_MISMATCH_PAYMENT_LIST_SUCCESS,
} from '../../../constant/constant/constant';
import { API_REPORT_HRM_MISMATCH_PAYMENT_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

interface hrmMismatchPaymentParam {
  branchId: number | null;
  startDate?: string;
  endDate?: string;
}

interface HrmMismatchPaymentState {
  isLoading: boolean;
  errors: string | null;
  data: any;
}

export const getHrmMismatchPayment =
  ({ branchId, startDate, endDate }: hrmMismatchPaymentParam) =>
  (dispatch: any) => {
    dispatch({ type: HRM_MISMATCH_PAYMENT_LIST_PENDING });

    const params = new URLSearchParams();
    if (branchId != null) params.append('branch_id', String(branchId));
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    httpService
      .get(`${API_REPORT_HRM_MISMATCH_PAYMENT_URL}?${params.toString()}`)
      .then((res) => {
        const _data = res.data;
        if (_data.success) {
          dispatch({
            type: HRM_MISMATCH_PAYMENT_LIST_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: HRM_MISMATCH_PAYMENT_LIST_ERROR,
            payload: _data.error?.message || 'Something went wrong',
          });
        }
      })
      .catch(() => {
        dispatch({
          type: HRM_MISMATCH_PAYMENT_LIST_ERROR,
          payload: 'Something went wrong',
        });
      });
  };

const initialState: HrmMismatchPaymentState = {
  isLoading: false,
  errors: null,
  data: [],
};

const hrmMismatchPaymentReducer = (
  state = initialState,
  action: any,
): HrmMismatchPaymentState => {
  switch (action.type) {
    case HRM_MISMATCH_PAYMENT_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
      };
    case HRM_MISMATCH_PAYMENT_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
        errors: null,
      };
    case HRM_MISMATCH_PAYMENT_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default hrmMismatchPaymentReducer;
