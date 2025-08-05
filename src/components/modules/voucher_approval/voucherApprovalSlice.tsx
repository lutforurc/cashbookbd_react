import { VOUCHER_APPROVAL_STORE_ERROR, VOUCHER_APPROVAL_STORE_PENDING, VOUCHER_APPROVAL_STORE_SUCCESS } from '../../constant/constant/constant';
import { API_VOUCHER_APPROVAL_STORE_URL } from '../../services/apiRoutes';
import httpService from '../../services/httpService';


export const storeVoucherApproval = (data: any, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: VOUCHER_APPROVAL_STORE_PENDING });
  httpService.post(API_VOUCHER_APPROVAL_STORE_URL, data)
    .then((res) => {
      const _data = res.data; 
      if (_data.success) {
        dispatch({
          type: VOUCHER_APPROVAL_STORE_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.data.data);
        }
      } else {
        dispatch({
          type: VOUCHER_APPROVAL_STORE_ERROR,
          payload: _data.error.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: VOUCHER_APPROVAL_STORE_ERROR,
        payload: 'Something went wrong.',
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};


const initialState = {
  isLoading: false,
  isSave: false,
  errors: {},
  data: {},
};


const voucherApprovalReducer = (state = initialState, action: any) => {
  switch (action.type) {

    case VOUCHER_APPROVAL_STORE_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
      };

    case VOUCHER_APPROVAL_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        data: action.payload,
        errors: {},
      };
    case VOUCHER_APPROVAL_STORE_ERROR:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default voucherApprovalReducer;
