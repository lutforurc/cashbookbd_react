import { VOUCHER_APPROVAL_REMOVE_ERROR, VOUCHER_APPROVAL_REMOVE_PENDING, VOUCHER_APPROVAL_REMOVE_SUCCESS, VOUCHER_APPROVAL_STORE_ERROR, VOUCHER_APPROVAL_STORE_PENDING, VOUCHER_APPROVAL_STORE_SUCCESS } from '../../constant/constant/constant';
import { API_VOUCHER_APPROVAL_REMOVE_URL, API_VOUCHER_APPROVAL_STORE_URL } from '../../services/apiRoutes';
import httpService from '../../services/httpService';


export const storeVoucherApproval = (data: any, callback?: (message: string, success?: boolean) => void) => (dispatch: any) => {
  dispatch({ type: VOUCHER_APPROVAL_STORE_PENDING });

  httpService.post(API_VOUCHER_APPROVAL_STORE_URL, data)
    .then((res) => {
      const _data = res.data;

      if (_data.success) {
        dispatch({
          type: VOUCHER_APPROVAL_STORE_SUCCESS,
          payload: _data.data?.data ?? null,
        });

        if (typeof callback === 'function') {
          callback(_data.message, true); // ✅ success = true
        }
      } else {
        dispatch({
          type: VOUCHER_APPROVAL_STORE_ERROR,
          payload: _data.error?.message ?? 'Unexpected error.',
        });

        if (typeof callback === 'function') {
          callback(_data.message ?? 'Unexpected error.', false); // ✅ success = false
        }
      }
    })
    .catch((err) => {
      const errorMessage = err?.response?.data?.message || 'Something went wrong.';
      
      dispatch({
        type: VOUCHER_APPROVAL_STORE_ERROR,
        payload: errorMessage,
      });

      if (typeof callback === 'function') {
        callback(errorMessage, false); // ✅ pass real error message
      }
    });
};



export const removeVoucherApproval = (data: any, callback?: (message: string, success?: boolean) => void) => (dispatch: any) => {
  dispatch({ type: VOUCHER_APPROVAL_REMOVE_PENDING });

  httpService.post(API_VOUCHER_APPROVAL_REMOVE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: VOUCHER_APPROVAL_REMOVE_SUCCESS,
          payload: _data.data?.data ?? null,
        });
        
        if (typeof callback === 'function') {
          callback(_data.message, true); // ✅ success = true
        }
      } else {
        dispatch({
          type: VOUCHER_APPROVAL_REMOVE_ERROR,
          payload: _data.error?.message ?? 'Unexpected error.',
        });
        
        if (typeof callback === 'function') {
          // console.log('Remove Approval Response:', _data);
          callback(_data.message ?? 'Unexpected error.', false); // ✅ success = false
        }
      }
    })
    .catch((err) => {
      const errorMessage = err?.response?.data?.message || 'Something went wrong.';
      
      dispatch({
        type: VOUCHER_APPROVAL_REMOVE_ERROR,
        payload: errorMessage,
      });

      if (typeof callback === 'function') {
        callback(errorMessage, false); // ✅ pass real error message
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
    case API_VOUCHER_APPROVAL_REMOVE_URL:
      return {
        ...state,
        isLoading: true,
        isSave: false,
      };

    case VOUCHER_APPROVAL_STORE_SUCCESS:
    case VOUCHER_APPROVAL_REMOVE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        data: action.payload,
        errors: {},
      };
    case VOUCHER_APPROVAL_STORE_ERROR:
    case VOUCHER_APPROVAL_REMOVE_ERROR:
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
